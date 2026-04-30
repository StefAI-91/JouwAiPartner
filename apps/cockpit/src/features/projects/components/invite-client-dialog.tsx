"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { Modal } from "@/components/shared/modal";
import { grantMemberPortalAccessAction, inviteProjectClientAction } from "../actions/clients";

export interface TeamCandidate {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "member";
}

type Tab = "client" | "member";

export function InviteClientDialog({
  projectId,
  teamCandidates,
}: {
  projectId: string;
  teamCandidates: TeamCandidate[];
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("client");
  const [email, setEmail] = useState("");
  const [memberId, setMemberId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function reset() {
    setEmail("");
    setMemberId("");
    setError(null);
    setSuccess(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function handleSubmit() {
    setError(null);
    setSuccess(null);

    if (tab === "client") {
      const trimmed = email.trim();
      startTransition(async () => {
        const res = await inviteProjectClientAction({ email: trimmed, projectId });
        if ("error" in res) {
          setError(res.error);
          return;
        }
        setSuccess(
          res.data.invitedFresh
            ? `Uitnodiging verstuurd naar ${trimmed}`
            : `${trimmed} heeft nu toegang tot dit project`,
        );
        setEmail("");
      });
      return;
    }

    if (!memberId) {
      setError("Kies een teamlid");
      return;
    }
    const candidate = teamCandidates.find((c) => c.id === memberId);
    startTransition(async () => {
      const res = await grantMemberPortalAccessAction({ profileId: memberId, projectId });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setSuccess(
        candidate
          ? `${candidate.full_name || candidate.email} is toegevoegd aan portaltoegang`
          : "Teamlid toegevoegd aan portaltoegang",
      );
      setMemberId("");
    });
  }

  const submitDisabled =
    isPending || (tab === "client" ? !email.trim() : !memberId || teamCandidates.length === 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <UserPlus className="size-3.5" />
        Toegang geven
      </button>

      <Modal open={open} onClose={close} title="Toegang geven tot portaal">
        <div className="space-y-4">
          <div className="flex gap-1 rounded-lg bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => {
                setTab("client");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === "client"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Klant uitnodigen
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("member");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === "member"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Teamlid toevoegen
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="space-y-4"
          >
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}
            {success && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {success}
              </p>
            )}

            {tab === "client" ? (
              <div>
                <label className="mb-1 block text-sm font-medium">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="contact@klant.nl"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Bestaande gebruiker? We voegen alleen toegang toe. Nieuwe gebruiker? We sturen een
                  uitnodigings-mail met magic link.
                </p>
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium">Teamlid</label>
                {teamCandidates.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/60 px-3 py-3 text-xs text-muted-foreground">
                    Alle teamleden hebben al toegang tot dit project.
                  </p>
                ) : (
                  <select
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Kies een teamlid…</option>
                    {teamCandidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name ? `${c.full_name} — ${c.email}` : c.email}
                      </option>
                    ))}
                  </select>
                )}
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Teamlid behoudt zijn interne toegang en kan voortaan ook vanuit het portaal
                  meekijken met de klant.
                </p>
              </div>
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
                disabled={submitDisabled}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? "Bezig..." : "Toegang geven"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
