# Micro Sprint PR-010: `wont_do` Flow met Verplichte Reden

## Doel

`wont_do` is in de PRD een **harde regel** (§4.7): topics die niet doorgaan moeten een reden hebben (min 10 chars, max 500), die reden moet zichtbaar zijn voor de klant in een uitklapbaar paneel "Bekijk afgewezen wensen". Plus: de `wont_do_proposed_by_client`-flow uit §8.3.7 — wanneer klant 👎 (`not_relevant`) klikt, krijgt het topic deze tussenstatus en moet het team bevestigen of bestrijden.

Zonder deze sprint blijft `wont_do` semantisch identiek aan een verloren topic. Vertrouwen vraagt expliciete uitleg.

## Requirements

| ID          | Beschrijving                                                                                                                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-DATA-050 | Migratie: CHECK constraint op `topics` — als `status = 'wont_do'` dan `wont_do_reason IS NOT NULL AND length(wont_do_reason) >= 10 AND length <= 500`                                                 |
| PR-DATA-051 | Migratie: bestaande `wont_do`-topics zonder reden krijgen warning-event in `topic_events`; geen migration-failure (gradual migration)                                                                 |
| PR-RULE-030 | Hard-regel: status-change naar `wont_do` zonder geldige reden wordt geblokkeerd door DB-constraint én server-side validatie                                                                           |
| PR-REQ-100  | DevHub `wont-do-form.tsx`: dialog/modal die opent bij status-change naar `wont_do`, vraagt reden, voorbeeld-redenen als placeholder                                                                   |
| PR-REQ-101  | Voorbeeld-placeholders in form: "Buiten scope huidige contract" / "Technisch niet haalbaar zonder major refactor" / "Vervangen door topic X (gemerged)" / "Klant heeft 👎 'niet relevant' aangegeven" |
| PR-REQ-102  | Portal: nieuw component `rejected-topics-panel.tsx` — uitklapbaar paneel onderaan roadmap-page met "Bekijk afgewezen wensen (N)"                                                                      |
| PR-REQ-103  | Per afgewezen topic in panel: titel + reden (markdown) + datum; geen signaal-knoppen                                                                                                                  |
| PR-REQ-104  | Nieuwe status `wont_do_proposed_by_client` (al in lifecycle-enum uit PR-001): klant 👎 → topic naar deze status, team-actie verplicht                                                                 |
| PR-REQ-105  | DevHub: aparte view (of filter-tab op topic-list) "Afwijzingen door klant" — toont `wont_do_proposed_by_client`-topics met "Bevestig afwijzing" / "Bestrijd"-knoppen                                  |
| PR-REQ-106  | "Bevestig afwijzing"-actie zet status naar `wont_do` met reden "Klant heeft 👎 'niet relevant' aangegeven" (voor-ingevuld, kan worden aangevuld)                                                      |
| PR-REQ-107  | "Bestrijd"-actie zet status terug naar `awaiting_client_input` met team-comment in payload (event)                                                                                                    |
| PR-REQ-108  | Status-transitie-validatie in mutation: alleen toegestane transities uit §11.7.1 mogelijk; illegale transitie gooit error                                                                             |
| PR-REQ-109  | Update PR-006 👎-flow: na 5 sec zonder undo wordt status `wont_do_proposed_by_client` (niet meer alleen verberg-flag)                                                                                 |

## Afhankelijkheden

- **PR-001** (lifecycle enum incl. `wont_do_proposed_by_client`)
- **PR-002** (basis-mutations)
- **PR-003** (DevHub topic-feature voor form-integratie)
- **PR-004** (Portal roadmap voor panel-integratie)
- **PR-006** (signal-flow voor 👎-extension)
- **PR-009** (events voor `wont_do_set` en `client_signal_set` met `wont_do_proposed`-trigger)

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- **I-4** (status-transitie-regels: check-constraint of trigger): aanbeveling server-side validatie + DB CHECK op enum als safety-net. Sprint volgt aanbeveling.

## Visuele referentie

