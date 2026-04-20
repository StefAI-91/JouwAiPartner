# Micro Sprint PW-QC-03: AI-pipeline hygiëne (prompt-sync, confidence, utils)

> **Parent tranche:** [`PW-QC-index.md`](./PW-QC-index.md) — quality-check follow-up op PW-02.

## Doel

De drie AI-agent inconsistenties die A/B-runs vertroebelen of dubbele-onderhoud vereisen, opruimen. Markdown-prompt wordt single source of truth, confidence-regels synchroniseren, post-processing wordt gedeeld.

## Requirements

| ID          | Beschrijving                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| AI-QC-001   | `packages/ai/src/utils/normalise.ts` met `normaliseForQuoteMatch`, `emptyToNull`, `sentinelToNull` (shared)              |
| AI-QC-002   | `risk-specialist.ts` en `meeting-structurer.ts` importeren de shared utils ipv lokale duplicates                         |
| AI-QC-003   | `prompts/meeting_structurer.md` aangemaakt — volledige system-prompt van `meeting-structurer.ts` verplaatst              |
| AI-QC-004   | Runtime-import patroon voor beide agents: `fs.readFileSync(resolve(__dirname, "../../prompts/xxx.md"))` in module-init   |
| AI-QC-005   | Prompt-content import edge-runtime-compatible of expliciet gemarkeerd als Node-runtime-only                              |
| AI-QC-006   | Synchronisatie-check: CI-test die faalt als inline SYSTEM_PROMPT drift van markdown                                      |
| AI-QC-007   | Quote-verificatie cap: kies `0.25` of `0.35` ipv `0.3` zodat "VERBODEN: 0.3" prompt-regel waar blijft in post-processing |
| AI-QC-008   | Alternatief voor AI-QC-007: aparte boolean `quote_verified` op het output-object + cap 0.0 alleen bij missing quote      |
| AI-QC-009   | Confidence-calibratie-tekst gelijk getrokken tussen MeetingStructurer en RiskSpecialist (of gedeeld prompt-fragment)     |
| AI-QC-010   | Gedeelde prompt-fragment-folder `prompts/_shared/confidence_calibration.md` overwogen (optioneel)                        |
| QUAL-QC-020 | Test: post-processing cap activeert bij quote niet in transcript, schrijft waarde ≠ 0.3                                  |
| QUAL-QC-021 | Test: markdown-file en inline SYSTEM_PROMPT zijn byte-identiek (trimEnd)                                                 |
| QUAL-QC-022 | A/B-rapport toont geen confidence=0.3 rijen meer na deze sprint                                                          |

## Bronverwijzingen

- Review-findings **AI2** (duplicate utils), **AI3** (cap-op-0.3 botst met prompt), **AI5** (confidence-regels niet gelijk), **AI6** (markdown ↔ TS-prompt drift-risico).
- Bestaande prompt: `prompts/risk_specialist.md`.
- Bestaande shared pattern: er is nog geen `packages/ai/src/utils/` — nieuwe folder.
- Agent files: `packages/ai/src/agents/risk-specialist.ts`, `packages/ai/src/agents/meeting-structurer.ts`.
- Flowwijs-regel `CLAUDE.md` → "Single responsibility: elk bestand doet één ding."

## Context

### AI2 — dubbele helpers

Deze 3 functies zijn byte-identiek in beide agent-bestanden:

```ts
function normaliseForQuoteMatch(text: string): string { … }
function emptyToNull(s: string): string | null { … }
function sentinelToNull<T extends string>(v: T): Exclude<T, "n/a"> | null { … }
```

Locatie: `meeting-structurer.ts:514-523` en `risk-specialist.ts:471-480`. Elke bugfix moet nu op 2 plekken.

### AI3 — cap op 0.3 is precies de verboden waarde

De prompt (`risk_specialist.md` sectie 3 + slotregel) zegt expliciet: "VERBODEN: confidence 0.3". De post-processing doet:

