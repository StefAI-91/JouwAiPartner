import { NextResponse } from "next/server";
import { widgetIngestSchema } from "@repo/database/validations/widget";
import { isOriginAllowedForProject } from "@repo/database/queries/widget";
import { insertWidgetIssue } from "@repo/database/mutations/widget";

// MVP: geen rate-limit. Bewust geaccepteerd risico voor cockpit-only rollout
// (3 gebruikers, whitelist beperkt Origin tot bekende domeinen, low-stakes
// payload). Origin-header is spoofbaar via curl — mitigatie zit in de
// whitelist + de payload bevat geen auth-state. Postgres-counter komt in
// WG-005, vóór de eerste klant-rollout (WG-004).

// Placeholder-status-page (WG-REQ-077). Echte status-page is aparte sprint.
// Bij 5xx krijgt de klant een link zodat hij weet of het aan ons ligt.
const STATUS_PAGE_URL = "https://status.jouw-ai-partner.nl";

interface IngestLog {
  type: "widget_ingest";
  project_id: string | null;
  origin: string | null;
  status: number;
  error_code: string | null;
  ts: string;
}

function logIngest(entry: Omit<IngestLog, "type" | "ts">): void {
  const payload: IngestLog = { type: "widget_ingest", ts: new Date().toISOString(), ...entry };
  console.log(JSON.stringify(payload));
}

function corsHeaders(origin: string): Headers {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Vary", "Origin");
  return headers;
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) {
    logIngest({ project_id: null, origin: null, status: 403, error_code: "no_origin" });
    return NextResponse.json({ error: "no_origin" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = widgetIngestSchema.safeParse(body);
  if (!parsed.success) {
    logIngest({ project_id: null, origin, status: 400, error_code: "validation" });
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const allowed = await isOriginAllowedForProject(parsed.data.project_id, origin);
  if (!allowed) {
    logIngest({
      project_id: parsed.data.project_id,
      origin,
      status: 403,
      error_code: "origin_not_allowed",
    });
    return NextResponse.json({ error: "origin_not_allowed" }, { status: 403 });
  }

  const result = await insertWidgetIssue(parsed.data);
  if ("error" in result) {
    logIngest({
      project_id: parsed.data.project_id,
      origin,
      status: 500,
      error_code: "insert_failed",
    });
    return NextResponse.json(
      { error: "insert_failed", message: result.error, status_page: STATUS_PAGE_URL },
      { status: 500, headers: corsHeaders(origin) },
    );
  }

  logIngest({ project_id: parsed.data.project_id, origin, status: 200, error_code: null });
  return NextResponse.json(
    { success: true, issue_id: result.data.id },
    { status: 200, headers: corsHeaders(origin) },
  );
}

/**
 * CORS preflight. Spiegelt Origin ongefilterd terug — preflight zelf doet niets
 * gevoeligs; de échte authorisatie zit in de POST (whitelist-check). Browsers
 * cachen het preflight-antwoord 24u zodat we niet bij elke POST opnieuw
 * geraakt worden.
 */
export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  });
}
