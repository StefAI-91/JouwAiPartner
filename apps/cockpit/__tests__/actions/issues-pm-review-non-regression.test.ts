import { describe, it, expect } from "vitest";
import { updateIssueSchema } from "@repo/database/validations/issues";

/**
 * CC-001 → CC-008 — non-regression: PM-review-flags (`decline_reason`,
 * `converted_to_question_id`) mogen NIET via een gewone `updateIssueAction`-
 * call worden gereset. De fix in CC-001 zit erin dat `updateIssueSchema`
 * die kolommen helemaal niet kent — een toekomstige "voeg ze toe aan de
 * schema"-wijziging zou stilletjes klant-zichtbare context verliezen.
 *
 * Deze test pin de schema-shape vast: parse strip álle onbekende velden,
 * inclusief de twee PM-review-flags.
 *
 * (Spec-locatie verwijst naar `apps/cockpit/__tests__/actions/`; in CC-008
 * staat het hier omdat cockpit de schema consumeert via pm-review en
 * inbox; devhub heeft een eigen non-regression-test op de issues-page-
 * filter (`needs_pm_review` mag niet in de open-default-set).)
 */

describe("updateIssueSchema — PM-review-flags non-regression", () => {
  const baseId = "00000000-0000-4099-8000-000000000001";

  it("strip `decline_reason` uit input (niet in schema)", () => {
    const parsed = updateIssueSchema.parse({
      id: baseId,
      title: "Updated",
      decline_reason: "moet weg",
    } as never);
    expect(parsed).not.toHaveProperty("decline_reason");
  });

  it("strip `converted_to_question_id` uit input (niet in schema)", () => {
    const parsed = updateIssueSchema.parse({
      id: baseId,
      title: "Updated",
      converted_to_question_id: "00000000-0000-4099-8000-0000000000aa",
    } as never);
    expect(parsed).not.toHaveProperty("converted_to_question_id");
  });

  it("strip `closed_at` uit input — wordt server-side gezet door PM-review-mutations", () => {
    const parsed = updateIssueSchema.parse({
      id: baseId,
      title: "Updated",
      closed_at: new Date().toISOString(),
    } as never);
    expect(parsed).not.toHaveProperty("closed_at");
  });

  it("accepteert wel reguliere veld-updates (smoke-test)", () => {
    const parsed = updateIssueSchema.parse({
      id: baseId,
      title: "OK",
      status: "in_progress",
    });
    expect(parsed.status).toBe("in_progress");
    expect(parsed.title).toBe("OK");
  });
});
