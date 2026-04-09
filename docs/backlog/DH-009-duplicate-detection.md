# Micro Sprint DH-009: Duplicate Detection via Embeddings (FASE 2)

> **Verplaatst naar fase 2.** In fase 1 worden items in triage handmatig beoordeeld zonder automatische duplicaat-detectie. De embedding kolommen worden al in fase 1 aangemaakt als voorbereiding.

## Doel

Bij Userback import en handmatig aanmaken van issues automatisch vergelijkbare bestaande issues detecteren via embedding similarity. Gebruikt Cohere embed-v4 (1024 dimensies) — dezelfde pipeline als extractions en meetings. Na deze sprint worden nieuwe issues in triage gemarkeerd als "Mogelijk duplicaat van #42 (92% match)" zodat de triagist snel kan mergen.

## Requirements

| ID       | Beschrijving                                                                    |
| -------- | ------------------------------------------------------------------------------- |
| FUNC-147 | Bij nieuw issue: genereer embedding van title + description via Cohere embed-v4 |
| FUNC-148 | Sla embedding op in issues.embedding kolom (vector(1024))                       |
| FUNC-149 | Zoek bestaande issues met cosine similarity > 0.85 (max 3 resultaten)           |
| FUNC-150 | Bij match: sla duplicate_of_id en similarity_score op                           |
| FUNC-151 | Triage UI toont "Mogelijk duplicaat van #N (X% match)" bij gemarkeerde items    |
| FUNC-152 | Merge actie in triage: koppel als duplicaat, cancel het nieuwe item             |
| PERF-105 | Embedding generatie: batch waar mogelijk (Cohere ondersteunt batch embed)       |
| PERF-106 | IVFFlat index op embedding kolom voor snelle similarity search                  |

## Bronverwijzingen

- PRD: `docs/specs/prd-devhub.md` -> sectie "5.8 Triage Inbox & Duplicate Detection"
- Bestaande embedding code: `packages/ai/src/embeddings.ts` (embedText functie)
- Bestaande vector search: `packages/mcp/src/tools/search.ts` (cosine similarity patroon)

## Context

### Embedding Pipeline

Hergebruikt `embedText` uit `@repo/ai/embeddings`:

```typescript
import { embedText } from "@repo/ai/embeddings";

// Bij import/aanmaken van issue
const embedding = await embedText(
  `${issue.title ?? ""} ${issue.description}`,
  "search_document", // inputType voor opslag
);
```

### Similarity Query

```sql
SELECT id, title, issue_number, 1 - (embedding <=> $1) AS similarity
FROM issues
WHERE project_id = $2
  AND status NOT IN ('cancelled')
  AND id != $3
  AND embedding IS NOT NULL
ORDER BY embedding <=> $1
LIMIT 3
```

Filter op similarity > 0.85 in applicatielogica.

### Integratie in sync pipeline

```
Na AI classificatie (DH-006)
    ↓
Genereer embedding: embedText(title + description, "search_document")
    ↓
Sla op in issues.embedding
    ↓
Zoek similar issues: findSimilarIssues(embedding, projectId, issueId)
    ↓
Bij match > 0.85:
  → Update issue: duplicate_of_id = match.id, similarity_score = match.similarity
    ↓
Triage UI toont duplicaat-markering
```

### Batch embedding bij eerste sync

Bij de eerste Userback sync (615 items) worden embeddings in batches gegenereerd:

- Cohere embed-v4 ondersteunt batch requests (max 96 teksten per call)
- 615 items / 96 = ~7 batch calls
- Geschatte kosten: ~$0.06

### Index

```sql
CREATE INDEX idx_issues_embedding ON issues
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 20);
```

## Prerequisites

- [ ] Micro Sprint DH-001: Database (embedding kolom, duplicate_of_id, similarity_score, ivfflat index)
- [ ] Micro Sprint DH-002: Queries en mutations
- [ ] Micro Sprint DH-006: AI classificatie agent (draait vóór duplicate detection)

## Taken

- [ ] Maak `packages/ai/src/pipeline/issue-dedup.ts` met embedAndFindDuplicates functie
- [ ] Maak query `findSimilarIssues` in `packages/database/src/queries/issues.ts`
- [ ] Maak mutation `markAsDuplicate` in `packages/database/src/mutations/issues.ts`
- [ ] Integreer in Userback sync pipeline (na classificatie, voor elke nieuwe issue)
- [ ] Integreer in createIssue Server Action (fire-and-forget, na classificatie)
- [ ] Triage UI: toon duplicaat-suggestie met similarity percentage en link naar origineel
- [ ] Triage UI: "Mergen" knop die duplicate_of_id instelt en status naar cancelled zet

## Acceptatiecriteria

- [ ] [FUNC-147] Nieuwe issues krijgen een embedding in de database
- [ ] [FUNC-149] Bij similarity > 0.85 wordt het issue gemarkeerd als potentieel duplicaat
- [ ] [FUNC-150] duplicate_of_id en similarity_score zijn correct ingevuld
- [ ] [FUNC-151] Triage UI toont "Mogelijk duplicaat van #N (X% match)"
- [ ] [FUNC-152] Merge actie in triage werkt: cancelled + duplicate_of_id gekoppeld
- [ ] [PERF-106] IVFFlat index is aangemaakt op embedding kolom
- [ ] Embeddings worden gegenereerd via bestaande embedText functie (geen nieuwe embedding code)
- [ ] TypeScript compileert zonder fouten

## Geraakt door deze sprint

- `packages/ai/src/pipeline/issue-dedup.ts` (nieuw)
- `packages/database/src/queries/issues.ts` (bijgewerkt — findSimilarIssues)
- `packages/database/src/mutations/issues.ts` (bijgewerkt — markAsDuplicate)
- `apps/devhub/src/actions/import.ts` (bijgewerkt — dedup na classificatie)
- `apps/devhub/src/actions/issues.ts` (bijgewerkt — dedup bij createIssue)
- `apps/devhub/src/components/issues/triage-item.tsx` (bijgewerkt — duplicaat UI)
