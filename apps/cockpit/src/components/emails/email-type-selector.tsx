"use client";

import { useState, useTransition } from "react";
import { Tag, X } from "lucide-react";
import { Button } from "@repo/ui/button";
import { updateEmailTypeAction } from "@/actions/email-links";

const EMAIL_TYPE_LABELS: Record<string, string> = {
  project_communication: "Projectcommunicatie",
  sales: "Sales",
  internal: "Intern",
  administrative: "Administratief",
  legal_finance: "Juridisch / Financieel",
  newsletter: "Nieuwsbrief",
  notification: "Notificatie",
  other: "Overig",
};

export function EmailTypeSelector({
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
    const emailType = value === "" ? null : value;

    startTransition(async () => {
      const result = await updateEmailTypeAction({
        emailId,
        emailType: emailType as Parameters<typeof updateEmailTypeAction>[0]["emailType"],
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
        <Tag className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Email type
        </span>
      </div>

      {!editing ? (
        <div className="flex items-center gap-2">
          {currentType ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {EMAIL_TYPE_LABELS[currentType] ?? currentType}
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
            {Object.entries(EMAIL_TYPE_LABELS).map(([value, label]) => (
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