- Live preview: `/design-preview/roadmap` § 04 (rejected-panel.tsx)
- Design-spec: §14.4 (form-component voor `wont-do-form`), §14.5 (collapsible panel-stijl)

## Migreren vanuit preview

| Preview-bestand                                                 | Productie-doel                                          | Wat doen                                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| `apps/portal/src/components/roadmap-preview/rejected-panel.tsx` | `apps/portal/src/components/roadmap/rejected-panel.tsx` | Migreren as-is; vervang mock met server-data via `listWontDoTopics`-query |

## Taken

### 1. Migratie — CHECK constraint

- `supabase/migrations/<datum>_wont_do_reason_constraint.sql`:

  ```sql
  -- Eerst: warning-events voor bestaande wont_do zonder reden
  INSERT INTO topic_events (topic_id, event_type, payload, created_at)
  SELECT id, 'wont_do_set', jsonb_build_object('warning', 'no_reason_at_migration'), now()
  FROM topics WHERE status = 'wont_do' AND (wont_do_reason IS NULL OR length(wont_do_reason) < 10);

  -- Daarna: constraint
  ALTER TABLE topics ADD CONSTRAINT wont_do_requires_reason
    CHECK (
      status <> 'wont_do' OR (
        wont_do_reason IS NOT NULL
        AND length(wont_do_reason) BETWEEN 10 AND 500
      )
    ) NOT VALID; -- NOT VALID = gelden voor nieuwe rijen, niet retroactief

  -- Optioneel: VALIDATE later na cleanup
  -- ALTER TABLE topics VALIDATE CONSTRAINT wont_do_requires_reason;
  ```

- **Note**: NOT VALID maakt migratie idempotent zonder breaking voor legacy data. In de DevHub UI tonen we waarschuwing voor topics zonder reden.

### 2. Query — `listWontDoTopics`

- `packages/database/src/queries/topics/list.ts`:
  - `listWontDoTopics(projectId, client?)` — `status = 'wont_do'`, gesorteerd op `closed_at DESC`

### 3. Status-transitie-validatie

- `packages/database/src/constants/topics.ts` — voeg toe:

  ```typescript
  export const ALLOWED_TRANSITIONS: Record<TopicLifecycleStatus, TopicLifecycleStatus[]> = {
    clustering: ["awaiting_client_input", "prioritized", "wont_do"],
    awaiting_client_input: ["prioritized", "scheduled", "wont_do_proposed_by_client", "wont_do"],
    wont_do_proposed_by_client: ["wont_do", "awaiting_client_input"],
    prioritized: ["scheduled", "awaiting_client_input", "wont_do"],
    scheduled: ["in_progress", "prioritized", "wont_do"],
    in_progress: ["done", "scheduled", "wont_do"],
    done: ["in_progress"],
    wont_do: ["awaiting_client_input"],
  };
  export function isAllowedTransition(from: TopicLifecycleStatus, to: TopicLifecycleStatus) {
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
  }
  ```

- Update `updateTopicStatus`-mutation (PR-002): vóór UPDATE check `isAllowedTransition(currentStatus, newStatus)` → throw als false

### 4. DevHub `wont-do-form`

- `apps/devhub/src/features/topics/components/wont-do-form.tsx` (`"use client"`):
  - Modal/dialog opent wanneer status-dropdown wijzigt naar `wont_do`
  - Textarea voor reden (min 10, max 500), placeholder met voorbeeld-redenen rotating
  - Bevestig-knop submit Server Action `setWontDo({ topicId, reason })`
  - Annuleren reset status-dropdown

### 5. DevHub `wont_do_proposed_by_client`-view

- Update topic-list of nieuwe filter-tab "Afwijzingen door klant"
- Per topic: knop "Bevestig afwijzing" (opent wont-do-form met reden voor-ingevuld) en "Bestrijd" (opent dialog voor team-comment, returns naar `awaiting_client_input`)

### 6. Portal `rejected-topics-panel`

- `apps/portal/src/components/roadmap/rejected-panel.tsx`:
  - Server Component, props: `projectId`
  - Fetch `listWontDoTopics(projectId)`
  - Render: collapsible (`<details>` of bestaand collapsible-component) met "Bekijk afgewezen wensen (N)"
  - Open: lijst topics met titel, reden (markdown), datum
  - Geen signaal-knoppen, klant kan niet ongedaan maken (alleen via team-contact)

