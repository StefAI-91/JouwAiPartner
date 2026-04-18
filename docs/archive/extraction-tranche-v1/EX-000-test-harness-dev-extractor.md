# Micro Sprint EX-000: Test-harness `/dev/extractor` pagina

> **Scope:** Dev-tool in cockpit, admin-only. Geen productie-wijzigingen. Bouwt het fundament waarop sprints EX-001 t/m EX-008 per-type extractie-agents tunen tegen echte meetings.

## Doel

Een interne dev-pagina bouwen (`apps/cockpit/src/app/(dashboard)/dev/extractor/page.tsx`) waarop een admin een bestaande meeting kan kiezen, een extractie-type kan kiezen, en een type-specialist agent kan runnen op het transcript van die meeting. De pagina toont het resultaat in een 4-panel view: transcript (met gemarkeerde quotes) — huidige extractions in de database — nieuwe extractions uit de verse run — en een diff tussen huidige en nieuwe.

Deze harness is de werkbank voor EX-001 t/m EX-008: per sprint wordt één nieuw type toegevoegd aan de dropdown, de specialist agent wordt gekalibreerd tegen 5-10 echte meetings, en pas als de kwaliteit voldoende is gaat het type in de MeetingStructurer merge (EX-009).

In deze sprint wordt de harness eerst bewezen met het bestaande `action_item`-type (de huidige Extractor is al getuned, dus het is een bekend-goed baseline). Dit valideert dat de harness werkt, de UI leesbaar is, en de diff-view nuttig is, zonder dat er een nieuwe agent geschreven hoeft te worden.

## Requirements

| ID        | Beschrijving                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------------- |
| FUNC-E001 | Admin kan in `/dev/extractor` een bestaande meeting kiezen uit een lijst                                 |
| FUNC-E002 | Admin kan een extractie-type kiezen uit een dropdown (bij start alleen `action_item`)                    |
| FUNC-E003 | "Run" knop roept de type-specialist agent aan op het transcript van de gekozen meeting                   |
| FUNC-E004 | Resultaat wordt getoond in 4-panel view: transcript / huidige extractions / nieuwe extractions / diff    |
| FUNC-E005 | Transcript-panel highlight de `transcript_ref` quotes van de nieuwe extractions                          |
| FUNC-E006 | Huidige extractions panel leest uit `extractions` tabel gefilterd op `meeting_id` + gekozen `type`       |
| FUNC-E007 | Nieuwe extractions panel toont de verse output van de specialist agent (niet opgeslagen in DB)           |
| FUNC-E008 | Diff-panel toont side-by-side: welke extractions zijn hetzelfde, nieuw, of verdwenen                     |
| FUNC-E009 | De gebruikte system-prompt is read-only zichtbaar in de UI (collapsible)                                 |
| FUNC-E010 | Geen resultaat wordt opgeslagen in de DB — harness is volledig read-only voor de extractions-tabel       |
| AUTH-E001 | Pagina is alleen toegankelijk voor admin-rol; members en clients krijgen 403                             |
| UI-E001   | 4-panel layout op desktop, stacked op mobiel (of hidden op mobiel — dev-tool)                            |
| UI-E002   | Transcript-highlights zijn visueel gekleurd per extraction (afzonderlijke kleur per match)               |
| UI-E003   | Diff-view gebruikt duidelijke iconen/kleuren: groen voor nieuw, rood voor verdwenen, grijs voor identiek |
| UI-E004   | Run-knop toont loading-state tijdens de agent-call                                                       |
| UI-E005   | Meetings in de kiezer worden gesorteerd op datum (nieuwste eerst) met titel + datum + type               |
| RULE-E001 | Harness runt alleen op meetings waarvan `transcript_raw` beschikbaar is                                  |
| RULE-E002 | Voor `action_item`: pagina gebruikt de bestaande `runExtractor` zonder wijziging aan die agent           |
| RULE-E003 | Prompt en agent-code worden geïmporteerd vanuit `packages/ai/src/agents/` (geen duplicatie)              |
| DATA-E001 | Nieuwe run wordt NIET in `extractions` tabel opgeslagen (ephemerale in-memory resultaat)                 |
| SEC-E001  | Server Action die de agent runt, checkt admin-rol via `requireAdmin()` uit `@repo/auth`                  |
| EDGE-E001 | Meeting zonder transcript → duidelijke error-melding in UI                                               |
| EDGE-E002 | Agent-call timeout of error → error-melding in UI zonder crash                                           |
| EDGE-E003 | Meeting zonder huidige extractions → huidige-panel toont "Geen extractions voor dit type"                |

