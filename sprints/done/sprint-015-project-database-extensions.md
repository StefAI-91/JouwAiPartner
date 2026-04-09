# Sprint 015: Project & Organization Database Extensions (v3)

## Doel

De database uitbreiden zodat projecten en organisaties de velden hebben die nodig zijn voor het vernieuwde projectmanagement: beschrijving, eigenaar, contactpersoon, deadlines, en een versiegebonden summaries-tabel voor AI-gegenereerde samenvattingen (zowel project context als AI briefing, zowel voor projecten als organisaties).

## Requirements

| ID       | Beschrijving                                                                                 |
| -------- | -------------------------------------------------------------------------------------------- |
| DATA-060 | Projects tabel uitbreiden met description, owner_id, contact_person_id, start_date, deadline |
| DATA-061 | Summaries tabel aanmaken met entity_type, entity_id, summary_type, content, version          |
| DATA-062 | Summaries versiehistorie: nieuwe summary maakt nieuwe rij, oude blijven bewaard              |
| DATA-063 | RLS policies op summaries tabel (authenticated users, zelfde patroon als v2)                 |
| DATA-064 | Indexes op summaries tabel (entity_type + entity_id + summary_type composite)                |
| DATA-065 | Query functies voor summaries (get latest, get history)                                      |
| DATA-066 | Mutation functies voor summaries (create new version)                                        |
| DATA-067 | Query functies voor projects uitbreiden met nieuwe velden + latest summaries                 |
| DATA-068 | Mutation functies voor projects uitbreiden met nieuwe velden                                 |

## Bronverwijzingen

- Platform spec: `docs/specs/platform-spec.md` -> sectie "4.1 Database Schema" (tabellen)
- Platform spec: `docs/specs/platform-spec.md` -> sectie "13.3 v3 Scope" (evolving summaries)
- Prototype: `apps/cockpit/src/app/(dashboard)/test-project/page.tsx` (design referentie)

## Context

### Database design: summaries tabel

```sql
CREATE TABLE summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('project', 'organization')),
  entity_id UUID NOT NULL,
  summary_type TEXT NOT NULL CHECK (summary_type IN ('context', 'briefing')),
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  source_meeting_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite index for fast lookups
CREATE INDEX idx_summaries_entity_type ON summaries (entity_type, entity_id, summary_type, version DESC);
```

### Projects tabel extensies

```sql
ALTER TABLE projects
  ADD COLUMN description TEXT,
  ADD COLUMN owner_id UUID REFERENCES people(id),
  ADD COLUMN contact_person_id UUID REFERENCES people(id),
  ADD COLUMN start_date DATE,
  ADD COLUMN deadline DATE;
```

### Relevante business rules

- **RULE-001**: "Err on keeping" — summaries worden nooit verwijderd, alleen nieuwe versies toegevoegd
- Summaries hebben geen verification_status — ze worden automatisch gegenereerd en zijn altijd gebaseerd op verified content

## Prerequisites

- [x] Sprint 014: MCP Verification Filter

## Taken

- [ ] Migratie: projects tabel uitbreiden met description, owner_id, contact_person_id, start_date, deadline
- [ ] Migratie: summaries tabel aanmaken met entity_type, entity_id, summary_type, content, version, source_meeting_ids
- [ ] Migratie: composite index op summaries
- [ ] Migratie: RLS policies op summaries (zelfde permissive patroon als v2)
- [ ] Query: `getLatestSummary(entityType, entityId, summaryType)` in `packages/database/src/queries/summaries.ts`
- [ ] Query: `getSummaryHistory(entityType, entityId, summaryType)` in `packages/database/src/queries/summaries.ts`
- [ ] Mutation: `createSummaryVersion(entityType, entityId, summaryType, content, sourceMeetingIds)` in `packages/database/src/mutations/summaries.ts`
- [ ] Query: `getProjectById` uitbreiden met owner (people join), contact_person (people join), start_date, deadline, description
- [ ] Query: `listProjects` uitbreiden met deadline en owner naam
- [ ] Mutation: `updateProject` uitbreiden met description, owner_id, contact_person_id, start_date, deadline
- [ ] TypeScript types updaten na migratie (regenereer of handmatig)

## Acceptatiecriteria

- [ ] [DATA-060] Projects tabel heeft nieuwe kolommen, bestaande data niet gebroken
- [ ] [DATA-061] Summaries tabel bestaat met juiste constraints en checks
- [ ] [DATA-062] Meerdere versies van een summary kunnen naast elkaar bestaan
- [ ] [DATA-063] RLS policies actief op summaries
- [ ] [DATA-064] Composite index aanwezig, query performance OK
- [ ] [DATA-065] `getLatestSummary` retourneert meest recente versie
- [ ] [DATA-066] `createSummaryVersion` maakt nieuwe rij met auto-incrementing version
- [ ] [DATA-067] `getProjectById` retourneert owner, contact_person, deadline, description
- [ ] [DATA-068] `updateProject` accepteert alle nieuwe velden

## Geraakt door deze sprint

- `supabase/migrations/20260405000001_project_extensions.sql` (nieuw — projects kolommen)
- `supabase/migrations/20260405000002_summaries_table.sql` (nieuw — summaries tabel + index + RLS)
- `packages/database/src/queries/summaries.ts` (nieuw — summary queries)
- `packages/database/src/mutations/summaries.ts` (nieuw — summary mutations)
- `packages/database/src/queries/projects.ts` (gewijzigd — extra velden + joins)
- `packages/database/src/mutations/projects.ts` (gewijzigd — extra velden)
