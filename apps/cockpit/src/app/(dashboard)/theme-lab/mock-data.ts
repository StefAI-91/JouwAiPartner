/**
 * Shared sample data voor de Theme UI Lab.
 * Bewust ONE source of truth zodat alle 19 varianten met dezelfde themes werken —
 * dan kun je varianten eerlijk met elkaar vergelijken.
 */

export type ThemeTemp = "hot" | "warm" | "cool" | "cold" | "new";

export type ThemeMock = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  mentions30d: number;
  lastMentionedDays: number;
  temp: ThemeTemp;
  /** 4 weken activity, kleine sparkline */
  sparkline: number[];
  /** % van gespreksdomein laatste 30 dagen */
  share: number;
  status: "emerging" | "verified" | "archived";
  description: string;
};

export const THEMES: ThemeMock[] = [
  {
    id: "t1",
    slug: "hiring-junior-devs",
    name: "Hiring junior devs",
    emoji: "👩‍💻",
    mentions30d: 14,
    lastMentionedDays: 1,
    temp: "hot",
    sparkline: [1, 2, 4, 7],
    share: 22,
    status: "verified",
    description: "Werving en selectie voor junior development rollen.",
  },
  {
    id: "t2",
    slug: "sales-pipeline",
    name: "Sales pipeline",
    emoji: "📈",
    mentions30d: 11,
    lastMentionedDays: 2,
    temp: "hot",
    sparkline: [3, 5, 2, 6],
    share: 17,
    status: "verified",
    description: "Deals, lead-kwaliteit en conversie.",
  },
  {
    id: "t3",
    slug: "productstrategie",
    name: "Productstrategie",
    emoji: "🧭",
    mentions30d: 9,
    lastMentionedDays: 3,
    temp: "warm",
    sparkline: [4, 3, 3, 5],
    share: 14,
    status: "verified",
    description: "Richting, positionering en roadmap van het eigen platform.",
  },
  {
    id: "t4",
    slug: "ai-agent-roadmap",
    name: "AI-agent roadmap",
    emoji: "🤖",
    mentions30d: 8,
    lastMentionedDays: 1,
    temp: "hot",
    sparkline: [2, 1, 3, 7],
    share: 12,
    status: "verified",
    description: "Welke agents we bouwen, in welke volgorde, en waarom.",
  },
  {
    id: "t5",
    slug: "team-cultuur",
    name: "Team-cultuur",
    emoji: "🫂",
    mentions30d: 6,
    lastMentionedDays: 5,
    temp: "warm",
    sparkline: [2, 3, 2, 1],
    share: 9,
    status: "verified",
    description: "Hoe we samenwerken, ritmes, tone-of-voice intern.",
  },
  {
    id: "t6",
    slug: "onboarding-proces",
    name: "Onboarding proces",
    emoji: "🧳",
    mentions30d: 5,
    lastMentionedDays: 6,
    temp: "cool",
    sparkline: [1, 1, 2, 2],
    share: 7,
    status: "emerging",
    description: "Hoe we nieuwe mensen inwerken — nog geen formeel proces.",
  },
  {
    id: "t7",
    slug: "finance-runway",
    name: "Finance & runway",
    emoji: "💶",
    mentions30d: 4,
    lastMentionedDays: 9,
    temp: "cool",
    sparkline: [3, 0, 1, 1],
    share: 6,
    status: "verified",
    description: "Cashflow, marges, runway, investeringen.",
  },
  {
    id: "t8",
    slug: "client-communicatie",
    name: "Client communicatie",
    emoji: "💬",
    mentions30d: 4,
    lastMentionedDays: 4,
    temp: "warm",
    sparkline: [1, 2, 1, 2],
    share: 6,
    status: "verified",
    description: "Hoe we klanten op de hoogte houden — portal, updates, tone.",
  },
  {
    id: "t9",
    slug: "tech-debt",
    name: "Tech debt",
    emoji: "🧱",
    mentions30d: 3,
    lastMentionedDays: 22,
    temp: "cold",
    sparkline: [2, 0, 0, 0],
    share: 4,
    status: "verified",
    description: "Opgestapelde technische schuld in de codebase.",
  },
  {
    id: "t10",
    slug: "remote-vs-office",
    name: "Remote vs office",
    emoji: "🏠",
    mentions30d: 2,
    lastMentionedDays: 26,
    temp: "cold",
    sparkline: [1, 0, 1, 0],
    share: 3,
    status: "verified",
    description: "Hybride werken, thuiswerken, kantoordagen.",
  },
];

