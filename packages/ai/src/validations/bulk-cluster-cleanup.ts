import { z } from "zod";
import { TOPIC_TYPES } from "@repo/database/constants/topics";

/**
 * PR-019 — Output-schema van de Bulk Cluster Cleanup agent.
 *
 * **Twee aparte arrays** in plaats van één `discriminatedUnion` — de
 * Anthropic-provider in Vercel AI SDK 6 accepteert geen `oneOf` in
 * structured-output schema's. De agent-functie mapt deze ruwe vorm naar de
 * publieke `BulkClusterOutput` shape (één `clusters[]` met `kind`-tag) zodat
 * de actions en UI hun discriminator-pattern kunnen blijven gebruiken.
 *
 * Eén issue komt in maximaal één cluster (Haiku krijgt die regel via de
 * prompt — het schema borgt alleen vorm, geen overlap-check; die is
 * server-side guard via de race-condition filter in de action).
 */
const matchClusterSchema = z.object({
  match_topic_id: z.string().uuid(),
  issue_ids: z.array(z.string().uuid()).min(1),
  rationale: z.string().min(10).max(300),
});

const newClusterSchema = z.object({
  new_topic: z.object({
    title: z.string().min(3).max(120),
    description: z.string().min(10).max(500),
    type: z.enum(TOPIC_TYPES),
  }),
  issue_ids: z.array(z.string().uuid()).min(1),
  rationale: z.string().min(10).max(300),
});

export const bulkClusterModelSchema = z.object({
  matches: z.array(matchClusterSchema),
  new_topics: z.array(newClusterSchema),
});

export type BulkClusterModelOutput = z.infer<typeof bulkClusterModelSchema>;

/**
 * Publieke vorm voor consumers (actions, UI). Discriminator op `kind` zodat
 * de UI per cluster kan switchen op match vs. new. Niet rechtstreeks van Zod
 * geïnferreerd omdat het output-schema flat is — handmatig vastgelegd om de
 * shape stabiel te houden.
 */
export type BulkCluster =
  | {
      kind: "match";
      match_topic_id: string;
      issue_ids: string[];
      rationale: string;
    }
  | {
      kind: "new";
      new_topic: { title: string; description: string; type: "bug" | "feature" };
      issue_ids: string[];
      rationale: string;
    };

export interface BulkClusterOutput {
  clusters: BulkCluster[];
}
