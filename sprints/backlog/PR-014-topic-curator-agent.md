# Micro Sprint PR-014: Topic-Curator Agent

## Doel

De eerste fase-5 AI-agent: `topic-curator` clustert nieuwe issues automatisch onder bestaande topics of stelt een nieuw topic voor. Mens-in-de-loop: agent stelt voor, mens accepteert/wijzigt/negeert. Suggesties verschijnen in de Triage-queue (PR-008) als banner met confidence-score, één-klik-accept-knop, en motivering. Past binnen vision §2.4 (AI als account manager) en sluit aan op de gatekeeper-pipeline.

## Requirements

| ID          | Beschrijving                                                                                                                                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-AI-001   | Agent `topic-curator` in `packages/ai/src/agents/topic-curator/` — register in `agents/registry.ts`                                                                                                                    |
| PR-AI-002   | Input: nieuwe issue (title + description + labels) + lijst bestaande topics in zelfde project (title + description + linked issues)                                                                                    |
| PR-AI-003   | Output (Zod-schema): `bestMatch: { topicId\|null, confidence: 0..1, reasoning: string }`, `alternativeMatches: Array<{ topicId, confidence }>`, `newTopicSuggestion: { suggested: boolean, title, description, type }` |
| PR-AI-004   | Model: Claude Sonnet (uit CLAUDE.md model-tier-policy)                                                                                                                                                                 |
| PR-AI-005   | Workflow: embed nieuwe issue via Cohere embed-v4 → top-K nearest topics op pgvector cosine → Sonnet beoordeelt match-quality met context                                                                               |
| PR-AI-006   | Agent draait via een orchestratie-pipeline `packages/ai/src/pipeline/topics/cluster-issue.ts`                                                                                                                          |
| PR-AI-007   | Trigger: direct na issue-creatie via Portal feedback (Server Action call); op aanvraag via DevHub Triage-knop; in cron (dagelijks 7:00) als batch                                                                      |
| PR-AI-008   | Agent skipt issues met `topic_id` reeds gezet (idempotent)                                                                                                                                                             |
| PR-AI-009   | Suggestie wordt opgeslagen in `agent_suggestions`-tabel (komt in PR-018) — voor nu: in `topic_events` met `event_type='agent_suggestion_proposed'`                                                                     |
| PR-AI-010   | Mens-review: in Triage-queue verschijnt banner per issue met "78% match — accepteer / wijzig / nieuw topic"                                                                                                            |
| PR-AI-011   | Acceptance-actie roept bestaande `linkIssue` mutation; logt event `agent_suggestion_accepted` met `accepted_by` en `confidence`                                                                                        |
| PR-AI-012   | Reject-actie logt event `agent_suggestion_rejected`                                                                                                                                                                    |
| PR-AI-013   | Agent-prompt bevat few-shot voorbeelden (handmatig gemaakte topic-clusterings uit fase 1-3)                                                                                                                            |
| PR-RULE-050 | Hard-regel: agent doet GEEN auto-link — alleen voorstellen. Mens accepteert.                                                                                                                                           |

## Afhankelijkheden

- **PR-001** + **PR-002** (topics + queries)
- **PR-008** (Triage-queue om suggesties te tonen)
- **PR-009** (events voor tracking)
- Bestaand: `packages/ai/src/agents/registry.ts`, `packages/ai/src/embeddings`, Cohere SDK
- Bestaand: `pgvector` extension, embedding-tabel of issues met embedding-veld

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- Bestaat een `issue_embeddings`-tabel of zit embedding op `issues`-rij? Check `packages/database/src/queries/embeddings`. Als niet: PR-014 moet ook embeddings-opslag voor issues toevoegen, of we beperken ons tot text-only matching in v1.
- Validatie-gates fase 4 → 5 (zie §5.4 fase 4-gates) — agent kan pas ingezet worden als curatielast >2u/week en team behoefte heeft

## Visuele referentie

- Geen aparte preview voor agent-suggesties; UI-banner past bij DevHub-stijl (§14.4 component-systeem)

## Taken

### 1. Agent-registratie

- `packages/ai/src/agents/topic-curator/`:

  ```
  packages/ai/src/agents/topic-curator/
  ├── index.ts             # main agent function
  ├── prompt.ts            # system prompt + few-shot examples
  ├── schema.ts            # Zod output schema
  └── README.md
  ```

