# Micro Sprint TH-002: ThemeTagger agent + emoji shortlist

## Doel

De ThemeTagger agent (Haiku 4.5) bouwen als 13e agent in de registry, inclusief de gecureerde emoji-shortlist die hij als enum gebruikt. Agent is volledig unit-testable tegen fixture-data, maar draait nog niet in de pipeline (dat is TH-003). Na deze sprint: je kunt lokaal een mock-meeting + mock-themes-lijst in de agent stoppen en hij retourneert een geldige Zod-gevalideerde output met matches + proposals. Eerste meetbare deliverable: tests tonen dat prompt-discipline werkt (geen over-tagging, geen lui nieuwe themes voorstellen).

## Requirements

| ID     | Beschrijving                                                                                       |
| ------ | -------------------------------------------------------------------------------------------------- |
| AI-200 | Gecureerde emoji shortlist `THEME_EMOJIS` (42 emoji's) in `packages/ai/src/agents/theme-emojis.ts` |
| AI-201 | `ThemeEmoji` type als union `typeof THEME_EMOJIS[number] \| '🏷️'` (fallback)                       |
| AI-202 | ThemeTagger agent in `packages/ai/src/agents/theme-tagger.ts`, gebruikt Haiku 4.5                  |
| AI-203 | Zod output-schema met `matches[]` (0–4), `proposals[]` (0–2), `meta`                               |
| AI-204 | Elke match heeft `themeId`, `confidence: 'medium'\|'high'`, `evidenceQuote`                        |
| AI-205 | Elke proposal heeft `name`, `description`, `emoji: ThemeEmoji`, `evidenceQuote`, `reasoning`       |
| AI-206 | Prompt bevat alle vier proposal-criteria uit PRD §5.6 letterlijk                                   |
| AI-207 | Prompt bevat alle vier discipline-regels uit PRD §5.2 letterlijk                                   |
| AI-208 | Prompt-input bundel: per thema name, description, matching_guide, 2–3 negative_examples            |
| AI-209 | Agent exposeert één export-functie `tagMeetingThemes({meeting, themes, negativeExamples})`         |
| AI-210 | Registratie in `packages/ai/src/agents/registry.ts` als 13e agent                                  |
| AI-211 | Unit tests met fixture-input → fixture-mock-response → payload-capture op `ai-sdk`-grens           |
| AI-212 | Test: agent stelt géén match voor als alle themes confidence=low zouden krijgen                    |
| AI-213 | Test: agent stelt géén proposal voor bij onderwerp met 1 extraction (substantie-regel)             |
| AI-214 | Zod-validatie werpt als output niet voldoet (bv. emoji niet in shortlist)                          |

## Bronverwijzingen

- PRD: `docs/specs/prd-themes.md` → §5.1 positie + §5.2 input/output + §5.6 criteria (regels 196-285)
- PRD: `docs/specs/prd-themes.md` → §7 emoji shortlist (regels 370-463)
- Repo: `packages/ai/src/agents/registry.ts` — registry pattern
- Repo: `packages/ai/src/agents/gatekeeper.ts` — voorbeeld agent met Zod
- CLAUDE.md → Mock-grens beleid (§Tests): mock alleen `@ai-sdk/anthropic` / `ai` grens

## Context

### Bestandsstructuur

```
packages/ai/src/agents/
├── theme-emojis.ts       -- NEW: THEME_EMOJIS, ThemeEmoji, THEME_EMOJI_FALLBACK
├── theme-tagger.ts       -- NEW: tagMeetingThemes() + Zod schemas + prompts
├── registry.ts           -- UPDATE: 13e agent toegevoegd
└── __tests__/
    └── theme-tagger.test.ts  -- NEW
```

### Prompt-structuur (system prompt)

Kernregels letterlijk uit PRD §5.2 en §5.6:

1. "Match alleen als het thema een substantieel onderwerp van de meeting is — niet bij terloopse vermeldingen van één zin."
2. "Gebruik de matching_guide als arbiter. Bij twijfel niet matchen."
3. "Retourneer alleen matches met confidence `medium` of `high`. `low` filter je zelf eruit."
4. "Max 4 matches per meeting. Als alles matcht is het over-tagging."
5. Nieuw thema alleen als: geen match ≥medium, ≥2 extractions aan onderwerp, niet te breed/smal, in `reasoning` benoem welk bestaand thema het dichtst was en waarom het toch niet past.

### Output voorbeeld

```ts
{
  matches: [
    { themeId: "uuid-of-hiring", confidence: "high", evidenceQuote: "We moeten twee junior devs werven dit kwartaal" },
    { themeId: "uuid-of-werkdruk", confidence: "medium", evidenceQuote: "Stef voelt zich kapot van de workload" }
  ],
  proposals: [],
  meta: { themesConsidered: 10 }
}
```

## Deliverables

- [ ] `packages/ai/src/agents/theme-emojis.ts` — shortlist export + type
- [ ] `packages/ai/src/agents/theme-tagger.ts` — agent + Zod schemas + prompts
- [ ] `packages/ai/src/agents/registry.ts` — 13e entry
- [ ] `packages/ai/src/agents/__tests__/theme-tagger.test.ts` — minimaal 5 cases (match high, match medium, skip low, no match → proposal, proposal rejected door substantie-regel)

## Acceptance criteria

- `tagMeetingThemes()` is pure function: alle side-effects via mocked `ai-sdk` boundary.
- Tests draaien met fixtures zonder echte LLM-calls.
- Zod-schema werpt duidelijk als proposal.emoji niet in `THEME_EMOJIS` zit.
- Registry-entry verschijnt op `/agents` observability pagina (manual check).
- Geen `.from()` of directe DB-calls in deze agent — alleen pure data-in/data-uit.

## Handmatige test-stappen

1. `npm run test --workspace=@repo/ai -- theme-tagger` → groen.
2. Tijdelijk script `scripts/try-theme-tagger.ts` dat echte transcript + echte themes pakt uit DB → log de output.
3. Check: output bevat plausibele matches + evidenceQuote die echt uit transcript komt.

## Out of scope

- Pipeline-integratie (TH-003).
- `theme_match_rejections` lezen uit DB — agent accepteert `negativeExamples` als parameter, ophalen komt in TH-003.
- Batch-run over bestaande meetings (TH-003).
- UI (TH-004 en verder).
