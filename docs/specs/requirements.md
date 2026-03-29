# Requirements Register

Gegenereerd uit `docs/specs/meeting-processing-review.md` (v2) op 2026-03-29.
Totaal: 90 requirements.

---

## Functionele eisen

| ID       | Beschrijving                                                                                 | Bron           | Sprint |
| -------- | -------------------------------------------------------------------------------------------- | -------------- | ------ |
| FUNC-001 | Gatekeeper doet alleen triage: meeting_type, party_type, relevance_score, organization_name  | PRD sectie 5.1 | 002    |
| FUNC-002 | Gatekeeper rejectt niet meer — elke meeting die door pre-filter komt wordt opgeslagen        | PRD sectie 5.1 | 002    |
| FUNC-003 | Relevance_score blijft bestaan voor ranking in zoekresultaten                                | PRD sectie 5.1 | 002    |
| FUNC-004 | Novelty check (duplicaat-detectie) blijft actief                                             | PRD sectie 5.1 | 002    |
| FUNC-005 | Extractor (Sonnet) extraheert decisions, action_items, needs, insights                       | PRD sectie 5.2 | 003    |
| FUNC-006 | Elke extractie bevat confidence score (0.0-1.0)                                              | PRD sectie 5.2 | 003    |
| FUNC-007 | Elke extractie bevat transcript_ref als bronvermelding                                       | PRD sectie 5.2 | 003    |
| FUNC-008 | Extractie wordt gestuurd door meeting_type (zie type-extractie matrix)                       | PRD sectie 4.2 | 003    |
| FUNC-009 | Organisatie-koppeling via 2-tier: exact match op name, dan alias match                       | PRD sectie 5.3 | 002    |
| FUNC-010 | Bij geen org match: unmatched_organization_name vullen op meeting                            | PRD sectie 5.3 | 002    |
| FUNC-011 | Deelnemer-matching via email tegen people tabel                                              | PRD sectie 5.4 | 002    |
| FUNC-012 | Bij match: rij aanmaken in meeting_participants                                              | PRD sectie 5.4 | 002    |
| FUNC-013 | Geen match deelnemer: blijft in meetings.participants text[] als fallback                    | PRD sectie 5.4 | 002    |
| FUNC-014 | Project-koppeling via 3-tier: exact, alias, embedding match                                  | PRD sectie 5.5 | 003    |
| FUNC-015 | Bij project match: rij in meeting_projects (many-to-many)                                    | PRD sectie 5.5 | 003    |
| FUNC-016 | Raw Fireflies API-response + Gatekeeper + Extractor output opslaan in raw_fireflies JSONB    | PRD sectie 5.6 | 003    |
| FUNC-017 | Alles direct embedden — meetings en extractions, geen wachten op approval                    | PRD sectie 6.1 | 003    |
| FUNC-018 | Meeting embedding verrijken met insights uit Extractor output                                | PRD sectie 6.2 | 003    |
| FUNC-019 | Re-embed worker verwerkt embedding_stale records elke 5 minuten                              | PRD sectie 6.3 | 001    |
| FUNC-020 | MCP search_knowledge retourneert bronvermelding + confidence + transcript_ref                | PRD sectie 7.3 | 004    |
| FUNC-021 | MCP get_decisions filtert extractions op type='decision' met bronvermelding                  | PRD sectie 7.3 | 004    |
| FUNC-022 | MCP get_action_items filtert op type='action_item' met metadata                              | PRD sectie 7.3 | 004    |
| FUNC-023 | MCP get_meeting_summary retourneert meeting detail met alle nieuwe velden                    | PRD sectie 8.3 | 004    |
| FUNC-024 | MCP correct_extraction overschrijft content/metadata, zet corrected_by/corrected_at          | PRD sectie 9   | 004    |
| FUNC-025 | Pre-filter: meetings < 2 minuten worden overgeslagen                                         | PRD sectie 5   | 002    |
| FUNC-026 | Pre-filter: meetings met < 2 deelnemers worden overgeslagen (solo-recording is geen gesprek) | PRD sectie 5   | 002    |
| FUNC-027 | Seed script met initiële organizations, people en projects (idempotent)                      | PRD sectie 10  | 001    |
| FUNC-028 | Supabase TypeScript types regenereren na migraties                                           | PRD sectie 10  | 001    |
| FUNC-029 | MCP get_organization_overview retourneert compleet klantoverzicht via SQL joins               | PRD sectie 8.3 | 004    |
| FUNC-030 | MCP list_meetings filtert op organization, project, datum, type met pagination               | PRD sectie 8.3 | 004    |