### 7. Update PR-006 👎-flow

- `apps/portal/src/components/roadmap/signal-buttons.tsx`:
  - 👎 zet signal als voorheen
  - Update Server Action: na zetten `not_relevant`-signal, zet topic-status naar `wont_do_proposed_by_client` (alleen als huidige status `awaiting_client_input` is)
  - Toast tekst: "We bekijken jouw afwijzing. Het JAIP-team komt erop terug."

### 8. Server actions

- `apps/devhub/src/features/topics/actions/topics.ts`:
  - `setWontDo({ topicId, reason })` — Zod-validate reden, call `updateTopicStatus(id, 'wont_do', { wont_do_reason: reason })`
  - `confirmClientRejection(topicId)` — pre-fill reden, call setWontDo
  - `disputeClientRejection(topicId, comment)` — set status terug naar `awaiting_client_input`, log event

### 9. Update Zod-schema

- `topicStatusSchema` in `validations/topics.ts` (PR-002) heeft `wont_do_reason` optional; voeg refine toe:
  ```typescript
  topicStatusSchema.refine(
    (data) =>
      data.status !== "wont_do" || (data.wont_do_reason && data.wont_do_reason.length >= 10),
    { message: "Reden verplicht bij wont_do (min 10 chars)" },
  );
  ```

## Acceptatiecriteria

- [ ] PR-DATA-050: poging tot `wont_do` zonder reden via SQL faalt op CHECK
- [ ] PR-DATA-051: bestaande wont_do zonder reden hebben warning-event; geen migratie-crash
- [ ] PR-RULE-030: form weigert submit zonder geldige reden; mutation gooit error bij directe call zonder reden
- [ ] PR-REQ-100/101: form heeft placeholder met voorbeeld-redenen
- [ ] PR-REQ-102/103: Portal toont collapsible panel met afgewezen wensen
- [ ] PR-REQ-104 t/m PR-REQ-107: klant 👎 → status proposed → team kan bevestigen of bestrijden, met juiste flows
- [ ] PR-REQ-108: illegal transitions worden geblokkeerd
- [ ] PR-REQ-109: 👎-flow update werkt (geen verberg-flag meer, echte status-change)
- [ ] Type-check + lint + check:queries slagen
- [ ] Vitest: `isAllowedTransition` getest voor alle paden uit §11.7.1

## Risico's

| Risico                                                                      | Mitigatie                                                                             |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `wont_do` redenen worden lui ingevuld ("zie ticket")                        | Code-review-cultuur; voorbeelden in placeholder; v2 kan AI-quality-check              |
| Klant ziet `wont_do_proposed_by_client` als afwijzing zonder uitleg         | UI-tekst maakt duidelijk: "we bekijken jouw afwijzing"                                |
| NOT VALID constraint laat oude bad data staan; nieuwe writes met workaround | Server-side validatie als tweede laag; als duurzaam data-cleanup nodig, aparte sprint |
| `disputeClientRejection` zonder team-comment is bot                         | Required-veld in dialog; min 10 chars op comment                                      |

## Bronverwijzingen

- PRD: `docs/specs/prd-portal-roadmap/04-conceptueel-model.md` §4.7 (`wont_do` hard-regel)
- PRD: `docs/specs/prd-portal-roadmap/08-fase-3-lifecycle.md` §8.3.6, §8.3.7 (`wont_do` flow + klant-rejection)
- PRD: `docs/specs/prd-portal-roadmap/11-data-model.md` §11.7.1 (transitie-grafiek)
- PRD: `docs/specs/prd-portal-roadmap/13-validatie-en-open-vragen.md` §13.3 I-4

## Vision-alignment

Vision §2.4 "verification before truth": elke afwijzing heeft een gemotiveerde reden, vastgelegd, zichtbaar voor klant. Geen zwart gat. Sluit aan op `audit-events`-pattern uit PR-009.
