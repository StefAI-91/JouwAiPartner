import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserbackSyncCursor, getExistingUserbackIds } from "../queries/issues";
import { upsertUserbackIssues } from "../mutations/issues";
import {
  fetchAllUserbackFeedback,
  isTestSubmission,
  mapUserbackToIssue,
  extractMediaUrls,
} from "./userback";
import { storeIssueMedia } from "../mutations/issue-attachments";

export interface SyncPipelineParams {
  projectId: string;
  limit: number;
  filterTests?: boolean;
  admin: SupabaseClient;
}

export interface SyncPipelineResult {
  /** IDs of newly imported issues (for optional AI classification) */
  importedIds: string[];
  imported: number;
  updated: number;
  skipped: number;
  mediaStored: number;
  filtered: number;
  total: number;
  isInitial: boolean;
  errors: string[];
}

/**
 * Core Userback sync pipeline: fetch, map, dedup, upsert, store media.
 * Used by both the Server Action and the API route to avoid duplication.
 */
export async function executeSyncPipeline({
  projectId,
  limit,
  filterTests = false,
  admin,
}: SyncPipelineParams): Promise<SyncPipelineResult> {
  // 1. Get sync cursor (null = first sync → default to 14 days ago)
  const rawCursor = await getUserbackSyncCursor(admin);
  const isInitial = rawCursor === null;
  const cursor = rawCursor ?? new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  console.log(
    `[syncPipeline] Starting ${isInitial ? "initial" : "incremental"} sync` +
      ` (cursor: ${cursor ?? "none"}, limit: ${limit})`,
  );

  // 2. Fetch from Userback API
  const items = await fetchAllUserbackFeedback(cursor, limit);

  // 3. Optionally filter test submissions
  const realItems = filterTests
    ? items.filter((item) => !isTestSubmission(item.description))
    : items;
  const filtered = items.length - realItems.length;

  if (realItems.length === 0) {
    return {
      importedIds: [],
      imported: 0,
      updated: 0,
      skipped: 0,
      mediaStored: 0,
      filtered,
      total: items.length,
      isInitial,
      errors: [],
    };
  }

  // 4. Map to issue format
  const mappedItems = realItems.map((item) => mapUserbackToIssue(item, projectId));

  // Build a lookup from userback_id -> original item (for media extraction)
  const itemsByUserbackId = new Map(realItems.map((item) => [String(item.id), item]));

  // 5. Dedup check
  const userbackIds = mappedItems
    .map((i) => i.userback_id)
    .filter((id): id is string => id !== null && id !== undefined);
  const existingMap = await getExistingUserbackIds(userbackIds, admin);

  // 6. Upsert (insert new, update existing)
  const result = await upsertUserbackIssues(mappedItems, existingMap, admin);

  // 7. Download and store media for NEW items
  let mediaStored = 0;
  for (const [userbackId, issueId] of result.importedMap) {
    const originalItem = itemsByUserbackId.get(userbackId);
    if (!originalItem) continue;

    const mediaUrls = extractMediaUrls(originalItem);
    if (mediaUrls.length === 0) continue;

    try {
      mediaStored += await storeIssueMedia(issueId, userbackId, mediaUrls, admin);
    } catch (err) {
      console.error(`[syncPipeline] Media storage failed for ${issueId}:`, err);
    }
  }

  return {
    importedIds: result.imported,
    imported: result.imported.length,
    updated: result.updated,
    skipped: result.skipped,
    mediaStored,
    filtered,
    total: items.length,
    isInitial,
    errors: result.errors.slice(0, 5),
  };
}
