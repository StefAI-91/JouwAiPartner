import { describe, it, expect } from "vitest";
import { buildMeetingEmbedText } from "../../src/pipeline/embed-text";

describe("buildMeetingEmbedText", () => {
  it("bevat meeting title, participants, summary in output", () => {
    const result = buildMeetingEmbedText(
      {
        title: "Weekly standup",
        participants: ["Alice", "Bob"],
        summary: "Besproken: voortgang sprint 5",
      },
      [],
    );

    expect(result).toContain("Meeting: Weekly standup");
    expect(result).toContain("Deelnemers: Alice, Bob");
    expect(result).toContain("Samenvatting: Besproken: voortgang sprint 5");
  });

  it("groepeert extractions per type met Nederlandse labels", () => {
    const result = buildMeetingEmbedText({ title: "Test" }, [
      { type: "decision", content: "We kiezen voor Next.js" },
      { type: "decision", content: "Deploy op Vercel" },
      { type: "action_item", content: "Stef maakt tickets aan" },
      { type: "insight", content: "Klant wil snellere turnaround" },
      { type: "need", content: "Extra developer nodig" },
    ]);

    expect(result).toContain("Besluiten:\n- We kiezen voor Next.js\n- Deploy op Vercel");
    expect(result).toContain("Actiepunten:\n- Stef maakt tickets aan");
    expect(result).toContain("Inzichten:\n- Klant wil snellere turnaround");
    expect(result).toContain("Behoeften:\n- Extra developer nodig");
  });

  it("retourneert lege string-secties als er geen extractions zijn", () => {
    const result = buildMeetingEmbedText({ title: "Test" }, []);

    expect(result).toBe("Meeting: Test");
    expect(result).not.toContain("Besluiten");
    expect(result).not.toContain("Actiepunten");
  });

  it("handelt lege/null velden correct af", () => {
    const result = buildMeetingEmbedText({ title: null, participants: null, summary: null }, []);

    expect(result).toBe("");
  });

  it("handelt missing velden correct af", () => {
    const result = buildMeetingEmbedText({}, []);
    expect(result).toBe("");
  });

  it("handelt lege participants array correct af", () => {
    const result = buildMeetingEmbedText(
      { title: "Test", participants: [], summary: "Samenvatting" },
      [],
    );

    expect(result).toContain("Meeting: Test");
    expect(result).not.toContain("Deelnemers");
    expect(result).toContain("Samenvatting: Samenvatting");
  });

  it("gebruikt type als label bij onbekend type", () => {
    const result = buildMeetingEmbedText({ title: "Test" }, [
      { type: "custom_type", content: "Iets speciaals" },
    ]);

    expect(result).toContain("custom_type:\n- Iets speciaals");
  });
});
