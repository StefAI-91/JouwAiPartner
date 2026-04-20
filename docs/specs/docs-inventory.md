# Docs Inventory — Q4a Spike-rapport

**Datum:** 2026-04-20
**Scope:** volledige `docs/`, `sprints/`, `packages/*/README*`, `.claude/`, `.husky/`, `package.json`, `CLAUDE.md`
**Status:** spike — alleen observaties, geen wijzigingen. Basis voor Q4b (spec sync execution).
**Afbakening Q4b:** alles wat in sectie 10 staat is concreet en vast-scoped. Nieuwe ideeën horen in een vervolg-spike, niet in Q4b.

---

## 1. Sprint-telling (definitief)

### 1.1 Totaalcijfers

| Locatie            | Aantal bestanden | Waarvan sprint-specs                                                                     |
| ------------------ | ---------------- | ---------------------------------------------------------------------------------------- |
| `sprints/done/`    | 70               | 70                                                                                       |
| `sprints/backlog/` | 15               | 14 (+ 1 README)                                                                          |
| `docs/backlog/`    | 17               | 13 (+ 2 indexes + 2 READMEs — PW-index, DH-013-020-index, README, PW-QC-index zijn meta) |

**Totaal sprint-specs (done + backlog):** 70 + 14 + 13 = 97 sprint-documenten. Voor "done" staat alleen 70 vast. Voor `docs/backlog/` geldt dat PW-01/02/03 + PW-QC-01..04 + DH-008/009 + DH-013..016 niet gemigreerd zijn naar `sprints/backlog/`, maar wél sprint-specs zijn.

### 1.2 Breakdown per prefix (`sprints/done/`, 70 items)

| Prefix         | Aantal | Sprint-range                                                             |
| -------------- | ------ | ------------------------------------------------------------------------ |
| `sprint-NNN-`  | 36     | 001, 002, 003, …, 028, 031–036 (+2x 015, +2x 016 parallelle workstreams) |
| `sprint-Q2b-*` | 3      | Q2b-A, Q2b-B, Q2b-C                                                      |
| `sprint-Q3*`   | 2      | Q3a, Q3b                                                                 |
| `sprint-T*`    | 6      | T02–T07                                                                  |
| `CP-*`         | 5      | CP-001 … CP-005                                                          |
| `DH-*`         | 14     | DH-001..007, DH-010..012, DH-017..020                                    |
| `FND-*`        | 4      | FND-001..004                                                             |

**Nummer-collisie:** `sprint-035-*.md` bestaat in `sprints/done/` (board-meetings-management) **én** in `sprints/backlog/` (summarizer-project-prefix). Twee verschillende sprints met hetzelfde nummer. Q4b-actie: hernummer de backlog-variant (bv. 038) of gebruik prefix.

### 1.3 CLAUDE.md-regel

Huidige string (line 30): _"39 sprints done (28 core + 4 foundation + 7 DevHub)"_. Dat was correct bij de laatste update maar is inmiddels drift: 70 done, niet 39. Voorgestelde nieuwe zin voor Q4b:

> "70 sprints done (36 core + 5 CP-portal + 4 foundation + 14 DevHub + 6 testing + 5 quality). Cockpit fully built … DevHub fase 1 complete (DH-001..007, DH-010..012, DH-017..020). Portal MVP wireframed (CP-001..005 done)."

**Afweging:** splitsing per categorie toevoegen of kort "70 sprints done" met verwijzing naar `sprints/done/README.md` (bestaat nog niet — Q4b-optie: maak summary README in done/).

### 1.4 `sprints/backlog/README.md` — regel 38

Huidige regel: _"All completed sprints are in `sprints/done/`. Total: 39 sprints."_ → moet 70 worden. Tabel in hetzelfde bestand is ook verouderd (zie §9).

---

## 2. Docs-structuur + statussen

### 2.1 Toplevel `docs/`

