import {
  listPortalProjectAssignees,
  type PortalAssigneeRole,
} from "@repo/database/queries/portal/access";
import { listTeamMembers } from "@repo/database/queries/team";
import { getAdminClient } from "@repo/database/supabase/admin";
import { Users } from "lucide-react";
import { InviteClientDialog } from "./invite-client-dialog";
import { RevokeClientButton } from "./revoke-client-button";

function formatLastSignIn(iso: string | null): string {
  if (!iso) return "Nog niet ingelogd";
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Vandaag";
  if (diffDays === 1) return "Gisteren";
  if (diffDays < 7) return `${diffDays}d geleden`;
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function initials(email: string, fullName: string | null): string {
  if (fullName?.trim()) {
    return fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("");
  }
  return email.slice(0, 2).toUpperCase();
}

const ROLE_BADGE: Record<PortalAssigneeRole, { label: string; className: string }> = {
  client: { label: "Klant", className: "bg-primary/10 text-primary" },
  member: { label: "Team", className: "bg-emerald-100 text-emerald-700" },
  admin: { label: "Admin", className: "bg-amber-100 text-amber-700" },
};

export async function ProjectClientsSection({ projectId }: { projectId: string }) {
  // Service-role client gebruikt voor de auth.users join in
  // listPortalProjectAssignees. Sectie is admin-only — caller (project-detail
  // page) draait al onder admin guard.
  const admin = getAdminClient();
  const [assignees, teamMembers] = await Promise.all([
    listPortalProjectAssignees(projectId, admin),
    listTeamMembers(admin),
  ]);

  // Filter de team-members die nog geen portal-access voor dit project hebben.
  const assignedIds = new Set(assignees.map((a) => a.profile_id));
  const teamCandidates = teamMembers
    .filter((m) => !assignedIds.has(m.id))
    .map((m) => ({ id: m.id, email: m.email, full_name: m.full_name, role: m.role }));

  return (
    <section className="rounded-2xl border border-border/40 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Portaltoegang</h2>
          <span className="text-sm text-muted-foreground">{assignees.length}</span>
        </div>
        <InviteClientDialog projectId={projectId} teamCandidates={teamCandidates} />
      </div>

      {assignees.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          Nog niemand uitgenodigd. Nodig een klant uit of geef een teamlid toegang.
        </p>
      ) : (
        <ul className="divide-y divide-border/40">
          {assignees.map((a) => {
            const badge = ROLE_BADGE[a.role] ?? ROLE_BADGE.client;
            return (
              <li
                key={a.profile_id}
                className="flex items-center gap-4 py-3 text-sm first:pt-0 last:pb-0"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase text-muted-foreground">
                  {initials(a.email, a.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{a.full_name || a.email}</span>
                    <span
                      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  {a.full_name && (
                    <div className="truncate text-xs text-muted-foreground">{a.email}</div>
                  )}
                </div>
                <div className="hidden text-xs text-muted-foreground md:block">
                  {formatLastSignIn(a.last_sign_in_at)}
                </div>
                <RevokeClientButton
                  profileId={a.profile_id}
                  projectId={projectId}
                  email={a.email}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
