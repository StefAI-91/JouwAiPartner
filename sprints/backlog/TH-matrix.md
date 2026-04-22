# Themes PRD → Sprint Traceability Matrix

Bron: `docs/specs/prd-themes.md` v1.0 (datum 2026-04-22).
Sprints: `TH-001` tot en met `TH-006`. Samen dekken ze v1-scope zoals gedefinieerd in PRD §3.2.

## Requirements dekking per sprint

| Sprint | Focus                                       | Requirement IDs                                         |
| ------ | ------------------------------------------- | ------------------------------------------------------- |
| TH-001 | Database & seed                             | DATA-200..209, FUNC-200, FUNC-201                       |
| TH-002 | ThemeTagger agent + emoji shortlist         | AI-200..214                                             |
| TH-003 | Pipeline-integratie + retroactieve batch    | FUNC-210..219, DATA-210, EDGE-200, EDGE-201             |
| TH-004 | Dashboard UI: pills + donut                 | UI-250..265, FUNC-220..222                              |
| TH-005 | Theme detail page + edit mode               | UI-266..280, FUNC-230..236, SEC-200, SEC-201            |
| TH-006 | Review-flow + match rejections + regenerate | UI-290..301, FUNC-240..247, SEC-210, EDGE-210, EDGE-211 |

## PRD-sectie dekking

| PRD-sectie           | Onderwerp                                    | Sprint(s)      |
| -------------------- | -------------------------------------------- | -------------- |
| §1 Context           | N.v.t. — motivatie, geen requirements        | (alle)         |
| §2 Visie             | Koppeling aan vision-doc                     | (alle)         |
| §3 Scope             | v1 in-scope / v2-v3 out-of-scope             | (alle)         |
| §4.1 Match-first     | Flow per meeting                             | TH-003         |
| §4.2 Verification    | Emerging → review                            | TH-002, TH-006 |
| §4.3 Seed vooraf     | 10 seed-themes als SQL                       | TH-001         |
| §4.4 Batch-run       | One-off script                               | TH-003         |
| §4.5 Embeddings      | Upgrade-trigger (v3+), geen v1-werk          | —              |
| §4.6 Scope meetings  | Alle meetings, één globale set               | TH-003         |
| §5.1 Pipeline-pos    | Na extractors, parallel embed-save           | TH-003         |
| §5.2 Input/output    | Zod-schema + prompt-discipline               | TH-002         |
| §5.3 Niet Gatekeeper | Design-keuze, geen requirement               | —              |
| §5.4 Curator         | v2/v3                                        | —              |
| §5.5 Feedback-loop   | `theme_match_rejections` + negative_examples | TH-001, TH-006 |
| §5.6 Proposal-crit.  | 4 criteria in prompt                         | TH-002         |
| §6 Datamodel         | 3 tabellen + RLS + indexes                   | TH-001         |
| §7 Emoji shortlist   | 42 + fallback in code                        | TH-002         |
| §8 Dashboard UI      | Pills + donut                                | TH-004         |
| §9 Detail page       | Route + 5 tabs + edit                        | TH-005         |
| §10 Review-flow      | Approval-kaart + ⊘ + emoji-picker            | TH-006         |
| §11 Seed-themes      | 10 concrete themes                           | TH-001         |
| §12 Regenerate-knop  | Meeting-detail re-tag                        | TH-006         |

## Out-of-scope bevestigingen

Expliciet v2+ conform PRD §3.3 — geen sprint toegewezen:

- Threads (doorlopend gesprek binnen thema) → v2
- Open-questions tracking → v2
- Narrative-paragraaf (C13) → v2
- Contradiction detection (D18) → v2/v3
- Weekly digest email (D16) → v3
- Theme-vs-theme split view (C15) → v2
- Quotes-per-persoon (C14) → v2
- Hiërarchische themes (parent/child) → later
- Cross-app themes (DevHub/Portal) → v2+
- `/themes` index-pagina met alle themes — pas v2 als collectie groot wordt
- Theme-samenvoegen bij duplicaten — v2 via Curator
- Embeddings voor matching — v3, zie §4.5 upgrade-trigger
- Candidate-pool / theme_candidates → alleen v1.5 als review te ruisig blijkt

## Totalen

- **Sprints:** 6
- **Requirement IDs totaal:** 74 gedocumenteerd
  - DATA: 10 (200-209, 210 = 11, maar 210 staat in TH-003 als uitbreiding)
  - FUNC: 35
  - AI: 15
  - UI: 50
  - SEC: 3
  - EDGE: 3
- **PRD-secties volledig afgedekt:** ja, alle uitvoerbare secties zijn in sprints gemapt; conceptuele secties (context/visie/scope) dragen indirect bij.

## Volgorde & afhankelijkheden

```
TH-001 (DB + seed)
   ↓
TH-002 (Agent standalone)
   ↓
TH-003 (Pipeline + batch)  ── depends on TH-001 + TH-002
   ↓
TH-004 (Dashboard UI)      ── depends on TH-003 voor data
   ↓
TH-005 (Detail page)       ── depends on TH-004 voor pill→detail nav
   ↓
TH-006 (Review + regenerate) ── depends on TH-003 (pipeline) + TH-005 (emoji-picker component)
```

**Kritisch pad:** TH-001 → TH-002 → TH-003. Pas daarna is UI-werk zinvol. Dashboard (TH-004) en detail (TH-005) zijn sequentieel door nav-link. TH-006 kan deels parallel met TH-005 zodra emoji-picker component gedeeld is.

## Bekende dekkingslacunes

Niets uit de PRD is onbedekt gebleven binnen v1-scope. Drie kanttekeningen:

1. **Performance-testing** (bijv. "hoe snel is de dashboard met 50 themes en 500 meetings?") is niet als eigen sprint opgenomen. Kan als follow-up na TH-004 indien nodig.
2. **Observability** — ThemeTagger wordt in registry geregistreerd (TH-002) en verschijnt op `/agents`, maar er is geen aparte sprint voor metrics-dashboard. PRD behandelt dit niet expliciet.
3. **Test-coverage van Server Actions** — impliciet in TH-005 / TH-006 acceptance. Als jullie test-strategy strenger wordt, kan dat een eigen sprint.

## Sprint-sizes inschatting

Ruwe aanname op basis van soortgelijke sprints in deze repo (DH-xxx / sprint-037). Pas aan op basis van eigen ervaring:

- TH-001: S (1–2 dagen) — puur data
- TH-002: M (2–3 dagen) — agent + tests
- TH-003: M (2–3 dagen) — pipeline + batch + edge-cases
- TH-004: M (2–3 dagen) — UI + queries
- TH-005: M-L (3–4 dagen) — veel tabs + edit-mode
- TH-006: M-L (3–4 dagen) — review + regenerate + feedback-integratie

**Totaal v1 inschatting:** ~13–19 ontwikkeldagen.