| Pad                            | Doel                                                        | Status                                                         |
| ------------------------------ | ----------------------------------------------------------- | -------------------------------------------------------------- |
| `docs/dependency-graph.md`     | Auto-gegenereerde graf v/d codebase                         | Actueel (husky pre-commit)                                     |
| `docs/test-coverage-report.md` | Coverage baseline Q3b                                       | Actueel (handmatig, Q3b)                                       |
| `docs/testing.md`              | Algemene test-guidelines                                    | Te reviewen in Q4b — ouder dan test-strategy.md                |
| `docs/specs/`                  | Bron van waarheid voor PRD/design/requirements              | Drift — zie §2.2                                               |
| `docs/backlog/`                | Pre-sprint specs die nog niet naar sprints/ verplaatst zijn | Drift — zie §9                                                 |
| `docs/security/`               | Security audit + protocollen + 4 oude sprints               | Actueel maar 4 sprint-specs liggen hier i.p.v. `sprints/done/` |
| `docs/archive/`                | Archief van PRD v1/v2 + extraction-tranche-v1               | Correct gearchiveerd                                           |
| `docs/email-templates/`        | 2 HTML-templates (magic-link + invite)                      | Actueel                                                        |

### 2.2 `docs/specs/` — 19 files

| File                               | Bytes  | Status / observatie                                                |
| ---------------------------------- | ------ | ------------------------------------------------------------------ |
| `vision-ai-native-architecture.md` | 38 kB  | Drift — agent roster klopt niet (zie §4)                           |
| `platform-spec.md`                 | 43 kB  | Technische bron van waarheid — steekproef Q4b vereist              |
| `requirements.md`                  | 20 kB  | v1 register, 90 requirements (zie §5)                              |
| `requirements-v2.md`               | 25 kB  | v2 review/dashboard register, 98 requirements                      |
| `requirements-devhub.md`           | 61 kB  | DevHub fase 1, 119 requirements — niet bijgewerkt sinds 2026-04-09 |
| `requirements-portal.md`           | 17 kB  | Portal MVP, 72 requirements                                        |
| `requirements-testing.md`          | 12 kB  | Testing, 68 requirements                                           |
| `prd-devhub.md`                    | 76 kB  | PRD fase 1 — steekproef Q4b                                        |
| `prd-feedback-widget.md`           | 14 kB  | Userback widget specs                                              |
| `plan-userback-integratie.md`      | 7 kB   | Kan waarschijnlijk naar archive (Userback is live, DH-007 done)    |
| `portal-mvp.md`                    | 14 kB  | Portal wireframes — alignment met vision vereist                   |
| `project-segmented-summaries.md`   | 23 kB  | v3 design                                                          |
| `meeting-extraction-strategy.md`   | 4 kB   | Mogelijk achterhaald na RiskSpecialist-only extractie              |
| `query-inventory.md`               | 31 kB  | Gegenereerd door Q2a                                               |
| `test-strategy.md`                 | 22 kB  | Gegenereerd door Q3a — actueel                                     |
| `style-guide.md`                   | 13 kB  | Design tokens                                                      |
| `v2-review-dashboard.md`           | 29 kB  | v2-doc — mogelijk archiveerbaar                                    |
| `revieuw-que.html`                 | 10 kB  | Typo ("revieuw") + HTML — Q4b: verplaats of verwijder              |
| `sketches/`                        | folder | Design sketches — negeer                                           |

### 2.3 Twee-locatie-backlog (drift-oorzaak)

- `docs/backlog/` = pre-sprint specs (PW, PW-QC, DH-fase-2, DH-013..020 access-control). Verschoven worden zodra de sprint écht gestart wordt.
- `sprints/backlog/` = actieve backlog (genummerd, master-lijst in README.md).

Reviewer-observatie was correct: PW-QC-01..04 staan in `docs/backlog/`, niet in `sprints/backlog/`. README in `sprints/backlog/` verwijst ernaar, maar de tabel mixt beide locaties zonder kolom "waar het bestand staat". Q4b-actie: voeg kolom toe of normaliseer naar één locatie.

---

## 3. Agent-registry-analyse

### 3.1 Geregistreerde agents (`packages/ai/src/agents/registry.ts`)

Exacte lijst uit `AGENT_REGISTRY`, 12 entries:

