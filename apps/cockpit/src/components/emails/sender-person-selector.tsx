"use client";

import { useState, useTransition } from "react";
import { UserCircle, X } from "lucide-react";
import { Button } from "@repo/ui/button";
import { updateEmailSenderPersonAction } from "@/features/emails/actions";

export function SenderPersonSelector({
  emailId,
  currentPerson,
  allPeople,
}: {
  emailId: string;
  currentPerson: { id: string; name: string; role: string | null } | null;
  allPeople: { id: string; name: string; role: string | null }[];
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(personId: string) {
    setError(null);
    const id = personId === "" ? null : personId;

    startTransition(async () => {
      const result = await updateEmailSenderPersonAction({
        emailId,
        senderPersonId: id,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setEditing(false);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <UserCircle className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Afzender (persoon)
        </span>
      </div>

      {!editing ? (
        <div className="flex items-center gap-2">
          {currentPerson ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {currentPerson.name}
              {currentPerson.role && (
                <span className="text-muted-foreground">({currentPerson.role})</span>
              )}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Geen persoon gekoppeld</span>
          )}
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setEditing(true)}
            className="text-muted-foreground"
          >
            {currentPerson ? "Wijzig" : "Koppelen"}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            onChange={(e) => handleChange(e.target.value)}
            disabled={isPending}
            defaultValue={currentPerson?.id ?? ""}
            className="h-7 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          >
            <option value="">Geen persoon</option>
            {allPeople.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
                {person.role ? ` (${person.role})` : ""}
              </option>
            ))}
          </select>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              setError(null);
              setEditing(false);
            }}
            disabled={isPending}
            aria-label="Annuleren"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
