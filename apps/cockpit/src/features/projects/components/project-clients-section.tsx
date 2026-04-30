import { listPortalProjectClients } from "@repo/database/queries/portal/access";
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

export async function ProjectClientsSection({ projectId }: { projectId: string }) {
  // Service-role client gebruikt voor de auth.users join in
  // listPortalProjectClients. Sectie is admin-only — caller (project-detail
  // page) draait al onder admin guard.
  const clients = await listPortalProjectClients(projectId, getAdminClient());

  return (
    <section className="rounded-2xl border border-border/40 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Klanten met portaltoegang</h2>
          <span className="text-sm text-muted-foreground">{clients.length}</span>
        </div>
        <InviteClientDialog projectId={projectId} />
      </div>

      {clients.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          Nog geen klanten uitgenodigd. Nodig iemand uit om dit project via het portaal te kunnen
          volgen.
        </p>
      ) : (
        <ul className="divide-y divide-border/40">
          {clients.map((c) => (
            <li
              key={c.profile_id}
              className="flex items-center gap-4 py-3 text-sm first:pt-0 last:pb-0"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase text-muted-foreground">
                {initials(c.email, c.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{c.full_name || c.email}</div>
                {c.full_name && (
                  <div className="truncate text-xs text-muted-foreground">{c.email}</div>
                )}
              </div>
              <div className="hidden text-xs text-muted-foreground md:block">
                {formatLastSignIn(c.last_sign_in_at)}
              </div>
              <RevokeClientButton profileId={c.profile_id} projectId={projectId} email={c.email} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