| #   | ID                    | Model      | Quadrant | Entrypoint                                                 |
| --- | --------------------- | ---------- | -------- | ---------------------------------------------------------- |
| 1   | `gatekeeper`          | Haiku 4.5  | cockpit  | `packages/ai/src/pipeline/gatekeeper-pipeline.ts`          |
| 2   | `summarizer`          | Sonnet 4.5 | cockpit  | `packages/ai/src/pipeline/steps/summarize.ts`              |
| 3   | `title-generator`     | Haiku 4.5  | cockpit  | `packages/ai/src/pipeline/steps/generate-title.ts`         |
| 4   | `needs-scanner`       | Haiku 4.5  | cockpit  | `packages/ai/src/pipeline/scan-needs.ts`                   |
| 5   | `management-insights` | Sonnet 4.5 | cockpit  | `packages/ai/src/pipeline/management-insights-pipeline.ts` |
| 6   | `weekly-summarizer`   | Sonnet 4.5 | cockpit  | `packages/ai/src/pipeline/weekly-summary-pipeline.ts`      |
| 7   | `project-summarizer`  | Haiku 4.5  | cockpit  | `packages/ai/src/pipeline/summary-pipeline.ts`             |
| 8   | `org-summarizer`      | Haiku 4.5  | cockpit  | `packages/ai/src/pipeline/summary-pipeline.ts`             |
| 9   | `email-classifier`    | Haiku 4.5  | cockpit  | `packages/ai/src/pipeline/email-pipeline.ts`               |
| 10  | `issue-classifier`    | Haiku 4.5  | devhub   | `apps/devhub/src/actions/classify.ts`                      |
| 11  | `issue-reviewer`      | Sonnet 4.5 | devhub   | `apps/devhub/src/actions/review.ts`                        |
| 12  | `risk-specialist`     | Sonnet 4.6 | cockpit  | `packages/ai/src/pipeline/steps/risk-specialist.ts`        |

**Status-kolom in registry:** alle 12 staan op `"live"`. Er zijn geen `"building"`-agents op dit moment.

### 3.2 Files in `packages/ai/src/agents/` (16 files)

| Bestand                  | Type           | In registry?                                           |
| ------------------------ | -------------- | ------------------------------------------------------ |
| `gatekeeper.ts`          | Agent          | ✓                                                      |
| `summarizer.ts`          | Agent          | ✓                                                      |
| `title-generator.ts`     | Agent          | ✓                                                      |
| `needs-scanner.ts`       | Agent          | ✓                                                      |
| `management-insights.ts` | Agent          | ✓                                                      |
| `weekly-summarizer.ts`   | Agent          | ✓                                                      |
| `project-summarizer.ts`  | Agent (2 IDs)  | ✓ (project-summarizer + org-summarizer in zelfde file) |
| `email-classifier.ts`    | Agent          | ✓                                                      |
| `issue-classifier.ts`    | Agent          | ✓                                                      |
| `issue-reviewer.ts`      | Agent          | ✓                                                      |
| `risk-specialist.ts`     | Agent          | ✓                                                      |
| `email-extractor.ts`     | Agent (orphan) | ✗ — geen call-site behalve registry-comment            |
| `issue-executor.ts`      | Agent (orphan) | ✗ — geen call-site behalve registry-comment            |
| `pricing.ts`             | Helper         | n.v.t.                                                 |
| `registry.ts`            | Registry-file  | n.v.t.                                                 |
| `run-logger.ts`          | Helper         | n.v.t.                                                 |

**Conclusie:**

- 12 geregistreerde, 13 agent-files op disk — want `project-summarizer.ts` bevat 2 agent-IDs (`project-summarizer` + `org-summarizer`) die hetzelfde bestand delen.
- 2 orphans: `email-extractor.ts`, `issue-executor.ts` — bewust uitgesloten (registry-comment regel 12). Reviewer-aanname "orphaned" was feitelijk juist, maar de context "bewust uitgesloten als placeholder voor toekomstig werk" ontbrak.
- **CLAUDE.md "12 actieve agents" klopt.** De verwarring 11 vs 12 zat in de vision-doc (zie §4).

### 3.3 Template `docs/specs/agents.md` (voor Q4b-6)

