# Portal v1 — Traceability Matrix

PRD: `docs/specs/prd-client-portal/` (revisie 2026-04-27)
Sprints: CP-006 t/m CP-009

> Deze matrix borgt dat elke PRD-requirement minstens één keer in een sprint terugkomt en dat elke sprint-requirement traceerbaar is naar een PRD-sectie. Update bij elke PRD-wijziging of sprint-revisie.

## 1. Sprint-overzicht

| Sprint | Naam                                   | Doel-laag            | Bouwt voort op  |
| ------ | -------------------------------------- | -------------------- | --------------- |
| CP-006 | Portal Schema Foundation               | Database + types     | CP-001, CP-004  |
| CP-007 | DevHub Client-Translation Editor       | DevHub UI + actions  | CP-006          |
| CP-008 | Portal Vier-Bucket Dashboard           | Portal queries + UI  | CP-006 (CP-007) |
| CP-009 | Portal Issue-Detail + Productie-Deploy | Detail-page + deploy | CP-006/007/008  |

Volgorde: CP-006 → (CP-007 ‖ CP-008) → CP-009. CP-007 en CP-008 kunnen parallel; CP-008 levert eerder zichtbare waarde voor de klant, CP-007 levert eerder de hertaalde content.

## 2. PRD §-sectie → sprint-mapping

| PRD-sectie                                                  | Onderwerp                             | Sprint(s)                      |
| ----------------------------------------------------------- | ------------------------------------- | ------------------------------ |
| §3.3 Rechtenmatrix — JAIP-admin                             | `client_title`/`description` invullen | CP-007                         |
| §4 In scope — vier-bucket overzicht                         | Bucket-view                           | CP-008                         |
| §4 In scope — source-switch                                 | Tabs                                  | CP-008                         |
| §4 In scope — type-filter tabs                              | Tabs (incl. Vragen)                   | CP-008                         |
| §4 In scope — klant-vriendelijke titels                     | Kolommen + UI                         | CP-006, CP-007, CP-008, CP-009 |
| §4 In scope — DevHub editor uitbreiden                      | Twee tekstvelden                      | CP-007                         |
| §4 In scope — read-only mobile                              | Responsive                            | CP-008                         |
| §4 In scope — productie-deploy                              | Vercel + DNS                          | CP-009                         |
| §5.1 Email-OTP login                                        | Bestaand (CP-002)                     | — (uit scope)                  |
| §5.2 Vier-bucket dashboard                                  | Volledig                              | CP-008                         |
| §5.3 Issue detail-pagina                                    | Fallback-rendering                    | CP-009                         |
| §5.4 Feedback-formulier                                     | Bestaand (CP-005) + regressie-test    | CP-008 verificatie             |
| §6 Toe te voegen kolommen                                   | Migratie                              | CP-006                         |
| §6 Toe te voegen constanten                                 | `PORTAL_SOURCE_GROUPS`                | CP-006                         |
| §6 Schrijfregels — `updateIssue`                            | Types-uitbreiding                     | CP-006, CP-007                 |
| §6 RLS — geen wijziging                                     | Verifiëren dat bestaand werkt         | CP-009 (RLS-bewijs)            |
| §7 Routes — `/projects/[id]/issues`                         | Aanpassen                             | CP-008                         |
| §7 Routes — `/projects/[id]/issues/[issueId]`               | Aanpassen                             | CP-009                         |
| §7 Monorepo — `apps/portal/vercel.json`                     | Toevoegen                             | CP-009                         |
| §8 NFR — Performance < 1.5s                                 | Verifiëren                            | CP-008, CP-009                 |
| §8 NFR — RLS op `issues`/`profiles`/`portal_project_access` | Bestaand                              | CP-009 verifiëren              |
| §9 Aannames                                                 | Codebase-bevestigd                    | — (PRD-doc)                    |
| §10 Acceptatiecriteria                                      | Zie §3 hieronder                      | CP-006/7/8/9                   |
| §11 Sprint-indicatie                                        | Decompositie-bron                     | CP-006/7/8/9                   |

## 3. PRD §10 acceptatiecriteria → sprint-mapping

| PRD-acceptatiecriterium                                              | Sprint     |
| -------------------------------------------------------------------- | ---------- |
| Stefan kan inloggen via OTP en ziet uitsluitend CAI-issues           | CP-009     |
| Dashboard toont vier buckets met correcte tellingen                  | CP-008     |
| Source-switch correct (`portal,userback` vs `manual,ai` vs Alles)    | CP-008     |
| Type-filter Bugs/Features/Vragen orthogonaal aan source-switch       | CP-008     |
| Detailpagina toont `client_title`/`client_description` met fallback  | CP-009     |
| JAIP-admin kan in DevHub editor `client_title`/`description` opslaan | CP-007     |
| Feedback-formulier blijft functioneel (regressie)                    | CP-008     |
| RLS getest met testaccount andere klant                              | CP-009     |
| Mobiele weergave werkt                                               | CP-008     |
| Deployed op `https://portal.jouw-ai-partner.nl/`                     | CP-009     |
| `apps/portal/vercel.json` aanwezig                                   | CP-009     |
| Stefan heeft minimaal één keer ingelogd + validatiesessie            | CP-009     |
| Alle features uit §5 voldoen aan eigen acceptatiecriteria            | per sprint |

