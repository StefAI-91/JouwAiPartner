import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SprintBanner } from "@/components/briefing/sprint-banner";
import type { SprintRow } from "@repo/database/queries/sprints";

function makeSprint(overrides: Partial<SprintRow> = {}): SprintRow {
  // Spread defaults dan overrides — zo kunnen tests bewust `summary: null`
  // doorgeven om de empty-state-branch te raken (`??` zou dat negeren).
  return {
    id: "11111111-1111-4111-8111-111111111111",
    project_id: "22222222-2222-4222-8222-222222222222",
    name: "Sprint 5",
    delivery_week: "2026-05-04",
    summary: "Login + onboarding flow",
    client_test_instructions: null,
    status: "in_progress",
    order_index: 4,
    created_at: "2026-04-25T10:00:00Z",
    updated_at: "2026-04-28T12:00:00Z",
    ...overrides,
  };
}

describe("SprintBanner", () => {
  it("toont sprint-naam in kop", () => {
    render(<SprintBanner sprint={makeSprint({ name: "Sprint 7" })} />);
    expect(screen.getByText(/Huidige sprint:\s*Sprint 7/)).toBeInTheDocument();
  });

  it("toont opleverweek-bereik (maandag t/m zondag)", () => {
    render(<SprintBanner sprint={makeSprint({ delivery_week: "2026-05-04" })} />);
    // 4 mei 2026 is maandag; verwacht "4 mei – 10 mei"
    expect(screen.getByText(/4 mei.*10 mei/)).toBeInTheDocument();
  });

  it("toont summary wanneer aanwezig", () => {
    render(<SprintBanner sprint={makeSprint({ summary: "Hier kan je login testen" })} />);
    expect(screen.getByText("Hier kan je login testen")).toBeInTheDocument();
  });

  it("toont fallback-tekst wanneer summary leeg is", () => {
    render(<SprintBanner sprint={makeSprint({ summary: null })} />);
    expect(screen.getByText(/werkt aan deze sprint/i)).toBeInTheDocument();
  });
});