Voorgestelde kolommen: `ID | Naam | Rol | Mascotte | Model | Quadrant | Status | Prompt-file | Entrypoint | Doel`. Bron-genereerbaar uit `AGENT_REGISTRY` via kort script. Overweging: genereren of handmatig onderhouden? Aanbeveling: handmatig in Q4b, met TODO-regel bovenaan om later te auto-genereren (low priority — 12 agents wijzigen niet vaak).

---

## 4. Vision-doc vs registry — exacte diff

### 4.1 Huidige tekst in `docs/specs/vision-ai-native-architecture.md`

Sectie 4.1 (regel 276) zegt: **"Built agents (11)"**. De tabel die volgt (regel 278-290) bevat:

1. Gatekeeper
2. Summarizer
3. **Extractor** ← in dec 2025 vervangen door RiskSpecialist (commit cf3bc18)
4. Needs Scanner
5. Email Classifier
6. **Email Extractor** ← agent-file bestaat, niet in registry (orphan)
7. Project Summarizer
8. Weekly Summarizer
9. Issue Classifier
10. **Issue Executor** ← agent-file bestaat, niet in registry (orphan)
11. Issue Reviewer

Regel 292 zegt: **"Planned agents (5)"**: Planner, Curator, Analyst, Communicator, Support.
Regel 302: **"Planned infrastructure (1)"**: Dispatcher.
Regel 308: **"Future (not yet scoped)"**: Executor.

### 4.2 Diff met werkelijke registry

| Agent                   | Vision-status | Registry  | Actie Q4b                                                                       |
| ----------------------- | ------------- | --------- | ------------------------------------------------------------------------------- |
| Gatekeeper              | Built         | live      | ok                                                                              |
| Summarizer              | Built         | live      | ok                                                                              |
| Extractor               | Built         | ontbreekt | **Verwijder uit Built-tabel**; noot: "vervangen door RiskSpecialist 2026-04-xx" |
| Needs Scanner           | Built         | live      | ok                                                                              |
| Email Classifier        | Built         | live      | ok                                                                              |
| Email Extractor         | Built         | orphan    | **Verplaats naar Planned** met noot "agent-file bestaat, geen call-site"        |
| Project Summarizer      | Built         | live      | ok                                                                              |
| Weekly Summarizer       | Built         | live      | ok                                                                              |
| Issue Classifier        | Built         | live      | ok                                                                              |
| Issue Executor          | Built         | orphan    | **Verplaats naar Planned** met noot "agent-file bestaat, geen call-site"        |
| Issue Reviewer          | Built         | live      | ok                                                                              |
| **Title Generator**     | _ontbreekt_   | live      | **Voeg toe aan Built-tabel**                                                    |
| **Management Insights** | _ontbreekt_   | live      | **Voeg toe aan Built-tabel**                                                    |
| **Org Summarizer**      | _ontbreekt_   | live      | **Voeg toe aan Built-tabel** (deelt file met project-summarizer)                |
| **RiskSpecialist**      | _ontbreekt_   | live      | **Voeg toe aan Built-tabel** — key hoofd-extractor                              |

### 4.3 Concrete regel-wijzigingen voor Q4b-4

- Regel 276: `**Built agents (11):**` → `**Built agents (12):**`
- Tabel regel 278-290: 4 wijzigingen (Extractor verwijderen, Email Extractor + Issue Executor naar Planned, RiskSpecialist + Title Generator + Management Insights + Org Summarizer toevoegen).
- Regel 317 in de ASCII-roadmap: `TODAY (Built — 11 agents)` → `TODAY (Built — 12 agents)` + sublijst bijwerken.
- Regel 292 Planned-tabel: Email Extractor + Issue Executor toevoegen (status "wired-but-unused").
- Overige vision-secties (data flow, phases, decisions): niet gewijzigd — buiten scope Q4b.

**Geschatte impact Q4b-4:** 1-2 uur — alleen tabel + roadmap-ASCII herschrijven, geen nieuwe secties.

---

## 5. Requirements-docs scope-meting

### 5.1 Omvang per register