export const PEOPLE = [
  { id: "p1", name: "Stef", role: "Founder" },
  { id: "p2", name: "Wouter", role: "Co-founder" },
  { id: "p3", name: "Ege", role: "Tech Lead" },
];

export type MeetingMock = {
  id: string;
  title: string;
  date: string;
  participants: string[];
  themeIds: string[];
};

export const MEETINGS: MeetingMock[] = [
  {
    id: "m1",
    title: "Wekelijkse founders sync",
    date: "2026-04-21",
    participants: ["Stef", "Wouter"],
    themeIds: ["t1", "t2", "t4"],
  },
  {
    id: "m2",
    title: "Product review sprint 72",
    date: "2026-04-20",
    participants: ["Stef", "Wouter", "Ege"],
    themeIds: ["t3", "t4", "t9"],
  },
  {
    id: "m3",
    title: "1-op-1 Wouter",
    date: "2026-04-18",
    participants: ["Stef", "Wouter"],
    themeIds: ["t5", "t1"],
  },
  {
    id: "m4",
    title: "Finance kwartaalreview",
    date: "2026-04-15",
    participants: ["Stef", "Wouter"],
    themeIds: ["t7", "t2"],
  },
  {
    id: "m5",
    title: "Hiring brainstorm",
    date: "2026-04-14",
    participants: ["Stef", "Wouter"],
    themeIds: ["t1", "t6"],
  },
];

/** Quotes per persoon per theme — voor "Wie zegt wat" variant */
export const QUOTES: Record<
  string,
  { personId: string; quote: string; meetingId: string; date: string }[]
> = {
  t1: [
    {
      personId: "p1",
      quote:
        "We moeten dit kwartaal twee junior devs binnenhalen, anders halen we de roadmap niet.",
      meetingId: "m1",
      date: "2026-04-21",
    },
    {
      personId: "p2",
      quote: "Ik ben bang dat we ze niet goed kunnen opvangen met ons huidige onboarding-verhaal.",
      meetingId: "m3",
      date: "2026-04-18",
    },
    {
      personId: "p1",
      quote: "Liever langzamer aannemen dan te snel en dan afscheid nemen.",
      meetingId: "m5",
      date: "2026-04-14",
    },
  ],
};

/** Tegenstrijdigheden die de Curator detecteert — voor variant D18 */
export const CONTRADICTIONS = [
  {
    themeId: "t1",
    earlier: {
      date: "2026-04-08",
      decision: "We nemen komende 2 maanden geen nieuwe mensen aan, focus op runway.",
    },
    later: {
      date: "2026-04-21",
      decision: "Twee junior devs werven dit kwartaal — prioriteit 1.",
    },
  },
];

/** Timeline events voor C12 */
export const TIMELINE_EVENTS = [
  {
    date: "2026-04-21",
    kind: "decision" as const,
    text: "Besluit: twee junior devs werven dit kwartaal.",
    source: "Wekelijkse founders sync",
    quote: "We moeten dit kwartaal twee junior devs binnenhalen.",
    author: "Stef",
  },
  {
    date: "2026-04-18",
    kind: "concern" as const,
    text: "Zorg geuit over onboarding-capaciteit.",
    source: "1-op-1 Wouter",
    quote: "Ik ben bang dat we ze niet goed kunnen opvangen.",
    author: "Wouter",
  },
  {
    date: "2026-04-14",
    kind: "insight" as const,
    text: "Voorkeur voor trage werving boven snelle turnover.",
    source: "Hiring brainstorm",
    quote: "Liever langzamer aannemen dan te snel afscheid nemen.",
    author: "Stef",
  },
  {
    date: "2026-04-08",
    kind: "decision" as const,
    text: "Besluit: twee maanden geen nieuwe aanname, focus op runway.",
    source: "Finance review",
    quote: "We gaan geen nieuwe commitments aan deze periode.",
    author: "Stef",
  },
];

/** Open vragen per theme — voor C11 tab */
export const OPEN_QUESTIONS: Record<string, { question: string; daysOpen: number }[]> = {
  t1: [
    { question: "Welke seniority-mix willen we in het team?", daysOpen: 18 },
    { question: "Werven we via netwerk of via bureau?", daysOpen: 7 },
    { question: "Wie begeleidt de eerste 4 weken van nieuwe hires?", daysOpen: 12 },
  ],
};
