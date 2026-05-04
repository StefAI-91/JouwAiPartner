import { NextResponse } from "next/server";
import { widgetIngestSchema } from "@repo/database/validations/widget";
import { isOriginAllowedForProject } from "@repo/database/queries/widget";
import { insertWidgetIssue } from "@repo/database/mutations/widget";
import { uploadScreenshotDataUrl } from "@repo/database/mutations/issues";
import { rateLimitOrigin } from "@/lib/rate-limit";

// WG-005: rate-limit per Origin via Postgres-counter. Whitelist + rate-limit
// tezamen sluiten het flood-risico — Origin spoof-resistant zou een nieuwe
// sprint vragen (mTLS / signed payloads), maar in V0 is hostname-binding
// genoeg voor goedwillende klanten.

// Placeholder-status-page (WG-REQ-077). Echte status-page is aparte sprint.
// Bij 5xx krijgt de klant een link zodat hij weet of het aan ons ligt.
const STATUS_PAGE_URL = "https://status.jouw-ai-partner.nl";

interface IngestLog {
  type: "widget_ingest";
  project_id: string | null;
  origin: string | null;
  status: number;
  error_code: string | null;
  /** Aantal requests in de huidige uur-bucket (post-increment). -1 = fail-open. */
  rate_count?: number;
  ts: string;
}

function logIngest(entry: Omit<IngestLog, "type" | "ts">): void {
  const payload: IngestLog = { type: "widget_ingest", ts: new Date().toISOString(), ...entry };
  // 4xx/5xx → warn zodat ze in Vercel filterbaar zijn; 200 → info.
  if (entry.status >= 400) {
    console.warn(JSON.stringify(payload));
  } else {
    console.info(JSON.stringify(payload));
  }
}

function corsHeaders(origin: string): Headers {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Vary", "Origin");
  return headers;
}

/**
 * Seconds tot het volgende hele uur. Geeft de caller een Retry-After zonder
 * dat hij zelf de uur-grens hoeft te berekenen.
 */
function secondsUntilNextHour(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(now.getHours() + 1, 0, 0, 0);
  return Math.ceil((next.getTime() - now.getTime()) / 1000);
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) {
    // Geen Origin = geen browser-call — browsers sturen 'm altijd op
    // cross-origin POSTs. Dit pad raken alleen curl/server-tools, dus
    // CORS-headers zijn hier zinloos.
    logIngest({ project_id: null, origin: null, status: 403, error_code: "no_origin" });
    return NextResponse.json({ error: "no_origin" }, { status: 403 });
  }

  // Vanaf hier moeten ALLE responses CORS-headers dragen — anders kan de
  // widget-modal de error-body niet lezen en ziet de gebruiker een
  // generieke "HTTP 400" zonder details.
  const body = await req.json().catch(() => null);
  const parsed = widgetIngestSchema.safeParse(body);
  if (!parsed.success) {
    logIngest({ project_id: null, origin, status: 400, error_code: "validation" });
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 400, headers: corsHeaders(origin) },
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
    return NextResponse.json(
      { error: "origin_not_allowed" },
      { status: 403, headers: corsHeaders(origin) },
    );
  }

  // Rate-limit pas ná de whitelist-check zodat we niet onbedoeld counters
  // ophogen voor random Origins die er sowieso niet door komen.
  const originHost = new URL(origin).hostname;
  const rate = await rateLimitOrigin(originHost);
  if (!rate.success) {
    logIngest({
      project_id: parsed.data.project_id,
      origin,
      status: 429,
      error_code: "rate_limited",
      rate_count: rate.count,
    });
    const retryAfter = secondsUntilNextHour();
    const headers = corsHeaders(origin);
    headers.set("Retry-After", String(retryAfter));
    headers.set("X-RateLimit-Limit", String(rate.limit));
    headers.set("X-RateLimit-Remaining", "0");
    return NextResponse.json(
      { error: "rate_limited", retry_after_seconds: retryAfter, limit_per_hour: rate.limit },
      { status: 429, headers },
    );
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

  // WG-006 screenshot-upload. Bewust ná issue-insert en niet-blokkerend
  // bij falen: gebruiker krijgt success-toast, screenshot mist. Een
  // ontbrekende screenshot is hersteldbaar via een follow-up-comment;
  // een geblokkeerd issue is dat niet.
  if (parsed.data.screenshot) {
    const upload = await uploadScreenshotDataUrl(
      result.data.id,
      parsed.data.screenshot.data_url,
      parsed.data.screenshot.width,
      parsed.data.screenshot.height,
    );
    if ("error" in upload) {
      console.warn(
        JSON.stringify({
          type: "widget_screenshot_upload_failed",
          issue_id: result.data.id,
          error: upload.error,
          ts: new Date().toISOString(),
        }),
      );
    }
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
