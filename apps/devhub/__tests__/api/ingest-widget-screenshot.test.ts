import { describe, it, expect, vi, beforeEach } from "vitest";

// WG-006a: route-test voor /api/ingest/widget/screenshot. Mock op de
// Supabase-grens (queries + mutations) zodat we het route-pad zelf testen
// zonder ook validatie- of storage-internals te testen. Bevestigt
// WG-REQ-104/106/107/111/113.

vi.mock("@repo/database/queries/widget", () => ({
  isOriginAllowedForProject: vi.fn(),
}));

vi.mock("@repo/database/mutations/widget", () => ({
  uploadWidgetScreenshot: vi.fn(),
  // rateLimitOrigin uit lib/rate-limit roept dit aan — mocken zodat
  // we niet de hele Supabase-RPC moeten faken.
  incrementRateLimit: vi.fn(),
}));

import { isOriginAllowedForProject } from "@repo/database/queries/widget";
import { uploadWidgetScreenshot, incrementRateLimit } from "@repo/database/mutations/widget";
import { POST, OPTIONS } from "@/app/api/ingest/widget/screenshot/route";

const PROJECT_ID = "550e8400-e29b-41d4-a716-446655440000";
const ORIGIN = "https://app.klant.nl";

function pngBlob(sizeBytes: number, mime = "image/png"): Blob {
  // PNG-signature (8 bytes) + filler tot gewenste size — voldoende voor
  // de mime/size-checks die de route doet.
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const filler = new Uint8Array(Math.max(0, sizeBytes - signature.length));
  return new Blob([signature, filler], { type: mime });
}

function buildRequest(formInit: Array<[string, string | Blob]>, headers?: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of formInit) {
    form.append(key, value as Blob);
  }
  return new Request("http://localhost/api/ingest/widget/screenshot", {
    method: "POST",
    headers: { origin: ORIGIN, ...headers },
    body: form,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: rate-limit telt op naar 1 (success), whitelist toestaan,
  // upload returnt token. Specifieke tests overrulen waar nodig.
  vi.mocked(incrementRateLimit).mockResolvedValue(1);
  vi.mocked(isOriginAllowedForProject).mockResolvedValue(true);
  vi.mocked(uploadWidgetScreenshot).mockResolvedValue({
    token: "11111111-1111-1111-1111-111111111111",
    storage_path: "widget/11111111-1111-1111-1111-111111111111.png",
    expires_at: "2026-04-30T07:00:00.000Z",
  });
});

describe("POST /api/ingest/widget/screenshot", () => {
  it("403 zonder Origin-header", async () => {
    const form = new FormData();
    form.append("project_id", PROJECT_ID);
    form.append("file", pngBlob(1024));
    const req = new Request("http://localhost/api/ingest/widget/screenshot", {
      method: "POST",
      body: form,
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("no_origin");
  });

  it("400 bij ongeldige project_id", async () => {
    const req = buildRequest([
      ["project_id", "not-a-uuid"],
      ["file", pngBlob(1024)],
    ]);
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_project_id");
  });

  it("400 als file-veld ontbreekt", async () => {
    const req = buildRequest([["project_id", PROJECT_ID]]);
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("missing_file");
  });

  it("413 bij file > 2MB (WG-REQ-104)", async () => {
    const tooBig = pngBlob(2 * 1024 * 1024 + 1);
    const req = buildRequest([
      ["project_id", PROJECT_ID],
      ["file", tooBig],
    ]);
    const res = await POST(req);
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toBe("payload_too_large");
    expect(body.max_bytes).toBe(2 * 1024 * 1024);
  });

  it("415 bij verkeerde mime (WG-REQ-104)", async () => {
    const jpeg = pngBlob(1024, "image/jpeg");
    const req = buildRequest([
      ["project_id", PROJECT_ID],
      ["file", jpeg],
    ]);
    const res = await POST(req);
    expect(res.status).toBe(415);
    expect((await res.json()).error).toBe("unsupported_media_type");
  });

  it("403 als Origin niet op whitelist staat (WG-REQ-106)", async () => {
    vi.mocked(isOriginAllowedForProject).mockResolvedValue(false);
    const req = buildRequest([
      ["project_id", PROJECT_ID],
      ["file", pngBlob(1024)],
    ]);
    const res = await POST(req);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("origin_not_allowed");
    expect(uploadWidgetScreenshot).not.toHaveBeenCalled();
  });

  it("429 bij over de rate-limit (WG-REQ-107)", async () => {
    // 11e binnen het uur — limit screenshot_ingest = 10.
    vi.mocked(incrementRateLimit).mockResolvedValue(11);
    const req = buildRequest([
      ["project_id", PROJECT_ID],
      ["file", pngBlob(1024)],
    ]);
    const res = await POST(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toMatch(/^\d+$/);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
    const body = await res.json();
    expect(body.error).toBe("rate_limited");
    expect(body.limit_per_hour).toBe(10);
    expect(uploadWidgetScreenshot).not.toHaveBeenCalled();
  });

  it("200 + token bij happy-path", async () => {
    const req = buildRequest([
      ["project_id", PROJECT_ID],
      ["file", pngBlob(1024)],
    ]);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.token).toBe("11111111-1111-1111-1111-111111111111");
    expect(body.expires_at).toBe("2026-04-30T07:00:00.000Z");
    // Storage-path moet **niet** terug naar de client — server-private.
    expect(body.storage_path).toBeUndefined();
    expect(uploadWidgetScreenshot).toHaveBeenCalledWith(PROJECT_ID, expect.any(Blob), "image/png");
  });

  it("CORS-header staat op alle responses na de Origin-check", async () => {
    const req = buildRequest([
      ["project_id", PROJECT_ID],
      ["file", pngBlob(1024)],
    ]);
    const res = await POST(req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    expect(res.headers.get("Vary")).toBe("Origin");
  });

  it("500 bij upload-fout (WG-REQ-111 — fail-mode logt + status-page)", async () => {
    vi.mocked(uploadWidgetScreenshot).mockRejectedValue(
      new Error("screenshot_upload_failed: storage exploded"),
    );
    const req = buildRequest([
      ["project_id", PROJECT_ID],
      ["file", pngBlob(1024)],
    ]);
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("upload_failed");
    expect(body.status_page).toContain("status.jouw-ai-partner.nl");
  });
});

describe("OPTIONS /api/ingest/widget/screenshot", () => {
  it("204 met CORS-preflight headers (WG-REQ-109)", async () => {
    const req = new Request("http://localhost/api/ingest/widget/screenshot", {
      method: "OPTIONS",
      headers: { origin: ORIGIN },
    });
    const res = await OPTIONS(req);
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain("Content-Type");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });
});
