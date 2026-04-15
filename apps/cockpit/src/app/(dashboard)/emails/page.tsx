export const dynamic = "force-dynamic";

import { Mail } from "lucide-react";
import Link from "next/link";
import { createClient } from "@repo/database/supabase/server";
import {
  listEmails,
  listActiveGoogleAccountsSafe,
  countEmailsByDirection,
  countEmailsByFilterStatus,
  type EmailDirection,
  type EmailFilterStatus,
} from "@repo/database/queries/emails";
import { EmailList } from "@/components/emails/email-list";
import { SyncButton } from "@/components/emails/sync-button";
import { GoogleAccountStatus } from "@/components/emails/google-account-status";

function parseDirection(value: string | string[] | undefined): EmailDirection {
  return value === "outgoing" ? "outgoing" : "incoming";
}

function parseFilterStatus(value: string | string[] | undefined): EmailFilterStatus {
  return value === "filtered" ? "filtered" : "kept";
}

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ direction?: string; filter?: string }>;
}) {
  const { direction: directionParam, filter: filterParam } = await searchParams;
  const direction = parseDirection(directionParam);
  const filterStatus = parseFilterStatus(filterParam);

  const supabase = await createClient();
  const [accounts, emailData, directionCounts, filterCounts] = await Promise.all([
    listActiveGoogleAccountsSafe(supabase),
    listEmails({ limit: 100, direction, filterStatus, client: supabase }),
    countEmailsByDirection({ client: supabase }),
    countEmailsByFilterStatus({ direction, client: supabase }),
  ]);

  const totalLabel =
    filterStatus === "filtered"
      ? `${filterCounts.filtered} gefilterd${direction === "outgoing" ? " (verzonden)" : ""}`
      : direction === "outgoing"
        ? `${directionCounts.outgoing} verzonden email${directionCounts.outgoing !== 1 ? "s" : ""}`
        : `${directionCounts.incoming} ontvangen email${directionCounts.incoming !== 1 ? "s" : ""}`;

  const keepFilterQS = filterStatus === "filtered" ? "&filter=filtered" : "";

  return (
    <div className="space-y-6 px-4 py-8 lg:px-10">
      <div className="flex items-center justify-between">
        <div>
          <h1>Emails</h1>
          <p className="mt-1 text-sm text-muted-foreground">{totalLabel}</p>
        </div>
        {accounts.length > 0 && <SyncButton />}
      </div>

      <GoogleAccountStatus
        accounts={accounts.map((a) => ({
          id: a.id,
          email: a.email,
          last_sync_at: a.last_sync_at,
        }))}
      />

      {/* Inbox / Sent tabs (direction) */}
      <div className="flex items-center gap-1 border-b border-border">
        <Link
          href={`/emails${filterStatus === "filtered" ? "?filter=filtered" : ""}`}
          className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            direction === "incoming"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Ontvangen ({directionCounts.incoming})
        </Link>
        <Link
          href={`/emails?direction=outgoing${keepFilterQS}`}
          className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            direction === "outgoing"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Verzonden ({directionCounts.outgoing})
        </Link>
      </div>

      {/* Filter status sub-tabs (Inbox vs Gefilterd) */}
      <div className="flex items-center gap-1">
        <Link
          href={`/emails${direction === "outgoing" ? "?direction=outgoing" : ""}`}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            filterStatus === "kept"
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground hover:bg-muted/60"
          }`}
        >
          Inbox ({filterCounts.kept})
        </Link>
        <Link
          href={`/emails?${direction === "outgoing" ? "direction=outgoing&" : ""}filter=filtered`}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            filterStatus === "filtered"
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground hover:bg-muted/60"
          }`}
        >
          Gefilterd ({filterCounts.filtered})
        </Link>
      </div>

      {filterStatus === "filtered" && emailData.items.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Deze emails zijn door de AI-gatekeeper buiten de hoofd-inbox gehouden (newsletters,
          notificaties, cold outreach of te lage relevantie). Open een email om hem alsnog door te
          laten.
        </div>
      )}

      {emailData.items.length === 0 && accounts.length > 0 ? (
        <div className="px-4 py-16 text-center">
          <Mail className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h2 className="mt-4 font-heading text-xl font-semibold">
            {filterStatus === "filtered"
              ? "Geen gefilterde emails"
              : direction === "outgoing"
                ? "Nog geen verzonden emails"
                : "Nog geen emails"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {filterStatus === "filtered"
              ? "De AI-gatekeeper heeft niets uit je inbox gefilterd."
              : 'Klik op "Sync emails" om emails op te halen uit Google Workspace.'}
          </p>
        </div>
      ) : (
        <EmailList emails={emailData.items} direction={direction} />
      )}
    </div>
  );
}
