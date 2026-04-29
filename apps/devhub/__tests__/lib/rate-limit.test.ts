import { describe, it, expect, vi, beforeEach } from "vitest";

// WG-005 (WG-REQ-092/096) — bewaakt het gedrag dat de ingest-route op
// vertrouwt: success-flag flipt op de juiste grens, en bij DB-uitval kantelt
// de util naar fail-open. Mock op de Supabase-grens (admin-client.rpc), niet
// op de interne mutation-helper — zo testen we de hele chain incl. de RPC-
// arg-naam ('p_key') waar productie ook op staat.

const mockRpc = vi.fn();
vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: () => ({ rpc: mockRpc }),
}));

import { rateLimitOrigin } from "../../src/lib/rate-limit";
import { WIDGET_RATE_LIMIT_PREFIXES } from "@repo/database/constants/widget";

beforeEach(() => {
  mockRpc.mockReset();
});

describe("rateLimitOrigin", () => {
  it("staat één request onder de limiet toe", async () => {
    mockRpc.mockResolvedValueOnce({ data: 1, error: null });
    const result = await rateLimitOrigin("klant.nl", WIDGET_RATE_LIMIT_PREFIXES.widget_ingest);
    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
  });

  it("staat exact de 30e request toe (limiet inclusief)", async () => {
    mockRpc.mockResolvedValueOnce({ data: 30, error: null });
    const result = await rateLimitOrigin("klant.nl", WIDGET_RATE_LIMIT_PREFIXES.widget_ingest);
    expect(result.success).toBe(true);
    expect(result.count).toBe(30);
  });

  it("blokkeert de 31e request (boven limiet)", async () => {
    mockRpc.mockResolvedValueOnce({ data: 31, error: null });
    const result = await rateLimitOrigin("klant.nl", WIDGET_RATE_LIMIT_PREFIXES.widget_ingest);
    expect(result.success).toBe(false);
    expect(result.count).toBe(31);
  });

  it("kantelt naar fail-open bij DB-fout (WG-REQ-096)", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const result = await rateLimitOrigin("klant.nl", WIDGET_RATE_LIMIT_PREFIXES.widget_ingest);
    expect(result.success).toBe(true);
    expect(result.count).toBe(-1);
  });

  it("scheidt counters per prefix (widget_ingest vs userback_ingest)", async () => {
    mockRpc.mockResolvedValue({ data: 1, error: null });

    await rateLimitOrigin("klant.nl", WIDGET_RATE_LIMIT_PREFIXES.widget_ingest);
    await rateLimitOrigin("klant.nl", WIDGET_RATE_LIMIT_PREFIXES.userback_ingest);

    const calls = mockRpc.mock.calls.map(([fn, args]) => ({ fn, args }));
    expect(calls).toEqual([
      { fn: "increment_rate_limit", args: { p_key: "widget_ingest:klant.nl" } },
      { fn: "increment_rate_limit", args: { p_key: "userback_ingest:klant.nl" } },
    ]);
  });
});
