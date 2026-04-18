# Micro Sprint PW-03: Project Orchestrator — de AI-coach

> **Scope:** Nieuwe AI-agent die per project alle structured extractions leest en proactief "wat moet vandaag gebeuren" advies emit. Voedt het "Next actions"-paneel op het project-werkblad. Dit is de vision-critical agent die maakt dat de app écht voelt als _"AI begeleidt projecten van A tot Z"_.

## Doel

Stef opent elke ochtend de app, kiest een project, en ziet top-3 voorgestelde acties van de AI — met reden, herkomst en quick-action chips. De AI leest alle structured extractions (decisions, risks, commitments, questions, needs, signals), weegt urgentie en ouderdom, en prioriteert.

Dit realiseert de kernbelofte uit de visie-pagina: _"AI vertelt je wat je over het hoofd ziet."_

## Requirements

| ID        | Beschrijving                                                                                         |
| --------- | ---------------------------------------------------------------------------------------------------- |
| AI-P030   | Nieuwe agent `packages/ai/src/agents/project-orchestrator.ts` (Sonnet)                               |
| AI-P031   | Input: alle verified extractions voor project-id + project metadata + laatste briefing               |
| AI-P032   | Output: `next_steps[]` (top 3 geprioriteerd), `blockers[]`, `waiting_on_client[]`, `suggested_focus` |
| AI-P033   | Elk `next_step`: title, why, urgency, source_extraction_ids[], suggested_actions[]                   |
| AI-P034   | Output gaat door review-flow: `verification_status='draft'` tot human approved                       |
| AI-P035   | Agent kan niet zomaar terugkomen op zijn eigen eerdere output (leest huidige project_pulse)          |
| DATA-P030 | Nieuwe tabel `project_pulse` — 1 rij per project per generatie-moment, met structured output jsonb   |
| DATA-P031 | Unique constraint `(project_id, created_at)` + index op `project_id + verification_status`           |
| DATA-P032 | Tabel heeft `source_extraction_ids uuid[]` voor traceability                                         |
| FUNC-P040 | Trigger: Orchestrator runt (a) na elke nieuwe verified extraction voor dat project, (b) 1x per dag   |
| FUNC-P041 | Project-werkblad paneel "Next actions" toont `project_pulse.next_steps` (verified, meest recent)     |
| FUNC-P042 | Elk next_step heeft quick-action chips die uit `suggested_actions` komen                             |
| FUNC-P043 | Herkomst-links per next_step openen bron-extractions in side-panel                                   |
| FUNC-P044 | Orchestrator-output verschijnt in review-queue voor Stef's goedkeuring voor zichtbaar op werkblad    |
| FUNC-P045 | Reviewer kan next_step afwijzen, bewerken, of goedkeuren                                             |
| FUNC-P046 | `/admin/orchestrator` pagina: overzicht van alle pulse-generaties, token-kosten, approval-rate       |
| QUAL-P030 | Spot-check door Stef: 10 pulse-generaties over 5 projecten — minstens 80% nuttig advies              |
| QUAL-P031 | Geen hallucinaties: elke `next_step.why` verwijst naar minstens 1 concrete `source_extraction_id`    |
| RULE-P030 | Orchestrator-output is verified-gated (niet zichtbaar op werkblad zonder Stef's approval)            |
| RULE-P031 | Alleen projecten met status `kickoff`/`in_progress`/`review`/`maintenance` krijgen pulses            |
| RULE-P032 | Orchestrator emit max 3 `next_steps` per pulse (voorkomt overload)                                   |
| EDGE-P030 | Project zonder extractions → geen pulse (skip, log)                                                  |
| EDGE-P031 | Orchestrator-failure → log + geen pulse (oude pulse blijft zichtbaar)                                |
| EDGE-P032 | 2 triggers tegelijk → debounce 5 min, laatste wint                                                   |

## Bronverwijzingen

- PW-02 (prerequisite): structured extractions in DB
- PW-01: Next actions-paneel bestaat al visueel (uit /shift mockup), moest gevuld worden
- Shift mockup: `apps/cockpit/src/app/(dashboard)/shift/page.tsx` — paneel "Next actions"
- Vision: `docs/specs/vision-ai-native-architecture.md` §7 "AI monitors everything"
- Verwant bestaand: `weekly-summarizer.ts` / `management-insights.ts` — vergelijkbaar patroon (AI aggregate + review gate)

## Context

### Probleem

Na PW-01 en PW-02 heeft Stef een werkblad met gestructureerde data per project. Maar hij moet zelf de synthese doen: "wat is het belangrijkste om nu te doen?" De panelen tonen data, geen prioriteit.

De visie is AI die vertelt wat er moet gebeuren. Dat is precies wat de Project Orchestrator doet.

### Oplossing

**Nieuwe Sonnet-agent** die per project alle verified extractions + project-metadata + laatste briefing leest, en een gestructureerde "pulse" emit:

```json
{
  "project_id": "cai-studio-uuid",
  "generated_at": "2026-04-18T09:00:00Z",
  "next_steps": [
    {
      "title": "Mail Joris (CAI) voor productie-credentials",
      "why": "Uit meeting 14 apr: Wouter zou dit doen — 4 dagen geleden. Blokkeert deploy.",
      "urgency": "high",
      "source_extraction_ids": ["uuid-van-commitment", "uuid-van-risk"],
      "suggested_actions": ["Naar Wouter toewijzen", "Draft mail", "Zet op agenda dinsdag"]
    }
  ],
  "blockers": ["Credentials 4 dagen oud - deploy staat stil"],
  "waiting_on_client": ["Beslissing auth-strategie (sinds 16 apr)"],
  "suggested_focus": "Deze week: unblock CAI Studio deploy en auth-beslissing."
}
```

### Trigger-logica

Orchestrator draait twee soorten triggers:

1. **Event-based:** elke keer dat er nieuwe verified extractions bijkomen voor een project, wacht 5 min (debounce), regenereer pulse.
2. **Time-based:** 1x per dag om 07:00 Europe/Amsterdam over alle actieve projecten — verse pulse voor 's ochtends.

Beide via Vercel Cron (time) + trigger in save-extractions pipeline (event).

### Review-flow

Orchestrator output gaat de bestaande review-flow door:

- `project_pulse` row met `verification_status='draft'`
- Verschijnt in `/review` queue
- Stef keurt goed/af/bewerkt → `verified`
- Pas verified pulses zijn zichtbaar op project-werkblad

Dit behoudt _"verification before truth"_-principe. Stef blijft in controle.

### Files touched

| Bestand                                                        | Wijziging                                                 |
| -------------------------------------------------------------- | --------------------------------------------------------- |
| `packages/ai/src/agents/project-orchestrator.ts`               | nieuw — Sonnet agent                                      |
| `packages/ai/src/validations/project-orchestrator.ts`          | nieuw — output schema                                     |
| `packages/ai/src/pipeline/orchestrator-pipeline.ts`            | nieuw — event + time trigger                              |
| `supabase/migrations/20260505000001_project_pulse.sql`         | nieuwe tabel                                              |
| `packages/database/src/queries/project-pulse.ts`               | nieuw — `getLatestPulseForProject(id, verifiedOnly=true)` |
| `packages/database/src/mutations/project-pulse.ts`             | nieuw — insert + verify                                   |
| `apps/cockpit/src/components/projects/next-actions-panel.tsx`  | nieuw — vervangt placeholder in PW-01                     |
| `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`      | next-actions-paneel integreren bovenaan                   |
| `apps/cockpit/src/app/(dashboard)/review/page.tsx`             | pulse-reviews in queue tonen                              |
| `apps/cockpit/src/app/(dashboard)/review/pulse/[id]/page.tsx`  | nieuw — pulse-review detail                               |
| `apps/cockpit/src/actions/pulse-review.ts`                     | verify/reject/edit actions                                |
| `apps/cockpit/src/app/(dashboard)/admin/orchestrator/page.tsx` | nieuw — overzicht + telemetry                             |
| `apps/cockpit/src/app/api/cron/orchestrator/route.ts`          | nieuw — daily cron endpoint                               |
| `vercel.json`                                                  | cron-entry voor 07:00 Europe/Amsterdam                    |
| Tests: agent, pipeline triggers, review flow, panel            | nieuw                                                     |

## Prerequisites

PW-02 done (structured extractions draaien in productie, `extraction-types.ts` bestaat).

## Taken

### TDD-first

- [ ] `project-orchestrator.test.ts`: mocked AI met 5 voorbeeld-extractions → 3 next_steps, elk met source_ids naar input-extractions.
- [ ] `orchestrator-pipeline.test.ts`: event trigger debounce werkt (5 min); time trigger runt voor alle actieve projecten; falen logs maar crasht niet.
- [ ] `next-actions-panel.test.tsx`: toont verified pulse; leeg-staat als geen verified; "wacht op review" indicator als alleen draft.

### Database

- [ ] Migratie `project_pulse` tabel + types regenereren.

### Agent + pipeline

- [ ] Zod schema voor output.
- [ ] Sonnet agent met prompt: jij leest project-context, jij emit max 3 next_steps met bronnen.
- [ ] Pipeline: event trigger in save-extractions + Vercel cron.
- [ ] Mutations: `insertPulse()`, `verifyPulse()`, `rejectPulse()`.

### UI

- [ ] `next-actions-panel.tsx` — bovenaan project-werkblad, 2-kolom breed zoals in /shift.
- [ ] Review-queue integratie + pulse-review-detail pagina.
- [ ] Admin-overzicht met telemetry (token-kosten, approval-rate per project).

### Rollout

- [ ] Event + cron triggeren.
- [ ] 1 week: alleen draft-output, Stef reviewt alles handmatig om kwaliteit te kalibreren.
- [ ] Daarna: pulse-generatie blijft doorlopen, verified-output verschijnt automatisch in werkblad.

### Validatie

- [ ] Tests groen.
- [ ] Handmatig: 5 projecten genereren een pulse → review → goedkeuren → zichtbaar op werkblad.
- [ ] Spot-check: elke next_step heeft traceerbare bron.

## Acceptatiecriteria

- [ ] [AI-P030-P035] Orchestrator werkt.
- [ ] [DATA-P030-P032] Tabel + indexen.
- [ ] [FUNC-P040-P046] Triggers, paneel, review-flow, admin-view.
- [ ] [QUAL-P030-P031] Spot-check + geen hallucinaties.
- [ ] [RULE-P030-P032] Verified-gated, status-scoped, max 3.
- [ ] [EDGE-P030-P032] Edge-cases gedekt.

## Dependencies

PW-02.

## Out of scope

- Automatisering (daadwerkelijk mailen, tickets creëren) — daarvoor is person_profile + policies + ai_actions laag nodig (post-deze-tranche).
- Cross-project patterns / Analyst agent (Phase E in vision).
- Notifications bij high-urgency next_steps (Slack/email).
- Client-facing version van de pulse voor Portal.
- Leer-loop: orchestrator past prompt aan op basis van approval-rate (manueel in volgende iteratie).

## Resultaat na deze sprint

Stef opent 's ochtends zijn dashboard, ziet voor elk actief project een top-3 acties-lijstje, gegenereerd door AI, gereviewd door hemzelf. Hij weet binnen 30 seconden per project wat belangrijk is — zonder zelf extractions door te lezen.

De vision _"AI helpt projecten A tot Z begeleiden"_ is vanaf nu operationeel voor de advies-laag. De automatiserings-laag (AI die zelf mailt/PRs opent) komt in een volgende tranche, bovenop deze fundering.