| File                      | Regels | Zelf-opgegeven totaal | Gemeten IDs (regex)       | Gegenereerd op |
| ------------------------- | ------ | --------------------- | ------------------------- | -------------- |
| `requirements.md`         | 168    | 90 requirements       | 132 regels met ID-pattern | 2026-03-29     |
| `requirements-v2.md`      | 183    | 98 requirements       | 99                        | 2026-03-31     |
| `requirements-devhub.md`  | 363    | 119 requirements      | 272                       | 2026-04-09     |
| `requirements-portal.md`  | 165    | 72 requirements       | 62                        | 2026-04-17     |
| `requirements-testing.md` | 123    | 68 requirements       | 73                        | 2026-04-04     |
| **Totaal**                | 1002   | 447 requirements      | n.v.t.                    |                |

Verschil tussen "zelf-opgegeven totaal" en gemeten IDs komt door duplicate referenties in de tabelcellen (bron-kolom verwijst vaak terug naar een eigen ID). Dat is normaal, niet alarmerend.

### 5.2 Steekproef — zijn requirements nog accuraat?

Zie voor de volledige verificatie de platform-spec check in Q4b. Q4a doet alleen een scope-schatting.

**Grove inschatting per register op basis van titel + leeftijd:**

| Register                  | Vermoedelijke actualiteit | Reden                                                        |
| ------------------------- | ------------------------- | ------------------------------------------------------------ |
| `requirements.md` (v1)    | Hoge drift verwacht       | v1 spec (mar 2026), daarna gepivotteerd naar v2/v3           |
| `requirements-v2.md`      | Middel drift              | v2 review-flow — grotendeels nog geldig                      |
| `requirements-devhub.md`  | Laag-middel drift         | DH-001..007 done, DH-013..020 gedeeltelijk done              |
| `requirements-portal.md`  | Laag drift                | Portal MVP CP-001..005 done, MVP-scope waarschijnlijk klopt  |
| `requirements-testing.md` | Middel-hoog drift         | v4 (T01-T07) bijna afgerond, scope-shifts tijdens uitvoering |

### 5.3 Tijdschatting voor volledige review in Q4b (realistisch)

- **Per register:** 5 min per requirement × gemiddeld 89 requirements = 7-8 uur per register als je elk item serieus valideert.
- **Pragmatisch:** steekproef van 10 requirements per register = 5 × 10 × 5 min = ~4 uur totaal. Volstaat om drift-patronen te identificeren zonder volledige re-write.
- **Aanbeveling Q4b:** behoud de 447-regel structuur, doe geen volledige herziening. Voeg aan elke register-header toe: "Last verified: 2026-04-20 — steekproef 10 items, [N] drift gevonden". Volledige herziening pas als er een concrete trigger is (nieuwe product-launch, audit).

### 5.4 `plan-userback-integratie.md` — archiveren?

Het plan-document is geschreven vóór DH-007 (userback integratie) en bevat scope die nu live is. Aanbeveling Q4b: verplaats naar `docs/archive/` met een README-line "Userback is geïntegreerd — zie DH-007 + DH-008 backlog".

---

## 6. Package README-gaten

### 6.1 Huidige status

| Package             | README?     | Regels | Publieke exports / modules                                                                           |
| ------------------- | ----------- | ------ | ---------------------------------------------------------------------------------------------------- |
| `packages/database` | ✓ (bestaat) | n.v.t. | queries/_, mutations/_, supabase/\* — client-scope beleid al beschreven                              |
| `packages/ai`       | ✗           | —      | agents/_, pipeline/_, embeddings.ts, fireflies.ts, gmail.ts, transcript-processor.ts, validations/\* |
| `packages/auth`     | ✗           | —      | middleware factory, assertRole helpers                                                               |
| `packages/mcp`      | ✗           | —      | createMcpServer, tools/\*                                                                            |
| `packages/ui`       | ✗           | —      | shadcn/ui-components (Button, Badge, Card, etc.)                                                     |

4 packages zonder README.

### 6.2 Skeleton-template per package (voor Q4b-5)

```markdown
# @repo/{name}

Kort wat-zin: één zin wat deze package doet.

## Publieke exports

- `from '@repo/{name}/X'` — korte beschrijving
- `from '@repo/{name}/Y'` — korte beschrijving

## Regels

- Wanneer gebruik je deze package?
- Wat NIET in deze package (scope-grens)?
- Client-scope / mock-beleid (indien relevant)

## Ontwikkeling

- `npm test --workspace=@repo/{name}`
- Waar staan de tests?

## Afhankelijkheden

- Interne: `@repo/database`, `@repo/ai`, etc.
- Externe: …
```

