# Sprint 035: Summarizer project-prefix + Tagger prefix-parser

## Doel

Project-attributie voor kernpunten en vervolgstappen verbeteren in multi-project meetings (vooral interne team-syncs en one-on-ones) door de Summarizer een verplichte project-prefix (`[ProjectNaam]` of `[Algemeen]`) te laten toevoegen aan elke thema-kop en elke vervolgstap. De Tagger parseert die prefix, propageert de attributie via thema-inheritance voor kernpunten en self-attributing per vervolgstap, en valt terug op de bestaande rule-based matcher voor oude data of vergeten prefixes. Géén database-schema changes. Géén migratie. Volledig backward compatible.

## Requirements

| ID       | Beschrijving                                                                                                                      |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| AI-060   | Summarizer-prompt voegt project-prefix toe aan elke thema-kop: `### [ProjectNaam] Themanaam` of `### [Algemeen] Themanaam`        |
| AI-061   | Summarizer-prompt voegt project-prefix toe aan elke vervolgstap: `[ProjectNaam] Actie — eigenaar, deadline` of `[Algemeen] ...`   |
| AI-062   | Summarizer gebruikt EXACTE projectnaam uit BEKENDE ENTITEITEN; `[Algemeen]` voor niet-project-specifieke content                  |
| AI-063   | Tagger parseert prefix uit thema-kop (kernpunten) en propageert attributie naar items onder die kop                               |
| AI-064   | Tagger parseert prefix uit elke vervolgstap individueel (self-attributing, geen inheritance)                                      |
| AI-065   | Geparste prefix wordt gematcht tegen Gatekeeper-identified projects (confidence 1.0) + knownProjects naam/alias (confidence 0.95) |
| AI-066   | Prefix `[Algemeen]` (case-insensitive) → `project_name=null`, `project_id=null`                                                   |
| AI-067   | Prefix zonder match tegen bekende projecten → item naar Algemeen (géén hallucinated `project_name_raw` in DB)                     |
| AI-068   | Prefix wordt gestript uit content voordat het naar segment-builder gaat                                                           |
| AI-069   | Kernpunt zonder thema-prefix → fallback op bestaande rule-based matching                                                          |
| AI-070   | Vervolgstap zonder prefix → fallback op bestaande rule-based matching                                                             |
| FUNC-070 | `formatSummary()` blijft leesbare markdown produceren; prefixes zichtbaar in `ai_summary` (user choice)                           |
| FUNC-071 | `ai_briefing` (plain text) wijzigt NIET                                                                                           |
| RULE-017 | Backward compat: pre-deploy meetings zonder prefix werken via rule-based fallback                                                 |
| RULE-018 | Prefix-parser errors breken pipeline niet; pipeline-level RULE-015 blijft backstop                                                |
| EDGE-010 | Malformed prefix (`[unclosed`, `[]`, lege naam) → behandelen als "geen prefix" → fallback                                         |
| EDGE-011 | Nested brackets `[[X]]` → regex weigert → "geen prefix"                                                                           |
| EDGE-012 | Item-level prefix overrided thema-inheritance                                                                                     |

## Bronverwijzingen

- Sprint 022 (klaar): `sprints/done/sprint-022-tagger-segment-build.md` — rule-based Tagger + segment-bouw.
- Spec: `docs/specs/project-segmented-summaries.md` — originele Tagger-design, blijft van kracht als fallback.
- Vision: `docs/specs/vision-ai-native-architecture.md` — knowledge quality / project-attributie.
- Gatekeeper identified_projects contract: `packages/ai/src/validations/gatekeeper.ts`.

## Context

### Probleem

De huidige Tagger (`packages/ai/src/pipeline/tagger.ts`) matcht ieder kernpunt en iedere vervolgstap in isolatie tegen projectnamen via string-matching. Dit faalt structureel in multi-project meetings waarin een projectnaam typisch maar één keer aan het begin van een blok valt. Gevolg: 1 punt matcht, de rest van het blok valt naar "Algemeen". Impact vooral op interne team-syncs en 1-op-1s.

