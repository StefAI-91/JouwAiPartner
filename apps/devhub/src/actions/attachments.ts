"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { assertProjectAccess, NotAuthorizedError } from "@repo/auth/access";
import { getIssueById } from "@repo/database/queries/issues";
import { insertAttachment } from "@repo/database/mutations/issue-attachments";

const attachmentTypeEnum = z.enum(["screenshot", "video", "attachment"]);

const recordIssueAttachmentSchema = z.object({
  issue_id: z.string().uuid(),
  type: attachmentTypeEnum,
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

/**
 * Persist an issue-attachment row after the client uploaded the blob directly
 * to Supabase storage. The browser does the upload with the authenticated
 * session (RLS on `storage.objects` allows any authenticated user to write
 * into the `issue-attachments` bucket); this action exists because the
 * `issue_attachments` table lives outside storage RLS and needs server-side
 * project-access enforcement.
 */
export async function recordIssueAttachmentAction(
  input: z.input<typeof recordIssueAttachmentSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = recordIssueAttachmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const issue = await getIssueById(parsed.data.issue_id);
  if (!issue) return { error: "Issue niet gevonden" };

  try {
    await assertProjectAccess(user.id, issue.project_id);
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { error: "Issue niet gevonden" };
    throw e;
  }

  // Defense in depth: ensure the uploaded path is scoped under this issue's
  // folder so a compromised/malicious client can't associate arbitrary objects.
  const expectedPrefix = `issues/${parsed.data.issue_id}/`;
  if (!parsed.data.storage_path.startsWith(expectedPrefix)) {
    return { error: "Ongeldig pad voor bijlage" };
  }

  try {
    await insertAttachment({
      issue_id: parsed.data.issue_id,
      type: parsed.data.type,
      storage_path: parsed.data.storage_path,
      original_url: null,
      file_name: parsed.data.file_name,
      mime_type: parsed.data.mime_type ?? null,
      file_size: parsed.data.file_size ?? null,
      width: parsed.data.width ?? null,
      height: parsed.data.height ?? null,
    });
  } catch (err) {
    console.error("[recordIssueAttachmentAction]", err);
    return { error: "Bijlage opslaan mislukt" };
  }

  revalidatePath(`/issues/${parsed.data.issue_id}`);
  return { success: true };
}