```ts
if (!normalisedTranscript.includes(refNorm)) {
  r.confidence = Math.min(r.confidence, 0.3);
}
```

Gevolg: een goed-bedoelde risk met confidence 0.7 maar paraphrased quote krijgt **0.3** in DB. In de A/B-rapport-analyse lijkt dat dan alsof het model 0.3 is gaan emitten (terwijl dat verboden is volgens prompt). Signal-vervuiling.

### AI5 — prompt-regels niet synchroon

MeetingStructurer zegt: `"0.0 = UITSLUITEND wanneer geen source_quote beschikbaar"`, geen verbod op 0.3.
RiskSpecialist zegt: `"VERBODEN: confidence 0.3"`, `"ondergrens 0.4"`.

Dat maakt A/B (MeetingStructurer risks vs RiskSpecialist risks) onvergelijkbaar — ze opereren onder andere confidence-semantiek.

### AI6 — handmatige sync

Commit `b9a792a` bestaat alleen omdat de markdown was uitgelopen op de ingeladen string. Single source of truth fixt dat structureel.

### Edge-runtime overweging

Vercel serverless default is Node.js runtime — `fs.readFileSync` werkt. Edge runtime zou `?raw` import nodig hebben (Vite/Turbopack-specifiek). Check per deployment welk runtime de pipeline draait. De huidige pipeline (`gatekeeper-pipeline.ts` via `api/ingest/*`) draait in Node — `fs.readFileSync` is OK.

## Werkwijze

1. **Shared utils** — maak `packages/ai/src/utils/normalise.ts`. Exporteer 3 functies. Importeer in beide agents, verwijder duplicates. Run type-check.
2. **Markdown voor structurer** — kopieer SYSTEM_PROMPT uit `meeting-structurer.ts` naar `prompts/meeting_structurer.md`. Run diff-check (byte-identiek na trimEnd).
3. **Runtime-import pattern** — in beide agents:
   ```ts
   import { readFileSync } from "node:fs";
   import { resolve, dirname } from "node:path";
   import { fileURLToPath } from "node:url";
   const __filename = fileURLToPath(import.meta.url);
   const __dirname = dirname(__filename);
   const SYSTEM_PROMPT = readFileSync(
     resolve(__dirname, "../../prompts/risk_specialist.md"),
     "utf8",
   ).trimEnd();
   ```
   Alternatief (simpeler bij CJS): `path.resolve(process.cwd(), "prompts/...")` — maar dat breekt in Vercel-build als cwd anders is.
4. **Sync-test** — `packages/ai/__tests__/prompts/sync.test.ts` dat beide markdown-files + corresponderende exports vergelijkt. Als iemand inline het prompt aanpast i.p.v. markdown, faalt de test.
5. **Quote-cap** — kies 0.25 (duidelijk "cap hit") of aparte boolean. Beslissing documenteren in commit-message + prompt-comment.
6. **Confidence-sync** — refactor confidence-sectie in beide prompts tot identiek tekst-blok. Of trek naar `prompts/_shared/confidence_calibration.md` en compose-load in beide (read + interpolate).
7. **A/B-rapport verificatie** — na deploy: check `experimental_risk_extractions` op confidence=0.3 rijen. Zouden 0 moeten zijn na deze sprint.

## Definition of done

- `packages/ai/src/utils/normalise.ts` bestaat en is de enige bron.
- `prompts/risk_specialist.md` + `prompts/meeting_structurer.md` zijn single source of truth. SYSTEM_PROMPT-constanten importeren runtime.
- Sync-test groen.
- Post-processing cap-waarde ≠ 0.3 (of boolean-alternatief gekozen).
- MeetingStructurer- en RiskSpecialist-prompt hanteren identieke confidence-regels.

## Out of scope

- Agent-splitsing voor 23-veld metadata (review-finding AI4) — pas als er productie-signaal is van timeout/truncation.