- `index.ts`:

  ```typescript
  import { generateObject } from "ai";
  import { anthropic } from "@ai-sdk/anthropic";
  import { topicCuratorOutputSchema } from "./schema";
  import { systemPrompt } from "./prompt";

  export type TopicCuratorInput = {
    issue: { id: string; title: string; description: string | null; labels?: string[] };
    candidateTopics: Array<{
      id: string;
      title: string;
      description: string | null;
      type: TopicType;
      linked_issues_count: number;
    }>;
  };

  export async function runTopicCurator(input: TopicCuratorInput) {
    const result = await generateObject({
      model: anthropic("claude-sonnet-4-7"),
      schema: topicCuratorOutputSchema,
      system: systemPrompt,
      prompt: buildPrompt(input),
    });
    return result.object;
  }
  ```

- Registreer in `packages/ai/src/agents/registry.ts` zodat de `/agents` observability-pagina hem ziet.

### 2. Schema

- `schema.ts`:

  ```typescript
  export const topicCuratorOutputSchema = z.object({
    bestMatch: z.object({
      topicId: z.string().uuid().nullable(),
      confidence: z.number().min(0).max(1),
      reasoning: z.string().min(10).max(500),
    }),
    alternativeMatches: z
      .array(
        z.object({
          topicId: z.string().uuid(),
          confidence: z.number().min(0).max(1),
        }),
      )
      .max(5),
    newTopicSuggestion: z
      .object({
        suggested: z.boolean(),
        title: z.string().min(3).max(200),
        description: z.string().max(1000),
        type: z.enum(["bug", "feature"]),
      })
      .nullable(),
  });
  ```

### 3. Prompt

- `prompt.ts`: system prompt met:
  - Rol: "Je bent een topic-curator. Je groepeert raw issues onder klant-vriendelijke topics."
  - Regels: één topic per issue, geen forced match (bestMatch.topicId mag null zijn als confidence <0.5)
  - Few-shot: 3-5 voorbeelden van handmatige clustering uit fase 1-3 productie-data
  - Output-format expliciet (matcht Zod-schema)

### 4. Pipeline-orchestratie

- `packages/ai/src/pipeline/topics/cluster-issue.ts`:

  ```typescript
  export async function clusterIssue(issueId: string) {
    const issue = await getIssueById(issueId);
    if (!issue) return;
    if (await isIssueAlreadyLinked(issueId)) return; // idempotent

    // 1. Embed issue
    const embedding = await embedText(issue.title + " " + issue.description, {
      inputType: "search_query",
    });

    // 2. Top-K nearest topics in zelfde project
    const candidates = await getTopKNearestTopics(issue.project_id, embedding, 5);

    // 3. Run agent
    const suggestion = await runTopicCurator({ issue, candidateTopics: candidates });

    // 4. Log als event
    await logTopicEvent({
      topic_id: suggestion.bestMatch.topicId ?? null, // hmm: event vereist topic_id niet null... als geen match, sla op in agent_suggestions (PR-018)
      event_type: "agent_suggestion_proposed",
      agent_id: "topic-curator",
      confidence: suggestion.bestMatch.confidence,
      payload: { issue_id: issueId, suggestion },
    });
    return suggestion;
  }
  ```

- **Note**: events vereisen `topic_id`. Bij newTopicSuggestion zonder bestMatch slaan we op in `agent_suggestions`-tabel (PR-018) of in een aparte `pending_suggestions`-collection. In v1 zonder `agent_suggestions`-tabel: voeg in PR-014 een nullable variant toe of maak een tussenliggende `agent_suggestion_proposed` event op een synthetisch topic-record. **Aanbeveling**: PR-018 als prerequisite verplaatsen naar PR-014 (samengevoegd) of `agent_suggestions`-tabel hier al toevoegen. Zie open vraag.

### 5. Embeddings-opslag voor issues

- Als nog niet aanwezig: voeg `embedding vector(1024)` kolom toe aan `issues`-tabel (of in `issue_embeddings`-tabel)
- Pipeline `embedText` (bestaand in `@repo/ai/embeddings`) genereert via Cohere embed-v4

### 6. Nearest-topic query

- `packages/database/src/queries/topics/embedding-search.ts`:

  ```typescript
  export async function getTopKNearestTopics(
    projectId: string,
    queryEmbedding: number[],
    k = 5,
    client?: SupabaseClient,
  ) {
    return await (client ?? getAdminClient()).rpc("match_topics_by_embedding", {
      project_id: projectId,
      query_embedding: queryEmbedding,
      k,
    });
  }
  ```

