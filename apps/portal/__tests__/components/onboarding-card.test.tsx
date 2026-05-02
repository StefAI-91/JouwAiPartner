// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

// CC-005 — onboarding-card render + dismissal-flow. Mocks de action-grens
// zodat we asserteren dat de juiste key naar de server gaat — geen interne
// implementatie-details.

const dismissMock = vi.hoisted(() => vi.fn(async () => ({ success: true as const })));

vi.mock("@/actions/preferences", () => ({
  dismissOnboardingAction: dismissMock,
}));

import { OnboardingCard } from "@/components/inbox/onboarding-card";

beforeEach(() => {
  dismissMock.mockClear();
  dismissMock.mockResolvedValue({ success: true });
});

afterEach(() => cleanup());

describe("OnboardingCard (portal)", () => {
  it("rendert titel en drie bullets", () => {
    render(<OnboardingCard />);
    expect(screen.getByText("Welkom in je inbox")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("verbergt de card en stuurt key='portal_inbox' naar de action bij klik op X", async () => {
    render(<OnboardingCard />);
    fireEvent.click(screen.getByLabelText("Sluit uitleg"));

    expect(screen.queryByText("Welkom in je inbox")).not.toBeInTheDocument();
    await waitFor(() => expect(dismissMock).toHaveBeenCalledTimes(1));
    expect(dismissMock).toHaveBeenCalledWith({ key: "portal_inbox" });
  });

  it("verbergt de card en triggert action bij klik op 'Begrepen, dank'", async () => {
    render(<OnboardingCard />);
    fireEvent.click(screen.getByRole("button", { name: "Begrepen, dank" }));

    expect(screen.queryByText("Welkom in je inbox")).not.toBeInTheDocument();
    await waitFor(() => expect(dismissMock).toHaveBeenCalledWith({ key: "portal_inbox" }));
  });
});
