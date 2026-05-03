// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

/**
 * PR-026 — PortalInboxLayout rendert per `selectedId`-state de juiste pane:
 *
 *   - undefined        → empty-pane (right) + lijst-pane (left)
 *   - "new"            → compose-pane (right) + lijst-pane (left)
 *   - <uuid> + thread  → thread-pane (right) + lijst-pane (left)
 *
 * Mobile-fallback test gebeurt via Tailwind responsive-classes — we asserten
 * dat de juiste `hidden md:flex`-classes aanwezig zijn op de aside / main.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/actions/inbox", () => ({
  sendMessageAsClientAction: vi.fn(),
  replyAsClientAction: vi.fn(),
}));

import { PortalInboxLayout } from "@/components/inbox/portal-inbox-layout";
import type { ConversationThread } from "@repo/database/queries/inbox";

const PROJECT_ID = "00000000-0000-4099-8000-000000000001";
const PROFILE_ID = "00000000-0000-4099-8000-0000000000bb";

const baseProps = {
  projectId: PROJECT_ID,
  projectName: "Test project",
  organizationName: "Test bv",
  questions: [],
  currentProfileId: PROFILE_ID,
  showOnboarding: false,
  filter: "all" as const,
};

function makeThread(): Extract<ConversationThread, { kind: "question" }> {
  return {
    kind: "question",
    thread: {
      id: "q-1",
      project_id: PROJECT_ID,
      organization_id: "o-1",
      sender_profile_id: "team-1",
      body: "Hoi, wat is de status?",
      status: "open",
      created_at: new Date().toISOString(),
      last_activity_at: null,
      replies: [],
    },
    messages: [
      {
        id: "q-1",
        body: "Hoi, wat is de status?",
        sender_profile_id: "team-1",
        created_at: new Date().toISOString(),
        sender: { id: "team-1", full_name: "Stef" },
      },
    ],
  };
}

afterEach(() => cleanup());

describe("PortalInboxLayout", () => {
  it("rendert empty-pane wanneer geen selectie en geen thread", () => {
    const { container } = render(
      <PortalInboxLayout {...baseProps} selectedId={undefined} thread={null} />,
    );
    // Empty-pane heeft een eigen "Nieuw bericht aan team"-CTA-knop in de
    // rechter-pane. We asserten op de aanwezigheid van die CTA in <main>.
    const main = container.querySelector("main");
    expect(main?.textContent).toMatch(/Selecteer een bericht|Nog geen berichten/);
  });

  it("rendert compose-pane voor selectedId='new'", () => {
    render(<PortalInboxLayout {...baseProps} selectedId="new" thread={null} />);
    // Compose-pane heeft de textarea + de uitleg-tekst die niet in andere panes voorkomt.
    expect(screen.getByPlaceholderText(/Schrijf je bericht/i)).toBeInTheDocument();
    expect(screen.getByText(/Stel een vraag of stuur een update/i)).toBeInTheDocument();
  });

  it("rendert thread-pane wanneer thread aanwezig is", () => {
    render(<PortalInboxLayout {...baseProps} selectedId="q-1" thread={makeThread()} />);
    // Thread-header toont de body als titel.
    expect(screen.getByRole("heading", { name: /Hoi, wat is de status/i })).toBeInTheDocument();
  });

  it("lijst-pane toont organization-naam · project-naam in header", () => {
    render(<PortalInboxLayout {...baseProps} selectedId={undefined} thread={null} />);
    expect(screen.getByText(/Test bv · Test project/i)).toBeInTheDocument();
  });

  it("toont onboarding-card in de empty-pane (rechts) als showOnboarding=true", () => {
    const { container } = render(
      <PortalInboxLayout {...baseProps} selectedId={undefined} thread={null} showOnboarding />,
    );
    // OnboardingCard hoort in de detail-pane (right), niet in de aside (left) —
    // eerste-bezoek krijgt een rijke welkom-surface op desktop. Mobile verbergt
    // de hele detail-pane, dus geen welkom op mobile (acceptabel: lijst is compact).
    const main = container.querySelector("main");
    expect(main?.textContent).toMatch(/Welkom in je inbox/);
    const aside = container.querySelector("aside");
    expect(aside?.textContent ?? "").not.toMatch(/Welkom in je inbox/);
  });

  it("CSS-only mobile fallback: lijst-pane krijgt 'hidden md:flex' wanneer er een selectie is", () => {
    const { container } = render(
      <PortalInboxLayout {...baseProps} selectedId="q-1" thread={makeThread()} />,
    );
    const aside = container.querySelector("aside");
    expect(aside?.className).toContain("hidden");
    expect(aside?.className).toContain("md:flex");
  });

  it("CSS-only mobile fallback: detail-pane krijgt 'hidden md:flex' wanneer GEEN selectie is", () => {
    const { container } = render(
      <PortalInboxLayout {...baseProps} selectedId={undefined} thread={null} />,
    );
    const main = container.querySelector("main");
    expect(main?.className).toContain("hidden");
    expect(main?.className).toContain("md:flex");
  });
});
