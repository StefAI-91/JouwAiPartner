"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { assertProjectAccess, NotAuthorizedError } from "@repo/auth/access";
import { getAdminClient } from "@repo/database/supabase/admin";
import { getIssueById } from "@repo/database/queries/issues";
import { insertAttachment } from "@repo/database/mutations/issue-attachments";

const BUCKET_ID = "issue-attachments";
const ATTACHMENT_TYPE = z.enum(["screenshot", "video", "attachment"]);

function sanitizeFileName(name: string): string {
  const trimmed = name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-");
  return trimmed.length > 120 ? trimmed.slice(0, 120) : trimmed || "image";
}

const createUploadUrlSchema = z.object({
  issue_id: z.string().uuid(),
  file_name: z.string().min(1).max(255),
});

/**
 * Mint a short-lived signed upload URL so the browser can PUT the blob
 * directly to Supabase Storage. Avoids routing binary data through the
 * Server Action body (Vercel caps it at ~4.5 MB) *and* avoids relying on
 * the browser-side Supabase session for storage auth — `createSignedUploadUrl`
 * uses the service role on the server, the returned token grants a one-shot
 * upload with no further auth header required.
 *
 * Returns the full `storage_path` the browser should use so the caller can
 * round-trip it into `recordIssueAttachmentAction` afterwards.
 */
export async function createIssueAttachmentUploadUrlAction(
  input: z.input<typeof createUploadUrlSchema>,
): Promise<
  { success: true; signed_url: string; token: string; storage_path: string } | { error: string }
> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = createUploadUrlSchema.safeParse(input);
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

  const safeName = sanitizeFileName(parsed.data.file_name);
  const storagePath = `issues/${parsed.data.issue_id}/${Date.now()}-${safeName}`;

  const { data, error } = await getAdminClient()
    .storage.from(BUCKET_ID)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    console.error("[createIssueAttachmentUploadUrlAction] signed url error:", error);
    return { error: "Upload-URL genereren mislukt" };
  }

  return {
    success: true,
    signed_url: data.signedUrl,
    token: data.token,
    storage_path: storagePath,
  };
}

const recordIssueAttachmentSchema = z.object({
  issue_id: z.string().uuid(),
  type: ATTACHMENT_TYPE,
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
 * Persist an issue-attachment row after the client uploaded the blob to
 * Supabase storage via a signed upload URL. Enforces project-access server-
 * side and requires the path to live under `issues/<issue_id>/` so a
 * compromised client can't associate arbitrary objects with this issue.
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
