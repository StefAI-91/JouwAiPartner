# Micro Sprint PW-QC-04: File splits (>150 regels) + anti-laundering tests

> **Parent tranche:** [`PW-QC-index.md`](./PW-QC-index.md) — quality-check follow-up op PW-02.
> **Prerequisites:** PW-QC-01 (action-shape), PW-QC-02 (query-laag bestaat), PW-QC-03 (shared utils + runtime-prompts).

## Doel

De vier grote bestanden uit PW-02 splitsen conform "splits bij ~150 regels" + de ontbrekende gedragstests toevoegen zonder anti-laundering patterns te introduceren.

## Requirements

| ID          | Beschrijving                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARCH-QC-001 | `meeting-structurer.ts` van 526 → <250 regels (prompt naar `.md`, utils al shared via PW-QC-03)                                                                           |
| ARCH-QC-002 | `risk-specialist.ts` van 483 → <250 regels (prompt naar `.md`, utils al shared via PW-QC-03)                                                                              |
| ARCH-QC-003 | `apps/cockpit/src/app/(dashboard)/dev/extractor/client.tsx` gesplitst in panels: `structurer-result-panel.tsx`, `specialist-result-panel.tsx`, gedeelde `copy-button.tsx` |
| ARCH-QC-004 | `gatekeeper-pipeline.ts` `processMeeting` (355 regels) gesplitst: titel-gen, tagger+segments en embed naar `pipeline/steps/`                                              |
| ARCH-QC-005 | Alle nieuwe files volgen "één responsibility, <150 regels" indien praktisch                                                                                               |
| QUAL-QC-030 | **T1 fix** — `apps/cockpit/__tests__/actions/dev-extractor.test.ts` gebruikt geen chainable DB-mock meer                                                                  |
| QUAL-QC-031 | T1 vervanging: óf `describeWithDb` (echte DB), óf query-functie mocks uit PW-QC-02 (`getExtractionsForMeetingByType` mock)                                                |
| QUAL-QC-032 | **T4 fix** — test in `packages/ai/__tests__/agents/risk-specialist-quote-cap.test.ts`: quote niet in transcript ⇒ confidence cap                                          |
| QUAL-QC-033 | T4 idem voor MeetingStructurer in `packages/ai/__tests__/agents/meeting-structurer-quote-cap.test.ts`                                                                     |
| QUAL-QC-034 | **T5 fix** — `packages/ai/__tests__/pipeline/gatekeeper-pipeline-fallback.test.ts`: structurer crasht ⇒ legacy pad draait                                                 |
| QUAL-QC-035 | Test T5 mockt op grens (agent-function) en assert op observable: `saveExtractions` (legacy) kreeg de call, niet `saveStructuredExtractions`                               |
| RULE-QC-030 | Geen `toHaveBeenCalledWith` op interne helpers                                                                                                                            |
| RULE-QC-031 | Geen nieuwe chainable DB-mocks                                                                                                                                            |
| RULE-QC-032 | Geen tests die private velden inspecteren                                                                                                                                 |

## Bronverwijzingen

- Review-findings **A2** (files >150 regels), **A3** (`processMeeting` te groot), **T1** (chainable DB-mock), **T4** (quote-cap niet getest), **T5** (fallback niet end-to-end getest).
- Flowwijs-regel `CLAUDE.md` → "Splits bij ~150 regels. Component te groot? Splits het."
- Flowwijs-regel `CLAUDE.md` → "Tests (anti-laundering)" — volledige sectie.
- Bestaand goed-voorbeeld: `packages/ai/src/pipeline/steps/` (kleine step-modules).

## Context

### Huidige groottes

| File                                                        | LOC | Oorzaak                                           | Doel       |
| ----------------------------------------------------------- | --- | ------------------------------------------------- | ---------- |
| `packages/ai/src/agents/meeting-structurer.ts`              | 526 | Inline SYSTEM_PROMPT (~290) + utils + filter-code | <250       |
| `packages/ai/src/agents/risk-specialist.ts`                 | 483 | Inline SYSTEM_PROMPT (~290) + utils               | <250       |
| `apps/cockpit/src/app/(dashboard)/dev/extractor/client.tsx` | 476 | 2 result-panels + copy-knop + form                | <200/panel |
| `packages/ai/src/pipeline/gatekeeper-pipeline.ts`           | 521 | `processMeeting` met 10 inline stappen            | <350       |

