# 9. Fase 4 — Narratieve Snapshots

## 9.1 Doel

Wekelijks (of op gewenste cadans) genereert het team een **status-rapport**: een bevroren snapshot van de topic-status met een handgeschreven narrative-noot en optionele patterns-sectie. Klanten kunnen het rapport in de Portal bekijken en historische rapporten doorzoeken.

**Ná deze fase weet de klant**: "Ik heb context, niet alleen status. Het JAIP-team licht patronen toe en plaatst ontwikkelingen in perspectief."

**Ná deze fase weet het team**: "Welke rapporten resoneren met klanten? Hoeveel tijd kost het schrijven nog na fase 1-3 automation?"

## 9.2 Wat we lenen, van wie

| Bron                        | Wat we kopen                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| **CAI Studio Notion-doc**   | Letterlijk: snapshot-format, kritische noot, "wat herhaalt zich" sectie, samengesteld-op-datum |
| **Stripe weekly changelog** | Editorial keuze welke fixes uitlichten, schrijfstijl                                           |
| **Headway / Beamer**        | Periodieke digest ipv constante stream                                                         |
| **Basecamp Shape Up**       | Narratief boven precisie, fuzzy progress, hill-charts-mentaliteit                              |

## 9.3 Functionele scope

### 9.3.1 Status-rapport entiteit

Een rapport is een **bevroren snapshot per project op een tijdstip**. Eigenschappen:

| Veld             | Type              | Toelichting                                               |
| ---------------- | ----------------- | --------------------------------------------------------- |
| id               | uuid              |                                                           |
| project_id       | uuid FK           |                                                           |
| compiled_at      | timestamptz       | "Samengesteld op X"                                       |
| compiled_by      | uuid FK profiles  | Welk team-lid heeft hem opgesteld                         |
| narrative_note   | text              | Handgeschreven kritische noot vooraf                      |
| content_snapshot | jsonb             | Bevroren state van alle relevante topics op `compiled_at` |
| patterns_section | jsonb (optioneel) | Pattern-detectie output                                   |
| published_at     | timestamptz NULL  | NULL = draft, datum = zichtbaar voor klant                |
| status           | text              | `draft` / `published` / `archived`                        |

`content_snapshot` bevat per topic:

```json
{
  "topic_id": "...",
  "title": "Publicatie-flow",
  "client_description": "...",
  "status_at_compile": "in_progress",
  "priority": "P0",
  "linked_issues_count": 4,
  "client_signal": "must_have",
  "bucket": "komende_week",
  "events_in_period": [
    { "event_type": "status_changed", "from": "scheduled", "to": "in_progress", "at": "..." }
  ]
}
```

> Bevroren = geen live-derivation. Als topic-status morgen verandert, oude rapport blijft hetzelfde tonen. Dit is gewild — het is een historisch document.

### 9.3.2 DevHub: rapport-creatie

Pagina `apps/devhub/src/components/reports/page.tsx` (compositiepagina).

**Flow**:

1. Team-lid klikt "Maak rapport" voor project X
2. Systeem genereert draft met:
   - Auto-gegenereerde topics-snapshot per bucket (alle 4 buckets)
   - Lege `narrative_note` veld voor handmatig invullen
   - Lege `patterns_section` (in fase 4 handmatig; in fase 5 AI-suggestie)
