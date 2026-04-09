import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@repo/database/supabase/server";
import { getAdminClient } from "@repo/database/supabase/admin";
import {
  getUserbackSyncCursor,
  getExistingUserbackIds,
  countUserbackIssues,
} from "@repo/database/queries/issues";
import { upsertUserbackIssues } from "@repo/database/mutations/issues";
import {
  fetchAllUserbackFeedback,
  mapUserbackToIssue,
  extractMediaUrls,
} from "@repo/database/integrations/userback";
import { storeIssueMedia } from "@repo/database/mutations/issue-attachments";

export const maxDuration = 60;

const postSchema = z.object({
  projectId: z.string().uuid(),
  limit: z.number().int().min(1).max(1000).default(10),
});

function verifyCronAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
  return !!(process.env.CRON_SECRET && authHeader === expectedToken);
}

/**
 * GET — Vercel Cron trigger (auth via CRON_SECRET).
 * Syncs max 50 items per cron run.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getAdminClient();
    const cursor = await getUserbackSyncCursor(admin);
    const items = await fetchAllUserbackFeedback(cursor, 50);

    if (items.length === 0) {
      return NextResponse.json({ synced: 0, total: 0, isInitial: cursor === null });
    }

    // Get project with userback_project_id = '127499'
    const { data: project } = await admin
      .from("projects")
      .select("id")
      .eq("userback_project_id", "127499")
      .single();

    if (!project) {
      return NextResponse.json(
        { error: "No project with userback_project_id 127499" },
        { status: 404 },
      );
    }

    const mappedItems = items.map((item) => mapUserbackToIssue(item, project.id));
    const itemsByUserbackId = new Map(items.map((item) => [String(item.id), item]));
    const userbackIds = mappedItems
      .map((i) => i.userback_id)
      .filter((id): id is string => id !== null && id !== undefined);
    const existingMap = await getExistingUserbackIds(userbackIds, admin);
    const result = await upsertUserbackIssues(mappedItems, existingMap, admin);

    // Download and store media for new items
    let mediaStored = 0;
    for (const [userbackId, issueId] of result.importedMap) {
      const originalItem = itemsByUserbackId.get(userbackId);
      if (!originalItem) continue;
      const mediaUrls = extractMediaUrls(originalItem);
      if (mediaUrls.length === 0) continue;
      try {
        mediaStored += await storeIssueMedia(issueId, userbackId, mediaUrls, admin);
      } catch (err) {
        console.error(`[cron] Media storage failed for ${issueId}:`, err);
      }
    }

    return NextResponse.json({
      imported: result.imported.length,
      updated: result.updated,
      skipped: result.skipped,
      mediaStored,
      total: items.length,
      isInitial: cursor === null,
    });
  } catch (err) {
    console.error("[GET /api/ingest/userback]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 },
    );
  }
}

/**
 * POST — Manual trigger from Settings/Import UI (auth via Supabase session).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const { projectId, limit } = parsed.data;
    const admin = getAdminClient();

    const cursor = await getUserbackSyncCursor(admin);
    const items = await fetchAllUserbackFeedback(cursor, limit);

    if (items.length === 0) {
      return NextResponse.json({
        imported: 0,
        updated: 0,
        skipped: 0,
        total: 0,
        isInitial: cursor === null,
      });
    }

    const mappedItems = items.map((item) => mapUserbackToIssue(item, projectId));
    const itemsByUserbackId = new Map(items.map((item) => [String(item.id), item]));
    const userbackIds = mappedItems
      .map((i) => i.userback_id)
      .filter((id): id is string => id !== null && id !== undefined);
    const existingMap = await getExistingUserbackIds(userbackIds, admin);
    const result = await upsertUserbackIssues(mappedItems, existingMap, admin);

    // Download and store media for new items
    let mediaStored = 0;
    for (const [userbackId, issueId] of result.importedMap) {
      const originalItem = itemsByUserbackId.get(userbackId);
      if (!originalItem) continue;
      const mediaUrls = extractMediaUrls(originalItem);
      if (mediaUrls.length === 0) continue;
      try {
        mediaStored += await storeIssueMedia(issueId, userbackId, mediaUrls, admin);
      } catch (err) {
        console.error(`[POST] Media storage failed for ${issueId}:`, err);
      }
    }

    return NextResponse.json({
      imported: result.imported.length,
      updated: result.updated,
      skipped: result.skipped,
      mediaStored,
      total: items.length,
      isInitial: cursor === null,
    });
  } catch (err) {
    console.error("[POST /api/ingest/userback]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 },
    );
  }
}
