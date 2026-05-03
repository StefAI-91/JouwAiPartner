// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

/**
 * PR-026 — PortalInboxRow rendering + active-state.
 *
 * Behavior we asserten:
 *   - href wijst naar `/projects/<id>/inbox/<messageId>`,
 *   - sender-label = "Jij" voor eigen-root, "Team" voor team-root,
 *   - active-state krijgt bg-primary/5 highlight (visueel onderscheid),
 *   - body-preview wordt getoond.
 */

import { PortalInboxRow } from "@/components/inbox/portal-inbox-row";

const PROJECT_ID = "00000000-0000-4099-8000-000000000001";
const QUESTION_ID = "00000000-0000-4099-8000-000000000010";
const PROFILE_ID = "00000000-0000-4099-8000-0000000000bb";
const OTHER_PROFILE = "00000000-0000-4099-8000-0000000000cc";

function makeQuestion(overrides: Partial<Parameters<typeof PortalInboxRow>[0]["question"]> = {}) {
  return {
    id: QUESTION_ID,
    body: "Wat is de status van dit project?",
    due_date: null,
    status: "open" as const,
    created_at: new Date().toISOString(),
    responded_at: null,
    sender_profile_id: OTHER_PROFILE,
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

  it("toont 'Jij' wanneer de current-profile de root verstuurde", () => {
    render(
      <PortalInboxRow
        projectId={PROJECT_ID}
        question={makeQuestion({ sender_profile_id: PROFILE_ID })}
        currentProfileId={PROFILE_ID}
        isActive={false}
      />,
    );
    expect(screen.getByText("Jij")).toBeInTheDocument();
  });

  it("toont 'Team' wanneer een ander de root verstuurde", () => {
    render(
      <PortalInboxRow
        projectId={PROJECT_ID}
        question={makeQuestion()}
        currentProfileId={PROFILE_ID}
        isActive={false}
      />,
    );
    expect(screen.getByText("Team")).toBeInTheDocument();
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

  it("rendert body-preview", () => {
    render(
      <PortalInboxRow
        projectId={PROJECT_ID}
        question={makeQuestion({ body: "Een specifieke vraag over feature X." })}
        currentProfileId={PROFILE_ID}
        isActive={false}
      />,
    );
    expect(screen.getByText("Een specifieke vraag over feature X.")).toBeInTheDocument();
  });

  it("rendert reply-snippet als laatste reply bestaat", () => {
    render(
      <PortalInboxRow
        projectId={PROJECT_ID}
        question={makeQuestion({
          replies: [
            {
              id: "r-1",
              body: "Antwoord van team — komt morgen.",
              sender_profile_id: OTHER_PROFILE,
              created_at: new Date().toISOString(),
            },
          ],
        })}
        currentProfileId={PROFILE_ID}
        isActive={false}
      />,
    );
    expect(screen.getByText(/Antwoord van team/)).toBeInTheDocument();
  });
});