## 4. Sprint-requirement → PRD-bron

### CP-006 (Schema Foundation)

| ID           | PRD-bron                                                                  |
| ------------ | ------------------------------------------------------------------------- |
| SCHEMA-V1-01 | §6 "Toe te voegen kolommen"                                               |
| SCHEMA-V1-02 | §6 "Toe te voegen constanten" + §5.2                                      |
| SCHEMA-V1-03 | §5.2 edge cases + §9 aanname 7                                            |
| SCHEMA-V1-04 | §6 "Schrijfregels" (impliciet uit codebase-realiteit; PRD §11 aanvulling) |
| SCHEMA-V1-05 | §6 RLS-paragraaf                                                          |

### CP-007 (DevHub Editor)

| ID            | PRD-bron                                                 |
| ------------- | -------------------------------------------------------- |
| DH-EDIT-V1-01 | §3.3 + §4 in scope + §5.3                                |
| DH-EDIT-V1-02 | §6 "Schrijfregels"                                       |
| DH-EDIT-V1-03 | Architectuur — Zod-validatie verplicht (CLAUDE.md regel) |
| DH-EDIT-V1-04 | §3.3 (klant-taal-context)                                |
| DH-EDIT-V1-05 | §11 week 1 "eerste invulling op CAI-issues"              |

### CP-008 (Bucket Dashboard)

| ID           | PRD-bron                                  |
| ------------ | ----------------------------------------- |
| BUCKET-V1-01 | §11 sprint-aanvulling + §5.2              |
| BUCKET-V1-02 | §11 week 2                                |
| BUCKET-V1-03 | §5.2 + §10 acceptance                     |
| BUCKET-V1-04 | §5.2 "Per bucket: telling"                |
| BUCKET-V1-05 | §5.2 source-switch tabel                  |
| BUCKET-V1-06 | §5.2 type-filter tabel                    |
| BUCKET-V1-07 | §5.2 velden/data-tabel                    |
| BUCKET-V1-08 | §5.2 edge case + §9 aanname 7             |
| BUCKET-V1-09 | §5.2 edge case "Bucket bevat 100+ issues" |
| BUCKET-V1-10 | §5.2 + §7 responsive                      |
| BUCKET-V1-11 | §5.4 + §10 acceptance                     |

### CP-009 (Detail + Deploy)

| ID           | PRD-bron                            |
| ------------ | ----------------------------------- |
| DEPLOY-V1-01 | §5.3 velden                         |
| DEPLOY-V1-02 | §5.3 velden + §5.2 source-indicator |
| DEPLOY-V1-03 | §5.3 edge case + RLS-tests          |
| DEPLOY-V1-04 | §7 monorepo + §10                   |
| DEPLOY-V1-05 | §4 in scope + §10 + §11             |
| DEPLOY-V1-06 | §10 acceptance                      |
| DEPLOY-V1-07 | §11 week 3                          |
| DEPLOY-V1-08 | §11 week 3 + §10                    |

## 5. Geen-bron-meer-checks (post-revisie 2026-04-27)

Volgende geschrapte concepten staan **niet** meer in een sprint:

- ❌ `client_visible` toggle / overrides
- ❌ `audit_log`-tabel + Postgres-trigger voor visibility-changes
- ❌ `has_production_impact`-indicator
- ❌ Label-based automatische visibility-regels

Als een sprint per ongeluk naar deze concepten verwijst → bug in de sprint, niet in de PRD.

## 6. Open vragen die in geen sprint zijn opgenomen (bewust)

Uit PRD §9:

- **Source-indicator stijl** (icoon vs label) — design-keuze, valt in CP-008 implementatie. Als design afwijkt: update §9 naar beantwoord.
- **AI-hertaling van `client_title`/`client_description`** — uitgesteld naar v2 met aparte spec; CP-007 houdt UI-ruimte vrij maar bouwt geen AI-knop.

## 7. Vision-alignment check

| Vision (vision-ai-native-architecture.md §2.4) | v1-dekking                         |
| ---------------------------------------------- | ---------------------------------- |
| Trust layer / transparency                     | ✅ CP-008 (bucket + source-switch) |
| View status of reported issues                 | ✅ CP-008/009                      |
| Submit feedback flows into DevHub              | ✅ CP-005 (af)                     |
| Project progress / milestones / timeline       | ❌ v2+ (PRD §4)                    |
| Meeting history / summaries                    | ❌ v2+ (PRD §4)                    |
| AI Account Manager (Q&A, weekly drafts)        | ❌ v2+ (PRD §4)                    |

V1 dekt het issue-stuk; de andere vier bouwstenen zijn expliciet uitgesteld in §4 "Toekomstige uitbreidingen".
