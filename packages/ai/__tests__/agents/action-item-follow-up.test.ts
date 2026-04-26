import { describe, it, expect } from "vitest";
import { addWorkdays, resolveFollowUpDate } from "../../src/agents/action-item-follow-up";

describe("addWorkdays", () => {
  it("adds workdays skipping weekend", () => {
    // 2026-04-23 is donderdag → +1 = vrijdag, +2 = maandag (skip weekend)
    expect(addWorkdays("2026-04-23", 1)).toBe("2026-04-24");
    expect(addWorkdays("2026-04-23", 2)).toBe("2026-04-27");
  });

  it("subtracts workdays skipping weekend", () => {
    // 2026-04-27 is maandag → −1 = vrijdag (skip weekend)
    expect(addWorkdays("2026-04-27", -1)).toBe("2026-04-24");
  });

  it("returns null voor ongeldige datum", () => {
    expect(addWorkdays("not-a-date", 1)).toBeNull();
    expect(addWorkdays("2026-13-01", 1)).toBeNull();
  });
});

describe("resolveFollowUpDate", () => {
  const meetingDate = "2026-04-20"; // maandag

  it("type A: follow_up = deadline (op de dag zelf checken)", () => {
    const got = resolveFollowUpDate({
      deadline: "2026-04-30",
      aiFollowUp: null,
      typeWerk: "A",
      meetingDate,
    });
    expect(got).toBe("2026-04-30");
  });

  it("type B: follow_up = deadline − 1 werkdag", () => {
    const got = resolveFollowUpDate({
      deadline: "2026-04-30", // donderdag
      aiFollowUp: null,
      typeWerk: "B",
      meetingDate,
    });
    expect(got).toBe("2026-04-29"); // woensdag
  });

  it("type C: follow_up = deadline − 1 werkdag (skip weekend)", () => {
    const got = resolveFollowUpDate({
      deadline: "2026-04-27", // maandag → −1 werkdag = vrijdag
      aiFollowUp: null,
      typeWerk: "C",
      meetingDate,
    });
    expect(got).toBe("2026-04-24");
  });

  it("type D: follow_up = deadline − 1 werkdag", () => {
    const got = resolveFollowUpDate({
      deadline: "2026-04-30",
      aiFollowUp: null,
      typeWerk: "D",
      meetingDate,
    });
    expect(got).toBe("2026-04-29");
  });

  it("same-day deadline (= meetingdatum): bumpt naar deadline + 1 werkdag", () => {
    const got = resolveFollowUpDate({
      deadline: meetingDate,
      aiFollowUp: null,
      typeWerk: "C",
      meetingDate,
    });
    expect(got).toBe("2026-04-21"); // dinsdag, dag erna check
  });

  it("type A same-day deadline: bumpt eveneens naar deadline + 1 werkdag", () => {
    const got = resolveFollowUpDate({
      deadline: meetingDate,
      aiFollowUp: null,
      typeWerk: "A",
      meetingDate,
    });
    expect(got).toBe("2026-04-21");
  });

  it("deadline = meeting + 1 werkdag, type C: −1 zou = meetingdag → bumpt naar deadline + 1", () => {
    // meeting = ma 2026-04-20, deadline = di 2026-04-21 → preferred = ma 04-20 ≤ meeting → bump naar wo 04-22
    const got = resolveFollowUpDate({
      deadline: "2026-04-21",
      aiFollowUp: null,
      typeWerk: "C",
      meetingDate,
    });
    expect(got).toBe("2026-04-22");
  });

  it("deadline = vrijdag voor weekend, type C: −1 werkdag = donderdag", () => {
    const got = resolveFollowUpDate({
      deadline: "2026-04-24", // vrijdag
      aiFollowUp: null,
      typeWerk: "C",
      meetingDate,
    });
    expect(got).toBe("2026-04-23"); // donderdag
  });

  it("geen deadline + AI-followup ná meeting: gebruik AI-waarde", () => {
    const got = resolveFollowUpDate({
      deadline: null,
      aiFollowUp: "2026-05-04",
      typeWerk: "B",
      meetingDate,
    });
    expect(got).toBe("2026-05-04");
  });

  it("geen deadline + AI-followup vóór/op meeting: null", () => {
    const got = resolveFollowUpDate({
      deadline: null,
      aiFollowUp: "2026-04-20",
      typeWerk: "B",
      meetingDate,
    });
    expect(got).toBeNull();
  });

  it("geen deadline + geen AI-followup: null", () => {
    const got = resolveFollowUpDate({
      deadline: null,
      aiFollowUp: null,
      typeWerk: "C",
      meetingDate,
    });
    expect(got).toBeNull();
  });

  it("ongeldige meetingdatum: null", () => {
    const got = resolveFollowUpDate({
      deadline: "2026-04-30",
      aiFollowUp: null,
      typeWerk: "A",
      meetingDate: "kapot",
    });
    expect(got).toBeNull();
  });

  it("ongeldige deadline: null", () => {
    const got = resolveFollowUpDate({
      deadline: "kapot",
      aiFollowUp: null,
      typeWerk: "C",
      meetingDate,
    });
    expect(got).toBeNull();
  });
});