### Oplossing (Niveau 1)

Verplaats project-attributie naar de Summarizer (Sonnet heeft al full transcript + `entityContext` met projectnamen/aliases), via een prefix-conventie op thema-koppen en vervolgstappen:

```
### [Klantportaal] Upload-flow
**Besluit:** We bouwen een upload-veld.
**Risico:** Performance moet gemonitord worden.

### [IntraNext Migratie] Planning Q3
**Besluit:** Deadline verschoven naar eind september.

### [Algemeen] Team-observaties
**Signaal:** Team ervaart werkdruk op dinsdagen.
```

Vervolgstappen:

```
[Klantportaal] Deploy nieuwe upload-flow — Wouter, vrijdag
[IntraNext Migratie] Schema-review voorbereiden — Stef, maandag
[Algemeen] Retro inplannen — Stef
```

### Gedrag van de Tagger

- **Kernpunten:** Parse elke `### [X] …`-kop → `currentTheme = X` → propageer naar alle kernpunten eronder tot de volgende `###`-kop. Item-level prefix (op een kernpunt zelf) overrided de inheritance (EDGE-012).
- **Vervolgstappen:** Parse prefix per entry (geen inheritance).
- **Strip-regex:** `^\[([^\[\]]+)\]\s+([\s\S]+)$`. Niet-greedy op brackets, geen nested, geen lege naam.
- Prefix wordt uit content gestript voordat het naar segment-builder gaat.
- **Backward compat:** zonder prefix valt Tagger terug op bestaande rule-based matching.
- **Hallucinated prefix:** geen match tegen Gatekeeper noch knownProjects → item valt via rule-based door op gestripte content; als die niets matcht → Algemeen. Geen vervuilde `project_name_raw` in DB.

### Files touched

