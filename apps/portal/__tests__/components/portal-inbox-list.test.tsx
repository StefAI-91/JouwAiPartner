// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

/**
 * PortalInboxList — counter + filter + visibility regressie-guards.
 *
 * Kernscenario (FIX cockpit→portal-zichtbaarheid): een door het team
 * gestart open thread MOET zichtbaar zijn in:
 *   - tab "Alles" — als rij in de lijst
 *   - tab "Open" — counter telt mee én de rij komt door het filter
 *
 * Vóór deze fix telden tab "Wacht op team" en bijbehorend filter alleen
 * threads waarvan de klant zelf de root stuurde, waardoor cockpit→portal-
 * berichten visueel uit beide kanalen verdwenen.
 */

import { PortalInboxList } from "@/components/inbox/portal-inbox-list";
import type { ClientQuestionListRow } from "@repo/database/queries/client-questions";

const PROJECT_ID = "00000000-0000-4099-8000-000000000001";
const CLIENT_PROFILE = "00000000-0000-4099-8000-0000000000bb";
const TEAM_PROFILE = "00000000-0000-4099-8000-0000000000cc";

function makeQuestion(overrides: Partial<ClientQuestionListRow>): ClientQuestionListRow {
  return {
    id: overrides.id ?? "00000000-0000-4099-8000-000000000010",
    body: "Een vraag",
    due_date: null,
    status: "open",
    created_at: new Date().toISOString(),
    responded_at: null,
    sender_profile_id: CLIENT_PROFILE,
    topic_id: null,
    issue_id: null,
    replies: [],
    ...overrides,
  };
}

function getCount(label: RegExp): number {
  // Filter-tab-DOM is `<a><span>{label}</span><span>{count}</span></a>` — pak
  // de tekstinhoud van de count-span via de gedeelde anchor.
  const anchor = screen.getAllByRole("link").find((a) => label.test(a.textContent ?? ""));
  if (!anchor) throw new Error(`tab not found: ${label}`);
  const countEl = anchor.querySelectorAll("span")[1];
  return Number(countEl?.textContent ?? "");
}

afterEach(() => cleanup());

describe("PortalInboxList — team-initiated open visibility", () => {
  it("teamlid stuurt root → tab 'Open' telt mee én rij komt door filter", () => {
    const teamRoot = makeQuestion({
      id: "00000000-0000-4099-8000-000000000020",
      sender_profile_id: TEAM_PROFILE,
      body: "Hallo, kun je deze documenten doornemen?",
      status: "open",
    });

    render(
      <PortalInboxList
        projectId={PROJECT_ID}
        questions={[teamRoot]}
        selectedId={undefined}
        currentProfileId={CLIENT_PROFILE}
        filter="open"
      />,
    );

    expect(getCount(/Alles/)).toBe(1);
    expect(getCount(/Open/)).toBe(1);
    // Filter "open" toont de team-initiated rij — vóór de fix viel die er uit.
    expect(screen.getByText(/Nieuw van team/i)).toBeInTheDocument();
    expect(screen.getByText(/Hallo, kun je deze documenten doornemen/)).toBeInTheDocument();
  });

  it("klant-initiated open + team-initiated open: beide tellen mee in tab 'Open'", () => {
    const ownRoot = makeQuestion({
      id: "00000000-0000-4099-8000-000000000021",
      sender_profile_id: CLIENT_PROFILE,
      body: "Vraag van mij",
    });
    const teamRoot = makeQuestion({
      id: "00000000-0000-4099-8000-000000000022",
      sender_profile_id: TEAM_PROFILE,
      body: "Vraag van team",
    });

    render(
      <PortalInboxList
        projectId={PROJECT_ID}
        questions={[ownRoot, teamRoot]}
        selectedId={undefined}
        currentProfileId={CLIENT_PROFILE}
        filter="all"
      />,
    );

    expect(getCount(/Alles/)).toBe(2);
    expect(getCount(/Open/)).toBe(2);
    expect(getCount(/Beantwoord/)).toBe(0);
  });

  it("filter='all' (default URL `/inbox`) toont elke thread, ook team-initiated open", () => {
    const teamRoot = makeQuestion({
      sender_profile_id: TEAM_PROFILE,
      body: "Bericht uit cockpit",
    });

    render(
      <PortalInboxList
        projectId={PROJECT_ID}
        questions={[teamRoot]}
        selectedId={undefined}
        currentProfileId={CLIENT_PROFILE}
        filter="all"
      />,
    );

    expect(screen.getByText(/Bericht uit cockpit/)).toBeInTheDocument();
  });

  it("responded thread valt in tab 'Beantwoord', niet in 'Open'", () => {
    const responded = makeQuestion({
      sender_profile_id: TEAM_PROFILE,
      status: "responded",
      responded_at: new Date().toISOString(),
      body: "Afgerond gesprek",
    });

    render(
      <PortalInboxList
        projectId={PROJECT_ID}
        questions={[responded]}
        selectedId={undefined}
        currentProfileId={CLIENT_PROFILE}
        filter="all"
      />,
    );

    expect(getCount(/Beantwoord/)).toBe(1);
    expect(getCount(/Open/)).toBe(0);
  });
});
