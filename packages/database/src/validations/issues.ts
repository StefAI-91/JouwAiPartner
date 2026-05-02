import { z } from "zod";
import {
  ISSUE_TYPES,
  ISSUE_STATUSES,
  ISSUE_PRIORITIES,
  ISSUE_COMPONENTS,
  ISSUE_SEVERITIES,
  UNASSIGNED_SENTINEL,
} from "../constants/issues";

/**
 * Parse a comma-separated URL param into a validated array. Empty segments
 * (e.g. from `"a,,b"`) are dropped and each remaining segment is validated by
 * `itemSchema`. Invalid items are silently filtered so a crafted query
 * reduces to a no-op rather than bleeding through to the database.
 *
 * Used by the issues list page and CSV export route to guard the raw URL
 * params that feed into `listIssues` / `countFilteredIssues`.
 */
function csvListSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z
    .string()
    .optional()
    .transform((raw): z.infer<T>[] | undefined => {
      if (!raw) return undefined;
      const items = raw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      const validated: z.infer<T>[] = [];
      for (const item of items) {
        const parsed = itemSchema.safeParse(item);
        if (parsed.success) validated.push(parsed.data);
      }
      return validated.length > 0 ? validated : undefined;
    });
}

const assigneeItemSchema = z.union([z.string().uuid(), z.literal(UNASSIGNED_SENTINEL)]);

/**
 * Shared schema for issue-list filter params coming from `?status=...` etc.
 * Consumed by the issues page route and the CSV export route so both
 * endpoints apply the same validation.
 */
export const issueListFilterSchema = z.object({
  status: csvListSchema(z.enum(ISSUE_STATUSES)),
  priority: csvListSchema(z.enum(ISSUE_PRIORITIES)),
  type: csvListSchema(z.enum(ISSUE_TYPES)),
  component: csvListSchema(z.enum(ISSUE_COMPONENTS)),
  assignee: csvListSchema(assigneeItemSchema),
  topic: csvListSchema(z.string().uuid()),
  // "1" → true, alles anders → false. Strikt zodat een knullig `?ungrouped=0`
  // niet ongewenst als truthy wordt geïnterpreteerd.
  ungrouped: z
    .string()
    .optional()
    .transform((v) => v === "1"),
  // Display-mode. Default = "topic" (groep-by-topic), `?group=flat` zet uit.
  // Enum zodat we later "priority"/"status"/etc. zonder breaking change
  // kunnen toevoegen.
  group: z.enum(["topic", "flat"]).optional(),
});

export type IssueListFilterParams = z.infer<typeof issueListFilterSchema>;

// CP-007 — lege strings normaliseren naar `null` zodat "leeg = fallback naar
// internal title/description" eenduidig blijft. Trim eerst om whitespace-only
// invoer ook als leeg te behandelen. Output is altijd `string | null`.
const emptyToNull = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((v) => {
      if (v == null) return null;
      return v.trim() === "" ? null : v;
    });

export const createIssueSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1, "Titel is verplicht").max(500),
  description: z.string().max(10000).nullish(),
  client_title: emptyToNull(200),
  client_description: emptyToNull(5000),
  type: z.enum(ISSUE_TYPES).default("bug"),
  status: z.enum(ISSUE_STATUSES).default("triage"),
  priority: z.enum(ISSUE_PRIORITIES).default("medium"),
  component: z.enum(ISSUE_COMPONENTS).nullish(),
  severity: z.enum(ISSUE_SEVERITIES).nullish(),
  labels: z.array(z.string()).default([]),
  assigned_to: z.string().uuid().nullish(),
  reporter_name: z.string().max(200).nullish(),
  reporter_email: z.string().email().nullish(),
});

export const updateIssueSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).nullish(),
  client_title: emptyToNull(200),
  client_description: emptyToNull(5000),
  type: z.enum(ISSUE_TYPES).optional(),
  status: z.enum(ISSUE_STATUSES).optional(),
  priority: z.enum(ISSUE_PRIORITIES).optional(),
  component: z.enum(ISSUE_COMPONENTS).nullish(),
  severity: z.enum(ISSUE_SEVERITIES).nullish(),
  labels: z.array(z.string()).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
});

export const deleteIssueSchema = z.object({
  id: z.string().uuid(),
});

export const createCommentSchema = z.object({
  issue_id: z.string().uuid(),
  body: z.string().min(1, "Reactie mag niet leeg zijn").max(10000),
});

export const updateCommentSchema = z.object({
  id: z.string().uuid(),
  issue_id: z.string().uuid(),
  body: z.string().min(1, "Reactie mag niet leeg zijn").max(10000),
});

export const deleteCommentSchema = z.object({
  id: z.string().uuid(),
  issue_id: z.string().uuid(),
});

// CC-001 — PM-review-gate.
//
// Discriminated union zodat één Zod-parse alle vier acties dekt; per actie
// alleen de velden die hij nodig heeft. min(10) op decline_reason en
// questionBody: een lege/eenwoord-toelichting is geen verklaring voor de
// klant (vision §5).
const zUuid = z.string().uuid();

export const pmReviewActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("endorse"),
    issueId: zUuid,
  }),
  z.object({
    action: z.literal("decline"),
    issueId: zUuid,
    declineReason: z.string().min(10, "Geef minstens 10 tekens reden mee").max(1000),
  }),
  z.object({
    action: z.literal("defer"),
    issueId: zUuid,
  }),
  z.object({
    action: z.literal("convert"),
    issueId: zUuid,
    questionBody: z.string().min(10, "Geef minstens 10 tekens vraag mee").max(2000),
  }),
]);

export type PmReviewAction = z.infer<typeof pmReviewActionSchema>;
