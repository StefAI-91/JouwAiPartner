"use client";

import { Mail, ExternalLink } from "lucide-react";
import { Button } from "@repo/ui/button";

interface GoogleAccountStatusProps {
  accounts: { id: string; email: string; last_sync_at: string | null }[];
}

export function GoogleAccountStatus({ accounts }: GoogleAccountStatusProps) {
  if (accounts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-white p-4">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Geen Google account gekoppeld</p>
            <p className="text-xs text-muted-foreground">
              Koppel een Google Workspace account om emails te synchroniseren.
            </p>
          </div>
          <Button size="sm" nativeButton={false} render={<a href="/api/email/auth" />}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Koppelen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex flex-wrap items-center gap-4">
        {accounts.map((account) => (
          <div key={account.id} className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">{account.email}</span>
            {account.last_sync_at && (
              <span className="text-[11px] text-muted-foreground">
                Laatst gesynchroniseerd:{" "}
                {new Date(account.last_sync_at).toLocaleString("nl-NL", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<a href="/api/email/auth" />}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Account toevoegen
        </Button>
      </div>
    </div>
  );
}
