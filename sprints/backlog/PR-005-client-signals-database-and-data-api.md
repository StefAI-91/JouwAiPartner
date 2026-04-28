# Micro Sprint PR-005: Klant-signalen Database + Queries + Mutations

## Doel

De data-laag voor fase 2 leggen: tabel `topic_client_signals` (een rij per `(topic_id, organization_id)` + UPDATE bij wijziging — model A uit §11.4), eventueel `topic_signal_history` voor audit, RLS, queries en mutations. Geen UI. Na deze sprint kunnen PR-006 (Portal-knoppen + DevHub-zicht) en de signaal-events in PR-009 op een stabiele data-API bouwen.

## Requirements

| ID          | Beschrijving                                                                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-DATA-020 | Tabel `topic_client_signals` met velden: `id`, `topic_id`, `organization_id`, `signal`, `set_by_profile_id`, `set_at`, `previous_signal`                  |
| PR-DATA-021 | UNIQUE constraint op `(topic_id, organization_id)` — één huidig signaal per (topic, org)                                                                  |
| PR-DATA-022 | CHECK constraint: `signal IN ('must_have','nice_to_have','not_relevant')`                                                                                 |
| PR-DATA-023 | Tabel `topic_signal_history` — append-only log met `id`, `topic_id`, `organization_id`, `from_signal`, `to_signal`, `changed_by_profile_id`, `changed_at` |
| PR-DATA-024 | Indexes: `(topic_id, organization_id)`, `(set_at)`                                                                                                        |
| PR-SEC-010  | RLS op `topic_client_signals`: SELECT voor org-leden via `has_portal_access`; INSERT/UPDATE alleen via auth-org match; DELETE alleen admins               |
| PR-SEC-011  | RLS op `topic_signal_history`: SELECT zelfde, alleen INSERT door mutations                                                                                |
| PR-REQ-050  | `getCurrentSignalForTopic(topicId, organizationId, client?)` retourneert `Signal \| null`                                                                 |
| PR-REQ-051  | `listCurrentSignalsByOrg(projectId, organizationId, client?)` retourneert `Map<topicId, Signal>` voor bulk-rendering                                      |
| PR-REQ-052  | `setClientSignal({ topic_id, organization_id, signal, set_by_profile_id }, client?)` — upsert; bij wijziging schrijft naar `topic_signal_history`         |
| PR-REQ-053  | `clearClientSignal({ topic_id, organization_id }, client?)` — DELETE rij; logt naar history met `to_signal=null`                                          |
| PR-REQ-054  | Zod-schemas: `setSignalSchema`, `clearSignalSchema`                                                                                                       |
| PR-RULE-010 | Hard-regel: één rij per (topic, org) — model A; geen meerdere actieve signalen per org                                                                    |

## Afhankelijkheden

- **PR-001** (topics-tabel)
- **PR-002** (queries/mutations basis-patroon)
- Bestaand: `organizations`, `profiles`, `portal_project_access`

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- **I-2** (signaal-model A vs B): aanbeveling A (één rij per (topic,org), audit apart). Bevestigen door Stef vóór migratie. Sprint volgt model A.
- **O-3** (multi-stakeholder per org): in v1 = per-org één signaal. Per-user uitbreiding is non-breaking later. Sprint volgt v1.

## Taken

### 1. Migratie 1 — `topic_client_signals`

- `supabase/migrations/<datum>_topic_client_signals.sql`:

  ```sql
  CREATE TABLE IF NOT EXISTS topic_client_signals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    signal text NOT NULL CHECK (signal IN ('must_have','nice_to_have','not_relevant')),
    set_by_profile_id uuid NOT NULL REFERENCES profiles(id),
    set_at timestamptz NOT NULL DEFAULT now(),
    previous_signal text,
    UNIQUE (topic_id, organization_id)
  );

  CREATE INDEX IF NOT EXISTS idx_signals_topic_org ON topic_client_signals(topic_id, organization_id);
  CREATE INDEX IF NOT EXISTS idx_signals_set_at ON topic_client_signals(set_at);
  ```

### 2. Migratie 2 — `topic_signal_history`

- `supabase/migrations/<datum>_topic_signal_history.sql`:

  ```sql
  CREATE TABLE IF NOT EXISTS topic_signal_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    from_signal text,
    to_signal text,
    changed_by_profile_id uuid NOT NULL REFERENCES profiles(id),
    changed_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_signal_history_topic ON topic_signal_history(topic_id, changed_at DESC);
  ```

### 3. Migratie 3 — RLS

