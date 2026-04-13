export const dynamic = "force-dynamic";

import { listTeamMembers, countAdmins } from "@repo/database/queries/team";
import { listProjects } from "@repo/database/queries/projects";
import { getAdminClient } from "@repo/database/supabase/admin";
import { TeamList } from "./team-list";
import { InviteDialog } from "./invite-dialog";

interface MemberWithAuth {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "member";
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  project_ids: string[];
}

export default async function TeamPage() {
  const admin = getAdminClient();
  const [members, projects, adminCount, authList, accessRows] = await Promise.all([
    listTeamMembers(admin),
    listProjects(admin),
    countAdmins(admin),
    admin.auth.admin.listUsers(),
    admin.from("devhub_project_access").select("profile_id, project_id"),
  ]);

  const authById = new Map((authList.data?.users ?? []).map((u) => [u.id, u]));
  const accessByUser = new Map<string, string[]>();
  for (const row of accessRows.data ?? []) {
    const list = accessByUser.get(row.profile_id) ?? [];
    list.push(row.project_id);
    accessByUser.set(row.profile_id, list);
  }

  const enriched: MemberWithAuth[] = members.map((m) => {
    const authUser = authById.get(m.id);
    return {
      ...m,
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
      banned_until: (authUser as { banned_until?: string } | undefined)?.banned_until ?? null,
      project_ids: accessByUser.get(m.id) ?? [],
    };
  });

  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-6 px-4 py-8 lg:px-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {enriched.length} {enriched.length === 1 ? "gebruiker" : "gebruikers"} — beheer rol en
            projectentoegang.
          </p>
        </div>
        <InviteDialog projects={projectOptions} />
      </div>

      <TeamList members={enriched} projects={projectOptions} adminCount={adminCount} />
    </div>
  );
}