## Bronverwijzingen

- Brief van de gebruiker: zie opdrachtbeschrijving in deze sessie (sectie "Sprint EX-000: Test-harness")
- Bestaande Extractor agent: `packages/ai/src/agents/extractor.ts`
- Bestaande Extractor validations: `packages/ai/src/validations/extractor.ts`
- Extractions tabel: `supabase/migrations/20260329000007_extractions.sql`
- Auth helpers: `packages/auth/src/` (via `DH-014-auth-helpers-assertions.md`)
- Cockpit admin-only routes: `apps/cockpit/src/app/(dashboard)/admin/`
- Cockpit middleware: `apps/cockpit/src/middleware.ts`
- Vision: `docs/specs/vision-ai-native-architecture.md` §4 (knowledge quality)

## Context

### Probleem

De huidige manier om een extractor-prompt te tunen is: code wijzigen → seed een meeting naar de staging pipeline → wachten tot Fireflies het oppikt → in de DB kijken of de output verbeterd is. Dit is traag, vereist productie-setup, en vervuilt de DB met test-extracties. Voor de 9 Tier-1 types die we gaan tunen is een snellere feedback-loop nodig.

### Oplossing

Een ephemerale dev-pagina die:

1. Een bestaande meeting uit de DB leest (met transcript) — geen nieuwe meetings nodig.
2. Een type-specialist agent aanroept op dat transcript — resultaat blijft in memory.
3. De output naast de huidige DB-extractions toont, met een visuele diff.
4. De system-prompt zichtbaar maakt zodat tijdens tunen snel duidelijk is wát er veranderde.

De admin kan zo in een paar minuten 5-10 echte meetings door een nieuwe agent runnen en kalibreren tegen de bestaande (getunede) output.

### Architectuur

```
apps/cockpit/src/app/(dashboard)/dev/extractor/
├── page.tsx                     -- Server Component: route-guard + initiele meeting-lijst
├── loading.tsx
├── error.tsx
└── client.tsx                   -- Client Component: state voor kiezer + resultaat-panels

apps/cockpit/src/actions/
└── dev-extractor.ts             -- Server Action: runDevExtractor(meetingId, type)

apps/cockpit/src/components/dev-extractor/
├── meeting-picker.tsx           -- Dropdown + zoekveld voor meetings
├── type-picker.tsx              -- Dropdown voor extractie-type
├── transcript-panel.tsx         -- Transcript met highlighted quotes
├── existing-extractions-panel.tsx   -- Lees uit DB
├── fresh-extractions-panel.tsx  -- Ephemerale run-output
├── diff-panel.tsx               -- Side-by-side diff
└── prompt-viewer.tsx            -- Read-only system-prompt weergave
```

### Type-registry

Er komt een centrale registry `packages/ai/src/agents/test-extractors/registry.ts` die per type een specialist agent koppelt. In EX-000 bevat deze alleen:

```typescript
import { runExtractor } from "../extractor";
import { ExtractorOutput } from "../../validations/extractor";

type SpecialistRunner = (transcript: string, context: RunContext) => Promise<unknown>;

export const TEST_EXTRACTOR_REGISTRY: Record<string, { runner: SpecialistRunner; prompt: string }> =
  {
    action_item: {
      runner: runExtractor,
      prompt: ACTION_ITEM_SYSTEM_PROMPT, // geëxporteerd uit extractor.ts
    },
  };
```

EX-001 t/m EX-008 voegen elk één entry toe aan deze registry.

### Server Action contract

```typescript
// apps/cockpit/src/actions/dev-extractor.ts
"use server";

export interface DevExtractorResult {
  type: string;
  freshExtractions: unknown[]; // specialist-agent output (type-specific)
  existingExtractions: ExtractionRow[]; // uit DB, zelfde meeting + type
  diff: {
    new: unknown[];
    removed: ExtractionRow[];
    identical: unknown[];
  };
  systemPrompt: string;
  transcript: string;
  meetingTitle: string;
  meetingDate: string;
}

export async function runDevExtractor(
  meetingId: string,
  type: string,
): Promise<{ success: true; data: DevExtractorResult } | { error: string }>;
```

### Diff-algoritme (simpel, tekstueel)

Voor EX-000: diff is content-based. Twee extractions zijn "identiek" als hun `content` string case-insensitief overeenkomt. Alles daarbuiten is "nieuw" (fresh maar niet in DB) of "verdwenen" (DB maar niet in fresh).

