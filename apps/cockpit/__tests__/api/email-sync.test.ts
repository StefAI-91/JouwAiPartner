import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@repo/database/queries/emails", () => ({
  listActiveGoogleAccounts: vi.fn(),
  getExistingGmailIds: vi.fn(),
  getUnprocessedEmails: vi.fn(),
}));

vi.mock("@repo/database/mutations/emails", () => ({
  insertEmails: vi.fn(),
  updateGoogleAccountTokens: vi.fn(),
  updateGoogleAccountLastSync: vi.fn(),
}));

vi.mock("@repo/ai/gmail", () => ({
  fetchEmails: vi.fn(),
}));

vi.mock("@repo/ai/pipeline/email-pipeline", () => ({
  processEmailBatch: vi.fn(),
}));

import { createClient } from "@repo/database/supabase/server";
import {
  listActiveGoogleAccounts,
  getExistingGmailIds,
  getUnprocessedEmails,
} from "@repo/database/queries/emails";
import {
  insertEmails,
  updateGoogleAccountTokens,
  updateGoogleAccountLastSync,
} from "@repo/database/mutations/emails";
import { fetchEmails } from "@repo/ai/gmail";
import { processEmailBatch } from "@repo/ai/pipeline/email-pipeline";
import { POST } from "../../src/app/api/email/sync/route";

describe("POST /api/email/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockAuth(authenticated: boolean) {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: authenticated ? { id: "user-1" } : null },
        }),
      },
    } as never);
  }

  it("returns 401 when user is not authenticated", async () => {
    mockAuth(false);

    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns 400 when no active Google accounts", async () => {
    mockAuth(true);
    vi.mocked(listActiveGoogleAccounts).mockResolvedValue([]);

    const res = await POST();
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("No connected Google accounts");
  });

  it("fetches emails per account and filters existing gmail_ids", async () => {
    mockAuth(true);
    vi.mocked(listActiveGoogleAccounts).mockResolvedValue([
      {
        id: "acc-1",
        email: "stef@jouwai.nl",
        access_token: "token",
        refresh_token: "refresh",
        token_expiry: new Date().toISOString(),
        last_sync_at: null,
      },
    ] as never);
    vi.mocked(fetchEmails).mockResolvedValue({
      messages: [
        {
          gmail_id: "g1",
          thread_id: "t1",
          subject: "Hello",
          from_address: "a@b.com",
          from_name: "A",
          to_addresses: [],
          cc_addresses: [],
          date: "2026-01-15",
          body_text: "Body",
          body_html: null,
          snippet: "Hello",
          labels: [],
          has_attachments: false,
          raw_gmail: {},
        },
        {
          gmail_id: "g2",
          thread_id: "t2",
          subject: "World",
          from_address: "c@d.com",
          from_name: "C",
          to_addresses: [],
          cc_addresses: [],
          date: "2026-01-15",
          body_text: "Body2",
          body_html: null,
          snippet: "World",
          labels: [],
          has_attachments: false,
          raw_gmail: {},
        },
      ],
      newTokens: null,
    } as never);
    vi.mocked(getExistingGmailIds).mockResolvedValue(new Set(["g1"]));
    vi.mocked(insertEmails).mockResolvedValue({ count: 1 });
    vi.mocked(updateGoogleAccountLastSync).mockResolvedValue(undefined as never);
    vi.mocked(getUnprocessedEmails).mockResolvedValue([]);

    const res = await POST();
    const data = await res.json();

    expect(data.fetched).toBe(1); // g2 was new, g1 was existing
    expect(insertEmails).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ gmail_id: "g2" })]),
    );
  });

  it("inserts new emails and updates account tokens", async () => {
    mockAuth(true);
    vi.mocked(listActiveGoogleAccounts).mockResolvedValue([
      {
        id: "acc-1",
        email: "stef@jouwai.nl",
        access_token: "old-token",
        refresh_token: "refresh",
        token_expiry: new Date().toISOString(),
        last_sync_at: "2026-01-10T00:00:00Z",
      },
    ] as never);
    vi.mocked(fetchEmails).mockResolvedValue({
      messages: [
        {
          gmail_id: "g3",
          thread_id: "t3",
          subject: "New",
          from_address: "x@y.com",
          from_name: "X",
          to_addresses: [],
          cc_addresses: [],
          date: "2026-01-15",
          body_text: "Body",
          body_html: null,
          snippet: "New",
          labels: [],
          has_attachments: false,
          raw_gmail: {},
        },
      ],
      newTokens: { access_token: "new-token", expiry_date: Date.now() + 3600000 },
    } as never);
    vi.mocked(getExistingGmailIds).mockResolvedValue(new Set());
    vi.mocked(insertEmails).mockResolvedValue({ count: 1 });
    vi.mocked(updateGoogleAccountTokens).mockResolvedValue(undefined as never);
    vi.mocked(updateGoogleAccountLastSync).mockResolvedValue(undefined as never);
    vi.mocked(getUnprocessedEmails).mockResolvedValue([]);

    const res = await POST();
    const data = await res.json();

    expect(updateGoogleAccountTokens).toHaveBeenCalledWith(
      "acc-1",
      expect.objectContaining({
        access_token: "new-token",
      }),
    );
    expect(updateGoogleAccountLastSync).toHaveBeenCalledWith("acc-1");
    expect(data.fetched).toBe(1);
  });

  it("processes unprocessed emails via processEmailBatch", async () => {
    mockAuth(true);
    vi.mocked(listActiveGoogleAccounts).mockResolvedValue([
      {
        id: "acc-1",
        email: "stef@jouwai.nl",
        access_token: "token",
        refresh_token: "refresh",
        token_expiry: new Date().toISOString(),
        last_sync_at: "2026-01-10T00:00:00Z",
      },
    ] as never);
    vi.mocked(fetchEmails).mockResolvedValue({ messages: [], newTokens: null } as never);
    vi.mocked(updateGoogleAccountLastSync).mockResolvedValue(undefined as never);
    vi.mocked(getUnprocessedEmails).mockResolvedValue([
      {
        id: "e1",
        subject: "Email 1",
        from_address: "a@b.com",
        from_name: "A",
        to_addresses: [],
        date: "2026-01-15",
        body_text: "Body",
        snippet: "Snippet",
      },
    ] as never);
    vi.mocked(processEmailBatch).mockResolvedValue([
      { emailId: "e1", classifier: { category: "client" }, errors: [] },
    ] as never);

    const res = await POST();
    const data = await res.json();

    expect(processEmailBatch).toHaveBeenCalledTimes(1);
    expect(data.processed).toBe(1);
  });

  it("updates last_sync timestamp per account", async () => {
    mockAuth(true);
    vi.mocked(listActiveGoogleAccounts).mockResolvedValue([
      {
        id: "acc-1",
        email: "test@test.com",
        access_token: "t",
        refresh_token: "r",
        token_expiry: new Date().toISOString(),
        last_sync_at: null,
      },
    ] as never);
    vi.mocked(fetchEmails).mockResolvedValue({ messages: [], newTokens: null } as never);
    vi.mocked(updateGoogleAccountLastSync).mockResolvedValue(undefined as never);
    vi.mocked(getUnprocessedEmails).mockResolvedValue([]);

    await POST();

    expect(updateGoogleAccountLastSync).toHaveBeenCalledWith("acc-1");
  });
});
