import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  bulkClusterModelSchema,
  type BulkClusterOutput,
} from "../validations/bulk-cluster-cleanup";
import { withAgentRun } from "./run-logger";

/**
 * PR-019 — Bulk Cluster Cleanup. On-demand opruim-tool: groepeert open
 * ungrouped `userback`-issues onder bestaande topics of stelt nieuwe topics
 * voor. Niet-persistent: een mens accepteert per cluster, de UI roept de
 * bestaande `linkIssueAction` / `createTopicAction` aan.
 *
 * Tegenhanger PR-014 doet hetzelfde per-issue at-intake; deze agent is
 * batch-only en bewust lichter (Haiku, geen embeddings, geen cap nu).
 */

export const BULK_CLUSTER_CLEANUP_MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../prompts/bulk-cluster-cleanup.md"),
  "utf8",
).trimEnd();

export interface BulkClusterIssueInput {
  id: string;
  number: number;
  title: string;
  /** Caller MOET truncaten naar ~400 chars voor token-budget. */
  description: string | null;
  ai_classification: Record<string, unknown> | null;
}

export interface BulkClusterTopicInput {
  id: string;
  title: string;
  description: string | null;
  type: "bug" | "feature";
  status: string;
  /**
   * Tot 5 al-gekoppelde issue-titels, meest recent eerst. Functioneert als
   * fingerprint: een nieuwe issue past pas écht bij het topic als hij ook
   * thematisch bij deze voorbeelden hoort. Lege array → topic heeft nog
   * geen geschiedenis; Haiku valt terug op title+description.
   */
  sampleIssueTitles: string[];
}

export interface BulkClusterInput {
  issues: BulkClusterIssueInput[];
  topics: BulkClusterTopicInput[];
}

function buildUserPrompt(input: BulkClusterInput): string {
  const topicsBlock = input.topics.length
    ? input.topics
        .map((t) => {
          const lines = [`- ${t.id} | ${t.type} | ${t.status} | ${t.title}`];
          if (t.description) lines.push(`    ${t.description}`);
          if (t.sampleIssueTitles.length > 0) {
            lines.push(`    eerder gekoppeld:`);
            for (const title of t.sampleIssueTitles) {
              lines.push(`      • ${title}`);
            }
          }
          return lines.join("\n");
        })
        .join("\n")
    : "(geen bestaande open topics in dit project)";

  const issuesBlock = input.issues
    .map((i) => {
      const cls = i.ai_classification
        ? Object.entries(i.ai_classification)
            .filter(([, v]) => v !== null && v !== undefined && v !== "")
            .map(([k, v]) => `${k}=${String(v)}`)
            .join(", ")
        : "";
      return [
        `- ${i.id} | #${i.number} | ${i.title}`,
        cls ? `    ai: ${cls}` : null,
        i.description ? `    ${i.description}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return `## Bestaande open topics\n${topicsBlock}\n\n## Open ungrouped issues\n${issuesBlock}\n\nGroepeer deze issues volgens de regels in het systeemprompt. Gebruik de exacte uuids uit de input.`;
}

export async function runBulkClusterCleanup(input: BulkClusterInput): Promise<BulkClusterOutput> {
  return withAgentRun(
    {
      agent_name: "bulk-cluster-cleanup",
      model: BULK_CLUSTER_CLEANUP_MODEL,
      metadata: { issue_count: input.issues.length, topic_count: input.topics.length },
    },
    async () => {
      const { object, usage } = await generateObject({
        model: anthropic(BULK_CLUSTER_CLEANUP_MODEL),
        maxRetries: 2,
        schema: bulkClusterModelSchema,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
            providerOptions: {
              anthropic: { cacheControl: { type: "ephemeral" } },
            },
          },
          { role: "user", content: buildUserPrompt(input) },
        ],
      });

      // Map de twee arrays naar de publieke discriminated-union vorm. Volgorde:
      // matches eerst, dan new — bewust deterministisch zodat UI-rendering en
      // tests reproduceerbaar zijn.
      //
      // Dedupe `issue_ids` binnen één cluster: het schema borgt vorm maar geen
      // uniqueness, en Haiku herhaalt incidenteel dezelfde id binnen een
      // cluster. Door hier op te schonen krijgt de UI nooit dubbele React-keys
      // én slaat de accept-actie geen issue dubbel op.
      const dedupe = <T>(xs: T[]): T[] => Array.from(new Set(xs));

      const result: BulkClusterOutput = {
        clusters: [
          ...object.matches.map((m) => ({
            kind: "match" as const,
            ...m,
            issue_ids: dedupe(m.issue_ids),
          })),
          ...object.new_topics.map((n) => ({
            kind: "new" as const,
            ...n,
            issue_ids: dedupe(n.issue_ids),
          })),
        ],
      };

      return { result, usage };
    },
  );
}
