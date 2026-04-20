export interface TestResult {
  test: string;
  result: string;
  pass: boolean;
}

export const testResults: TestResult[] = [
  {
    test: "Volledige pipeline: Gatekeeper \u2192 Extractor \u2192 opslag \u2192 embedding",
    result: "1 meeting \u2192 23 extracties \u2192 alles geembed en doorzoekbaar",
    pass: true,
  },
  {
    test: "Gatekeeper classificatie (Claude Haiku 4.5)",
    result: "meeting_type: strategy, relevance: 0.95, party_type: partner",
    pass: true,
  },
  {
    test: "Extractor (Claude Sonnet 4.5)",
    result: "4 decisions, 5 action_items, 4 needs, 8 insights met transcript_ref",
    pass: true,
  },
  {
    test: "Cohere embed-v4 (v2 API, 1024 dim)",
    result: "Meeting + 23 extracties + people + projects geembed",
    pass: true,
  },
  {
    test: "Entity resolution (3-tier)",
    result: "Projecten 'MVP - Effect op Maat' en 'Fleur op Zak' herkend",
    pass: true,
  },
  {
    test: "Idempotency check",
    result: "Duplicate meetings correct overgeslagen",
    pass: true,
  },
  {
    test: "Pre-filters",
    result: "Meetings zonder deelnemers overgeslagen",
    pass: true,
  },
  {
    test: "raw_fireflies JSONB",
    result: "Audit trail met gatekeeper + extractor metadata opgeslagen",
    pass: true,
  },
  {
    test: "search_knowledge bronvermelding (Sprint 6)",
    result:
      "Resultaten tonen bron (meeting titel + datum), transcript-citaat en verificatie-status",
    pass: true,
  },
  {
    test: "get_decisions metadata (Sprint 6)",
    result: "Besluiten tonen made_by, confidence en verificatie-status",
    pass: true,
  },
  {
    test: "get_action_items metadata (Sprint 6)",
    result: "Actiepunten tonen assignee, deadline, en person-filter werkt op metadata",
    pass: true,
  },
  {
    test: "Sufficiency check (Sprint 6)",
    result: "MCP system prompt versterkt: geen antwoord zonder bron, eerlijk bij ontbrekende data",
    pass: true,
  },
];
