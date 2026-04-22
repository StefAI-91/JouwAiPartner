# Agent Register

**Bron:** `packages/ai/src/agents/registry.ts` (`AGENT_REGISTRY`) — dit register is de feitelijke bron van waarheid. Deze pagina is een leesbare afgeleide.
**Laatste sync:** 2026-04-20 (Q4b).
**Regeneratie:** handmatig bijwerken wanneer `AGENT_REGISTRY` wijzigt. Zie §4 voor een eventueel `npm run docs:agents` script.

---

## 1. Live agents (12)

Alle agents hieronder staan op `status: "live"` in de registry en worden daadwerkelijk aangeroepen in de pipeline.

| #   | ID                    | Naam                | Rol                  | Mascotte | Model      | Quadrant | Prompt-file                      | Entrypoint                                                 |
| --- | --------------------- | ------------------- | -------------------- | -------- | ---------- | -------- | -------------------------------- | ---------------------------------------------------------- |
| 1   | `gatekeeper`          | Gatekeeper          | De poortwachter      | 🛡️       | Haiku 4.5  | cockpit  | `prompts/gatekeeper.md`          | `packages/ai/src/pipeline/gatekeeper-pipeline.ts`          |
| 2   | `summarizer`          | Summarizer          | De verhalenverteller | 📝       | Sonnet 4.5 | cockpit  | `prompts/summarizer.md`          | `packages/ai/src/pipeline/steps/summarize.ts`              |
| 3   | `title-generator`     | Title Generator     | De kopmaker          | ✍️       | Haiku 4.5  | cockpit  | `prompts/title-generator.md`     | `packages/ai/src/pipeline/steps/generate-title.ts`         |
| 4   | `needs-scanner`       | Needs Scanner       | De behoefte-speurder | 🔎       | Haiku 4.5  | cockpit  | `prompts/needs-scanner.md`       | `packages/ai/src/pipeline/scan-needs.ts`                   |
| 5   | `management-insights` | Management Insights | De bestuurs-analist  | 👔       | Sonnet 4.5 | cockpit  | `prompts/management-insights.md` | `packages/ai/src/pipeline/management-insights-pipeline.ts` |
| 6   | `weekly-summarizer`   | Weekly Summarizer   | De week-verslaggever | 📅       | Sonnet 4.5 | cockpit  | `prompts/weekly-summarizer.md`   | `packages/ai/src/pipeline/weekly-summary-pipeline.ts`      |
| 7   | `project-summarizer`  | Project Summarizer  | De project-analist   | 📊       | Haiku 4.5  | cockpit  | `prompts/project-summarizer.md`  | `packages/ai/src/pipeline/summary-pipeline.ts`             |
| 8   | `org-summarizer`      | Org Summarizer      | De klant-analist     | 🏢       | Haiku 4.5  | cockpit  | `prompts/org-summarizer.md`      | `packages/ai/src/pipeline/summary-pipeline.ts`             |
| 9   | `email-classifier`    | Email Classifier    | De sorteerder        | 📬       | Haiku 4.5  | cockpit  | `prompts/email-classifier.md`    | `packages/ai/src/pipeline/email-pipeline.ts`               |
| 10  | `issue-classifier`    | Issue Classifier    | De triage-assistent  | 🗂️       | Haiku 4.5  | devhub   | `prompts/issue-classifier.md`    | `apps/devhub/src/actions/classify.ts`                      |
| 11  | `issue-reviewer`      | Issue Reviewer      | De health-analist    | 🩺       | Sonnet 4.5 | devhub   | `prompts/issue-reviewer.md`      | `apps/devhub/src/actions/review.ts`                        |
| 12  | `risk-specialist`     | Risk Specialist     | De wachter           | 🦉       | Sonnet 4.6 | cockpit  | `prompts/risk_specialist.md`     | `packages/ai/src/pipeline/steps/risk-specialist.ts`        |

### 1.1 Cross-quadrant verdeling

- **Cockpit:** 10 agents (knowledge ingestion + samenvattingen + analyses)
- **DevHub:** 2 agents (triage + project health)
- **Portal / Delivery / Cross:** 0 agents (niet gestart)

### 1.2 Model-verdeling

- **Haiku 4.5:** 7 agents (lichte classificatie + samenvatting)
- **Sonnet 4.5:** 4 agents (cross-turn analyse + rapportage)
- **Sonnet 4.6:** 1 agent (risk-specialist, high-effort cross-turn patroon-detectie)

---

## 2. Orphan / placeholder agents

Agent-files die wel op disk staan maar niet in `AGENT_REGISTRY` geregistreerd zijn. Dit is bewust: ze zijn geschreven voor toekomstig werk maar hebben geen productie-call-site.

| Bestand                                     | Status               | Toelichting                                                                                                                             |
| ------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ai/src/agents/email-extractor.ts` | Geparkeerd (planned) | Bedoeld voor extracties uit emails; geen pipeline-integratie. Overweging: verwijderen of activeren zodra email-extracties gewenst zijn. |
| `packages/ai/src/agents/issue-executor.ts`  | Geparkeerd (planned) | Bedoeld voor AI-execution van tickets (Phase C in vision-doc). Geen call-site.                                                          |

Het registry-commentaar (regel 11-12 van `registry.ts`) legt deze uitsluiting expliciet vast: _"Gepland / mock-agents horen NIET in dit register — alleen agents die daadwerkelijk in de pipeline worden aangeroepen."_

---

## 3. Historische wijzigingen

Voor context wanneer oudere docs of PRs afwijken van bovenstaande lijst:

- **2026-04-18 — RiskSpecialist vervangt Extractor** (commits `cf3bc18`, `d15f722`, `0a17a10`, `e52b4af`). De oude `Extractor` agent (generieke extracties op Sonnet) is uit de codebase verwijderd. `RiskSpecialist` (Sonnet 4.6, high effort) is nu de enige extractie-bron.
- **2026-04-18 — Meeting Structurer verwijderd** (commit `e52b4af`). Experimenteel patroon voor multi-step meeting-structuur; niet in productie gekomen.
- **2026-04-17 — Registry geïntroduceerd** (commit `b70aa4d`). Voor die datum was er geen central register; agents werden ad-hoc aangeroepen. Het `/agents` dashboard is vanaf deze commit data-driven.

Vision-doc (`docs/specs/vision-ai-native-architecture.md §4.1`) beschrijft bredere roadmap-agents (Planner, Curator, Analyst, Communicator, Support, Dispatcher, Executor). Die zijn **niet** gebouwd — het vision-doc is de roadmap, `AGENT_REGISTRY` de feitelijke productie-status.

---

## 4. Auto-genereren (toekomstig)

Optioneel vervolg: script `scripts/generate-agents-doc.js` dat deze tabel regenereert uit `AGENT_REGISTRY`. Lage prioriteit — 12 agents wijzigen niet vaak en handmatig onderhoud is prima. Als we ooit 20+ agents hebben, automatiseren.

Totdat het script bestaat: bij elke wijziging in `registry.ts` óók deze file bijwerken. De sync-subagent (`.claude/agents/agent-sync.md`) detecteert drift indien dit vergeten wordt.
