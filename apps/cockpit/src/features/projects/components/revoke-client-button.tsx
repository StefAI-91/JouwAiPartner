"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { revokeProjectClientAction } from "../actions/clients";

export function RevokeClientButton({
  profileId,
  projectId,
  email,
}: {
  profileId: string;
  projectId: string;
  email: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await revokeProjectClientAction({ profileId, projectId });
      if ("error" in res) {
        setError(res.error);
        setConfirming(false);
        return;
      }
      // Success: page revalidates server-side; UI ververst via revalidatePath.
    });
  }

  if (error) {
    return (
      <span className="text-xs text-red-600" title={error}>
        Mislukt
      </span>
    );
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          aria-label={`Bevestig intrekken van toegang voor ${email}`}
        >
          {isPending ? "..." : "Intrekken"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Annuleer
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
      aria-label={`Toegang intrekken voor ${email}`}
      title="Toegang intrekken"
    >
      <X className="size-4" />
    </button>
  );
}
