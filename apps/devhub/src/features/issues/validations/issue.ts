import { z } from "zod";
import {
  createIssueSchema,
  updateIssueSchema,
  deleteIssueSchema,
  createCommentSchema,
  updateCommentSchema,
  deleteCommentSchema,
} from "@repo/database/validations/issues";

/**
 * Re-export van de centrale Zod-schemas zodat consumers in `features/issues/`
 * één import-pad hebben. Aangevuld met DevHub-specifieke action-schemas die
 * niet in `@repo/database/validations` thuishoren (UI/upload-flow specifiek).
 *
 * Patroon volgt `features/topics/validations/topic.ts`.
 */
export {
  createIssueSchema,
  updateIssueSchema,
  deleteIssueSchema,
  createCommentSchema,
  updateCommentSchema,
  deleteCommentSchema,
};

// ── Action-only wrappers ──────────────────────────────────────────────────

export const projectIdSchema = z.string().uuid();

export const classifySchema = z.object({
  id: z.string().uuid(),
});
export type ClassifyInput = z.infer<typeof classifySchema>;

export const bulkClassifySchema = z.object({
  projectId: z.string().uuid(),
});
export type BulkClassifyInput = z.infer<typeof bulkClassifySchema>;

// ── Attachment upload-flow ────────────────────────────────────────────────

export const ATTACHMENT_TYPE_ENUM = z.enum(["screenshot", "video", "attachment"]);

export const createIssueAttachmentUploadUrlSchema = z.object({
  issue_id: z.string().uuid(),
  file_name: z.string().min(1).max(255),
});
export type CreateIssueAttachmentUploadUrlInput = z.infer<
  typeof createIssueAttachmentUploadUrlSchema
>;

export const recordIssueAttachmentSchema = z.object({
  issue_id: z.string().uuid(),
  type: ATTACHMENT_TYPE_ENUM,
  storage_path: z.string().min(1).max(500),
  file_name: z.string().min(1).max(255),
  mime_type: z.string().max(120).nullable().optional(),
  file_size: z
    .number()
    .int()
    .min(0)
    .max(50 * 1024 * 1024)
    .nullable()
    .optional(),
  width: z.number().int().min(0).max(20_000).nullable().optional(),
  height: z.number().int().min(0).max(20_000).nullable().optional(),
});
export type RecordIssueAttachmentInput = z.infer<typeof recordIssueAttachmentSchema>;
