import { Sparkles } from "lucide-react";
import { CHANGELOG } from "./changelog-data";

export const metadata = {
  title: "Wat is er nieuw — DevHub",
};

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-primary" aria-hidden />
        <h1 className="text-lg font-semibold">Wat is er nieuw</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Hoofdlijnen van wat er recent in DevHub is veranderd. Nieuwste bovenaan.
      </p>

      <div className="mt-8 space-y-8">
        {CHANGELOG.map((batch, idx) => (
          <section
            key={`${batch.date}-${idx}`}
            className="rounded-lg border border-border bg-card p-5"
          >
            <header className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold">{batch.headline}</h2>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {batch.date}
              </span>
            </header>
            <ul className="mt-3 space-y-2">
              {batch.items.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground/90">
                  <span
                    aria-hidden
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Mis je iets, of klopt iets niet meer? Werk{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.7rem]">
          apps/devhub/src/app/(app)/changelog/changelog-data.ts
        </code>{" "}
        bij — handmatig of via Claude.
      </p>
    </div>
  );
}
