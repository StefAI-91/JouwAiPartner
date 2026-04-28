# Micro Sprint PR-017: Topic Merge/Split UI met AI-Suggesties

## Doel

Re-clustering ondersteunen: topics samenvoegen (merge) wanneer ze 80%+ overlap hebben, en topics splitsen als één topic feitelijk over meerdere klant-vragen gaat. Merge krijgt AI-suggesties (vergelijkbaar met topic-curator); split is volledig handmatig (te subjectief). Linked issues volgen de nieuwe structuur, oud topic wordt gemarkeerd als `wont_do` met reden "Gemerged in [Topic A]".

## Requirements

| ID          | Beschrijving                                                                                                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-REQ-160  | DevHub topic-list toont badge "Mogelijke merges (N)" als AI-suggesties bestaan                                                                                              |
| PR-REQ-161  | Klikken op badge toont lijst van merge-suggesties met overlap-score (≥80% via embedding-similarity)                                                                         |
| PR-REQ-162  | Per merge-suggestie: "Topic A en Topic B lijken X% — mergen?" → "Bekijk diff" / "Accepteer" / "Negeer"                                                                      |
| PR-REQ-163  | Accept-actie: `mergeTopics(sourceTopicId, targetTopicId)` mutation — verhuist linked issues van source naar target, source → wont_do met reden "Gemerged in [target.title]" |
| PR-REQ-164  | Topic-detail in DevHub heeft "Split topic"-knop                                                                                                                             |
| PR-REQ-165  | Split-flow: dialog met checkbox per linked issue; geselecteerde issues verhuizen naar nieuw topic; user kiest title/type voor nieuw topic                                   |
| PR-REQ-166  | Origineel behoudt resterende issues; status auto-recompute (PR-007)                                                                                                         |
| PR-REQ-167  | Beide acties (merge + split) loggen events `topics_merged` en `topic_split` in `topic_events`                                                                               |
| PR-REQ-168  | Merge-suggestie via embedding-similarity tussen topic-embeddings (≥0.85 cosine = match-kandidaat)                                                                           |
| PR-AI-060   | Pipeline `packages/ai/src/pipeline/topics/detect-merges.ts`: embed alle topics in project → all-pairs cosine-similarity → top-N pairs ≥0.85                                 |
| PR-RULE-070 | Hard-regel: na merge is source-topic permanent op `wont_do` — uitkomst is auditable in events                                                                               |

## Afhankelijkheden

- **PR-001** + **PR-002** (topics + queries)
- **PR-003** (DevHub topic-feature)
- **PR-009** (events) — voor `topics_merged` + `topic_split`
- **PR-010** (`wont_do` met reden) — merge zet source op wont_do
- **PR-014** (embeddings infra voor topics) — voor merge-similarity

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- All-pairs similarity is O(N²) — bij 100 topics is dat 10k pairs. Acceptabel? Of beperken tot top-K nearest?
  - **Aanbeveling**: alleen voor topics met `status IN ('clustering','awaiting_client_input','prioritized')` — actieve set typisch <50

## Visuele referentie

- Geen aparte preview; integratie in DevHub topic-list/detail (§14.4 component-systeem)

## Taken

### 1. Merge-suggestie pipeline

- `packages/ai/src/pipeline/topics/detect-merges.ts`:

  ```typescript
  export async function detectMergeCandidates(projectId: string) {
    const activeTopics = await listTopics(projectId, {
      statuses: ["clustering", "awaiting_client_input", "prioritized"],
    });
    const embeddings = activeTopics.map((t) => ({ id: t.id, embedding: t.embedding })); // assumes embedding kolom uit PR-014
    const pairs: Array<{ a: string; b: string; similarity: number }> = [];
    for (let i = 0; i < embeddings.length; i++) {
      for (let j = i + 1; j < embeddings.length; j++) {
        const sim = cosineSimilarity(embeddings[i].embedding, embeddings[j].embedding);
        if (sim >= 0.85) pairs.push({ a: embeddings[i].id, b: embeddings[j].id, similarity: sim });
      }
    }
    return pairs.sort((x, y) => y.similarity - x.similarity).slice(0, 10);
  }
  ```

- Cron of on-demand triggered (knop in DevHub topic-list)

### 2. Merge-mutation

- `packages/database/src/mutations/topics/merge.ts`:

  ```typescript
  export async function mergeTopics(
    sourceTopicId: string,
    targetTopicId: string,
    mergedBy: string,
    client?: SupabaseClient,
  ) {
    // 1. Verhuis alle linked issues van source naar target
    await client
      .from("topic_issues")
      .update({ topic_id: targetTopicId })
      .eq("topic_id", sourceTopicId);
    // 2. Set source naar wont_do met reden
    const target = await getTopicById(targetTopicId, client);
    await updateTopicStatus(
      sourceTopicId,
      "wont_do",
      { wont_do_reason: `Gemerged in topic "${target.title}"` },
      client,
    );
    // 3. Log event op beide topics
    await logTopicEvent(
      {
        topic_id: sourceTopicId,
        event_type: "topics_merged",
        actor_profile_id: mergedBy,
        payload: { merged_into: targetTopicId },
      },
      client,
    );
    await logTopicEvent(
      {
        topic_id: targetTopicId,
        event_type: "topics_merged",
        actor_profile_id: mergedBy,
        payload: { merged_from: sourceTopicId },
      },
      client,
    );
    // 4. Recompute target status (PR-007)
    await recomputeTopicStatus(targetTopicId, client);
  }
  ```