3. Team-lid schrijft narrative-noot (1-3 alinea's max)
4. Team-lid review topic-snapshot — kan items handmatig uitvinkken (niet relevant voor dit rapport)
5. Team-lid kiest "Publiceer" of "Sla op als draft"
6. Bij publiceren: `published_at = now()`, `status = 'published'`, klant ziet hem in Portal

**Geen auto-publish**. Mens drukt op publish-knop.

### 9.3.3 DevHub: rapport-templates

Vier rapport-typen (selectable bij creatie):

| Template        | Doel                              | Cadans                  |
| --------------- | --------------------------------- | ----------------------- |
| Wekelijks       | Standaard digest                  | Wekelijks               |
| Sprint-einde    | Wat is opgeleverd na sprint       | 2-wekelijks (na sprint) |
| Maand-overzicht | Wat speelde de afgelopen maand    | Maandelijks             |
| Ad-hoc          | Voor incidenten of major releases | Op aanvraag             |

Templates verschillen in:

- Time-window voor "Recent gefixt"-items (week / sprint / maand / custom)
- Default placeholders in narrative-noot
- Welke patterns ze opnemen

> v1 implementeert alleen "Wekelijks". Andere templates komen als waarde duidelijk is.

### 9.3.4 Portal: rapporten-archief

Nieuwe pagina `apps/portal/src/app/(app)/projects/[id]/reports/page.tsx`.

Toont:

- Lijst van gepubliceerde rapporten, nieuwste eerst
- Per rapport: titel ("Wekelijks rapport — 23 april 2026"), `compiled_by` naam, `published_at`
- Klikbaar naar rapport-detail

### 9.3.5 Portal: rapport-detail-pagina

Route: `apps/portal/src/app/(app)/projects/[id]/reports/[reportId]/page.tsx`

> **Editorial typografie is hier de hoogste design-stake.** Drop cap op de kritische noot, romeinse cijfers per bucket-sectie, leeswijdte ~62ch, masthead in `--paper-cream`. Volledige spec: [§ 14 Design-keuzes](./14-design-keuzes.md), live referentie: `/design-preview/roadmap` § 08.

Layout (gebaseerd op CAI's Notion-doc):

```
┌─────────────────────────────────────────────────────────┐
│  Wekelijks rapport — Project [naam]                     │
│  Samengesteld op 23 april 2026 door [team-lid]          │
├─────────────────────────────────────────────────────────┤
│  Kritische noot vooraf                                  │
│  ─────────────────────                                  │
│  [narrative_note rendered as markdown]                  │
├─────────────────────────────────────────────────────────┤
│  Recent gefixt                                          │
│  ─────────────────                                      │
│  [topic 1 — 1-2 zin samenvatting]                       │
│  [topic 2 — ...]                                        │
├─────────────────────────────────────────────────────────┤
│  Komende week                                           │
│  ─────────────                                          │
│  [...]                                                  │
├─────────────────────────────────────────────────────────┤
│  Hoge prio daarna                                       │
│  [...]                                                  │
├─────────────────────────────────────────────────────────┤
│  Niet geprioritiseerd                                   │
│  [...]                                                  │
├─────────────────────────────────────────────────────────┤
│  Wat herhaalt zich (optioneel, fase 5 AI)              │
│  ─────────────────────                                  │
│  • [pattern 1]                                          │
│  • [pattern 2]                                          │
└─────────────────────────────────────────────────────────┘
```

### 9.3.6 Portal: nav-knop "Bekijk rapporten"

Onder de live-roadmap-view een prominente CTA: "Bekijk wekelijkse rapporten →". Klanten worden naar archief geleid.

### 9.3.7 Patterns-sectie (handmatig in fase 4)

In fase 4 schrijft team de patterns-sectie zelf. Voorbeelden die we kopiëren uit CAI's doc:

> "Publicatie-flow werkt niet betrouwbaar — in alle drie documenten aanwezig"
>
> "Bestandsgroottes en -limieten onduidelijk en beperkend — in alle drie documenten"

Patterns worden als `{ title, description }`-array opgeslagen in `patterns_section`. UI toont als bullet-lijst.

> AI-detectie van patterns komt in fase 5. Tot dan: vrij tekstveld voor team.

## 9.4 Out of scope (expliciet)

- ❌ Auto-gegenereerde narrative-noot → fase 5 (AI suggesties)
- ❌ Auto-gegenereerde patterns-sectie → fase 5
- ❌ PDF-export van rapporten → eerst zien of HTML volstaat
- ❌ Email-distributie van rapporten → klanten kunnen zelf delen
- ❌ Rapport-comments van klant → v2 (vereist threading)
- ❌ Rapport-archief search → eerst zien of >20 rapporten überhaupt
- ❌ Cross-rapport diff ("wat is veranderd sinds vorig rapport") → v2
- ❌ Rapport-templates voor Sprint-einde, Maand, Ad-hoc → v2

## 9.5 Database-veranderingen

Nieuwe tabel `topic_status_reports`:

| Kolom            | Type                                           | Toelichting                      |
| ---------------- | ---------------------------------------------- | -------------------------------- |
| id               | uuid PK                                        |                                  |
| project_id       | uuid FK projects                               |                                  |
| template         | text                                           | `weekly` (alleen v1)             |
| compiled_at      | timestamptz NOT NULL                           |                                  |
| compiled_by      | uuid FK profiles                               |                                  |
| narrative_note   | text                                           | Markdown                         |
| content_snapshot | jsonb NOT NULL                                 | Bevroren topic-state             |
| patterns_section | jsonb DEFAULT '[]'                             | Array van `{title, description}` |
| published_at     | timestamptz NULL                               | NULL = draft                     |
| status           | text CHECK IN ('draft','published','archived') | Default `draft`                  |
| created_at       | timestamptz                                    |                                  |
| updated_at       | timestamptz                                    |                                  |

**RLS**:

- SELECT: client met `has_portal_access(auth.uid(), project_id)` AND `status = 'published'`
- SELECT: admin/member: alle statuses
- INSERT/UPDATE/DELETE: alleen admin/member

## 9.6 Code-organisatie

```
packages/database/src/
├── queries/reports/                ← nieuw cluster
│   ├── index.ts
│   ├── list.ts                     ← listReports, listPublishedReports
│   ├── detail.ts                   ← getReportById
│   └── snapshot.ts                 ← buildContentSnapshot (utility voor draft-creatie)
└── mutations/reports/
    ├── index.ts
    ├── crud.ts                     ← insertReport, updateReport
    └── publish.ts                  ← publishReport (set published_at)

apps/devhub/src/components/reports/    ← compositiepagina
├── page.tsx                        ← lijst + "Maak rapport"
├── report-editor.tsx               ← draft-bewerken
├── topics-snapshot-preview.tsx     ← preview vóór publiceren
└── narrative-note-editor.tsx       ← markdown editor

apps/portal/src/components/reports/  ← compositiepagina
├── reports-list.tsx
├── report-detail.tsx
└── patterns-section.tsx
```

## 9.7 Acceptatiecriteria

### DevHub

- [ ] Team kan een rapport-draft maken via "Maak rapport"-knop
- [ ] Draft pre-vult `content_snapshot` met huidige topic-state
- [ ] Draft is bewerkbaar tot publicatie
- [ ] Publiceren zet `published_at`, niet bewerkbaar daarna (alleen archiveren mogelijk)
- [ ] Markdown editor voor `narrative_note`
- [ ] Patterns-sectie is een herhaalbaar form (add/remove pattern)

### Portal

- [ ] `/projects/[id]/reports` toont lijst van gepubliceerde rapporten
- [ ] Klikbaar naar `/projects/[id]/reports/[reportId]`
- [ ] Drafts (status='draft') zijn níét zichtbaar voor klant
- [ ] Rapport rendert narrative-noot als markdown
- [ ] Bevroren `content_snapshot` wordt getoond, niet live topic-data
- [ ] Patterns-sectie verschijnt onderaan als gevuld, anders niet getoond

### Cross-cutting

- [ ] Rapport-snapshot is écht bevroren (later wijzigen van topic verandert oude rapport niet)
- [ ] RLS: klant van CAI ziet alleen CAI-rapporten
- [ ] `npm run type-check`, lint, check:queries slagen

## 9.8 Verificatie-momenten in deze fase

### Tijdens implementatie

- Maak één rapport handmatig in productie voor CAI
- Check: oude rapport-content blijft constant nadat een topic-status verandert
- Test: klant van andere org kan dit rapport niet zien

### Vier weken na go-live (gate naar fase 5)

| Metric                                             | Drempel                        |
| -------------------------------------------------- | ------------------------------ |
| Klant haalt rapport actief op                      | ≥50% van klanten 1+ keer/maand |
| Account managers gebruiken rapport in klantgesprek | ≥60% van gesprekken            |
| Curatielast (incl. rapport-schrijven)              | ≤2u/klant/week                 |
| Tijd om één rapport te schrijven                   | ≤30 min                        |

**Als rapporten weinig gelezen worden**: drop fase 5 narrative-AI; AI-clustering kan nog wel zinnig zijn voor topic-creatie.

## 9.9 Geschatte sprint-omvang

**1 sprint** (5-7 werkdagen).

- DB migratie + types: ~0.5 dag
- Queries + mutations + snapshot-utility: ~1.5 dagen
- DevHub editor + UI: ~2 dagen
- Portal archief + detail: ~1.5 dagen
- RLS + integration: ~0.5 dag
- Buffer: ~0.5-1 dag

## 9.10 Risico's in fase 4

| Risico                                                   | Mitigatie                                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------------ |
| Rapport-schrijven kost te veel tijd                      | Templates met goede defaults; max 30 min benchmark                       |
| Klant leest rapport niet                                 | Notify (in fase 4 niet, maar in v2 wel) of nav-CTA prominenter           |
| Drafts blijven liggen, worden nooit gepubliceerd         | Reminder-systeem in DevHub: "3 drafts wachten ≥7 dagen"                  |
| Klant verwacht real-time updates op gepubliceerd rapport | UI maakt duidelijk: "Bevroren op [datum] — voor live status zie roadmap" |
| Bevroren snapshots groeien storage onbeheersbaar         | Archiveer rapporten ouder dan 6 maanden naar lichtere variant            |
| Markdown rendering kwetsbaar voor injectie               | Gebruik veilige markdown-parser (zelfde als bestaande Portal)            |