## Datamodel eisen

| ID       | Beschrijving                                                                                | Bron                     | Sprint |
| -------- | ------------------------------------------------------------------------------------------- | ------------------------ | ------ |
| DATA-001 | Tabel profiles: id UUID PK REFERENCES auth.users(id) ON DELETE CASCADE                      | PRD sectie 3.1           | 001    |
| DATA-002 | Tabel profiles: full_name TEXT, email TEXT NOT NULL, avatar_url TEXT                        | PRD sectie 3.1           | 001    |
| DATA-003 | Tabel profiles: role TEXT DEFAULT 'member' (voorbereid, nog niet actief)                    | PRD sectie 3.1           | 001    |
| DATA-004 | Trigger: profiel automatisch aanmaken bij nieuwe auth.users registratie                     | PRD sectie 3.1           | 001    |
| DATA-005 | Tabel organizations: id UUID PK, name TEXT NOT NULL UNIQUE                                  | PRD sectie 3.2           | 001    |
| DATA-006 | Tabel organizations: aliases TEXT[] DEFAULT '{}'                                            | PRD sectie 3.2           | 001    |
| DATA-007 | Tabel organizations: type TEXT NOT NULL ('client','partner','supplier','other')             | PRD sectie 3.2           | 001    |
| DATA-008 | Tabel organizations: contact_person TEXT, email TEXT                                        | PRD sectie 3.2           | 001    |
| DATA-009 | Tabel organizations: status TEXT DEFAULT 'prospect' ('prospect','active','inactive')        | PRD sectie 3.2           | 001    |
| DATA-010 | Tabel organizations: created_at, updated_at TIMESTAMPTZ                                     | PRD sectie 3.2           | 001    |
| DATA-011 | Tabel people: id UUID PK, name TEXT NOT NULL, email TEXT UNIQUE                             | PRD sectie 3.3           | 001    |
| DATA-012 | Tabel people: team TEXT, role TEXT                                                          | PRD sectie 3.3           | 001    |
| DATA-013 | Tabel people: embedding VECTOR(1024), embedding_stale BOOLEAN DEFAULT TRUE                  | PRD sectie 3.3           | 001    |
| DATA-014 | Tabel people: created_at, updated_at TIMESTAMPTZ                                            | PRD sectie 3.3           | 001    |
| DATA-015 | Tabel projects: id UUID PK, name TEXT NOT NULL UNIQUE                                       | PRD sectie 3.4           | 001    |
| DATA-016 | Tabel projects: aliases TEXT[] DEFAULT '{}'                                                 | PRD sectie 3.4           | 001    |
| DATA-017 | Tabel projects: organization_id UUID FK -> organizations                                    | PRD sectie 3.4           | 001    |
| DATA-018 | Tabel projects: status TEXT DEFAULT 'lead' (sales/delivery/overig)                          | PRD sectie 3.4           | 001    |
| DATA-019 | Tabel projects: embedding VECTOR(1024), embedding_stale BOOLEAN DEFAULT TRUE                | PRD sectie 3.4           | 001    |
| DATA-020 | Tabel projects: created_at, updated_at TIMESTAMPTZ                                          | PRD sectie 3.4           | 001    |
| DATA-021 | Tabel meetings: id UUID PK, fireflies_id TEXT UNIQUE, title TEXT NOT NULL                   | PRD sectie 3.5           | 001    |
| DATA-022 | Tabel meetings: date TIMESTAMPTZ, participants TEXT[], summary TEXT, transcript TEXT        | PRD sectie 3.5           | 001    |
| DATA-023 | Tabel meetings: meeting_type TEXT (7 vaste types)                                           | PRD sectie 3.5           | 001    |
| DATA-024 | Tabel meetings: party_type TEXT ('client','partner','internal','other')                     | PRD sectie 3.5           | 001    |
| DATA-025 | Tabel meetings: organization_id UUID FK -> organizations                                    | PRD sectie 3.5           | 001    |
| DATA-026 | Tabel meetings: unmatched_organization_name TEXT                                            | PRD sectie 3.5           | 001    |
| DATA-027 | Tabel meetings: raw_fireflies JSONB                                                         | PRD sectie 3.5           | 001    |
| DATA-028 | Tabel meetings: relevance_score FLOAT                                                       | PRD sectie 3.5           | 001    |
| DATA-029 | Tabel meetings: embedding VECTOR(1024), embedding_stale BOOLEAN DEFAULT TRUE                | PRD sectie 3.5           | 001    |
| DATA-030 | Tabel meetings: created_at, updated_at TIMESTAMPTZ                                          | PRD sectie 3.5           | 001    |
| DATA-031 | Tabel meeting_projects: composite PK (meeting_id, project_id), FKs met ON DELETE CASCADE    | PRD sectie 3.6           | 001    |
| DATA-032 | Tabel meeting_participants: composite PK (meeting_id, person_id), FKs met ON DELETE CASCADE | PRD sectie 3.7           | 001    |
| DATA-033 | Tabel extractions: id UUID PK, meeting_id UUID FK -> meetings ON DELETE CASCADE             | PRD sectie 3.8           | 001    |
| DATA-034 | Tabel extractions: type TEXT NOT NULL ('decision','action_item','need','insight')           | PRD sectie 3.8           | 001    |
| DATA-035 | Tabel extractions: content TEXT NOT NULL                                                    | PRD sectie 3.8           | 001    |
| DATA-036 | Tabel extractions: confidence FLOAT (0.0-1.0)                                               | PRD sectie 3.8           | 001    |
| DATA-037 | Tabel extractions: metadata JSONB DEFAULT '{}' (type-specifieke velden)                     | PRD sectie 3.8           | 001    |
| DATA-038 | Tabel extractions: transcript_ref TEXT (bronvermelding)                                     | PRD sectie 3.8           | 001    |
| DATA-039 | Tabel extractions: organization_id UUID FK -> organizations, project_id UUID FK -> projects | PRD sectie 3.8           | 001    |
| DATA-040 | Tabel extractions: embedding VECTOR(1024), embedding_stale BOOLEAN DEFAULT TRUE             | PRD sectie 3.8           | 001    |
| DATA-041 | Tabel extractions: created_at TIMESTAMPTZ                                                   | PRD sectie 3.8           | 001    |
| DATA-050 | Tabel extractions: corrected_by UUID FK -> profiles, corrected_at TIMESTAMPTZ               | PRD sectie 3.8           | 001    |
| DATA-051 | Tabel meetings: search_vector TSVECTOR met auto-update trigger (dutch config)               | PRD sectie 7.4           | 001    |
| DATA-052 | Tabel extractions: search_vector TSVECTOR met auto-update trigger (dutch config)            | PRD sectie 7.4           | 001    |
| DATA-053 | GIN indexes op search_vector kolommen voor full-text search                                  | PRD sectie 7.4           | 001    |
| DATA-042 | HNSW vector indexes op alle embedding-kolommen                                              | PRD sectie 8, sprint 001 | 001    |
| DATA-043 | B-tree indexes op FK-kolommen en veelgebruikte filters                                      | PRD sectie 8, sprint 001 | 001    |
| DATA-044 | Hybrid search functie: search_all_content() met vector + full-text via RRF                  | PRD sectie 7.4, 8        | 001    |
| DATA-045 | Vector search functie: match_people()                                                       | PRD sectie 8, sprint 001 | 001    |
| DATA-046 | Vector search functie: match_projects()                                                     | PRD sectie 8, sprint 001 | 001    |
| DATA-047 | Vector search functie: search_meetings_by_participant()                                     | PRD sectie 8, sprint 001 | 001    |
| DATA-048 | pg_cron + pg_net extensions voor re-embed worker scheduling                                 | PRD sectie 6.3           | 001    |
| DATA-049 | Re-embed worker schedule elke 5 minuten via pg_cron                                         | PRD sectie 6.3           | 001    |