### 3. Split-mutation

- `packages/database/src/mutations/topics/split.ts`:

  ```typescript
  export async function splitTopic(
    sourceTopicId: string,
    newTopic: { title: string; type: TopicType },
    issueIdsToMove: string[],
    splitBy: string,
    client?: SupabaseClient,
  ) {
    const source = await getTopicById(sourceTopicId, client);
    const created = await insertTopic(
      {
        project_id: source.project_id,
        title: newTopic.title,
        type: newTopic.type,
        created_by: splitBy,
      },
      client,
    );
    await client
      .from("topic_issues")
      .update({ topic_id: created.id })
      .in("issue_id", issueIdsToMove);
    await logTopicEvent(
      {
        topic_id: sourceTopicId,
        event_type: "topic_split",
        actor_profile_id: splitBy,
        payload: { new_topic_id: created.id, issue_count: issueIdsToMove.length },
      },
      client,
    );
    await logTopicEvent(
      {
        topic_id: created.id,
        event_type: "topic_split",
        actor_profile_id: splitBy,
        payload: { from_topic_id: sourceTopicId },
      },
      client,
    );
    await recomputeTopicStatus(sourceTopicId, client);
    await recomputeTopicStatus(created.id, client);
  }
  ```

### 4. DevHub UI — merge

- Update `apps/devhub/src/features/topics/components/topic-list.tsx`:
  - Badge "Mogelijke merges (N)" met N = aantal merge-pairs voor dit project
  - Klik → modal of route `/projects/[id]/topics/merge-suggestions`
  - Per pair: zij-aan-zij comparison (titles, descriptions, linked issues), overlap-score, knoppen "Bekijk diff" / "Accepteer" / "Negeer"

- `apps/devhub/src/features/topics/components/merge-suggestions-list.tsx`:
  - Server Component
  - Props: `projectId`
  - Fetch suggesties (gecached uit pipeline)

### 5. DevHub UI — split

- Update `apps/devhub/src/features/topics/components/topic-detail.tsx`:
  - Knop "Split topic" naast "Verwijder" en "Override status"
  - Klik → dialog `<SplitDialog>` met:
    - Title-input voor nieuw topic
    - Type-selector
    - Lijst linked issues met checkbox per issue
    - "Maak nieuw topic" knop → call `splitTopic` Server Action

- `apps/devhub/src/features/topics/components/split-dialog.tsx` (`"use client"`)

### 6. Server Actions

- `apps/devhub/src/features/topics/actions/merge-split.ts`:

  ```typescript
  export async function acceptMerge(sourceId: string, targetId: string) {
    /* ... */
  }
  export async function rejectMergeSuggestion(sourceId: string, targetId: string) {
    /* log event, geen mutation */
  }
  export async function splitTopicAction(sourceId: string, newTopic: any, issueIds: string[]) {
    /* ... */
  }
  ```

### 7. Tests

- Vitest integration:
  - mergeTopics: source krijgt wont_do, issues verhuisd, target krijgt nieuwe linked, events gelogd
  - splitTopic: nieuw topic gemaakt, issues verhuisd, beide statussen recomputed
  - Cosine-similarity test: 2 topics met identieke title moeten ≥0.95 zijn

## Acceptatiecriteria

- [ ] PR-REQ-160 t/m PR-REQ-167: alle UI-flows werken
- [ ] PR-REQ-168: merge-suggesties via embedding-similarity ≥0.85
- [ ] PR-AI-060: pipeline retourneert top-10 pairs gesorteerd op similarity
- [ ] PR-RULE-070: source-topic na merge is `wont_do` met reden
- [ ] Type-check + lint slagen
- [ ] Vitest groen

## Risico's

| Risico                                                              | Mitigatie                                                                           |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| All-pairs similarity is O(N²) → traag bij grote projecten           | Beperken tot active topics; cron-batch in plaats van real-time                      |
| Merge ongedaan maken is moeilijk                                    | Source-topic blijft bestaan (wont_do, niet deleted); audit-events laten herstel toe |
| Klant ziet topics verschijnen + verdwijnen door re-clustering       | Klant ziet `wont_do` met reden "Gemerged"; nieuwe topic verschijnt — transparant    |
| Cosine-threshold 0.85 produceert false positives (titles zijn vaag) | Mens-review verplicht; threshold tunable per project                                |
| Split-dialog met 100+ issues is onbruikbaar                         | Voorzie zoekfilter binnen dialog; cap op 50 issues per split                        |

## Bronverwijzingen

- PRD: `docs/specs/prd-portal-roadmap/10-fase-5-ai-acceleratie.md` §10.3.4 (merge/split)
- PRD: §3.9 risico "re-clustering is harder dan eerste clustering"
- PRD: §11.6.1 events `topics_merged`, `topic_split`

## Vision-alignment

Vision §2.4 — re-clustering is dé manifestatie van "AI helpt, mens beslist": agent identificeert overlap, mens drukt op accept. Voorkomt dat topics-laag fragmenteert tot ruis.
