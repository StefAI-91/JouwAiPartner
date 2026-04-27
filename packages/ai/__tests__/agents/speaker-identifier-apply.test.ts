import { describe, it, expect } from "vitest";
import { applyMappingToTranscript } from "../../src/agents/speaker-identifier";

describe("applyMappingToTranscript", () => {
  const transcript = `[speaker_0]: First line by speaker 0.

[speaker_1]: Second line by speaker 1.

[speaker_0]: Third line by speaker 0 again.

[unknown]: Iemand die niet gediarized is.`;

  it("vervangt [speaker_X] door naam wanneer confidence boven drempel ligt", () => {
    const got = applyMappingToTranscript(transcript, [
      { speaker_id: "speaker_0", person_name: "Stef Banninga", confidence: 0.9, reasoning: "" },
      {
        speaker_id: "speaker_1",
        person_name: "Wouter van den Heuvel",
        confidence: 0.85,
        reasoning: "",
      },
    ]);
    expect(got).toContain("[Stef Banninga]: First line");
    expect(got).toContain("[Wouter van den Heuvel]: Second line");
    expect(got).toContain("[Stef Banninga]: Third line");
    expect(got).toContain("[unknown]: Iemand"); // niet gemapt → blijft staan
  });

  it("laat label staan als confidence onder de drempel zit", () => {
    const got = applyMappingToTranscript(transcript, [
      { speaker_id: "speaker_0", person_name: "Stef Banninga", confidence: 0.4, reasoning: "" },
    ]);
    expect(got).toContain("[speaker_0]: First line"); // ongewijzigd
    expect(got).not.toContain("Stef Banninga");
  });

  it("laat label staan als person_name leeg is", () => {
    const got = applyMappingToTranscript(transcript, [
      { speaker_id: "speaker_0", person_name: "", confidence: 0.95, reasoning: "" },
    ]);
    expect(got).toContain("[speaker_0]: First line");
  });

  it("custom threshold respecteert", () => {
    const got = applyMappingToTranscript(
      transcript,
      [{ speaker_id: "speaker_0", person_name: "Stef Banninga", confidence: 0.5, reasoning: "" }],
      0.4,
    );
    expect(got).toContain("[Stef Banninga]: First line");
  });

  it("idempotent: zonder valide mappings ongewijzigde input terug", () => {
    expect(applyMappingToTranscript(transcript, [])).toBe(transcript);
  });

  it("ondersteunt 'unknown' label-mapping als die er is", () => {
    const got = applyMappingToTranscript(transcript, [
      { speaker_id: "unknown", person_name: "Tibor", confidence: 0.7, reasoning: "" },
    ]);
    expect(got).toContain("[Tibor]: Iemand");
  });

  it("vervangt many-to-one (diarization-split) correct", () => {
    const split = `[speaker_0]: Eerst dit.

[speaker_3]: En ook dit.`;
    const got = applyMappingToTranscript(split, [
      { speaker_id: "speaker_0", person_name: "Wouter", confidence: 0.9, reasoning: "" },
      { speaker_id: "speaker_3", person_name: "Wouter", confidence: 0.85, reasoning: "" },
    ]);
    expect(got).toContain("[Wouter]: Eerst dit");
    expect(got).toContain("[Wouter]: En ook dit");
  });

  it("returnt lege string voor lege input", () => {
    expect(applyMappingToTranscript("", [])).toBe("");
  });
});
