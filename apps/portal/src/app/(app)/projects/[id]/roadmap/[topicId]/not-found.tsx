import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function TopicNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div
        className="flex size-12 items-center justify-center rounded-full"
        style={{
          backgroundColor: "var(--paper-deep)",
          color: "var(--ink-muted)",
        }}
      >
        <FileQuestion className="size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-[var(--ink)]">Onderwerp niet gevonden</h2>
        <p className="text-sm text-[var(--ink-muted)]">
          Dit onderwerp bestaat niet of hoort niet bij dit project.
        </p>
      </div>
      <Link
        href=".."
        className="inline-flex h-8 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-[var(--paper-deep)]"
        style={{ borderColor: "var(--rule-hairline)" }}
      >
        Terug naar roadmap
      </Link>
    </div>
  );
}
