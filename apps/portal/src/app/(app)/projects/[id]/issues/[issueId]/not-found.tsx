import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function IssueNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FileQuestion className="size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Issue niet gevonden</h2>
        <p className="text-sm text-muted-foreground">
          Deze melding bestaat niet of hoort niet bij dit project.
        </p>
      </div>
      <Link
        href=".."
        className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
      >
        Terug naar issues
      </Link>
    </div>
  );
}
