# Sprint 06: Novelty Check + Extraction

**Phase:** 1 — Foundation
**Requirements:** REQ-605, REQ-1600–REQ-1604, REQ-1607
**Depends on:** Sprint 05 (Gatekeeper pipeline), Sprint 03 (embedding utility)
**Produces:** Duplicate detection + automatic extraction of people, skills, decisions, action items

---

## Task 1: Add novelty check to Gatekeeper pipeline

**What:** Before admitting content, check if semantically similar content already exists (similarity > 0.92 = duplicate).

**Add to `src/lib/agents/gatekeeper-pipeline.ts`:**
```typescript
/**
 * Check if content is too similar to existing entries.
 * Returns true if content is novel (should proceed), false if duplicate.
 */
async function isNovel(
  embedding: number[],
  table: string,
  threshold: number = 0.92
): Promise<{ novel: boolean; similarId?: string; similarity?: number }> {
  // Use the appropriate match function based on table
  const matchFunction = `match_${table === "slack_messages" ? "documents" : table}`;

  // Direct SQL query for flexibility across tables
  const { data, error } = await supabase.rpc("search_all_content", {
    query_embedding: embedding as any,
    match_threshold: threshold,
    match_count: 1,
  });

  if (error || !data || data.length === 0) {
    return { novel: true };
  }

  return {
    novel: false,
    similarId: data[0].id,
    similarity: data[0].similarity,
  };
}
```

**Integrate into processContent():**
```typescript
// In processContent(), after generating embedding but before insert:
if (embedding && result.action === "admit") {
  const noveltyCheck = await isNovel(embedding, input.table);

  if (!noveltyCheck.novel) {
    // Content is a duplicate — reject it
    await logGatekeeperDecision(null, input.table, {
      ...result,
      action: "reject",
      reason: `Duplicate detected. Similar to existing entry ${noveltyCheck.similarId} (similarity: ${noveltyCheck.similarity?.toFixed(3)})`,
    });
    return { result: { ...result, action: "reject" }, rowId: null };
  }
}
```

**Why 0.92 threshold:**
- 0.95+ = essentially identical text (too strict, misses paraphrases)
- 0.90 = very similar content (might catch legitimately related but different content)
- 0.92 = sweet spot: catches real duplicates while allowing related-but-distinct content

---

## Task 2: Build entity extraction agent

**What:** After content is admitted, extract people mentions, skills, and project involvement using `generateObject()`.

**Create `src/lib/agents/extractor.ts`:**
```typescript
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ExtractionSchema = z.object({
  people: z.array(
    z.object({
      name: z.string().describe("Person's full name"),
      role_mentioned: z.string().optional().describe("Role or title if mentioned"),
      skills: z.array(z.string()).describe("Skills or expertise demonstrated or mentioned"),
      projects: z.array(
        z.object({
          name: z.string().describe("Project name"),
          role: z.string().optional().describe("Their role: lead, contributor, reviewer"),
        })
      ).describe("Projects this person is associated with in this content"),
    })
  ).describe("People mentioned in the content with their context"),
  decisions: z.array(
    z.object({
      decision: z.string().describe("What was decided"),
      made_by: z.string().optional().describe("Who made or announced the decision"),
      context: z.string().optional().describe("Why this decision was made"),
    })
  ).describe("Decisions made or referenced in this content"),
  action_items: z.array(
    z.object({
      description: z.string().describe("What needs to be done"),
      assignee: z.string().optional().describe("Who is responsible"),
      due_date: z.string().optional().describe("Due date if mentioned (ISO format)"),
    })
  ).describe("Action items or tasks mentioned"),
});

export type ExtractionResult = z.infer<typeof ExtractionSchema>;

const SYSTEM_PROMPT = `You are an extraction agent for a company knowledge platform. Given content from business communications (meetings, documents, Slack, email), extract structured information.

Rules:
- Only extract people who are CLEARLY mentioned by name. Do not infer unnamed people.
- Skills should be specific and professional (e.g., "React Native", "sales forecasting"), not generic (e.g., "communication").
- Decisions must be concrete and actionable, not vague opinions.
- Action items must have a clear task. "We should think about X" is NOT an action item. "John will prepare the proposal by Friday" IS.
- If nothing fits a category, return an empty array for that field.
- For due dates, convert relative dates to ISO format based on the content date if possible.`;

export async function extractEntities(
  content: string,
  source: { type: string; id: string; date?: string }
): Promise<ExtractionResult> {
  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    schema: ExtractionSchema,
    system: SYSTEM_PROMPT,
    prompt: `Extract structured information from this ${source.type} content:\n\n${content}`,
  });

  return object;
}
```

