"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, MailPlus, Pencil, UserX } from "lucide-react";
import { Badge } from "@repo/ui/badge";
import { inviteUserAction, deactivateUserAction } from "@/actions/team";
import { UserEditDialog } from "./user-edit-dialog";
import type { TeamMemberView, ProjectOption } from "./team-list";

function formatLastLogin(iso: string | null): string {
  if (!iso) return "Nog nooit";
  const d = new Date(iso);
  const now = Date.now();
  const diffDays = Math.floor((now - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Vandaag";
  if (diffDays === 1) return "Gisteren";
  if (diffDays < 7) return `${diffDays}d geleden`;
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export function UserRow({
  member,
  projects,
  isLastAdmin,
}: {
  member: TeamMemberView;
  projects: ProjectOption[];
  isLastAdmin: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const banned = Boolean(
    member.banned_until && new Date(member.banned_until).getTime() > Date.now(),
  );
  const neverLoggedIn = !member.last_sign_in_at;
  const projectCount = member.role === "admin" ? projects.length : member.project_ids.length;

  function handleResendInvite() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await inviteUserAction({
        email: member.email,
        role: member.role,
        projectIds: member.role === "member" ? member.project_ids : [],
        resendInvite: true,
      });
      if ("error" in res) setError(res.error);
      else setNotice("Invite opnieuw verstuurd");
      setMenuOpen(false);
    });
  }

  function handleDeactivate() {
    if (!confirm(`Weet je zeker dat je ${member.email} wilt deactiveren?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deactivateUserAction({ userId: member.id });
      if ("error" in res) setError(res.error);
      else setNotice("Gedeactiveerd");
      setMenuOpen(false);
    });
  }

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_120px_140px_120px_40px] items-center gap-4 px-5 py-3 text-sm">
        <div className="min-w-0">
          <div className="truncate font-medium">{member.full_name || member.email}</div>
          <div className="truncate text-xs text-muted-foreground">
            {member.email || <span className="italic">Geen email</span>}
            {banned && <span className="ml-2 text-red-600">· gedeactiveerd</span>}
          </div>
          {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
          {notice && <div className="mt-1 text-xs text-emerald-600">{notice}</div>}
        </div>
        <div>
          <Badge variant={member.role === "admin" ? "default" : "outline"} className="text-[11px]">
            {member.role}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {formatLastLogin(member.last_sign_in_at)}
        </div>
        <div className="text-xs text-muted-foreground">
          {member.role === "admin" ? "alle" : `${projectCount}`}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted"
            aria-label="Acties"
            disabled={isPending}
          >
            <MoreHorizontal className="size-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-9 z-30 w-56 overflow-hidden rounded-lg border bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setEditOpen(true);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <Pencil className="size-4" />
                  Bewerken
                </button>
                {neverLoggedIn && (
                  <button
                    type="button"
                    onClick={handleResendInvite}
                    disabled={isPending}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                  >
                    <MailPlus className="size-4" />
                    Opnieuw uitnodigen
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={isPending || isLastAdmin || banned}
                  title={
                    isLastAdmin
                      ? "Er moet minimaal één admin overblijven"
                      : banned
                        ? "Al gedeactiveerd"
                        : undefined
                  }
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserX className="size-4" />
                  Deactiveren
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <UserEditDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        member={member}
        projects={projects}
        isLastAdmin={isLastAdmin}
      />
    </>
  );
}
