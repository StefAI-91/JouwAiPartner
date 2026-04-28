# Micro Sprint PR-018: `agent_suggestions` Tabel + Acceptance-Tracking

## Doel

De fase 5-infrastructuur voor agent-quality-meting opleveren: tabel `agent_suggestions` waarin alle voorgestelde agent-acties leven (curator, narrator, pattern-detector), met `outcome`-veld om acceptance/rejection/modification te tracken. Plus een DevHub-dashboard dat acceptance-rate per agent toont over tijd. Zonder dit weet het team niet of agents beter of slechter worden.

## Requirements

| ID          | Beschrijving                                                                                                                                                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| PR-DATA-070 | Tabel `agent_suggestions` met velden uit §11.9: `id`, `agent_id`, `target_type`, `target_id`, `suggestion_payload jsonb`, `confidence`, `created_at`, `reviewed_at`, `reviewed_by`, `outcome` |
| PR-DATA-071 | CHECK: `target_type IN ('topic','report_narrative','pattern','merge')`, `outcome IN ('accepted','rejected','modified')` als gevuld                                                            |
| PR-DATA-072 | Indexes: `(agent_id, created_at DESC)`, `(target_type, target_id)`, `(reviewed_at)` voor unreviewed-queue                                                                                     |
| PR-SEC-040  | RLS: SELECT/INSERT/UPDATE alleen admin/member; geen client-toegang                                                                                                                            |
| PR-DATA-073 | Migratie: extra kolommen op `topic_events`: `agent_id`, `confidence`, `accepted_by` (al voorzien in PR-009 — dubbelchecken)                                                                   |
| PR-REQ-170  | `insertAgentSuggestion(input, client?)` mutation — wordt aangeroepen door alle agents (PR-014/15/16/17)                                                                                       |
| PR-REQ-171  | `markSuggestionReviewed(id, outcome, reviewedBy, modifiedPayload?, client?)` mutation                                                                                                         |
| PR-REQ-172  | `listSuggestions({ agent_id?, target_type?, status?: 'pending'                                                                                                                                | 'reviewed' }, client?)` query |
| PR-REQ-173  | `getAgentAcceptanceRate(agentId, window?, client?)` — retourneert `{ total, accepted, rejected, modified, accepted_pct }`                                                                     |
| PR-REQ-174  | DevHub `/agents`-pagina (bestaand) krijgt sectie "Acceptance over tijd" per agent met grafiek of tabel                                                                                        |
| PR-REQ-175  | Hookpunt: alle bestaande agent-flows (PR-014/15/16/17) schrijven hun output via `insertAgentSuggestion` (refactor)                                                                            |
| PR-REQ-176  | DevHub topic-list/triage-queue: voor pending suggesties — query gebruikt `agent_suggestions` ipv `topic_events`                                                                               |

## Afhankelijkheden

- **PR-009** (events) — niet strict afhankelijk maar overlapt; refactor mogelijk
- **PR-014/15/16/17** (agents) — moeten allemaal naar deze tabel schrijven

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- Verhouding `agent_suggestions` ↔ `topic_events`: zijn dit twee bronnen van waarheid of één? **Aanbeveling**: agent-suggesties leven in `agent_suggestions`; bij accept/reject schrijft de mutation een follow-up event in `topic_events` (`agent_suggestion_accepted` etc.). Sprint volgt dit.
- Waar leeft `target_id` voor `target_type='pattern'` (patterns hebben geen eigen tabel)? **Aanbeveling**: gebruik report_id als parent.

## Visuele referentie

- Geen aparte preview; integreert met bestaande `/agents` observability-pagina

## Taken

### 1. Migratie

- `supabase/migrations/<datum>_agent_suggestions.sql`:

  ```sql
  CREATE TABLE IF NOT EXISTS agent_suggestions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id text NOT NULL,
    target_type text NOT NULL CHECK (target_type IN ('topic','report_narrative','pattern','merge')),
    target_id uuid,
    suggestion_payload jsonb NOT NULL,
    confidence real CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
    created_at timestamptz NOT NULL DEFAULT now(),
    reviewed_at timestamptz,
    reviewed_by uuid REFERENCES profiles(id),
    outcome text CHECK (outcome IS NULL OR outcome IN ('accepted','rejected','modified'))
  );

  CREATE INDEX IF NOT EXISTS idx_suggestions_agent_time ON agent_suggestions(agent_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_suggestions_target ON agent_suggestions(target_type, target_id);
  CREATE INDEX IF NOT EXISTS idx_suggestions_pending ON agent_suggestions(reviewed_at) WHERE reviewed_at IS NULL;
  ```

