/**
 * Mock-data voor de `/theme-lab/storyline` prototype. Zelfstandig (niet gekoppeld
 * aan `mock-data.ts`) zodat deze prototype los valt te bewerken zonder andere
 * theme-lab varianten te raken. Theme: "Hiring junior devs" — dezelfde sfeer als
 * de shared mock, maar uitgewerkt met AI-narrative + moments + extractions per
 * (meeting, theme).
 */

export type ExtractionType = "decision" | "action_item" | "need" | "insight";

export interface ThemeExtraction {
  id: string;
  type: ExtractionType;
  content: string;
}

export type Confidence = "medium" | "high";

export interface MeetingBlock {
  meetingId: string;
  title: string;
  date: string; // YYYY-MM-DD
  participants: string[];
  confidence: Confidence;
  /** Uit meeting_themes — het waarom van deze link. */
  evidenceQuote: string;
  /** Uit extraction_themes — de concrete haakjes aan dit thema. */
  extractions: ThemeExtraction[];
}

export type MomentKind = "decision" | "shift" | "tension" | "open";

export interface StoryMoment {
  date: string;
  label: string;
  kind: MomentKind;
  meetingIds: string[];
}

export interface ThemeStoryline {
  slug: string;
  emoji: string;
  name: string;
  description: string;
  status: "verified" | "emerging" | "archived";
  stats: {
    meetings: number;
    extractions: number;
    decisions: number;
    openQuestions: number;
    mentions30d: number;
    lastMentionedDays: number;
  };
  narrative: {
    /** Multi-paragraaf markdown-lite. Newlines markeren paragraaf-breaks. */
    body: string;
    /** Korte kop onder de titel — "waar staat het nu". */
    currentStatus: string;
    generatedAt: string; // ISO
    model: string;
  };
  moments: StoryMoment[];
  meetings: MeetingBlock[];
}

export const HIRING_STORY: ThemeStoryline = {
  slug: "hiring-junior-devs",
  emoji: "👩‍💻",
  name: "Hiring junior devs",
  description: "Werving en selectie voor junior development rollen.",
  status: "verified",
  stats: {
    meetings: 4,
    extractions: 11,
    decisions: 3,
    openQuestions: 2,
    mentions30d: 14,
    lastMentionedDays: 2,
  },
  narrative: {
    currentStatus: "Actief werven — maar onboarding-capaciteit staat als rem open.",
    body: `Het denken over hiring is in drie weken gekanteld van "consolideren" naar "actief werven". Begin april lag de focus op runway-bescherming — Stef kondigde een aanname-pauze aan. Die lijn is op 14 april verlaten: de roadmap-druk maakte twee junior devs prioriteit 1.

Wouters belangrijkste zorg — dat jullie de onboarding-capaciteit niet hebben voor twee nieuwe mensen — staat sinds 18 april op tafel en is nog niet geadresseerd. De vraag "werven we via bureau of eigen netwerk" is wel beantwoord (voorkeur netwerk, 14 apr) maar het recruiter-budget-besluit blijft liggen.

Laatst besproken op 21 april in de founders sync, waar het werven is bevestigd. Volgende ijkpunt: Stef komt met een shortlist.`,
    generatedAt: "2026-04-22T06:30:00Z",
    model: "claude-sonnet-4-6",
  },
  moments: [
    {
      date: "2026-04-08",
      label: "Aannames bevroren — runway-focus",
      kind: "decision",
      meetingIds: ["m-finance"],
    },
    {
      date: "2026-04-14",
      label: "Koerswijziging: trage werving via netwerk",
      kind: "shift",
      meetingIds: ["m5"],
    },
    {
      date: "2026-04-18",
      label: "Zorg over onboarding-capaciteit",
      kind: "tension",
      meetingIds: ["m3"],
    },
    {
      date: "2026-04-21",
      label: "Werven bevestigd, shortlist volgt",
      kind: "decision",
      meetingIds: ["m1"],
    },
  ],
  meetings: [
    {
      meetingId: "m1",
      title: "Wekelijkse founders sync",
      date: "2026-04-21",
      participants: ["Stef", "Wouter"],
      confidence: "high",
      evidenceQuote:
        "We moeten dit kwartaal twee junior devs binnenhalen, anders halen we de roadmap niet.",
      extractions: [
        {
          id: "e-m1-1",
          type: "decision",
          content: "Twee junior devs werven dit kwartaal — prioriteit 1.",
        },
        {
          id: "e-m1-2",
          type: "action_item",
          content: "Stef maakt shortlist via eigen netwerk, deadline komende week.",
        },
        {
          id: "e-m1-3",
          type: "insight",
          content: "Roadmap-druk weegt nu zwaarder dan runway-zorg.",
        },
      ],
    },
    {
      meetingId: "m3",
      title: "1-op-1 Wouter",
      date: "2026-04-18",
      participants: ["Stef", "Wouter"],
      confidence: "medium",
      evidenceQuote:
        "Ik ben bang dat we ze niet goed kunnen opvangen met ons huidige onboarding-verhaal.",
      extractions: [
        {
          id: "e-m3-1",
          type: "need",
          content: "Onboarding-capaciteit in kaart brengen voordat we hires aannemen.",
        },
        {
          id: "e-m3-2",
          type: "insight",
          content: "Snelle werving zonder begeleiding leidde eerder tot turnover.",
        },
      ],
    },
    {
      meetingId: "m5",
      title: "Hiring brainstorm",
      date: "2026-04-14",
      participants: ["Stef", "Wouter"],
      confidence: "high",
      evidenceQuote: "Liever langzamer aannemen dan te snel en dan afscheid nemen.",
      extractions: [
        {
          id: "e-m5-1",
          type: "decision",
          content: "Voorkeur: werven via eigen netwerk, niet via recruitment-bureau.",
        },
        {
          id: "e-m5-2",
          type: "action_item",
          content: "Twee profielen uitwerken: junior-FE en junior-AI.",
        },
        {
          id: "e-m5-3",
          type: "insight",
          content: "Senior mentorrol blijft onderbelicht in de hiring-discussie.",
        },
        {
          id: "e-m5-4",
          type: "need",
          content: "Besluit over recruiter-budget staat nog open.",
        },
      ],
    },
    {
      meetingId: "m-finance",
      title: "Finance review",
      date: "2026-04-08",
      participants: ["Stef", "Wouter"],
      confidence: "medium",
      evidenceQuote: "We gaan geen nieuwe commitments aan deze periode.",
      extractions: [
        {
          id: "e-mf-1",
          type: "decision",
          content: "Twee maanden geen nieuwe aanname, focus op runway.",
        },
      ],
    },
  ],
};
