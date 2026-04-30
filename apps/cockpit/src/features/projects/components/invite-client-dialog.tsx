"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { Modal } from "@/components/shared/modal";
import { inviteProjectClientAction } from "../actions/clients";

export function InviteClientDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function reset() {
    setEmail("");
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
    startTransition(async () => {
      const res = await inviteProjectClientAction({ email: email.trim(), projectId });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setSuccess(
        res.data.invitedFresh
          ? `Uitnodiging verstuurd naar ${email.trim()}`
          : `${email.trim()} heeft nu toegang tot dit project`,
      );
      setEmail("");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <UserPlus className="size-3.5" />
        Klant uitnodigen
      </button>

      <Modal open={open} onClose={close} title="Klant uitnodigen voor portaal">
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
              placeholder="contact@klant.nl"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Bestaande klant? We voegen alleen toegang toe. Nieuwe gebruiker? We sturen een
              uitnodigings-mail met magic link.
            </p>
          </div>

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
              {isPending ? "Versturen..." : "Toegang geven"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