### 2. RLS

- `supabase/migrations/<datum>_agent_suggestions_rls.sql`:

  ```sql
  ALTER TABLE agent_suggestions ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "suggestions_admin_only" ON agent_suggestions FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','member')));
  ```

### 3. Queries en mutations

- `packages/database/src/queries/agent-suggestions.ts`:
  - `listSuggestions`, `getSuggestionById`, `getAgentAcceptanceRate`
- `packages/database/src/mutations/agent-suggestions.ts`:
  - `insertAgentSuggestion(input, client?)`
  - `markSuggestionReviewed(id, { outcome, reviewedBy, modifiedPayload? }, client?)`

### 4. Refactor agents

- Update `packages/ai/src/pipeline/topics/cluster-issue.ts` (PR-014):
  - Na agent-run: `insertAgentSuggestion({ agent_id: 'topic-curator', target_type: 'topic', target_id: bestMatch.topicId ?? null, suggestion_payload: result, confidence })`
- Update `packages/ai/src/pipeline/topics/generate-narrative.ts` (PR-015):
  - Na narrative-generate: `insertAgentSuggestion({ agent_id: 'topic-narrator', target_type: 'report_narrative', target_id: reportId, suggestion_payload: { markdown }, confidence: null })`
- Update PR-016 (pattern-detector) en PR-017 (merge-detector) idem

- Triage-queue (PR-008/PR-014): query `listSuggestions({ target_type: 'topic', status: 'pending' })` ipv `topic_events`-filter

### 5. Acceptance-flow

- DevHub Triage-knoppen "Accept"/"Reject" roepen Server Action die:
  1. `markSuggestionReviewed(suggestionId, { outcome, reviewedBy: userId })`
  2. Bij accept: `linkIssue` mutation (bestaand)
  3. Log event `agent_suggestion_accepted` of `_rejected` in `topic_events` (PR-009)

### 6. Dashboard `/agents`-pagina

- Update `apps/devhub/src/components/agents/page.tsx` (of waar het ook leeft):
  - Per agent: tabel of grafiek met acceptance-rate over tijd (per week)
  - Metric-kaarten: total / accepted / rejected / modified met %
  - Filter: laatste 7d / 30d / 90d

### 7. Tests

- Vitest unit: `getAgentAcceptanceRate` returns correct percentage
- Integration: insert 10 suggesties met diverse outcomes, query acceptance-rate

## Acceptatiecriteria

- [ ] PR-DATA-070 t/m PR-DATA-073: migratie idempotent
- [ ] PR-SEC-040: RLS getoetst — client-account heeft geen toegang
- [ ] PR-REQ-170 t/m PR-REQ-173: queries/mutations werken
- [ ] PR-REQ-174: dashboard toont rate per agent
- [ ] PR-REQ-175: alle agents schrijven naar `agent_suggestions`
- [ ] PR-REQ-176: triage-queue gebruikt nieuwe tabel
- [ ] Type-check + lint + check:queries slagen

## Risico's

| Risico                                                       | Mitigatie                                                                                |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Twee bronnen (events + suggestions) raken inconsistent       | Mutation-laag schrijft beide atomic; één bron leidend (suggestions), event is afgeleid   |
| Migratie van bestaande agent-output is complex               | Refactor klein-stapsgewijs per agent; events blijven werken tijdens transitie            |
| Acceptance-rate is onbetrouwbaar bij weinig data             | UI toont "te weinig data" tot N≥10                                                       |
| `outcome='modified'` is moeilijk te detecteren (diff-detect) | In v1: alleen accepted/rejected; modified komt in v2 via diff-tracking (PR-015 narrator) |

## Bronverwijzingen

- PRD: `docs/specs/prd-portal-roadmap/10-fase-5-ai-acceleratie.md` §10.5 (data-model)
- PRD: `docs/specs/prd-portal-roadmap/11-data-model.md` §11.9 (`agent_suggestions`)
- Bestaand: `packages/ai/src/agents/registry.ts`, observability-pagina

## Vision-alignment

Vision-kernprincipe — "verification before truth": agent-suggesties zijn pas waarheid als mens accepteert. Tabel maakt dit meet- en stuurbaar. Zonder acceptance-tracking kunnen we niet bepalen of agents beter worden over tijd.
