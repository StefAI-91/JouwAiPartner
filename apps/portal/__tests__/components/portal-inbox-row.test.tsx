// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

/**
 * PortalInboxRow — status-first hiërarchie.
 *
 * Behavior we asserten:
 *   - href wijst naar `/projects/<id>/inbox/<messageId>`,
 *   - status-pil "Wacht op team" voor open thread van klant zelf,
 *   - status-pil "Beantwoord" voor responded thread,
 *   - bij beantwoorde thread: jouw vraag staat klein als context, het laatste
 *     team-antwoord staat prominent,
 *   - bij wachtende thread: jouw vraag staat prominent zonder reply-quote,
 *   - active-state krijgt bg-primary/5 highlight,
 *   - reply-count wordt getoond zodra er minstens één reactie is.
 */

import { PortalInboxRow } from "@/components/inbox/portal-inbox-row";

const PROJECT_ID = "00000000-0000-4099-8000-000000000001";
const QUESTION_ID = "00000000-0000-4099-8000-000000000010";
const PROFILE_ID = "00000000-0000-4099-8000-0000000000bb";
const TEAM_PROFILE = "00000000-0000-4099-8000-0000000000cc";

function makeQuestion(overrides: Partial<Parameters<typeof PortalInboxRow>[0]["question"]> = {}) {
  return {
    id: QUESTION_ID,
    body: "Wat is de status van dit project?",
    due_date: null,
    status: "open" as const,
    created_at: new Date().toISOString(),
    responded_at: null,
    sender_profile_id: PROFILE_ID,
    topic_id: null,
    issue_id: null,
    replies: [],
    ...overrides,
  };
}

afterEach(() => cleanup());

describe("PortalInboxRow", () => {
  it("rendert link naar /projects/<id>/inbox/<messageId>", () => {
    render(
      <PortalInboxRow
        projectId={PROJECT_ID}
        question={makeQuestion()}
        currentProfileId={PROFILE_ID}
        isActive={false}
      />,
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe(`/projects/${PROJECT_ID}/inbox/${QUESTION_ID}`);
  });

  it("toont 'Wacht op team' wanneer thread open is en root door de klant is verstuurd", () => {
    render(
      <PortalInboxRow
        projectId={PROJECT_ID}
        question={makeQuestion({ status: "open", sender_profile_id: PROFILE_ID })}
        currentProfileId={PROFILE_ID}
        isActive={false}
      />,
    );
    expect(screen.getByText(/Wacht op team/i)).toBeInTheDocument();
  });

  it("toont 'Nieuw van team' met primary-rand wanneer thread open is en root door team is verstuurd (cockpit→portal)", () => {
    // Regressie-guard: vóór deze fix viel een door team gestart open bericht
    // door de net-tussen "Wacht op team" (eis: sender = klant) en "Beantwoord"
    // (eis: status = responded) en kreeg een muted "Open"-pill zonder
    // accent-rand. De klant zag het bericht in "Alles" wel staan, maar
    // visueel zonder cue dat er iets nieuws was — gevolg: "het bericht komt
    // niet aan".
    const { container } = render(
      <PortalInboxRow
        projectId={PROJECT_ID}
        question={makeQuestion({ status: "open", sender_profile_id: TEAM_PROFILE })}
        currentProfileId={PROFILE_ID}
        isActive={false}
      />,
    );
    expect(screen.getByText(/Nieuw van team/i)).toBeInTheDocument();
    const link = container.querySelector("a");
    expect(link?.className).toContain("border-primary/70");
    expect(link?.className).toContain("bg-primary/5");
  });

  it("toont 'Beantwoord' wanneer status='responded'", () => {
    render(
      <PortalInboxRow
        projectId={PROJECT_ID}
        question={makeQuestion({
          status: "responded",
          responded_at: new Date().toISOString(),
        })}
        currentProfileId={PROFILE_ID}
        isActive={false}
      />,
    );
    expect(screen.getByText(/^Beantwoord$/)).toBeInTheDocument();
  });

  it("active-state krijgt bg-primary/5 highlight", () => {
    const { container } = render(
      <PortalInboxRow
        projectId={PROJECT_ID}
        question={makeQuestion()}
        currentProfileId={PROFILE_ID}
        isActive
      />,
    );
    const link = container.querySelector("a");
    expect(link?.className).toContain("bg-primary/5");
  });

  it("toont vraag prominent (zonder reply-quote) bij wachtende thread", () => {
    render(
      <PortalInboxRow
        projectId={PROJECT_ID}
        question={makeQuestion({ body: "Een specifieke vraag over feature X." })}
        currentProfileId={PROFILE_ID}
        isActive={false}
      />,
    );
    expect(screen.getByText("Een specifieke vraag over feature X.")).toBeInTheDocument();
    // Geen "Jij vroeg" context-prefix bij wachtende threads — dat is alleen
    // bij beantwoorde threads relevant.
    expect(screen.queryByText(/Jij vroeg/i)).not.toBeInTheDocument();
  });

  it("toont team-antwoord prominent + jouw vraag als 'Jij vroeg' context bij beantwoorde thread", () => {
    render(
      <PortalInboxRow
        projectId={PROJECT_ID}
        question={makeQuestion({
          body: "Hoi Stef, wat is de status?",
          status: "responded",
          responded_at: new Date().toISOString(),
          replies: [
            {
              id: "r-1",
              body: "Komt morgen — demo om 14:00.",
              sender_profile_id: TEAM_PROFILE,
              created_at: new Date().toISOString(),
            },
          ],
        })}
        currentProfileId={PROFILE_ID}
        isActive={false}
      />,
    );
    // Jouw oorspronkelijke vraag verschijnt als context-regel met label.
    expect(screen.getByText(/Jij vroeg/i)).toBeInTheDocument();
    expect(screen.getByText(/Hoi Stef, wat is de status\?/)).toBeInTheDocument();
    // Het team-antwoord staat als quote in de body.
    expect(screen.getByText(/Komt morgen — demo om 14:00\./)).toBeInTheDocument();
  });

  it("toont reply-count wanneer er reacties zijn", () => {
    render(
      <PortalInboxRow
        projectId={PROJECT_ID}
        question={makeQuestion({
          status: "responded",
          responded_at: new Date().toISOString(),
          replies: [
            {
              id: "r-1",
              body: "Ja",
              sender_profile_id: TEAM_PROFILE,
              created_at: new Date().toISOString(),
            },
            {
              id: "r-2",
              body: "Nog iets",
              sender_profile_id: PROFILE_ID,
              created_at: new Date().toISOString(),
            },
          ],
        })}
        currentProfileId={PROFILE_ID}
        isActive={false}
      />,
    );
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/reactie/)).toBeInTheDocument();
  });
});
