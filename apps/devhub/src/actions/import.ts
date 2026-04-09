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
import { fetchAllUserbackFeedback, mapUserbackToIssue } from "@repo/database/integrations/userback";
import { classifyIssueBackground } from "./classify";

const AI_CLASSIFY_DELAY_MS = 100;

const syncSchema = z.object({
  projectId: z.string().uuid(),
  limit: z.number().int().min(1).max(1000).default(10),
});

export interface SyncResult {
  imported: number;
  updated: number;
  skipped: number;
  total: number;
  classified: number;
  isInitial: boolean;
}

/**
 * Sync Userback feedback into the issues table.
 * Uses cursor-based incremental sync. Limit controls max items fetched from API.
 */
export async function syncUserback(
  input: z.input<typeof syncSchema>,
): Promise<{ success: true; data: SyncResult } | { error: string }> {
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
        data: { imported: 0, updated: 0, skipped: 0, total: 0, classified: 0, isInitial },
      };
    }

    // 3. Map to issue format
    const mappedItems = items.map((item) => mapUserbackToIssue(item, projectId));

    // 4. Check which userback_ids already exist (batch dedup)
    const userbackIds = mappedItems
      .map((i) => i.userback_id)
      .filter((id): id is string => id !== null && id !== undefined);
    const existingMap = await getExistingUserbackIds(userbackIds, admin);

    // 5. Upsert (insert new, update existing)
    const result = await upsertUserbackIssues(mappedItems, existingMap, admin);

    // 6. AI classification for NEW items only (sequential, 100ms delay)
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
