"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import { getAdminClient } from "@repo/database/supabase/admin";
import {
  getUserbackSyncCursor,
  getExistingUserbackIds,
  countUserbackIssues,
} from "@repo/database/queries/issues";
import { upsertUserbackIssues } from "@repo/database/mutations/issues";
import { insertActivity } from "@repo/database/mutations/issues";
import {
  fetchAllUserbackFeedback,
  mapUserbackToIssue,
  extractMediaUrls,
  extractMediaFromMetadata,
} from "@repo/database/integrations/userback";
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
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = syncSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const { projectId, limit } = parsed.data;
  const admin = getAdminClient();

  try {
    // 1. Get sync cursor (null = first sync)
    const cursor = await getUserbackSyncCursor(admin);
    const isInitial = cursor === null;

    console.log(
      `[syncUserback] Starting ${isInitial ? "initial" : "incremental"} sync` +
        ` (cursor: ${cursor ?? "none"}, limit: ${limit})`,
    );

    // 2. Fetch from Userback API
    const items = await fetchAllUserbackFeedback(cursor, limit);

    if (items.length === 0) {
      return {
        success: true,
        data: {
          imported: 0,
          updated: 0,
          skipped: 0,
          total: 0,
          classified: 0,
          isInitial,
          errors: [],
        },
      };
    }

    // 3. Map to issue format + keep original items for media extraction
    const mappedItems = items.map((item) => mapUserbackToIssue(item, projectId));

    // Build a lookup from userback_id → original item (for media extraction later)
    const itemsByUserbackId = new Map(items.map((item) => [String(item.id), item]));

    // 4. Check which userback_ids already exist (batch dedup)
    const userbackIds = mappedItems
      .map((i) => i.userback_id)
      .filter((id): id is string => id !== null && id !== undefined);
    const existingMap = await getExistingUserbackIds(userbackIds, admin);

    // 5. Upsert (insert new, update existing)
    const result = await upsertUserbackIssues(mappedItems, existingMap, admin);

    // 6. Download and store media for NEW items (screenshots, video, attachments)
    let mediaStored = 0;
    for (const [userbackId, issueId] of result.importedMap) {
      const originalItem = itemsByUserbackId.get(userbackId);
      if (!originalItem) continue;

      const mediaUrls = extractMediaUrls(originalItem);
      if (mediaUrls.length === 0) continue;

      try {
        const count = await storeIssueMedia(issueId, userbackId, mediaUrls, admin);
        mediaStored += count;
        console.log(`[syncUserback] Stored ${count} media files for issue ${issueId}`);
      } catch (err) {
        console.error(`[syncUserback] Media storage failed for ${issueId}:`, err);
      }
    }

    console.log(`[syncUserback] Total media files stored: ${mediaStored}`);

    // 7. AI classification for NEW items only (sequential, 100ms delay)
    let classified = 0;
    for (const issueId of result.imported) {
      try {
        await classifyIssueBackground(issueId);
        classified++;
      } catch (err) {
        console.error(`[syncUserback] AI classification failed for ${issueId}:`, err);
      }

      if (classified < result.imported.length) {
        await new Promise((resolve) => setTimeout(resolve, AI_CLASSIFY_DELAY_MS));
      }
    }

    revalidatePath("/issues");
    revalidatePath("/settings/import");

    return {
      success: true,
      data: {
        imported: result.imported.length,
        updated: result.updated,
        skipped: result.skipped,
        total: items.length,
        classified,
        isInitial,
        errors: result.errors.slice(0, 5),
      },
    };
  } catch (err) {
    console.error("[syncUserback]", err);
    return { error: err instanceof Error ? err.message : "Sync mislukt" };
  }
}

/**
 * Get sync status info for the import page.
 */
export async function getSyncStatus(projectId: string): Promise<{
  itemCount: number;
  lastSyncCursor: string | null;
}> {
  const admin = getAdminClient();
  const [itemCount, lastSyncCursor] = await Promise.all([
    countUserbackIssues(projectId, admin),
    getUserbackSyncCursor(admin),
  ]);

  return { itemCount, lastSyncCursor };
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };

  const admin = getAdminClient();

  try {
    // Find all Userback issues that have NO attachments yet
    const { data: issues, error: queryError } = await admin
      .from("issues")
      .select("id, userback_id, source_metadata")
      .eq("source", "userback")
      .not("userback_id", "is", null)
      .not("source_metadata", "is", null);

    if (queryError) throw new Error(queryError.message);
    if (!issues?.length) {
      return { success: true, data: { processed: 0, mediaStored: 0, skipped: 0, errors: [] } };
    }

    // Get issue IDs that already have attachments
    const { data: existingAttachments } = await admin
      .from("issue_attachments")
      .select("issue_id")
      .in(
        "issue_id",
        issues.map((i) => i.id),
      );

    const hasAttachments = new Set((existingAttachments ?? []).map((a) => a.issue_id));

    let processed = 0;
    let mediaStored = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const issue of issues) {
      // Skip if already has attachments
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