| Bestand                                                   | Wijziging                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ai/src/agents/summarizer.ts`                    | `SYSTEM_PROMPT` uitbreiden (prefix-instructies + voorbeelden in KERNPUNTEN- en VERVOLGSTAPPEN-secties). `formatSummary()` onveranderd.                                                                                                                                                |
| `packages/ai/src/validations/summarizer.ts`               | Alleen Zod `.describe()` tekst bijwerken met prefix-voorbeeld — geen structurele schema-change.                                                                                                                                                                                       |
| `packages/ai/src/pipeline/tagger.ts`                      | Nieuwe helpers `parsePrefix()` + `resolvePrefixProject()`. Refactor `tagItems()` in `tagKernpunten()` (thema-inheritance) en `tagVervolgstappen()` (self-attributing). Bestaande rule-based matching blijft intact als fallback. Thema-koppen worden nu geconsumeerd, niet gefilterd. |
| `packages/ai/__tests__/pipeline/tagger.test.ts`           | Nieuwe test-suites (12+ nieuwe cases voor alle requirements + edge-cases).                                                                                                                                                                                                            |
| `packages/ai/__tests__/pipeline/segment-builder.test.ts`  | Eén regressie-assertion: segmenten bevatten GEEN `[X]`-prefix in content.                                                                                                                                                                                                             |
| `sprints/backlog/sprint-035-summarizer-project-prefix.md` | Sprint-brief (dit bestand).                                                                                                                                                                                                                                                           |

**Niet geraakt (wel geverifieerd):** `gatekeeper-pipeline.ts`, `segment-builder.ts`, `context-injection.ts`, alle UI-componenten (react-markdown rendert brackets correct), MCP tools, weekly/project-summarizers.

## Taken

- [x] Tests schrijven (TDD, in `packages/ai/__tests__/pipeline/tagger.test.ts`):
  - AI-063 thema-inheritance + reset op volgende kop
  - AI-064 vervolgstap self-attributing
  - AI-066 `[Algemeen]` / `[ALGEMEEN]` → null project
  - AI-067 hallucinated project → Algemeen, geen `project_name_raw` lek
  - AI-068 content gestript van prefix
  - AI-069 thema-kop zonder prefix → fallback per item naar rule-based
  - AI-070 vervolgstap zonder prefix → rule-based
  - AI-065 alias- en naam-match via knownProjects (0.95)
  - EDGE-010 malformed prefix → fallback
  - EDGE-011 nested brackets → fallback
  - EDGE-012 item-level prefix overrided thema-inheritance
  - RULE-017 regressie: hele meeting zonder prefixes → identiek aan huidige rule-based output
- [x] `parsePrefix(text)` helper in `tagger.ts`.
- [x] `resolvePrefixProject(name, identifiedProjects, knownProjects, ignoredNames)` helper.
- [x] Refactor tagger: split in `tagKernpunten()` (thema-inheritance + item-level override) en `tagVervolgstappen()` (self-attributing). Beide vallen terug op `ruleBasedMatch()` bij geen/malformed prefix.
- [x] Thema-koppen worden geconsumeerd (voor inheritance) i.p.v. gefilterd — maar niet als content naar segmenten geschreven.
- [x] Summarizer `SYSTEM_PROMPT` updaten: KERNPUNTEN-sectie (verplichte `[ProjectNaam]` prefix op thema-kop, nieuwe voorbeelden), VERVOLGSTAPPEN-sectie (prefix verplicht, voorbeelden, expliciet `[Algemeen]` voor niet-project-specifiek).
- [x] Zod `.describe()` updaten — alleen beschrijvingstekst, geen structurele change.
- [x] Regressie-assertie in `segment-builder.test.ts` voor gestripte content.
- [x] Tests groen + typecheck groen + lint groen op workspace-niveau.
- [ ] End-to-end handmatig (zie Verificatie).

## Acceptatiecriteria

- [x] [AI-060] Summarizer-prompt eist `### [ProjectNaam] Themanaam` op elke thema-kop.
- [x] [AI-061] Summarizer-prompt eist `[ProjectNaam] Actie — eigenaar, deadline` op elke vervolgstap.
- [x] [AI-062] Prompt eist EXACT `[Algemeen]` en EXACT de schrijfwijze uit BEKENDE ENTITEITEN.
- [x] [AI-063] `tagKernpunten()` parseert thema-prefix en propageert attributie (test: `propagates theme-prefix project to all kernpunten under that theme`).
- [x] [AI-064] `tagVervolgstappen()` parseert prefix per vervolgstap zonder inheritance.
- [x] [AI-065] Prefix-resolutie: Gatekeeper 1.0, knownProjects naam/alias 0.95.
- [x] [AI-066] `[Algemeen]` (case-insensitive) → null project / null id / confidence 0.
- [x] [AI-067] Onbekende prefix → item naar Algemeen; `project_name_raw` bevat NIET de hallucinated naam.
- [x] [AI-068] Content in `TaggedItem.content` + segmenten bevat GEEN `[X]`-prefix meer.
- [x] [AI-069] Thema-kop zonder prefix → `currentTheme = null` → per-item rule-based fallback.
- [x] [AI-070] Vervolgstap zonder prefix → rule-based fallback.
- [x] [FUNC-070] `formatSummary()` ongewijzigd — prefixes blijven zichtbaar in `ai_summary` (bewuste keuze).
- [x] [FUNC-071] `ai_briefing` (briefing-veld) ongewijzigd in schema.
- [x] [RULE-017] Hele meeting zonder prefixes produceert identieke output aan pre-sprint (regressietest).
- [x] [RULE-018] Parser-fouten breken pipeline niet; RULE-015 in `gatekeeper-pipeline.ts` blijft backstop.
- [x] [EDGE-010] Malformed prefix (`[unclosed`, `[]`, whitespace-only) → fallback.
- [x] [EDGE-011] Nested brackets `[[X]]` → regex weigert → fallback.
- [x] [EDGE-012] Item-level prefix wint van inherited thema (test verifieert override + continue inheritance daarna).

## Risico's en aandachtspunten