**Cost:** ~$0.0001-0.0003 per extraction (Haiku is very cheap). At 1000 Slack messages + 40 meetings/week, extraction costs ~$5-10/month.

---

## Task 3: Save extracted entities to database

**What:** Write extracted people, skills, decisions, and action items to their respective tables. Handle upserts for people (same person mentioned across multiple sources).

**Add to `src/lib/agents/extractor.ts`:**
```typescript
export async function saveExtractions(
  result: ExtractionResult,
  source: { type: string; id: string }
): Promise<void> {
  // Process people
  for (const person of result.people) {
    // Upsert person (find by name, or create)
    let { data: existingPerson } = await supabase
      .from("people")
      .select("id")
      .ilike("name", person.name)
      .single();

    let personId: string;

    if (existingPerson) {
      personId = existingPerson.id;
      // Mark embedding as stale (profile changed)
      await supabase
        .from("people")
        .update({ embedding_stale: true, updated_at: new Date().toISOString() })
        .eq("id", personId);
    } else {
      const { data: newPerson } = await supabase
        .from("people")
        .insert({
          name: person.name,
          role: person.role_mentioned || null,
          embedding_stale: true,
        })
        .select("id")
        .single();
      personId = newPerson!.id;
    }

    // Upsert skills
    for (const skill of person.skills) {
      const { data: existingSkill } = await supabase
        .from("people_skills")
        .select("id, evidence_count, source_ids")
        .eq("person_id", personId)
        .ilike("skill", skill)
        .single();

      if (existingSkill) {
        const sourceIds = existingSkill.source_ids || [];
        sourceIds.push({ source_type: source.type, source_id: source.id });
        await supabase
          .from("people_skills")
          .update({
            evidence_count: existingSkill.evidence_count + 1,
            last_seen: new Date().toISOString(),
            source_ids: sourceIds,
          })
          .eq("id", existingSkill.id);
      } else {
        await supabase.from("people_skills").insert({
          person_id: personId,
          skill,
          evidence_count: 1,
          last_seen: new Date().toISOString(),
          source_ids: [{ source_type: source.type, source_id: source.id }],
        });
      }
    }

    // Upsert project involvement
    for (const project of person.projects) {
      await supabase.from("people_projects").upsert(
        {
          person_id: personId,
          project: project.name,
          role_in_project: project.role || null,
          last_mentioned: new Date().toISOString(),
          source_ids: [{ source_type: source.type, source_id: source.id }],
        },
        { onConflict: "person_id,project" }
      );
    }
  }

  // Insert decisions
  for (const decision of result.decisions) {
    await supabase.from("decisions").insert({
      decision: decision.decision,
      context: decision.context || null,
      made_by: decision.made_by || null,
      source_type: source.type,
      source_id: source.id,
      date: new Date().toISOString(),
    });
  }

  // Insert action items
  for (const item of result.action_items) {
    await supabase.from("action_items").insert({
      description: item.description,
      assignee: item.assignee || null,
      due_date: item.due_date || null,
      source_type: source.type,
      source_id: source.id,
    });
  }
}
```

**Integrate into Gatekeeper pipeline (`processContent`):**
```typescript
// After successful admission (status === "active" && rowId):
if (status === "active" && rowId) {
  const extractions = await extractEntities(textToEvaluate, {
    type: input.metadata.source,
    id: rowId,
  });
  await saveExtractions(extractions, {
    type: input.metadata.source,
    id: rowId,
  });
}
```

**Key design decisions:**
- People are matched by name (case-insensitive via `ilike`) — simple and works when teams use consistent names
- Skills use evidence counting — more mentions = stronger signal
- `embedding_stale = true` on person update triggers the re-embedding worker to refresh their profile vector
- Extraction runs AFTER admission — don't waste Haiku calls on rejected content

---

## Verification

- [ ] Duplicate content (similarity > 0.92) is rejected with reason logged
- [ ] Novel content passes through normally
- [ ] People mentioned in meetings are created in `people` table
- [ ] Skills are extracted and evidence counts increment on repeat mentions
- [ ] Project involvement is tracked in `people_projects`
- [ ] Decisions appear in `decisions` table with source linkage
- [ ] Action items appear in `action_items` table with assignee
- [ ] Person's `embedding_stale` is set to true when new skills/projects are added
