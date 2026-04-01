# Sprint 014: MCP Verification Filter (v2-007)

## Doel

MCP tools alignen met het verificatiemodel. Na deze sprint retourneren alle MCP search en retrieval tools standaard alleen geverifieerde content. Dit is de laatste v2 sprint — het sluit de cirkel: content komt binnen, wordt gereviewd door het team, en pas daarna is het queryable via MCP. De platform-spec en MILESTONES worden bijgewerkt om v2 als afgerond te markeren.

## Requirements

| ID       | Beschrijving                                                                   |
| -------- | ------------------------------------------------------------------------------ |
| FUNC-028 | MCP tools: default filter verification_status = 'verified'                     |
| FUNC-029 | MCP tools: optionele include_drafts parameter                                  |
| FUNC-030 | MCP tools: verification status tonen in output                                 |
| FUNC-031 | search_all_content() SQL functie updaten met verification filter               |
| FUNC-032 | MCP tool descriptions updaten voor LLM clients                                 |
| FUNC-033 | platform-spec.md en MILESTONES.md updaten voor v2 completion                   |
| RULE-005 | MCP tools filteren standaard op verification_status = 'verified'               |
| RULE-006 | MCP tools accepteren optionele include_drafts parameter voor intern gebruik    |
| AUTH-005 | MCP tools gebruiken admin client (apart process)                               |
| INT-001  | search_all_content() SQL functie krijgt verified_only parameter (default true) |

## Bronverwijzingen

- PRD: `docs/specs/v2-review-dashboard.md` -> sectie "8. MCP Updates" (regels 410-438)
- PRD: `docs/specs/v2-review-dashboard.md` -> sectie "9. Sprints — v2-007" (regels 585-604)

## Context

### Relevante business rules

- **RULE-005**: "MCP tools filteren standaard op verification_status = 'verified'. Alle search en retrieval tools voegen deze filter toe als WHERE clause. Ongeacht de query van de gebruiker, alleen geverifieerde content komt terug."
- **RULE-006**: "MCP tools accepteren een optionele include_drafts parameter (boolean, default false) voor intern gebruik. Beschrijving voor LLM: 'Include unverified (draft) content. Only for internal review purposes.'"

### MCP output format

Elke extractie in MCP output toont nu de verificatie status:

```
Decision: "We choose vendor X for cloud migration"
Source: Meeting "Discovery call Acme Corp" — March 15, 2026
Status: Verified by Stef Banninga on March 16, 2026
Confidence: 0.87
```

### search_all_content() update

De SQL functie krijgt een `verified_only` parameter:

```sql
-- Pseudo-code voor de update
CREATE OR REPLACE FUNCTION search_all_content(
  query TEXT,
  match_limit INT DEFAULT 10,
  verified_only BOOLEAN DEFAULT TRUE  -- NIEUW
)
RETURNS TABLE(...) AS $$
BEGIN
  -- Voeg WHERE verification_status = 'verified' toe wanneer verified_only = TRUE
  -- Dit geldt voor zowel meetings als extractions in de hybride search
END;
$$ LANGUAGE plpgsql;
```

### include_drafts parameter

Alle MCP tools die content ophalen krijgen deze optionele parameter:

```typescript
include_drafts: z.boolean()
  .optional()
  .default(false)
  .describe("Include unverified (draft) content. Only for internal review purposes.");
```

### Bestaande MCP tools die aangepast moeten worden

Alle tools in `packages/mcp/src/tools/` die meetings of extractions ophalen:

- search tools (vector search, full-text search)
- get_organization_overview
- list_meetings
- Eventuele andere retrieval tools

Elke tool moet:

1. `include_drafts` parameter accepteren
2. Default filteren op `verification_status = 'verified'`
3. Verification status meegeven in de response

### Edge cases en foutafhandeling

- Query die alleen draft content matcht + include_drafts=false -> lege resultatenset (correct gedrag, niet een foutmelding)
- Bestaande MCP clients die de include_drafts parameter niet meesturen -> werkt correct want default is false

## Prerequisites

- [ ] Sprint 013: Dashboard + Clients + People moet afgerond zijn (alle UI is klaar, team reviewt actief)

## Taken

- [ ] search_all_content() SQL functie updaten met verified_only parameter (default true)
- [ ] Alle MCP search/retrieve tools updaten: verification_status filter + include_drafts parameter
- [ ] Verification status toevoegen aan MCP tool output (wie, wanneer, status)
- [ ] MCP tool descriptions updaten zodat LLM clients weten wat include_drafts doet
- [ ] platform-spec.md en MILESTONES.md updaten om v2 als afgerond te markeren

## Acceptatiecriteria

- [ ] [FUNC-028] MCP query retourneert alleen geverifieerde content (default gedrag)
- [ ] [FUNC-029] MCP met include_drafts=true retourneert alle content inclusief drafts
- [ ] [FUNC-030] Elke extractie in MCP output toont verificatie status (verified by, datum)
- [ ] [FUNC-031] search_all_content() SQL functie respecteert verified_only filter
- [ ] [FUNC-032] MCP tool descriptions zijn bijgewerkt voor LLM clients
- [ ] [FUNC-033] platform-spec.md en MILESTONES.md reflecteren v2 completion
- [ ] [RULE-005] Zonder include_drafts parameter worden alleen verified items geretourneerd
- [ ] [INT-001] search_all_content() accepteert verified_only parameter met default true

## Geraakt door deze sprint

- `supabase/migrations/YYYYMMDDHHMMSS_search_verification_filter.sql` (nieuw — SQL functie update)
- `packages/mcp/src/tools/` (alle tool bestanden — filter + parameter + output)
- `docs/specs/platform-spec.md` (gewijzigd — v2 status)
- `MILESTONES.md` (gewijzigd — v2 completion)