- **Sonnet-compliance:** Sonnet kan prefix vergeten, vooral bij 1-project meetings. Mitigatie: rule-based fallback (AI-069/AI-070) + prompt expliciet maken dat prefix ALTIJD aanwezig moet zijn, ook bij één project.
- **Sonnet-varianten op "Algemeen":** kan `[Geen project]`, `[Intern]` proberen. Mitigatie: prompt eist EXACT `[Algemeen]`; parser matcht alleen literal `algemeen`. Varianten → no-match → rule-based fallback → Algemeen (veilig).
- **Hallucinated project:** `[Nieuwe App]` dat niet in Gatekeeper + knownProjects zit → AI-067 vangt op: item naar Algemeen, geen vervuilde `project_name_raw` in DB.
- **Meerdere prefixes in één item:** regex pakt alleen de eerste. Prompt instrueert "één prefix per kop, splits thema's per project".
- **Prompt-cache invalidation:** `SYSTEM_PROMPT`-wijziging invalideert Anthropic prompt cache één keer. Acceptabel.
- **Token-overhead:** prefix per item = <2% meer output tokens. Verwaarloosbaar.

## Verificatie

### Unit

```bash
npm run test  # alle @repo/ai tests, inclusief 12+ nieuwe Tagger-cases en 1 segment-builder regressie
npm run type-check
npm run lint
```

### End-to-end (handmatig, na merge)

1. Kies een bestaande multi-project meeting in dev (bv. een 1-op-1 met Wouter waar 2-3 projecten besproken zijn).
2. Re-run de pipeline via de re-process action (`apps/cockpit/src/app/api/ingest/reprocess/route.ts`).
3. Inspecteer `meetings.ai_summary` in DB: verwacht `### [ProjectNaam] Thema`-headers en `[ProjectNaam] ...` vervolgstappen.
4. Inspecteer `meeting_project_summaries` rows:
   - ≥2 segmenten (eerder meestal 1 project + Algemeen).
   - `kernpunten[]` bevat GEEN `[...]` prefixes (gestript).
   - `project_id` correct gevuld per segment waar Gatekeeper/known het kende.
5. Open meeting-detail pagina in de cockpit UI:
   - Markdown-sectie toont `### [Klantportaal] Upload-flow` (prefixes zichtbaar, user choice).
   - Segmenten-sectie toont per project een blok met clean kernpunten (geen brackets).
6. Open een OUDE meeting (pre-deploy): segmenten ongewijzigd aanwezig — fallback werkt (RULE-017).

### Goed-resultaat-signalen

- Multi-project meeting: kernpunten correct verdeeld, niet 90% naar Algemeen.
- 1-project meeting: zelfde resultaat als vóór de sprint.
- Interne sync zonder projecten: 1 Algemeen-segment, gedrag identiek.
- Geen uncaught errors in pipeline-logs.
- `ai_briefing` op dashboard carousel: visueel identiek aan voor de sprint (FUNC-071).

### Optionele meet-laag (aanbevolen, niet in scope van deze sprint)

Voeg na `buildSegments` een `console.info`-log toe met aantal segmenten + % Algemeen, om na 10 multi-project meetings te bewijzen of de fix werkt. Bij %Algemeen < ~15% → succes. Anders → Niveau 2 (LLM-classifier) of Niveau 3 (schema-wijziging).

## Geraakt door deze sprint

- `packages/ai/src/pipeline/tagger.ts` (refactor: `parsePrefix`, `resolvePrefixProject`, `tagKernpunten`, `tagVervolgstappen`, `ruleBasedMatch`, `contentFromResolution`)
- `packages/ai/src/agents/summarizer.ts` (SYSTEM_PROMPT uitgebreid)
- `packages/ai/src/validations/summarizer.ts` (Zod `.describe()` tekst bijgewerkt)
- `packages/ai/__tests__/pipeline/tagger.test.ts` (12+ nieuwe cases)
- `packages/ai/__tests__/pipeline/segment-builder.test.ts` (1 regressie-assertie)
- `sprints/backlog/sprint-035-summarizer-project-prefix.md` (dit bestand)