Voor latere types kan dit verfijnd worden (bv. metadata-vergelijking), maar simpel houden voor EX-000.

### Toegangscontrole

- Middleware in `apps/cockpit/src/middleware.ts` laat `/dev/*` door voor ingelogde users, maar de pagina zelf doet een `requireAdmin()`-call en redirect op failure naar `/` met een toast.
- Server Action `runDevExtractor` doet ook `requireAdmin()` (defense-in-depth).

### Files touched

| Bestand                                                                    | Wijziging                                                                                                                  |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `apps/cockpit/src/app/(dashboard)/dev/extractor/page.tsx`                  | nieuw                                                                                                                      |
| `apps/cockpit/src/app/(dashboard)/dev/extractor/loading.tsx`               | nieuw                                                                                                                      |
| `apps/cockpit/src/app/(dashboard)/dev/extractor/error.tsx`                 | nieuw                                                                                                                      |
| `apps/cockpit/src/app/(dashboard)/dev/extractor/client.tsx`                | nieuw                                                                                                                      |
| `apps/cockpit/src/actions/dev-extractor.ts`                                | nieuw                                                                                                                      |
| `apps/cockpit/src/components/dev-extractor/meeting-picker.tsx`             | nieuw                                                                                                                      |
| `apps/cockpit/src/components/dev-extractor/type-picker.tsx`                | nieuw                                                                                                                      |
| `apps/cockpit/src/components/dev-extractor/transcript-panel.tsx`           | nieuw                                                                                                                      |
| `apps/cockpit/src/components/dev-extractor/existing-extractions-panel.tsx` | nieuw                                                                                                                      |
| `apps/cockpit/src/components/dev-extractor/fresh-extractions-panel.tsx`    | nieuw                                                                                                                      |
| `apps/cockpit/src/components/dev-extractor/diff-panel.tsx`                 | nieuw                                                                                                                      |
| `apps/cockpit/src/components/dev-extractor/prompt-viewer.tsx`              | nieuw                                                                                                                      |
| `packages/ai/src/agents/test-extractors/registry.ts`                       | nieuw                                                                                                                      |
| `packages/ai/src/agents/extractor.ts`                                      | export `SYSTEM_PROMPT` constant (nu file-lokaal)                                                                           |
| `packages/database/src/queries/dev-extractor.ts`                           | nieuw — `listMeetingsWithTranscript()`, `getMeetingWithTranscript(id)`, `listExtractionsByMeetingAndType(meetingId, type)` |
| `apps/cockpit/src/app/(dashboard)/dev/extractor/__tests__/action.test.ts`  | nieuw (Server Action gedragstest)                                                                                          |
| `packages/ai/__tests__/agents/test-extractors/registry.test.ts`            | nieuw                                                                                                                      |

### Niet geraakt

- `packages/ai/src/pipeline/` (geen productie-pipeline-wijzigingen)
- `packages/ai/src/agents/extractor.ts` body (alleen `SYSTEM_PROMPT` geëxporteerd)
- `extractions` tabel en RLS policies
- Alle bestaande cockpit-routes buiten `/dev/`

## Prerequisites

- DH-013 t/m DH-015 (access-control) — al done. `requireAdmin()` bestaat.
- Geen andere prereqs.

## Taken

### TDD-first

- [ ] Schrijf test `packages/ai/__tests__/agents/test-extractors/registry.test.ts` — verifieert dat `TEST_EXTRACTOR_REGISTRY.action_item` bestaat, een `runner` heeft die een callable is, en een `prompt` string heeft die niet leeg is.
- [ ] Schrijf test `apps/cockpit/src/app/(dashboard)/dev/extractor/__tests__/action.test.ts`:
  - Admin → returned `{ success: true, data: { ... }}` bij geldige meeting + `action_item` type.
  - Non-admin → `{ error: "forbidden" }` of throw.
  - Meeting zonder transcript → `{ error: "Meeting heeft geen transcript" }`.
  - Agent-call error → wordt gevangen en teruggegeven als error.
  - DB wordt NIET muteert (verify: count van `extractions` blijft identiek voor/na de call).

### Implementatie

