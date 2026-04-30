import { NextResponse } from "next/server";
import { isOriginAllowedForProject } from "@repo/database/queries/widget";
import { uploadWidgetScreenshot } from "@repo/database/mutations/widget";
import {
  WIDGET_SCREENSHOT_ALLOWED_MIMES,
  WIDGET_SCREENSHOT_MAX_BYTES,
} from "@repo/database/constants/widget";
import { rateLimitOrigin } from "@/lib/rate-limit";

// WG-006a: screenshot-upload endpoint. Aparte route zodat we PNG-bytes en
// feedback-payloads niet door dezelfde 413/415-funnel duwen, en zodat de
// rate-limit van screenshots los staat van die van feedback (anders zou
// een vol screenshot-budget feedback-submits blokkeren). Het token dat we
// hier teruggeven wordt door WG-006b in de feedback-POST geclaimd.

// `req.formData()` werkt alleen op de Node-runtime — Edge accepteert wel
// formData maar geen Blob > 1MB betrouwbaar. Expliciet zetten voorkomt dat
// een Vercel-deploy stilletjes de Edge-runtime kiest.
export const runtime = "nodejs";

const STATUS_PAGE_URL = "https://status.jouw-ai-partner.nl";

interface IngestLog {
  type: "widget_screenshot_ingest";
  project_id: string | null;
  origin: string | null;
  status: number;
  error_code: string | null;
  /** Aantal bytes in het uploaded bestand. null als niet geparset. */
  bytes?: number | null;
  /** Rate-limit count voor logging. -1 = fail-open. */
  rate_count?: number;
  ts: string;
}

function logIngest(entry: Omit<IngestLog, "type" | "ts">): void {
  const payload: IngestLog = {
    type: "widget_screenshot_ingest",
    ts: new Date().toISOString(),
    ...entry,
  };
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

function secondsUntilNextHour(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(now.getHours() + 1, 0, 0, 0);
  return Math.ceil((next.getTime() - now.getTime()) / 1000);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isAllowedMime(mime: string): boolean {
  return (WIDGET_SCREENSHOT_ALLOWED_MIMES as readonly string[]).includes(mime);
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) {
    logIngest({ project_id: null, origin: null, status: 403, error_code: "no_origin" });
    return NextResponse.json({ error: "no_origin" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    logIngest({ project_id: null, origin, status: 400, error_code: "invalid_multipart" });
    return NextResponse.json(
      { error: "invalid_multipart" },
      { status: 400, headers: corsHeaders(origin) },
    );
  }

  const projectId = form.get("project_id");
  const file = form.get("file");

  if (typeof projectId !== "string" || !UUID_RE.test(projectId)) {
    logIngest({ project_id: null, origin, status: 400, error_code: "invalid_project_id" });
    return NextResponse.json(
      { error: "invalid_project_id" },
      { status: 400, headers: corsHeaders(origin) },
    );
  }

  if (!(file instanceof Blob)) {
    logIngest({ project_id: projectId, origin, status: 400, error_code: "missing_file" });
    return NextResponse.json(
      { error: "missing_file" },
      { status: 400, headers: corsHeaders(origin) },
    );
  }

  // Volgorde: cheap checks eerst (size + mime) zodat we whitelist-DB-call
  // en rate-limit-counter niet onnodig raken voor evident-foute requests.
  if (file.size > WIDGET_SCREENSHOT_MAX_BYTES) {
    logIngest({
      project_id: projectId,
      origin,
      status: 413,
      error_code: "payload_too_large",
      bytes: file.size,
    });
    return NextResponse.json(
      { error: "payload_too_large", max_bytes: WIDGET_SCREENSHOT_MAX_BYTES },
      { status: 413, headers: corsHeaders(origin) },
    );
  }

  if (!isAllowedMime(file.type)) {
    logIngest({
      project_id: projectId,
      origin,
      status: 415,
      error_code: "unsupported_media_type",
      bytes: file.size,
    });
    return NextResponse.json(
      { error: "unsupported_media_type", allowed: WIDGET_SCREENSHOT_ALLOWED_MIMES },
      { status: 415, headers: corsHeaders(origin) },
    );
  }

  const allowed = await isOriginAllowedForProject(projectId, origin);
  if (!allowed) {
    logIngest({
      project_id: projectId,
      origin,
      status: 403,
      error_code: "origin_not_allowed",
      bytes: file.size,
    });
    return NextResponse.json(
      { error: "origin_not_allowed" },
      { status: 403, headers: corsHeaders(origin) },
    );
  }

  // Rate-limit ná whitelist zodat random-Origin-spam de counter niet ophoogt
  // voor klanten die er sowieso niet door komen.
  const originHost = new URL(origin).hostname;
  const rate = await rateLimitOrigin(originHost, "screenshot_ingest");
  if (!rate.success) {
    logIngest({
      project_id: projectId,
      origin,
      status: 429,
      error_code: "rate_limited",
      bytes: file.size,
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

  try {
    const result = await uploadWidgetScreenshot(projectId, file, file.type);
    logIngest({
      project_id: projectId,
      origin,
      status: 200,
      error_code: null,
      bytes: file.size,
    });
    // storage_path expliciet **niet** terug naar de client — alleen het
    // token + expires_at. Storage-pad is server-private; client heeft 't
    // niet nodig om in WG-006b te claimen.
    return NextResponse.json(
      { success: true, token: result.token, expires_at: result.expires_at },
      { status: 200, headers: corsHeaders(origin) },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logIngest({
      project_id: projectId,
      origin,
      status: 500,
      error_code: "upload_failed",
      bytes: file.size,
    });
    return NextResponse.json(
      { error: "upload_failed", message, status_page: STATUS_PAGE_URL },
      { status: 500, headers: corsHeaders(origin) },
    );
  }
}

/**
 * CORS preflight. Spiegelt Origin ongefilterd terug — preflight zelf doet
 * niets gevoeligs; de échte authorisatie zit in de POST.
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
