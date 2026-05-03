"use client";

import { useState, useTransition } from "react";
import { UserCircle, X } from "lucide-react";
import { Button } from "@repo/ui/button";
import { updateEmailPartyTypeAction } from "@/features/emails/actions";

const PARTY_TYPE_LABELS: Record<string, string> = {
  internal: "Intern",
  client: "Klant",
  accountant: "Boekhouder",
  tax_advisor: "Fiscalist",
  lawyer: "Advocaat",
  partner: "Partner",
  other: "Overig",
};

export function EmailPartyTypeSelector({
  emailId,
  currentType,
}: {
  emailId: string;
  currentType: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(value: string) {
    setError(null);
    const partyType = value === "" ? null : value;

    startTransition(async () => {
      const result = await updateEmailPartyTypeAction({
        emailId,
        partyType: partyType as Parameters<typeof updateEmailPartyTypeAction>[0]["partyType"],
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
          Persoon type
        </span>
      </div>

      {!editing ? (
        <div className="flex items-center gap-2">
          {currentType ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {PARTY_TYPE_LABELS[currentType] ?? currentType}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Niet ingesteld</span>
          )}
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setEditing(true)}
            className="text-muted-foreground"
          >
            {currentType ? "Wijzig" : "Instellen"}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            onChange={(e) => handleChange(e.target.value)}
            disabled={isPending}
            defaultValue={currentType ?? ""}
            className="h-7 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          >
            <option value="">Geen type</option>
            {Object.entries(PARTY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
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