### 6.3 Concrete invulling per package (voor Q4b-5)

- **`packages/ai/README.md`** — beschrijf agent-registry + pipeline-entrypoints. Link naar `prompts/*.md`, `docs/specs/vision-ai-native-architecture.md §4`. Benadruk: orphans `email-extractor.ts` en `issue-executor.ts` zijn placeholder, geen import.
- **`packages/auth/README.md`** — middleware-factory signatuur + `isAdmin` / `requireAdmin` / `assertProjectAccess` contract. Verwijzing naar DH-013/014 sprint-specs.
- **`packages/mcp/README.md`** — `createMcpServer()` contract, tool-registratie, test-uitzondering `_registeredTools` (zie `test-strategy.md §4`).
- **`packages/ui/README.md`** — lijst van shadcn-components met import-pad. Stijl: "zie `style-guide.md` voor tokens + base-nova conventies".

**Geschatte impact Q4b-5:** 3-4 uur — 4 READMEs × 45 min + review.

---

## 7. Husky / dep-graph-status

### 7.1 `.husky/pre-commit` — volledige inhoud

```bash
npx lint-staged

# Q2b: blokkeer directe Supabase .from()-calls
bash scripts/check-no-direct-supabase.sh

# Regenerate dependency graph if any source files changed
STAGED_SRC=$(git diff --cached --name-only -- 'packages/' 'apps/' | grep -E '\.(ts|tsx)$' || true)
if [ -n "$STAGED_SRC" ]; then
  node scripts/generate-dep-graph.js
  git add docs/dependency-graph.md
fi
```

### 7.2 `.husky/pre-push`

```bash
npm run test
```

### 7.3 Root `package.json` scripts

- `dep-graph` → `node scripts/generate-dep-graph.js` ✓
- `check:queries` → `bash scripts/check-no-direct-supabase.sh` ✓
- `lint` / `type-check` / `test` → turbo-wrappers ✓

### 7.4 Conclusie

**Het oorspronkelijke Q4-7 voorstel is overbodig.** Dep-graph-automation is al geregeld:

- Auto-regen in pre-commit ✓
- Auto-add in pre-commit ✓
- Manuele trigger via `npm run dep-graph` ✓

Q4b-actie Q4-7: **schrappen** uit Q4b-takenlijst. Eventueel micro-vervolg: documenteer het in `packages/README.md` of root-CLAUDE.md als sectie "Automatisering" — maar zelfs dat is optioneel.

---

## 8. `.claude/`-framework overzicht

### 8.1 Structuur

| Pad                     | Inhoud                                                         |
| ----------------------- | -------------------------------------------------------------- |
| `.claude/agents/`       | 9 subagent-definities (.md)                                    |
| `.claude/hooks/`        | 1 shell-script: `session-start.sh` (alleen remote npm install) |
| `.claude/skills/`       | 2 skills: `frontend-design/`, `visualize/`                     |
| `.claude/settings.json` | SessionStart-hook registratie                                  |

### 8.2 Subagents (relevant voor sync-ritme)

| Agent                                                                                                                                  | Doel                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `agent-sync.md`                                                                                                                        | **Bron-van-waarheid-bewaker** — detecteert drift tussen specs/sprints/code. MUST BE USED voor nieuwe sprint |
| `agent-sprint.md`                                                                                                                      | Sprint-planner                                                                                              |
| `agent-prd-to-sprint.md`                                                                                                               | PRD → micro-sprints                                                                                         |
| `agent-quality-checker.md`                                                                                                             | Code review                                                                                                 |
| `agent-test-writer.md`, `agent-debugger.md`, `agent-database-specialist.md`, `agent-feature-builder.md`, `agent-deployment-checker.md` | Specialistische subagents                                                                                   |

### 8.3 Afstemming met Q4b-8 (sync-ritme)

