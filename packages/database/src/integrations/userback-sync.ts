import type { SupabaseClient } from "@supabase/supabase-js";
import { getExistingUserbackIds } from "../queries/userback-issues";
import { upsertUserbackIssues } from "../mutations/issues";
import {
  fetchAllUserbackFeedback,
  isTestSubmission,
  mapUserbackToIssue,
  extractMediaUrls,
} from "./userback";
import { storeIssueMedia } from "../mutations/issues/attachments";

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
  // 1. Hard 30-day window: only fetch items created in the last 30 days.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // 2. Resolve the Userback project to scope the API call — without this
  //    filter the API returns feedback from every project under the token.
  const { data: project, error: projectErr } = await admin
    .from("projects")
    .select("userback_project_id")
    .eq("id", projectId)
    .single();

  if (projectErr) {
    throw new Error(`Failed to load project ${projectId}: ${projectErr.message}`);
  }
  const userbackProjectId = project?.userback_project_id ?? null;
  if (!userbackProjectId) {
    throw new Error(
      `Project ${projectId} has no userback_project_id — set it before syncing to avoid pulling feedback from other Userback projects.`,
    );
  }

  console.log(
    `[syncPipeline] Starting sync (userbackProjectId: ${userbackProjectId}, createdAfter: ${thirtyDaysAgo}, limit: ${limit})`,
  );

  // 3. Fetch newest-first; pagination stops as soon as items are older than
  //    the cutoff, so no client-side filtering needed.
  const items = await fetchAllUserbackFeedback(thirtyDaysAgo, limit, userbackProjectId);

  // 3. Optionally filter test submissions
  const realItems = filterTests
    ? items.filter((item) => !isTestSubmission(item.description))
    : items;
  const filtered = items.length - realItems.length;
  const isInitial = false;

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

  // 5. Map to issue format
  const mappedItems = realItems.map((item) => mapUserbackToIssue(item, projectId));

  // Build a lookup from userback_id -> original item (for media extraction)
  const itemsByUserbackId = new Map(realItems.map((item) => [String(item.id), item]));

  // 6. Dedup check
  const userbackIds = mappedItems
    .map((i) => i.userback_id)
    .filter((id): id is string => id !== null && id !== undefined);
  const existingMap = await getExistingUserbackIds(userbackIds, admin);

  // 7. Upsert (insert new, update existing)
  const result = await upsertUserbackIssues(mappedItems, existingMap, admin);

  // 8. Download and store media for NEW items
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
