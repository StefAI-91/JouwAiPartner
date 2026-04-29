import Link from "next/link";
import { ArrowRight, Download, Globe, MessageSquare } from "lucide-react";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";

export default async function SettingsPage() {
  const user = await getAuthenticatedUser();
  const admin = user ? await isAdmin(user.id) : false;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-lg font-semibold">Instellingen</h1>
      <p className="mt-1 text-sm text-muted-foreground">Beheer integraties en importeer data.</p>

      <div className="mt-6 space-y-3">
        <Link
          href="/settings/import"
          className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <Download className="size-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Import</p>
              <p className="text-xs text-muted-foreground">Userback feedback importeren</p>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </Link>

        {admin && (
          <>
            <Link
              href="/settings/widget"
              className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <Globe className="size-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Widget-domeinen</p>
                  <p className="text-xs text-muted-foreground">
                    Whitelist welke sites feedback mogen sturen
                  </p>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>

            <Link
              href="/settings/slack"
              className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="size-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Slack notificaties</p>
                  <p className="text-xs text-muted-foreground">Meldingen bij urgente bugs</p>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
