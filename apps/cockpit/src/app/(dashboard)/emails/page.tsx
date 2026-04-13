export const dynamic = "force-dynamic";

import { Mail } from "lucide-react";
import Link from "next/link";
import { createClient } from "@repo/database/supabase/server";
import {
  listEmails,
  listActiveGoogleAccountsSafe,
  countEmailsByDirection,
  type EmailDirection,
} from "@repo/database/queries/emails";
import { EmailList } from "@/components/emails/email-list";
import { SyncButton } from "@/components/emails/sync-button";
import { GoogleAccountStatus } from "@/components/emails/google-account-status";

function parseDirection(value: string | string[] | undefined): EmailDirection {
  return value === "outgoing" ? "outgoing" : "incoming";
}

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ direction?: string }>;
}) {
  const { direction: directionParam } = await searchParams;
  const direction = parseDirection(directionParam);

  const supabase = await createClient();
  const [accounts, emailData, counts] = await Promise.all([
    listActiveGoogleAccountsSafe(supabase),
    listEmails({ limit: 100, direction, client: supabase }),
    countEmailsByDirection({ client: supabase }),
  ]);

  const totalLabel =
    direction === "outgoing"
      ? `${counts.outgoing} verzonden email${counts.outgoing !== 1 ? "s" : ""}`
      : `${counts.incoming} ontvangen email${counts.incoming !== 1 ? "s" : ""}`;

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

      {/* Inbox / Sent tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <Link
          href="/emails"
          className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            direction === "incoming"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Ontvangen ({counts.incoming})
        </Link>
        <Link
          href="/emails?direction=outgoing"
          className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            direction === "outgoing"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Verzonden ({counts.outgoing})
        </Link>
      </div>

      {emailData.items.length === 0 && accounts.length > 0 ? (
        <div className="px-4 py-16 text-center">
          <Mail className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h2 className="mt-4 font-heading text-xl font-semibold">
            {direction === "outgoing" ? "Nog geen verzonden emails" : "Nog geen emails"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Klik op &quot;Sync emails&quot; om emails op te halen uit Google Workspace.
          </p>
        </div>
      ) : (
        <EmailList emails={emailData.items} direction={direction} />
      )}
    </div>
  );
}
