/**
 * Hardcoded AI responses for the AI summary editor mockup.
 *
 * This is a UX prototype — no real AI call happens. A lightweight keyword
 * match on the user's instruction decides which canned "AI proposal" to
 * return, so the flow feels realistic during demos.
 *
 * When the real implementation lands this file gets replaced by a streaming
 * endpoint that calls the Summarizer agent with the transcript + instructions.
 */

export interface DiffBlock {
  /** Free-form label shown above the diff (e.g. "Summary · Kernpunten"). */
  location: string;
  /** Removed lines. */
  before: string[];
  /** Added lines. */
  after: string[];
}

export interface MockProposal {
  /** Short intro sentence shown by the AI before the diff. */
  intro: string;
  /** One or more diff blocks the user can accept as a unit. */
  diffs: DiffBlock[];
  /** Rough cost hint shown under the diff (pure demo copy). */
  costHint: string;
}

const BAS_RENAME: MockProposal = {
  intro: "Ik stel deze wijzigingen voor. Jij keurt ze goed.",
  diffs: [
    {
      location: "Briefing",
      before: [
        "Bas stelde voor om de scope van fase 1 te beperken tot de kernmodule. Stef en het team gingen akkoord met deze aanpak.",
      ],
      after: [
        "Bas Spenkelink (Markant) stelde voor om de scope van fase 1 te beperken tot de kernmodule. Bas gaf akkoord; Stef had bedenkingen bij de scope en wilde eerst het data-model bevestigen.",
      ],
    },
    {
      location: "Summary · Kernpunten",
      before: ["**Besluit:** Stef en Bas gaan akkoord met fase 1 (kernmodule only)."],
      after: [
        "**Besluit:** Bas Spenkelink gaat akkoord met fase 1 (kernmodule only).",
        "**Risico:** Stef twijfelt over de scope — datamodel moet eerst bevestigd worden voordat fase 1 start.",
      ],
    },
    {
      location: "Summary · Deelnemers",
      before: ["- **Bas** — Niet bekend"],
      after: ["- **Bas Spenkelink** — Oprichter — Markant Internet"],
    },
  ],
  costHint: "~€0.02 · 2 AI-calls (summary + briefing)",
};

const ADD_WOUTER: MockProposal = {
  intro: "Ik voeg dit toe aan Vervolgstappen.",
  diffs: [
    {
      location: "Summary · Vervolgstappen",
      before: [],
      after: ["- [ ] Wouter sluit aan in sprint 3"],
    },
  ],
  costHint: "~€0.01 · 1 AI-call (alleen summary)",
};

const GENERIC: MockProposal = {
  intro: "Ik heb je verzoek verwerkt. Check de voorgestelde wijzigingen hieronder.",
  diffs: [
    {
      location: "Briefing",
      before: [
        "De deelnemers bespraken de planning voor Q2 en stemden af over de technische scope.",
      ],
      after: [
        "De deelnemers bespraken de planning voor Q2 en stemden af over de technische scope. Concrete vervolgstap: Stef levert het datamodel op 18 april.",
      ],
    },
  ],
  costHint: "~€0.02 · 2 AI-calls",
};

/**
 * Pick a mock proposal based on keywords in the instruction.
 * Default to GENERIC if nothing matches.
 */
export function pickMockProposal(instruction: string): MockProposal {
  const text = instruction.toLowerCase();
  if (text.includes("bas") || text.includes("spenkelink")) return BAS_RENAME;
  if (text.includes("wouter") || text.includes("voeg toe") || text.includes("toevoeg")) {
    return ADD_WOUTER;
  }
  return GENERIC;
}

/** Small delay to make the mock feel like a real streaming call. */
export const MOCK_THINK_MS = 1200;
