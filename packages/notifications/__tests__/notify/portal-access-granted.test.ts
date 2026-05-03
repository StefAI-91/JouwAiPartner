import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetProjectName = vi.fn();
const mockSendMail = vi.fn();

vi.mock("@repo/database/queries/projects", () => ({
  getProjectName: (...args: unknown[]) => mockGetProjectName(...args),
}));

vi.mock("../../src/send", () => ({
  sendMail: (...args: unknown[]) => mockSendMail(...args),
}));

import { notifyPortalAccessGranted } from "../../src/notify/portal-access-granted";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  mockSendMail.mockResolvedValue({ ok: true });
  process.env.NEXT_PUBLIC_PORTAL_URL = "https://portal.jouwai.nl";
});

describe("notifyPortalAccessGranted", () => {
  it("stuurt mail met deeplink naar projectpagina + projectnaam in subject", async () => {
    mockGetProjectName.mockResolvedValueOnce("Acme migratie");

    await notifyPortalAccessGranted({ to: "klant@acme.nl", projectId: PROJECT_ID });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const call = mockSendMail.mock.calls[0]![0];
    expect(call.to).toBe("klant@acme.nl");
    expect(call.tag).toBe("portal-access-granted");
    expect(call.subject).toContain("Acme migratie");
    expect(call.html).toContain(`https://portal.jouwai.nl/projects/${PROJECT_ID}`);
    expect(call.text).toContain(`https://portal.jouwai.nl/projects/${PROJECT_ID}`);
  });

  it("valt terug op generieke naam als projectnaam onbekend is", async () => {
    mockGetProjectName.mockResolvedValueOnce(null);

    await notifyPortalAccessGranted({ to: "klant@acme.nl", projectId: PROJECT_ID });

    const call = mockSendMail.mock.calls[0]![0];
    expect(call.subject).toContain("een nieuw project");
  });

  it("skipt als NEXT_PUBLIC_PORTAL_URL ontbreekt (geen dode CTA)", async () => {
    delete process.env.NEXT_PUBLIC_PORTAL_URL;
    vi.spyOn(console, "error").mockImplementation(() => {});

    await notifyPortalAccessGranted({ to: "klant@acme.nl", projectId: PROJECT_ID });

    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("skipt als email leeg is (caller-bug; loggen, niet sturen)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    await notifyPortalAccessGranted({ to: "", projectId: PROJECT_ID });

    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("vangt errors uit getProjectName (best-effort, faalt nooit caller)", async () => {
    mockGetProjectName.mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      notifyPortalAccessGranted({ to: "klant@acme.nl", projectId: PROJECT_ID }),
    ).resolves.toBeUndefined();
    expect(mockSendMail).not.toHaveBeenCalled();
  });
});