### T1 — de exacte anti-laundering-overtreding

```ts
// apps/cockpit/__tests__/actions/dev-extractor.test.ts:47-73
const chain = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: mockMeeting }),
  order: vi.fn().mockReturnThis(),
};
mockGetAdminClient.mockReturnValue(chain as any);
```

Dit test de mocks, niet de code. Als iemand `.single()` vervangt door `.maybeSingle()`, blijft de test groen maar werkt de action anders. CLAUDE.md: "Chainable DB-mocks die query-strings matchen. Stop — dan test je de mocks, niet de code."

### Fix-patroon voor T1

Na PW-QC-02 bestaat `getExtractionsForMeetingByType` in de query-laag. De action roept die aan, dus test mockt alleen die functie:

```ts
vi.mock("@repo/database/queries/extractions", () => ({
  getExtractionsForMeetingByType: vi.fn(),
}));
// …
getExtractionsForMeetingByType.mockResolvedValue([
  { id: "ex1", type: "risk", content: "…", confidence: 0.8 },
]);
// assert op observable: action-return-shape
```

### T4 — wat getest moet worden

Gedrag: als agent een `source_quote` retourneert die niet in `transcript` staat (na normalisatie), wordt `confidence` gecapt. Mock `generateObject` op de AI-SDK-grens:

```ts
vi.mock("ai", () => ({ generateObject: vi.fn() }));
generateObject.mockResolvedValue({
  object: { risks: [{ content: "…", source_quote: "bestaat niet in transcript", confidence: 0.9, metadata: {...} }] },
  usage: { ... },
});

const { output } = await runRiskSpecialist("ander transcript zonder die quote", { … });
expect(output.risks[0].confidence).toBeLessThan(0.4);  // cap geactiveerd
```

### T5 — pipeline fallback

```ts
vi.mock("@repo/ai/agents/meeting-structurer", () => ({
  runMeetingStructurer: vi.fn().mockRejectedValue(new Error("crash")),
}));
vi.mock("@repo/ai/agents/extractor", () => ({ runExtractor: vi.fn() }));
vi.mock("@repo/ai/agents/summarizer", () => ({ runSummarizer: vi.fn() }));

process.env.USE_MEETING_STRUCTURER = "true";
await processMeeting(meetingId);

expect(runSummarizer).toHaveBeenCalled(); // fallback triggered
expect(runExtractor).toHaveBeenCalled();
```

Focus op de observable flow — niet op interne flag-state-transitions.

## Werkwijze

### Splits strategy

1. **Agents** — Na PW-QC-03 zijn prompts al in `.md`. Restant splitst langs:
   - `risk-specialist.ts` ≈ 150 regels (runRiskSpecialist + context-build)
   - `risk-specialist-normalize.ts` ≈ 50 regels (raw → normalised shape)
   - Idem MeetingStructurer
2. **`client.tsx`** — Extract:
   - `structurer-form.tsx` (meeting+type picker + run-button)
   - `structurer-result-panel.tsx` (resultaat voor MeetingStructurer)
   - `specialist-result-panel.tsx` (resultaat voor RiskSpecialist)
   - `copy-button.tsx` (gedeeld)
   - `client.tsx` orchestreert alleen state + roept panels aan (<100 regels).
3. **`gatekeeper-pipeline.ts`** — Extract:
   - `pipeline/steps/generate-title.ts`
   - `pipeline/steps/tag-and-segment.ts`
   - `pipeline/steps/embed.ts`
   - `processMeeting` wordt orchestration van ~10 `runXStep(…)` calls (~200 regels).

### Test strategy

- Eerst T1 fix (afhankelijk van PW-QC-02 query-functie).
- Dan T4: twee kleine agent-tests, pure boundary-mock, ≤30 regels elk.
- Dan T5: één pipeline-fallback-test met `generateObject` gemockt op AI-SDK-grens.

## Definition of done

- Alle 4 target-files < genoemde LOC-limieten.
- Tests T1 vervangen, T4 en T5 toegevoegd, allemaal boundary-mocks.
- `npm run test` groen, lint + type-check groen.
- Handmatig: `/dev/extractor` draait identiek, pipeline draait identiek.
- Geen dead code, geen dangling exports, geen half-afgebouwde refactors.

## Out of scope

- Legacy `runSummarizeStep` + `runExtractStep` verwijderen — dat gebeurt pas als `USE_MEETING_STRUCTURER=true` definitief permanent is (aparte sprint).
