import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@repo/database/supabase/server";
import { getAdminClient } from "@repo/database/supabase/admin";
import { getProjectByUserbackProjectId } from "@repo/database/queries/projects";
import { executeSyncPipeline } from "@repo/database/integrations/userback-sync";
import { isAdmin } from "@repo/auth/access";
import { classifyIssueBackground } from "@/features/issues/actions/classify";

export const maxDuration = 300;

// WG-REQ-077: bij 5xx geven we een status-page link mee zodat de caller
// weet of het aan ons ligt. Echte status-page volgt later — placeholder URL
// is genoeg voor V0.
const STATUS_PAGE_URL = "https://status.jouw-ai-partner.nl";

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
 * Syncs up to 100 items per cron run, then runs AI classify on new ones.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getAdminClient();

    // Get project with userback_project_id = '127499'
    const project = await getProjectByUserbackProjectId("127499", admin);

    if (!project) {
      return NextResponse.json(
        { error: "No project with userback_project_id 127499" },
        { status: 404 },
      );
    }

    const result = await executeSyncPipeline({
      projectId: project.id,
      limit: 100,
      filterTests: true,
      admin,
    });

    let classified = 0;
    for (const id of result.importedIds) {
      try {
        await classifyIssueBackground(id);
        classified++;
      } catch (err) {
        console.error(`[cron] classify failed for ${id}:`, err);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return NextResponse.json({
      imported: result.imported,
      updated: result.updated,
      skipped: result.skipped,
      mediaStored: result.mediaStored,
      filtered: result.filtered,
      total: result.total,
      classified,
      isInitial: result.isInitial,
    });
  } catch (err) {
    console.error("[GET /api/ingest/userback]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Sync failed",
        status_page: STATUS_PAGE_URL,
      },
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

  if (!(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
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
    const admin = getAdminClient();

    const result = await executeSyncPipeline({
      projectId: parsed.data.projectId,
      limit: parsed.data.limit,
      filterTests: true,
      admin,
    });

    return NextResponse.json({
      imported: result.imported,
      updated: result.updated,
      skipped: result.skipped,
      mediaStored: result.mediaStored,
      filtered: result.filtered,
      total: result.total,
      isInitial: result.isInitial,
    });
  } catch (err) {
    console.error("[POST /api/ingest/userback]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Sync failed",
        status_page: STATUS_PAGE_URL,
      },
      { status: 500 },
    );
  }
}
