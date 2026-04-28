# Micro Sprint PR-007: Auto-rollup van Issue-status naar Topic-status

## Doel

Topic-status wordt automatisch afgeleid uit linked-issue-statussen volgens de regels in §8.3.1: alle issues done → topic done; ≥1 in_progress → topic in_progress; etc. Implementatie SERVER-SIDE in de `updateIssue`-mutation (geen Postgres-trigger — zie I-1 in §13.3). Override-vlag (`status_overridden`) zet auto-rollup handmatig uit; "Resume auto-rollup"-knop schakelt terug aan en herberekent direct. Dit is de kern van de "issue-data rolt op naar topic-status, topic-data leeft naast issues" regel uit §12.5.

## Requirements

| ID          | Beschrijving                                                                                                                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PR-REQ-070  | Issue-status update triggert recompute van topic-status (server-side in `updateIssue`-mutation)                                                                                                                          |
| PR-REQ-071  | Recompute-regels: alle issues `done`/`cancelled` → topic `done`; ≥1 `in_progress` → `in_progress`; alle `todo`/`backlog` met `target_sprint` → `scheduled`; anders `prioritized` of `awaiting_client_input` per defaults |
| PR-REQ-072  | Recompute schrijft `closed_at = now()` als nieuwe status `done` is en oude status niet                                                                                                                                   |
| PR-REQ-073  | Recompute slaat status-mapping over als `topic.status_overridden = true`                                                                                                                                                 |
| PR-REQ-074  | Override-toggle: DevHub topic-detail heeft knop "Override status" → set `status_overridden = true`; "Resume auto-rollup" → set `false` + recompute                                                                       |
| PR-REQ-075  | Override-actie wordt gelogd in `topic_events` (gebruikt PR-009 events; tot dan: console.log + TODO)                                                                                                                      |
| PR-REQ-076  | Recompute-functie is pure (gegeven `(issues, currentTopic)` → returned target-status); apart testbaar zonder DB                                                                                                          |
| PR-REQ-077  | Issue → topic-relatie via `topic_issues` join; recompute leest alle linked issues van een topic                                                                                                                          |
| PR-REQ-078  | `linkIssueToTopic` en `unlinkIssueFromTopic` (PR-002) triggeren ook recompute                                                                                                                                            |
| PR-RULE-020 | Status-regels leven in `packages/database/src/constants/topics.ts` als pure functie `computeTopicStatus(issues, topic)`, niet hardcoded in mutation (zie R-4)                                                            |
| PR-RULE-021 | Hard-regel: nooit Postgres-trigger voor rollup — server-side in mutation (I-1 aanbeveling)                                                                                                                               |
| PR-DATA-030 | Migratie: kolom `topics.status_overridden boolean DEFAULT false` (al in PR-001 — verifieer en voeg toe als ontbrekend)                                                                                                   |

## Afhankelijkheden

- **PR-001** (topics + topic_issues; `status_overridden` kolom)
- **PR-002** (basis-mutations)
- Bestaand: `updateIssue`-mutation in `packages/database/src/mutations/issues/`

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- **I-1** (auto-rollup trigger of server-side): aanbeveling server-side. Sprint volgt aanbeveling.
- **I-4** (status-transitie-regels: check-constraint of trigger): aanbeveling server-side validatie + DB CHECK op enum als safety-net. Voor recompute: server-side logic; geen transitie-regels in deze sprint (komen in PR-010 voor wont_do).

## Taken

### 1. Pure compute-functie

- `packages/database/src/constants/topics.ts` — voeg toe:

  ```typescript
  import type { TopicLifecycleStatus } from "./topics";

  export type LinkedIssueStatusInput = {
    status: string; // DevHub issue-status
  };
  export type TopicComputeInput = {
    currentStatus: TopicLifecycleStatus;
    statusOverridden: boolean;
    priority: string | null;
    targetSprintId: string | null;
    issues: LinkedIssueStatusInput[];
  };

  export function computeTopicStatus(input: TopicComputeInput): TopicLifecycleStatus {
    if (input.statusOverridden) return input.currentStatus;
    if (input.issues.length === 0) {
      // geen issues → blijft op huidige status (vermoedelijk clustering of awaiting_client_input)
      return input.currentStatus;
    }
    const allTerminal = input.issues.every((i) => i.status === "done" || i.status === "cancelled");
    if (allTerminal) return "done";
    const anyInProgress = input.issues.some((i) => i.status === "in_progress");
    if (anyInProgress) return "in_progress";
    const allTodoOrBacklog = input.issues.every(
      (i) => i.status === "todo" || i.status === "backlog",
    );
    if (allTodoOrBacklog && input.targetSprintId) return "scheduled";
    if (input.priority) return "prioritized";
    return "awaiting_client_input";
  }
  ```

