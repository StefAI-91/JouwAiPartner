"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/shared/modal";
import { updateUserAccessAction } from "@/actions/team";
import type { TeamMemberView, ProjectOption } from "./team-list";

export function UserEditDialog({
  open,
  onClose,
  member,
  projects,
  isLastAdmin,
}: {
  open: boolean;
  onClose: () => void;
  member: TeamMemberView;
  projects: ProjectOption[];
  isLastAdmin: boolean;
}) {
  const [role, setRole] = useState<"admin" | "member">(member.role);
  const [projectIds, setProjectIds] = useState<string[]>(member.project_ids);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggleProject(id: string) {
    setProjectIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await updateUserAccessAction({
        userId: member.id,
        role,
        projectIds: role === "admin" ? [] : projectIds,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      onClose();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={`${member.full_name || member.email} bewerken`}>
      <div className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div>
          <label className="mb-1 block text-sm font-medium">Rol</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRole("member")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                role === "member"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-input hover:bg-muted"
              }`}
            >
              Member
            </button>
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                role === "admin"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-input hover:bg-muted"
              }`}
            >
              Admin
            </button>
          </div>
          {isLastAdmin && role === "member" && (
            <p className="mt-1 text-xs text-red-600">
              Er moet minimaal één admin overblijven. Promoveer eerst een ander teamlid.
            </p>
          )}
        </div>

        {role === "member" && (
          <div>
            <label className="mb-1 block text-sm font-medium">Projecten</label>
            {projects.length === 0 ? (
              <p className="text-xs text-muted-foreground">Geen projecten beschikbaar.</p>
            ) : (
              <div className="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-input p-2">
                {projects.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={projectIds.includes(p.id)}
                      onChange={() => toggleProject(p.id)}
                      className="size-4"
                    />
                    <span>{p.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {role === "admin" && (
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Admins hebben impliciet toegang tot alle projecten.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || (isLastAdmin && role === "member")}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Opslaan..." : "Opslaan"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
