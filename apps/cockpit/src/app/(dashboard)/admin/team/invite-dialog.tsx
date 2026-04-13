"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/shared/modal";
import { inviteUserAction } from "@/actions/team";
import type { ProjectOption } from "./team-list";

export function InviteDialog({ projects }: { projects: ProjectOption[] }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function reset() {
    setEmail("");
    setRole("member");
    setProjectIds([]);
    setError(null);
    setSuccess(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function toggleProject(id: string) {
    setProjectIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleSubmit() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await inviteUserAction({
        email: email.trim(),
        role,
        projectIds: role === "admin" ? [] : projectIds,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setSuccess(`Uitnodiging verstuurd naar ${email.trim()}`);
      setEmail("");
      setProjectIds([]);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Plus className="size-4" />
        Uitnodigen
      </button>

      <Modal open={open} onClose={close} title="Teamlid uitnodigen">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {success && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="naam@bedrijf.nl"
            />
          </div>

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
              onClick={close}
              disabled={isPending}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Sluiten
            </button>
            <button
              type="submit"
              disabled={isPending || !email.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "Versturen..." : "Uitnodiging versturen"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