De sync-agent (`agent-sync.md`) vult al de "periodieke sync-check"-rol in. Q4b-8 moet dus **niet** een nieuwe hook of cron bouwen, maar:

1. Vastleggen wanneer de sync-agent gedraaid wordt (suggestie: start van elke nieuwe sprint).
2. Toevoegen aan `CLAUDE.md`: "Vóór elke nieuwe sprint: run de `sync` subagent."
3. Documenteren dat `docs-inventory.md` als input dient voor de sync-agent (deze Q4a-output).

**Geschatte impact Q4b-8:** 30 min — alleen één CLAUDE.md-regel + cross-reference in `agent-sync.md`.

---

## 9. `sprints/backlog/README.md` — diff met realiteit

### 9.1 Entries foutief nog als "Backlog" gelabeld

Uit de tabel (regel 7-34):

| #   | Sprint-label in README        | Werkelijke status                                  | Q4b-actie                                     |
| --- | ----------------------------- | -------------------------------------------------- | --------------------------------------------- |
| 031 | Shared packages cleanup       | **Done** (`sprint-031-shared-packages-cleanup.md`) | Verwijder uit Backlog-tabel                   |
| T02 | Database mutations tests      | **Done**                                           | Verwijder                                     |
| T03 | Database queries tests        | **Done**                                           | Verwijder                                     |
| T04 | Cockpit actions tests         | **Done**                                           | Verwijder                                     |
| T05 | DevHub actions tests          | **Done**                                           | Verwijder                                     |
| T06 | MCP tools tests               | **Done**                                           | Verwijder                                     |
| T07 | API routes tests              | **Done**                                           | Verwijder                                     |
| Q2b | Query centralisatie execution | **Done** (gesplitst in Q2b-A/B/C)                  | Vervang rij door 3 sub-rijen of verwijder rij |
| Q3a | Test infra audit spike        | **Done**                                           | Verwijder                                     |
| Q3b | Test vangnet execution        | **Done**                                           | Verwijder                                     |

**10 rijen drift.**

### 9.2 Entries ontbrekend in README (wel in `sprints/backlog/` folder)

| Bestand                                   | Sprint                                                    | Q4b-actie                      |
| ----------------------------------------- | --------------------------------------------------------- | ------------------------------ |
| `sprint-035-summarizer-project-prefix.md` | Summarizer project-prefix (nummer-collisie met done-035!) | Toevoegen + hernummer naar 038 |
| `sprint-037-management-insights.md`       | Management insights                                       | Toevoegen                      |

### 9.3 Entries foutief aanwezig maar bestaan niet in `sprints/backlog/` folder

| #        | README-regel              | Werkelijke locatie | Q4b-actie                                      |
| -------- | ------------------------- | ------------------ | ---------------------------------------------- |
| PW-QC-01 | Security + error handling | `docs/backlog/`    | Kolom "locatie" toevoegen of markeer expliciet |
| PW-QC-02 | Database discipline       | `docs/backlog/`    | idem                                           |
| PW-QC-03 | AI-pipeline hygiëne       | `docs/backlog/`    | idem                                           |
| PW-QC-04 | File splits + tests       | `docs/backlog/`    | idem                                           |

### 9.4 "Completed Sprints Summary"-sectie (regel 36-69)

Hele sectie is verouderd:

- Regel 38: "Total: 39 sprints" → **70**
- Regel 44: "v2 — Review & Dashboard (sprints 008-014)" — incompleet (014 is MCP verification filter, geen dashboard)
- Regel 53 "v4 — Behavioral Test Coverage (sprints T01-T07)" — T01 is nog backlog
- Ontbrekende secties: CP-001..005 (portal MVP-sprint 5), sprints 031-036, Q2b/Q3a/Q3b

**Q4b-actie:** herschrijf "Completed Sprints Summary" óf schrap het blok en laat README alleen de tabel tonen met een link naar `sprints/done/` voor details.

### 9.5 Nummer-collisie sprint-035

- `sprints/done/sprint-035-board-meetings-management.md`
- `sprints/backlog/sprint-035-summarizer-project-prefix.md`

Twee verschillende sprints, zelfde nummer. **Q4b-actie:** hernummer de backlog-variant naar 038 (037 is reeds in gebruik) en update sprint-file-header + cross-references.