## AI pipeline eisen

| ID     | Beschrijving                                                                            | Bron           | Sprint |
| ------ | --------------------------------------------------------------------------------------- | -------------- | ------ |
| AI-001 | Gatekeeper (Haiku 4.5) schema: meeting_type, party_type, relevance_score, organization_name | PRD sectie 5.1 | 002    |
| AI-002 | Gatekeeper prompt: alleen classificatie, geen extractie-instructies                     | PRD sectie 5.1 | 002    |
| AI-003 | Extractor (Sonnet) als apart AI-call na Gatekeeper                                      | PRD sectie 5.2 | 003    |
| AI-004 | Extractor output: type, content, confidence, transcript_ref, metadata per extractie     | PRD sectie 5.2 | 003    |
| AI-005 | Extractor wordt gestuurd door meeting_type voor type-specifieke extracties              | PRD sectie 5.2 | 003    |
| AI-006 | Prompt caching inschakelen voor Gatekeeper en Extractor system prompts                  | PRD sectie 6.1 | 002-003 |
| AI-007 | Transcript_ref validatie: quote checken tegen brontranscript, confidence→0 bij mismatch | PRD sectie 6.2 | 003    |

## MCP eisen

| ID      | Beschrijving                                                                                          | Bron           | Sprint |
| ------- | ----------------------------------------------------------------------------------------------------- | -------------- | ------ |
| MCP-001 | search_knowledge retourneert bronvermelding (meeting titel, datum, transcript_ref)                    | PRD sectie 7   | 004    |
| MCP-002 | search_knowledge retourneert confidence score per resultaat                                           | PRD sectie 7   | 004    |
| MCP-003 | get_decisions filtert extractions op type='decision'                                                  | PRD sectie 7.3 | 004    |
| MCP-004 | get_action_items filtert extractions op type='action_item' met metadata                               | PRD sectie 7.3 | 004    |
| MCP-005 | get_meeting_summary bevat meeting_type, party_type, organization, extractions                         | PRD sectie 8.3 | 004    |
| MCP-006 | correct_extraction overschrijft content/metadata, zet corrected_by/corrected_at, embedding_stale=true | PRD sectie 9   | 004    |
| MCP-007 | get_organization_overview retourneert meetings, extracties, projecten, people via SQL joins            | PRD sectie 8.3 | 004    |
| MCP-008 | list_meetings filtert op organization, project, date_from, date_to, meeting_type met pagination       | PRD sectie 8.3 | 004    |

## Business rules

| ID       | Beschrijving                                                   | Bron           | Sprint  |
| -------- | -------------------------------------------------------------- | -------------- | ------- |
| RULE-001 | Geen review-gate — alles is direct doorzoekbaar                | PRD sectie 1   | 003     |
| RULE-002 | Bronvermelding verplicht bij elk MCP-antwoord                  | PRD sectie 7.1 | 004     |
| RULE-003 | Confidence als indicator, niet als gate                        | PRD sectie 2   | 003     |
| RULE-004 | Needs zijn cumulatief — geen status-veld, groeiend profiel     | PRD sectie 3.8 | 003     |
| RULE-005 | Meeting transcript is bron van waarheid, extracties zijn index | PRD sectie 1   | -       |
| RULE-006 | 2-staps AI: Haiku 4.5 voor triage, Sonnet voor extractie       | PRD sectie 5   | 002-003 |
