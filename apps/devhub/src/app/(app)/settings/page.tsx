import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";

export default function SettingsPage() {
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
      </div>
    </div>
  );
}
