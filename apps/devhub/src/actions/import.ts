"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAdminClient } from "@repo/database/supabase/admin";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin, assertProjectAccess, NotAuthorizedError } from "@repo/auth/access";
import {
  getUserbackSyncCursor,
  countUserbackIssues,
  listUserbackIssuesForBackfill,
} from "@repo/database/queries/userback-issues";
import { getIssueIdsWithAttachments } from "@repo/database/queries/issue-attachments";
import { extractMediaFromMetadata } from "@repo/database/integrations/userback";
import { executeSyncPipeline } from "@repo/database/integrations/userback-sync";
import { storeIssueMedia } from "@repo/database/mutations/issue-attachments";
import { classifyIssueBackground } from "./classify";

const AI_CLASSIFY_DELAY_MS = 100;

const syncSchema = z.object({
  projectId: z.string().uuid(),
  limit: z.number().int().min(1).max(1000).default(10),
});

/**
 * Sync Userback feedback into the issues table.
 * Uses cursor-based incremental sync. Limit controls max items fetched from API.
 */
export async function syncUserback(input: z.input<typeof syncSchema>): Promise<
  | {
      success: true;
      data: {
        imported: number;
        updated: number;
        skipped: number;
        total: number;
        classified: number;
        isInitial: boolean;
        errors: string[];
      };
    }
  | { error: string }
> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = syncSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const { projectId, limit } = parsed.data;

  // Userback sync pulls external data + writes across issues — admin-only.
  try {
    await assertProjectAccess(user.id, projectId);
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { error: "Geen toegang tot dit project" };
    throw e;
  }
  if (!(await isAdmin(user.id))) return { error: "Alleen admins kunnen syncen" };

  const admin = getAdminClient();

  try {
    const result = await executeSyncPipeline({ projectId, limit, admin });

    // AI classification for NEW items only (sequential, 100ms delay)
    let classified = 0;
    for (const issueId of result.importedIds) {
      try {
        await classifyIssueBackground(issueId);
        classified++;
      } catch (err) {
        console.error(`[syncUserback] AI classification failed for ${issueId}:`, err);
      }

      if (classified < result.importedIds.length) {
        await new Promise((resolve) => setTimeout(resolve, AI_CLASSIFY_DELAY_MS));
      }
    }

    revalidatePath("/issues");
    revalidatePath("/settings/import");

    return {
      success: true,
      data: {
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        total: result.total,
        classified,
        isInitial: result.isInitial,
        errors: result.errors,
      },
    };
  } catch (err) {
    console.error("[syncUserback]", err);
    return { error: err instanceof Error ? err.message : "Sync mislukt" };
  }
}

const syncStatusSchema = z.object({
  projectId: z.string().uuid(),
});

/**
 * Get sync status info for the import page.
 */
export async function getSyncStatus(
  input: z.input<typeof syncStatusSchema>,
): Promise<
  { success: true; data: { itemCount: number; lastSyncCursor: string | null } } | { error: string }
> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = syncStatusSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const { projectId } = parsed.data;

  try {
    await assertProjectAccess(user.id, projectId);
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { error: "Geen toegang tot dit project" };
    throw e;
  }

  const admin = getAdminClient();

  try {
    const [itemCount, lastSyncCursor] = await Promise.all([
      countUserbackIssues(projectId, admin),
      getUserbackSyncCursor(admin),
    ]);

    return { success: true, data: { itemCount, lastSyncCursor } };
  } catch (err) {
    console.error("[getSyncStatus]", err);
    return { error: "Status ophalen mislukt" };
  }
}

/**
 * Backfill media for existing Userback issues that don't have attachments yet.
 * Reads source_metadata.raw_userback to extract media URLs, downloads them,
 * and stores in Supabase storage.
 */
export async function backfillMedia(): Promise<
  | {
      success: true;
      data: { processed: number; mediaStored: number; skipped: number; errors: string[] };
    }
  | { error: string }
> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  // Backfill touches all Userback issues across projects → admin-only.
  if (!(await isAdmin(user.id))) return { error: "Alleen admins kunnen backfillen" };

  const admin = getAdminClient();

  try {
    const issues = await listUserbackIssuesForBackfill(admin);
    if (issues.length === 0) {
      return { success: true, data: { processed: 0, mediaStored: 0, skipped: 0, errors: [] } };
    }

    const hasAttachments = await getIssueIdsWithAttachments(
      issues.map((i) => i.id),
      admin,
    );

    let processed = 0;
    let mediaStored = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const issue of issues) {
      if (hasAttachments.has(issue.id)) {
        skipped++;
        continue;
      }

      const metadata = issue.source_metadata as Record<string, unknown> | null;
      if (!metadata) {
        skipped++;
        continue;
      }

      const mediaUrls = extractMediaFromMetadata(metadata);
      if (mediaUrls.length === 0) {
        skipped++;
        continue;
      }

      try {
        const count = await storeIssueMedia(issue.id, issue.userback_id!, mediaUrls, admin);
        mediaStored += count;
        processed++;
        console.log(`[backfillMedia] Issue ${issue.id}: stored ${count} files`);
      } catch (err) {
        const msg = `Issue ${issue.userback_id}: ${err instanceof Error ? err.message : String(err)}`;
        console.error(`[backfillMedia] ${msg}`);
        errors.push(msg);
      }
    }

    revalidatePath("/issues");

    return {
      success: true,
      data: { processed, mediaStored, skipped, errors: errors.slice(0, 5) },
    };
  } catch (err) {
    console.error("[backfillMedia]", err);
    return { error: err instanceof Error ? err.message : "Backfill mislukt" };
  }
}
