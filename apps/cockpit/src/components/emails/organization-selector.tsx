"use client";

import { useState, useTransition } from "react";
import { Building2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateEmailOrganizationAction } from "@/actions/email-links";

export function OrganizationSelector({
  emailId,
  currentOrganization,
  allOrganizations,
}: {
  emailId: string;
  currentOrganization: { id: string; name: string } | null;
  allOrganizations: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(organizationId: string) {
    setError(null);
    const orgId = organizationId === "" ? null : organizationId;

    startTransition(async () => {
      const result = await updateEmailOrganizationAction({
        emailId,
        organizationId: orgId,
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
        <Building2 className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Organisatie
        </span>
      </div>

      {!editing ? (
        <div className="flex items-center gap-2">
          {currentOrganization ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {currentOrganization.name}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Geen organisatie gekoppeld</span>
          )}
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setEditing(true)}
            className="text-muted-foreground"
          >
            {currentOrganization ? "Wijzig" : "Koppelen"}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            onChange={(e) => handleChange(e.target.value)}
            disabled={isPending}
            defaultValue={currentOrganization?.id ?? ""}
            className="h-7 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          >
            <option value="">Geen organisatie</option>
            {allOrganizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
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
