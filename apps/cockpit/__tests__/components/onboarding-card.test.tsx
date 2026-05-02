// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

// CC-005 — cockpit onboarding-card spiegelt portal maar gebruikt key
// `cockpit_inbox`. Test bewaakt dat dismissal naar de juiste key gaat zodat
// portal- en cockpit-state niet vermengd raken.

const dismissMock = vi.hoisted(() => vi.fn(async () => ({ success: true as const })));

vi.mock("@/features/inbox/actions/preferences", () => ({
  dismissOnboardingAction: dismissMock,
}));

import { OnboardingCard } from "@/features/inbox/components/onboarding-card";

beforeEach(() => {
  dismissMock.mockClear();
  dismissMock.mockResolvedValue({ success: true });
});

afterEach(() => cleanup());

describe("OnboardingCard (cockpit)", () => {
  it("rendert titel en drie bullets", () => {
    render(<OnboardingCard />);
    expect(screen.getByText("Welkom in de cockpit-inbox")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("dismissal stuurt key='cockpit_inbox' (niet portal_inbox)", async () => {
    render(<OnboardingCard />);
    fireEvent.click(screen.getByLabelText("Sluit uitleg"));

    expect(screen.queryByText("Welkom in de cockpit-inbox")).not.toBeInTheDocument();
    await waitFor(() => expect(dismissMock).toHaveBeenCalledTimes(1));
    expect(dismissMock).toHaveBeenCalledWith({ key: "cockpit_inbox" });
  });
});
