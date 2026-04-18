import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdmin } from "@repo/auth/access";
import { getAdminClient } from "../supabase/admin";

export interface PortalProjectWithDetails {
  id: string;
  name: string;
  status: string;
  organization: { id: string; name: string } | null;
  last_activity_at: string | null;
}

const PORTAL_PROJECT_DETAIL_COLS = `
  id, name, status,
  organization:organizations(id, name)
`;

/**
 * List portal projects voor een profile, inclusief organisatie en laatste
 * activiteit (afgeleid van issues.updated_at). Admins zien alle projecten
 * (preview-mode), clients alleen projecten met rij in `portal_project_access`.
 */
export async function listPortalProjectsWithDetails(
  profileId: string,
  client?: SupabaseClient,
): Promise<PortalProjectWithDetails[]> {
  if (!profileId) return [];

  const db = client ?? getAdminClient();

  let projects: {
    id: string;
    name: string;
    status: string | null;
    organization: { id: string; name: string } | null;
  }[] = [];

  if (await isAdmin(profileId, db)) {
    const { data, error } = await db
      .from("projects")
      .select(PORTAL_PROJECT_DETAIL_COLS)
      .order("name");
    if (error) {
      console.error("[listPortalProjectsWithDetails] Admin fetch error:", error.message);
      return [];
    }
    projects = (data ?? []) as unknown as typeof projects;
  } else {
    const { data, error } = await db
      .from("portal_project_access")
      .select(`projects(${PORTAL_PROJECT_DETAIL_COLS})`)
      .eq("profile_id", profileId);
    if (error) {
      console.error("[listPortalProjectsWithDetails] Client fetch error:", error.message);
      return [];
    }
    const rows = (data ?? []) as unknown as Array<{ projects: (typeof projects)[number] | null }>;
    projects = rows
      .map((row) => row.projects)
      .filter((p): p is (typeof projects)[number] => p !== null);
  }

  if (projects.length === 0) return [];

  const projectIds = projects.map((p) => p.id);

  const { data: issueRows } = await db
    .from("issues")
    .select("project_id, updated_at")
    .in("project_id", projectIds);

  const lastActivityMap = new Map<string, string>();
  if (issueRows) {
    for (const row of issueRows as { project_id: string; updated_at: string | null }[]) {
      if (!row.updated_at) continue;
      const existing = lastActivityMap.get(row.project_id);
      if (!existing || row.updated_at > existing) {
        lastActivityMap.set(row.project_id, row.updated_at);
      }
    }
  }

  return projects
    .map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status ?? "lead",
      organization: p.organization,
      last_activity_at: lastActivityMap.get(p.id) ?? null,
    }))
    .sort((a, b) => {
      const la = a.last_activity_at ?? "";
      const lb = b.last_activity_at ?? "";
      if (la !== lb) return lb.localeCompare(la);
      return a.name.localeCompare(b.name);
    });
}

export interface PortalProjectDashboard {
  id: string;
  name: string;
  status: string;
  organization: { id: string; name: string } | null;
}

/**
 * Fetch minimale project-gegevens voor het portal dashboard. Gebruikt door
 * zowel de dashboardpagina als het layout voor de subnav-header. RLS blokt
 * automatisch wanneer een client geen toegang heeft.
 */
export async function getPortalProjectDashboard(
  projectId: string,
  client?: SupabaseClient,
): Promise<PortalProjectDashboard | null> {
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("projects")
    .select(PORTAL_PROJECT_DETAIL_COLS)
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    console.error("[getPortalProjectDashboard]", error.message);
    return null;
  }
  if (!data) return null;

  const row = data as unknown as {
    id: string;
    name: string;
    status: string | null;
    organization: { id: string; name: string } | null;
  };

  return {
    id: row.id,
    name: row.name,
    status: row.status ?? "lead",
    organization: row.organization,
  };
}

export interface RecentPortalIssue {
  id: string;
  issue_number: number;
  title: string;
  status: string;
  updated_at: string;
  created_at: string;
}

/**
 * Laatste N issues voor een project, gesorteerd op updated_at desc. Wordt
 * getoond in de recente-activiteit lijst op het portal dashboard.
 */
export async function listRecentProjectIssues(
  projectId: string,
  limit: number,
  client?: SupabaseClient,
): Promise<RecentPortalIssue[]> {
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("issues")
    .select("id, issue_number, title, status, updated_at, created_at")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[listRecentProjectIssues]", error.message);
    return [];
  }

  return (data ?? []) as RecentPortalIssue[];
}

export interface PortalIssueCounts {
  ontvangen: number;
  ingepland: number;
  in_behandeling: number;
  afgerond: number;
}

/**
 * Tel issues per vertaalde portal-statusgroep. Interne statussen worden
 * gebundeld volgens de STATUS_MAP uit `docs/specs/portal-mvp.md`.
 */
export async function getProjectIssueCounts(
  projectId: string,
  client?: SupabaseClient,
): Promise<PortalIssueCounts> {
  const db = client ?? getAdminClient();

  const counts: PortalIssueCounts = {
    ontvangen: 0,
    ingepland: 0,
    in_behandeling: 0,
    afgerond: 0,
  };

  const { data, error } = await db.from("issues").select("status").eq("project_id", projectId);

  if (error) {
    console.error("[getProjectIssueCounts]", error.message);
    return counts;
  }

  for (const row of (data ?? []) as { status: string }[]) {
    switch (row.status) {
      case "triage":
        counts.ontvangen++;
        break;
      case "backlog":
      case "todo":
        counts.ingepland++;
        break;
      case "in_progress":
        counts.in_behandeling++;
        break;
      case "done":
      case "cancelled":
        counts.afgerond++;
        break;
    }
  }

  return counts;
}
