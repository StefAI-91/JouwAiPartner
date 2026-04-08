export const dynamic = "force-dynamic";

import { Mail } from "lucide-react";
import { createClient } from "@repo/database/supabase/server";
import { listEmails, listActiveGoogleAccountsSafe } from "@repo/database/queries/emails";
import { EmailList } from "@/components/emails/email-list";
import { SyncButton } from "@/components/emails/sync-button";
import { GoogleAccountStatus } from "@/components/emails/google-account-status";

export default async function EmailsPage() {
  const supabase = await createClient();
  const [accounts, emailData] = await Promise.all([
    listActiveGoogleAccountsSafe(supabase),
    listEmails({ limit: 100, client: supabase }),
  ]);

  return (
    <div className="space-y-6 px-4 py-8 lg:px-10">
      <div className="flex items-center justify-between">
        <div>
          <h1>Emails</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {emailData.count} email{emailData.count !== 1 ? "s" : ""} gesynchroniseerd
          </p>
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

      {emailData.items.length === 0 && accounts.length > 0 ? (
        <div className="px-4 py-16 text-center">
          <Mail className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h2 className="mt-4 font-heading text-xl font-semibold">Nog geen emails</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Klik op &quot;Sync emails&quot; om emails op te halen uit Google Workspace.
          </p>
        </div>
      ) : (
        <EmailList emails={emailData.items} />
      )}
    </div>
  );
}