- Postgres-functie:

  ```sql
  CREATE OR REPLACE FUNCTION match_topics_by_embedding(project_id uuid, query_embedding vector(1024), k integer)
  RETURNS TABLE(id uuid, title text, description text, type text, similarity real)
  LANGUAGE sql STABLE AS $$
    SELECT t.id, t.title, t.description, t.type, 1 - (t.embedding <=> query_embedding) as similarity
    FROM topics t
    WHERE t.project_id = $1
    ORDER BY t.embedding <=> query_embedding
    LIMIT k;
  $$;
  ```

- Topics ook embedding-kolom toevoegen + populate via een aparte cron-pipeline

### 7. Triage-queue UI uitbreiden

- Update `apps/devhub/src/components/triage/ungrouped-issues-list.tsx`:
  - Per issue: fetch latest agent_suggestion (uit events of agent_suggestions-tabel)
  - Render banner: "Lijkt op topic _Publicatie-flow_ — 78% match"
  - Knoppen: "Accepteer", "Kies ander topic" (bestaande picker), "Negeer suggestie"
  - Op accept: `linkIssue` + log `agent_suggestion_accepted`
  - Op reject: log `agent_suggestion_rejected`

### 8. Triggers

- Server Action voor handmatige run: `runCuratorForIssue(issueId)` in `apps/devhub/src/components/triage/actions/triage.ts`
- Hook in feedback-creatie (Portal `apps/portal/src/actions/feedback.ts` of de Server Action die issue insert): na success, `clusterIssue(newIssueId)` async (geen blocker voor user)
- Cron (Vercel Cron of Supabase Edge function): dagelijks 7:00, run `clusterIssue` voor alle nieuwe issues van afgelopen 24u

### 9. Acceptance-tracking

- Per agent-run: count `agent_suggestion_accepted` / total — track als baseline voor PR-018 acceptance-rate metric

## Acceptatiecriteria

- [ ] PR-AI-001: agent geregistreerd; zichtbaar in `/agents` observability
- [ ] PR-AI-002 t/m PR-AI-005: agent runs end-to-end met test-issue
- [ ] PR-AI-006/007: triggers werken (manual + Portal-feedback + cron)
- [ ] PR-AI-008: idempotent — issue met topic_id wordt geskipt
- [ ] PR-AI-009/010: suggesties verschijnen in Triage-queue
- [ ] PR-AI-011/012: accept/reject acties loggen events
- [ ] PR-AI-013: prompt bevat ≥3 few-shot voorbeelden uit echte data
- [ ] PR-RULE-050: geen auto-link — mens-review is verplicht
- [ ] Acceptance-rate ≥70% op 20 historische issues (vergelijk met handmatige clustering)
- [ ] Prompt-cache-budget acceptabel — meet token-cost per run
- [ ] Type-check + lint slagen
- [ ] Vitest: agent-output-validatie tegen Zod-schema (mock LLM-response)

## Risico's

| Risico                                                        | Mitigatie                                                                         |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Agent-output is inconsistent (Zod-validatie faalt)            | Schema-strict + retry; als persistent: prompt-rewrite                             |
| Token-cost groeit lineair met klant-volume                    | Budget-cap per project per maand; agent fail-fast bij overschrijding (vision R-5) |
| Embedding-data ontbreekt voor bestaande topics → cold start   | Backfill-script: embed alle bestaande topics éénmalig                             |
| Privacy: agent ziet data van meerdere klanten                 | Nooit cross-klant; één run per project; getest                                    |
| Agent stelt mergebare topics voor die team al heeft afgewezen | Track rejections; in v2: agent leert "dit is afgewezen, niet opnieuw voorstellen" |
| Klant verwart agent-suggestie met team-actie                  | Agent-suggesties leven in DevHub, niet in Portal                                  |

## Bronverwijzingen

- PRD: `docs/specs/prd-portal-roadmap/10-fase-5-ai-acceleratie.md` §10.3.1 (topic-curator)
- Vision: `docs/specs/vision-ai-native-architecture.md` §2.4 + gatekeeper-pipeline
- CLAUDE.md: model-tier-policy + AI-stack
- Bestaand: `packages/ai/src/agents/registry.ts`, `packages/ai/src/embeddings`

## Vision-alignment

Kerntoepassing van vision §2.4 (AI als account manager): agent doet 70% van clustering-werk, mens reviewt de 30% twijfelgevallen. "Verification before truth" — geen auto-link.
