import { describe, it, expect, vi, beforeEach } from "vitest";

const mockListAssignees = vi.fn();
const mockSendMail = vi.fn();

vi.mock("@repo/database/queries/portal", () => ({
  listPortalProjectAssignees: (...args: unknown[]) => mockListAssignees(...args),
}));

vi.mock("../../src/send", () => ({
  sendMail: (...args: unknown[]) => mockSendMail(...args),
}));

import { notifyTeamReply } from "../../src/notify/question-reply";

const parent = {
  id: "q-1",
  project_id: "proj-1",
  body: "Wat is de planning?",
};

beforeEach(() => {
  mockListAssignees.mockReset();
  mockSendMail.mockReset();
  mockSendMail.mockResolvedValue({ ok: true });
  process.env.NEXT_PUBLIC_PORTAL_URL = "https://portal.jouwai.nl";
});

describe("notifyTeamReply", () => {
  it("stuurt mail naar elke klant met preview-snippet (eerste 200 chars)", async () => {
    mockListAssignees.mockResolvedValueOnce([
      { profile_id: "p1", email: "k1@x.nl", role: "client" },
      { profile_id: "p2", email: "team@x.nl", role: "member" },
    ]);
    const longReply = "x".repeat(500);

    await notifyTeamReply(parent, longReply);

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const call = mockSendMail.mock.calls[0]![0];
    expect(call.to).toBe("k1@x.nl");
    expect(call.tag).toBe("new-team-reply");
    expect(call.subject).toBe("Je hebt een nieuw antwoord");
    // Preview is 200 chars, niet de volle 500
    expect(call.html).toContain("x".repeat(200));
    expect(call.html).not.toContain("x".repeat(201));
  });

  it("skipt silent als er geen klant-recipients zijn", async () => {
    mockListAssignees.mockResolvedValueOnce([
      { profile_id: "p1", email: "team@x.nl", role: "member" },
    ]);

    await notifyTeamReply(parent, "antwoord");
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("CC-008 — preview is code-point-aware (knipt geen emoji's halverwege)", async () => {
    mockListAssignees.mockResolvedValueOnce([
      { profile_id: "p1", email: "k1@x.nl", role: "client" },
    ]);
    // 199 emoji's (elk 2 UTF-16 code units = 398 units totaal).
    // Met `.slice(0, 200)` zou je halverwege een surrogate pair afkappen.
    const emojiBody = "🎉".repeat(199);

    await notifyTeamReply(parent, emojiBody);

    const call = mockSendMail.mock.calls[0]![0];
    // Niet meer dan 199 hele emoji's. Geen onleesbare half-surrogate.
    expect(call.html.includes("\uD83C")).toBe(true); // de hele 🎉 is aanwezig
    // Het halve surrogate-fragment (alléén "\uD83C" gevolgd door iets niet-laag-surrogate
    // zoals "<" voor sluittag) is een teken dat de slice gehalveerd heeft. Dat moet niet.
    expect(call.html).not.toMatch(/\uD83C(?![\uDC00-\uDFFF])/);
  });

  it("vangt errors uit listPortalProjectAssignees (best-effort)", async () => {
    mockListAssignees.mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(notifyTeamReply(parent, "x")).resolves.toBeUndefined();
    expect(mockSendMail).not.toHaveBeenCalled();
  });
});