- `supabase/migrations/<datum>_signals_rls.sql`:

  ```sql
  ALTER TABLE topic_client_signals ENABLE ROW LEVEL SECURITY;
  ALTER TABLE topic_signal_history ENABLE ROW LEVEL SECURITY;

  -- SELECT voor org-leden via has_portal_access
  CREATE POLICY "signals_select_client" ON topic_client_signals FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM topics t
        JOIN portal_project_access ppa ON ppa.project_id = t.project_id
        WHERE t.id = topic_client_signals.topic_id
          AND ppa.profile_id = auth.uid()
      )
      AND organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

  -- INSERT/UPDATE: client-rol mag alleen eigen org
  CREATE POLICY "signals_write_client_own_org" ON topic_client_signals FOR ALL
    USING (
      organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM topics t
        JOIN portal_project_access ppa ON ppa.project_id = t.project_id
        WHERE t.id = topic_client_signals.topic_id AND ppa.profile_id = auth.uid()
      )
    );

  -- Admin/member kan altijd
  CREATE POLICY "signals_select_internal" ON topic_client_signals FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','member')));

  -- History: SELECT same as signals; INSERT alleen via mutations (admin)
  CREATE POLICY "signal_history_select_client" ON topic_signal_history FOR SELECT
    USING (
      organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM topics t
        JOIN portal_project_access ppa ON ppa.project_id = t.project_id
        WHERE t.id = topic_signal_history.topic_id AND ppa.profile_id = auth.uid()
      )
    );
  ```

### 4. Queries en Mutations

- Voeg toe aan bestaande `packages/database/src/queries/topics/` cluster:
  - `signals.ts`: `getCurrentSignalForTopic`, `listCurrentSignalsByOrg`, `getSignalHistory`
- Voeg toe aan `packages/database/src/mutations/topics/`:
  - `signals.ts`: `setClientSignal` (upsert + history-insert in transactie), `clearClientSignal` (delete + history-insert)

- **Transactie-aanpak**: gebruik Postgres-functie of laat de mutation meerdere statements uitvoeren via `client.rpc(...)`. Simplest: in mutation eerst SELECT current → INSERT history → UPSERT signal in één try-block; geen rollback (acceptabel risico voor v1).

### 5. Zod-validaties

- `packages/database/src/validations/signals.ts`:

  ```typescript
  import { z } from "zod";
  export const setSignalSchema = z.object({
    topic_id: z.string().uuid(),
    organization_id: z.string().uuid(),
    signal: z.enum(["must_have", "nice_to_have", "not_relevant"]),
  });
  export const clearSignalSchema = z.object({
    topic_id: z.string().uuid(),
    organization_id: z.string().uuid(),
  });
  ```

### 6. Tests

- Vitest integration: setSignal van een org → check rij in `topic_client_signals` + history-rij
- Test wijziging: setSignal nogmaals met ander signal → UPDATE rij + nieuwe history-rij met `from_signal` gevuld
- RLS-test: org A probeert signal te zetten op topic van org B-project → geblokkeerd

## Acceptatiecriteria

- [ ] PR-DATA-020 t/m PR-DATA-024: migraties draaien idempotent
- [ ] PR-SEC-010/011: RLS-policies aanwezig en getoetst
- [ ] PR-REQ-050 t/m PR-REQ-053: queries en mutations werken via integration-tests
- [ ] PR-REQ-054: Zod-schemas exporteren correct
- [ ] PR-RULE-010: poging tot tweede signal-rij voor zelfde (topic,org) crasht op UNIQUE
- [ ] Type-check + lint + check:queries slagen

## Risico's

| Risico                                                             | Mitigatie                                                                              |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Race condition: 2 stakeholders zetten signaal tegelijk             | UPSERT met `ON CONFLICT (topic_id,organization_id)` — laatste write wint               |
| RLS-policy laat per ongeluk cross-org signal-zet toe               | Test expliciet met andere-org-account; bevestig 403/PostgREST-error                    |
| History-tabel groeit onbeheersbaar                                 | Niet zorgen in v1 (1 signaal per topic per week per klant max); index op (topic, time) |
| Mutation faalt halverwege (signal upsert ok, history insert faalt) | Acceptabel risico in v1; in v2 via Postgres-functie met BEGIN/COMMIT                   |

## Bronverwijzingen

- PRD: `docs/specs/prd-portal-roadmap/07-fase-2-klant-signalen.md` §7.5 (DB)
- PRD: `docs/specs/prd-portal-roadmap/11-data-model.md` §11.4, §11.5 (signals + history)
- PRD: `docs/specs/prd-portal-roadmap/13-validatie-en-open-vragen.md` §13.3 I-2

## Vision-alignment

Past in vision §2.4 — klant-signaal is dé feedbackloop tussen Portal (klant) en DevHub (team). Database-first: signalen leven als rows, niet als state in een UI.
