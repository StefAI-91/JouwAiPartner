import { describe, it, expect } from "vitest";
import {
  parseElevenLabsUtterances,
  parseFirefliesUtterances,
  sampleUtterancesPerName,
  sampleUtterancesPerSpeaker,
} from "../../src/agents/speaker-identifier-sampling";

describe("parseElevenLabsUtterances", () => {
  it("parses een simple multi-speaker transcript", () => {
    const t = `[speaker_0]: Okay. Yep.

[speaker_1]: All right, so the goal of today is the weekly sync.

[speaker_0]: Cool.`;
    const got = parseElevenLabsUtterances(t);
    expect(got).toEqual([
      { speaker_id: "speaker_0", text: "Okay. Yep." },
      { speaker_id: "speaker_1", text: "All right, so the goal of today is the weekly sync." },
      { speaker_id: "speaker_0", text: "Cool." },
    ]);
  });

  it("voegt vervolgregels toe aan dezelfde speaker", () => {
    const t = `[speaker_1]: First sentence.
Second sentence on next line.

[speaker_0]: Reply.`;
    const got = parseElevenLabsUtterances(t);
    expect(got[0].text).toBe("First sentence. Second sentence on next line.");
    expect(got[1].text).toBe("Reply.");
  });

  it("negeert tekst voor de eerste speaker-prefix", () => {
    const t = `Some preamble.
[speaker_0]: Eerste echte regel.`;
    const got = parseElevenLabsUtterances(t);
    expect(got).toHaveLength(1);
    expect(got[0]).toEqual({ speaker_id: "speaker_0", text: "Eerste echte regel." });
  });

  it("ondersteunt unknown-label", () => {
    const t = `[unknown]: Wat krakers op de achtergrond.

[speaker_0]: Ja.`;
    const got = parseElevenLabsUtterances(t);
    expect(got[0].speaker_id).toBe("unknown");
  });
});

describe("parseFirefliesUtterances", () => {
  it("parses simple multi-name transcript", () => {
    const t = `Stef Banninga: Ja.
Wouter van den Heuvel: Het doel van vandaag is de weeklijst.
Stef Banninga: Oké.`;
    const got = parseFirefliesUtterances(t);
    expect(got).toEqual([
      { name: "Stef Banninga", text: "Ja." },
      { name: "Wouter van den Heuvel", text: "Het doel van vandaag is de weeklijst." },
      { name: "Stef Banninga", text: "Oké." },
    ]);
  });

  it("ondersteunt Nederlandse tussenvoegsels (van, de, den, der)", () => {
    const t = `Wouter van den Heuvel: Ja.
Pieter de Jong: Oké.
Sander der Kinderen: Top.`;
    const got = parseFirefliesUtterances(t);
    expect(got.map((u) => u.name)).toEqual([
      "Wouter van den Heuvel",
      "Pieter de Jong",
      "Sander der Kinderen",
    ]);
  });

  it("voegt vervolgregels samen met de vorige speaker", () => {
    const t = `Stef Banninga: Eerste regel.
Tweede regel zonder naam-prefix.
Wouter: Andere spreker.`;
    const got = parseFirefliesUtterances(t);
    expect(got).toHaveLength(2);
    expect(got[0].text).toBe("Eerste regel. Tweede regel zonder naam-prefix.");
    expect(got[1].name).toBe("Wouter");
  });

  it("blacklist voorkomt dat 'Note:' / 'Action:' als spreker telt", () => {
    const t = `Stef Banninga: Yes.
Note: dit is een notitie.
Action: iets doen.
Wouter: oké.`;
    const got = parseFirefliesUtterances(t);
    // Note + Action regels worden bij de vorige spreker (Stef) geappend
    expect(got).toHaveLength(2);
    expect(got[0].name).toBe("Stef Banninga");
    expect(got[0].text).toContain("dit is een notitie");
    expect(got[1].name).toBe("Wouter");
  });

  it("rejecteert te lange of te onsamenhangende prefixes", () => {
    const t = `dit is een hele lange zin met veel woorden en geen echte naam: niet als speaker tellen
Stef: Echte spreker.`;
    const got = parseFirefliesUtterances(t);
    expect(got).toHaveLength(1);
    expect(got[0].name).toBe("Stef");
  });
});

describe("sampleUtterancesPerName", () => {
  it("groepeert per naam en pakt langste utterances", () => {
    const fixture = parseFirefliesUtterances(
      [
        "Stef Banninga: " + "x".repeat(80),
        "Wouter van den Heuvel: " + "y".repeat(50),
        "Stef Banninga: kort.",
        "Wouter van den Heuvel: " + "z".repeat(100),
      ].join("\n"),
    );
    const got = sampleUtterancesPerName(fixture, 1, 40);
    expect(got.get("Wouter van den Heuvel")![0].length).toBe(100);
    expect(got.get("Stef Banninga")![0].length).toBe(80);
  });
});

describe("sampleUtterancesPerSpeaker", () => {
  const fixture = parseElevenLabsUtterances(`[speaker_0]: Yep.
[speaker_1]: All right, so the goal of today is the weekly sync. Let me give some more context about what is happening this week.
[speaker_0]: Cool.
[speaker_1]: Steph, you are taking over while I am on paternity leave.
[speaker_0]: Got it.
[speaker_1]: Lieke is thirty weeks pregnant and I will be away for two weeks.
[speaker_0]: Okay.`);

  it("pakt langste utterances per speaker boven de minimale lengte", () => {
    const got = sampleUtterancesPerSpeaker(fixture, 2, 40);
    const speaker1 = got.get("speaker_1");
    expect(speaker1).toBeDefined();
    expect(speaker1!.length).toBe(2);
    // De langste twee zinnen voor speaker_1 in dit fixture
    expect(speaker1![0].length).toBeGreaterThan(speaker1![1].length);
  });

  it("valt terug op alle utterances als geen boven minLength uitkomt", () => {
    // Alle speaker_0-utterances zijn korter dan 40 chars
    const got = sampleUtterancesPerSpeaker(fixture, 3, 40);
    const speaker0 = got.get("speaker_0");
    expect(speaker0).toBeDefined();
    expect(speaker0!.length).toBeGreaterThan(0);
  });

  it("kapt af op perSpeaker", () => {
    const long = parseElevenLabsUtterances(
      [
        "[speaker_0]: " + "a".repeat(100),
        "[speaker_0]: " + "b".repeat(100),
        "[speaker_0]: " + "c".repeat(100),
        "[speaker_0]: " + "d".repeat(100),
      ].join("\n\n"),
    );
    const got = sampleUtterancesPerSpeaker(long, 2);
    expect(got.get("speaker_0")!.length).toBe(2);
  });
});