- **Documentatie**: pure functie, geen DB-call. Test alle paden via Vitest.

### 2. Recompute helper

- `packages/database/src/mutations/topics/auto-rollup.ts`:

  ```typescript
  export async function recomputeTopicStatus(topicId: string, client: SupabaseClient) {
    const topic = await getTopicById(topicId, client);
    if (!topic) return;
    if (topic.status_overridden) return; // skip
    const linkedIssues = await getIssuesForTopic(topicId, client);
    const newStatus = computeTopicStatus({
      currentStatus: topic.status,
      statusOverridden: false,
      priority: topic.priority,
      targetSprintId: topic.target_sprint_id,
      issues: linkedIssues.map((i) => ({ status: i.status })),
    });
    if (newStatus === topic.status) return;
    await updateTopicStatus(topicId, newStatus, { trigger: "auto_rollup" }, client);
    // PR-009: log naar topic_events met trigger=auto_rollup; tot dan: TODO-comment
  }
  ```

### 3. Hook in mutations

- Update `packages/database/src/mutations/issues/core.ts` (of waar `updateIssue` leeft):
  - Na de UPDATE-call: `if (data.status changed) { const topicId = await getTopicIdForIssue(issueId, client); if (topicId) await recomputeTopicStatus(topicId, client); }`
  - **Performance**: alleen recompute als `status` veld werkelijk wijzigde
- Update `packages/database/src/mutations/topics/linking.ts` (uit PR-002):
  - Na link/unlink: `recomputeTopicStatus(topicId, client)`

### 4. DevHub override UI

- Update `apps/devhub/src/features/topics/components/topic-detail.tsx`:
  - Onder de status-dropdown: knop "Override status" of "Resume auto-rollup"
  - Klik → Server Action `toggleStatusOverride(topicId)` → flip `status_overridden`
  - Bij Resume: ook recompute

- `apps/devhub/src/features/topics/actions/topics.ts` — voeg `toggleStatusOverride` action toe

### 5. Status-recompute test scenarios

- 4 issues op 1 topic, status alle `todo` → topic `awaiting_client_input` (geen priority/sprint) of `scheduled` (met sprint)
- Sluit één issue → blijft op huidige (omdat niet alle done)
- Sluit alle 4 → topic `done`, `closed_at` gezet
- Heropen één issue (`in_progress`) → topic `in_progress`
- Override aan, sluit alle issues → topic blijft handmatig
- Resume → topic recompute naar `done`

### 6. Tests

- Vitest unit-test op `computeTopicStatus` met 8+ scenarios
- Integration-test: insert topic + 3 linked issues, update issue-status, check topic-status

## Acceptatiecriteria

- [ ] PR-REQ-070 t/m PR-REQ-072: recompute-regels werken volgens scenarios
- [ ] PR-REQ-073: override blokkeert recompute
- [ ] PR-REQ-074/075: toggle UI + (TODO) log
- [ ] PR-REQ-076: pure functie testbaar zonder DB; alle paden gedekt
- [ ] PR-REQ-077/078: link/unlink triggert recompute
- [ ] PR-RULE-020: regels in constants, niet inline
- [ ] PR-RULE-021: geen Postgres-trigger
- [ ] Type-check + lint + check:queries slagen
- [ ] Vitest groen

## Risico's

| Risico                                                             | Mitigatie                                                                      |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Recompute crasht en blokkeert issue-update                         | Catch errors in mutation, log, ga door (issue-update is leading)               |
| Performance: elke issue-update doet 1-2 extra queries              | Alleen bij status-change; bij volume tweaken met dedup of batch                |
| Auto-rollup zet topic op verkeerde status door bug                 | Override-knop als escape; logging maakt debugging mogelijk (zie PR-009)        |
| Recompute belt zichzelf circulair via updateTopic                  | `updateTopicStatus` ≠ `updateTopic`; updateTopic raakt status NIET (PR-002)    |
| Issue-status van DevHub wijkt af van verwachte enum (R-4 in §13.7) | `computeTopicStatus` is pure functie; bij nieuwe issue-status faalt type-check |

## Bronverwijzingen

- PRD: `docs/specs/prd-portal-roadmap/08-fase-3-lifecycle.md` §8.3.1, §8.3.2 (rollup + override)
- PRD: `docs/specs/prd-portal-roadmap/12-devhub-workflow.md` §12.5, §12.5.1 (rollup-regels + override)
- PRD: `docs/specs/prd-portal-roadmap/13-validatie-en-open-vragen.md` §13.3 I-1, I-4, §13.7 R-4

## Vision-alignment

Vision §2.4 + database-as-communication-bus principe. Auto-rollup is een _afgeleide waarheid_: één bron (issues), één afgeleide (topic-status), geen sync-conflict. Override is bewuste escape — gelogd in events (PR-009), niet verborgen.
