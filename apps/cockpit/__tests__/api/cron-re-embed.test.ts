import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/ai/pipeline/re-embed-worker", () => ({
  runReEmbedWorker: vi.fn(),
}));

import { runReEmbedWorker } from "@repo/ai/pipeline/re-embed-worker";
import { POST } from "../../src/app/api/cron/re-embed/route";

const CRON_SECRET = "test-cron-secret";

describe("POST /api/cron/re-embed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
  });

  it("returns 401 without valid auth", async () => {
    const req = new Request("http://localhost/api/cron/re-embed", {
      method: "POST",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong secret", async () => {
    const req = new Request("http://localhost/api/cron/re-embed", {
      method: "POST",
      headers: { authorization: "Bearer wrong-secret" },
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("calls runReEmbedWorker and returns totals per table", async () => {
    vi.mocked(runReEmbedWorker).mockResolvedValue({
      total: 15,
      byTable: { meetings: 5, extractions: 8, emails: 2 },
    } as never);

    const req = new Request("http://localhost/api/cron/re-embed", {
      method: "POST",
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = await POST(req as never);
    const data = await res.json();

    expect(runReEmbedWorker).toHaveBeenCalledTimes(1);
    expect(data.success).toBe(true);
    expect(data.processed).toBe(15);
    expect(data.byTable.meetings).toBe(5);
    expect(data.byTable.extractions).toBe(8);
  });

  it("returns zero processed when nothing is stale", async () => {
    vi.mocked(runReEmbedWorker).mockResolvedValue({
      total: 0,
      byTable: {},
    } as never);

    const req = new Request("http://localhost/api/cron/re-embed", {
      method: "POST",
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = await POST(req as never);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.processed).toBe(0);
  });
});
