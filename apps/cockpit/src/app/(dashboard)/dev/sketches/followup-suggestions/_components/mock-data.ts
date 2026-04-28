export interface MockSuggestion {
  id: string;
  actorInitial: string;
  actorName: string;
  actorNameShort: string;
  deadline: { label: string; tone: "amber" | "neutral" };
  text: string;
  source: string;
}

export const MOCK_ACTIVE: MockSuggestion[] = [
  {
    id: "s1",
    actorInitial: "W",
    actorName: "Wouter van den Heuvel",
    actorNameShort: "Wouter",
    deadline: { label: "deze week", tone: "amber" },
    text: "Checken of Stef een exportlijst kan genereren vanuit DevHub met opgeloste en openstaande tickets op bug- en feature-niveau, conform het besproken format.",
    source: "uit transcript 12:47",
  },
  {
    id: "s2",
    actorInitial: "W",
    actorName: "Wouter van den Heuvel",
    actorNameShort: "Wouter",
    deadline: { label: "geen deadline", tone: "neutral" },
    text: "Lijst aanleveren met feedbackpunten die hij tijdens de review tegenkomt, zodat Stef die kan verwerken in het AI-model.",
    source: "uit transcript 23:11",
  },
];

export interface MockSnoozed {
  id: string;
  actor: string;
  text: string;
}

export const MOCK_SNOOZED: MockSnoozed[] = [
  {
    id: "snz1",
    actor: "Stef",
    text: "Knop voor markdown-uploadlimiet onderzoeken",
  },
];