- [ ] Exporteer `SYSTEM_PROMPT` uit `packages/ai/src/agents/extractor.ts` zodat de registry ernaar kan verwijzen.
- [ ] Maak `packages/ai/src/agents/test-extractors/registry.ts` met alleen `action_item`.
- [ ] Maak queries `packages/database/src/queries/dev-extractor.ts`:
  - `listMeetingsWithTranscript(limit = 50)` — meetings met non-null `transcript_raw`, sorted op `date DESC`.
  - `getMeetingWithTranscript(id)` — single meeting met transcript + context-velden.
  - `listExtractionsByMeetingAndType(meetingId, type)` — rijen uit `extractions` tabel.
- [ ] Maak Server Action `apps/cockpit/src/actions/dev-extractor.ts`:
  - `requireAdmin()` boven in functie.
  - Load meeting + transcript.
  - Roep `TEST_EXTRACTOR_REGISTRY[type].runner(transcript, context)` aan.
  - Query huidige extractions uit DB (gefilterd op type).
  - Bereken simpele diff op `content`.
  - Return `DevExtractorResult`.
- [ ] Maak route-pagina `app/(dashboard)/dev/extractor/page.tsx` — Server Component. Doet `requireAdmin()`, laadt meeting-lijst, rendert client.
- [ ] Maak Client Component `client.tsx` met state voor gekozen meeting + type + resultaat. Roept Server Action bij "Run".
- [ ] Maak 7 presentational components (meeting-picker, type-picker, transcript-panel, existing/fresh/diff/prompt-viewer).
- [ ] Voeg `loading.tsx` + `error.tsx` toe aan de route.
- [ ] Handmatige test: run op 3 bestaande meetings met `action_item` type. Verifieer dat de fresh-output overeenkomt met wat er al in de DB staat (bewijs dat de bestaande extractor reproduceerbaar is via de harness).

### Validatie

- [ ] `npm run type-check` groen.
- [ ] `npm run lint` groen.
- [ ] `npm run test` groen (incl. nieuwe tests).
- [ ] Handmatig: non-admin probeert `/dev/extractor` → redirect of 403.
- [ ] Handmatig: admin runt harness op meeting zonder transcript → nette error.

## Acceptatiecriteria

- [ ] [FUNC-E001] Meeting-kiezer toont minstens 20 recente meetings met transcript.
- [ ] [FUNC-E002] Type-kiezer toont `action_item` als enige optie na deze sprint.
- [ ] [FUNC-E003] Run-knop triggert server action die de specialist agent aanroept.
- [ ] [FUNC-E004] Pagina toont 4 duidelijk gescheiden panels.
- [ ] [FUNC-E005] Transcript-panel highlight quotes uit fresh extractions.
- [ ] [FUNC-E006] Huidige extractions worden uit DB gelezen gefilterd op meeting + type.
- [ ] [FUNC-E007] Fresh-output is zichtbaar direct na een succesvolle run.
- [ ] [FUNC-E008] Diff toont new/removed/identical secties, elk met zichtbare items.
- [ ] [FUNC-E009] System-prompt is (collapsible) zichtbaar in UI.
- [ ] [FUNC-E010] Geen nieuwe rijen in `extractions` tabel na een harness-run.
- [ ] [AUTH-E001] Non-admin wordt geredirect of ziet 403 op `/dev/extractor`.
- [ ] [SEC-E001] Server Action weigert non-admin calls.
- [ ] [RULE-E001] Meeting-kiezer toont geen meetings zonder `transcript_raw`.
- [ ] [RULE-E002] `action_item` runs gebruiken `runExtractor` uit `packages/ai/src/agents/extractor.ts` ongewijzigd.
- [ ] [DATA-E001] Na 3 opeenvolgende runs is `SELECT COUNT(*) FROM extractions WHERE meeting_id = X` ongewijzigd.
- [ ] [EDGE-E001] Meeting zonder transcript → error-toast in UI, geen crash.
- [ ] [EDGE-E002] Agent error → error-toast, run-knop blijft bruikbaar.
- [ ] [EDGE-E003] Meeting zonder huidige extractions → panel toont "Geen extractions".
- [ ] Tests groen: registry.test.ts + action.test.ts.

## Dependencies

Geen. Dit is de eerste sprint van de extractie-refactor tranche.

## Out of scope

- Nieuwe extractie-types. Die komen in EX-001 t/m EX-008.
- Bewerken van de prompt in de UI (read-only weergave volstaat).
- Persisteren van harness-runs voor historische vergelijking.
- Project-workspace panelen (komen per type in EX-001 t/m EX-008).
- Productie-wijziging aan Summarizer of Extractor (komt in EX-009).
- Tier-2 types (idea, insight, client_sentiment, pricing_signal, milestone).
- tuning_status veld op extractions (komt in EX-001).