---

## 10. Q4b-takenlijst met vaste scope

Elke taak heeft nu een concrete diff-doel en een tijdschatting. Geen ambiguïteit meer.

### Q4b-1 — Sprint-telling bijwerken

- **Diff:** `CLAUDE.md:30` "39 sprints done (28 core + 4 foundation + 7 DevHub)" → nieuwe zin uit §1.3.
- **Geschatte tijd:** 15 min.

### Q4b-2 — Agents.md genereren

- **Diff:** nieuw bestand `docs/specs/agents.md` met 12-rijen tabel uit §3.1 + 2 Planned/orphan rijen uit §4.2.
- **Template:** kolommen uit §3.3.
- **Geschatte tijd:** 45 min.

### Q4b-3 — Requirements review (steekproef-strategie)

- **Diff:** aan elk van de 5 requirements-registers een `Last verified: 2026-04-20 — steekproef 10 items, [N] drift` header toevoegen. Géén volledige herziening.
- **Scope:** 5 registers × 10 steekproeven × 5 min = ~4 uur inclusief rapportage.
- **Prioriteit:** middel — valideer tenminste `requirements.md` (v1, hoogste drift).

### Q4b-4 — Vision-doc bijwerken

- **Diff:** regels 276, 278-290, 292-306, 317-331 in `docs/specs/vision-ai-native-architecture.md` — exacte wijzigingen in §4.3.
- **Geschatte tijd:** 1-2 uur.

### Q4b-5 — Package READMEs schrijven

- **Diff:** 4 nieuwe bestanden `packages/{ai,auth,mcp,ui}/README.md` op basis van skeleton §6.2 en inhoud §6.3.
- **Geschatte tijd:** 3-4 uur.

### Q4b-6 — Backlog-README normaliseren

- **Diff:** verwijder 10 done-entries (§9.1), voeg 2 ontbrekende toe (§9.2), markeer 4 PW-QC entries met locatie (§9.3), herschrijf "Completed Sprints Summary" óf schrap block (§9.4).
- **Tevens:** hernummer `sprint-035-summarizer-project-prefix.md` → `sprint-038-…` (§9.5).
- **Geschatte tijd:** 1 uur.

### Q4b-7 — Dep-graph documentatie

- **Diff:** **SCHRAPPEN uit Q4b.** Dep-graph-automation is al volledig geregeld (§7). Eventueel 1-regel-noot in `packages/README.md` dat dep-graph automatisch bijgewerkt wordt — optioneel.
- **Geschatte tijd:** 0 min (of 10 min voor de noot).

### Q4b-8 — Sync-ritme vastleggen

- **Diff:** voeg aan `CLAUDE.md` onder "Sprint Management" één regel toe: _"Vóór elke nieuwe sprint: run de `sync` subagent."_ + cross-reference naar `docs-inventory.md` in `.claude/agents/agent-sync.md`.
- **Geschatte tijd:** 30 min.

### Q4b-9 — Plan-userback-integratie archiveren

- **Diff:** `mv docs/specs/plan-userback-integratie.md docs/archive/` + 1-regel noot in `docs/archive/README.md` (indien bestaand, anders aanmaken).
- **Geschatte tijd:** 10 min.

### Q4b-10 — `revieuw-que.html` opruimen

- **Diff:** bepaal met eigenaar of deze HTML nog nuttig is. Zo nee: verwijder. Zo ja: hernoem naar `review-queue.html` + verplaats naar `docs/specs/sketches/`.
- **Geschatte tijd:** 15 min.

### Totaaltijd Q4b

~10-12 uur over 10 taken. Kan opgesplitst in Q4b-A (taken 1, 2, 4, 6, 8 — docs/meta, ~4 uur) en Q4b-B (taken 3, 5 — content-heavy, ~7 uur) indien gewenst.

---

## Afsluiting

Dit rapport is de vaste scope voor Q4b. Nieuwe observaties die tijdens Q4b-uitvoering opduiken horen in een vervolg-spike (Q4c), niet in Q4b-scope. Dat is expliciet de les uit het eerste Q4-voorstel dat drift bevatte.
