import type { ReactNode } from "react";
import { SECTIONS } from "./mock-data";

/**
 * Outer chrome of the design preview: masthead, sticky TOC,
 * and content slot. Server component.
 */
export function PreviewShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Masthead */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur"
        style={{
          backgroundColor: "color-mix(in oklch, var(--paper) 88%, transparent)",
          borderColor: "var(--rule-hairline)",
        }}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-6 py-3 md:px-10">
          <div className="flex items-baseline gap-3">
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{ backgroundColor: "var(--accent-brand)" }}
            />
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--ink-muted)]">
              Design preview · Portal roadmap
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
              Mock data — geen DB-verbinding
            </span>
            <span
              aria-hidden
              className="h-3 w-px"
              style={{ backgroundColor: "var(--rule-hairline)" }}
            />
            <a
              href="/login"
              className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--ink-muted)] hover:text-[var(--accent-brand-deep)] underline-offset-4 hover:underline"
            >
              ← Naar productie-portal
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] gap-12 px-6 py-12 md:px-10 md:py-20">
        {/* Sticky TOC — desktop only */}
        <aside className="hidden lg:block w-[200px] shrink-0">
          <nav className="sticky top-24 space-y-1" aria-label="Inhoudsopgave preview">
            <p className="section-marker mb-4">Inhoud</p>
            <ol className="space-y-2.5">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="group flex items-baseline gap-2.5 text-[13px] leading-snug text-[var(--ink-soft)] hover:text-[var(--ink)]"
                  >
                    <span className="font-mono num-tabular text-[10px] tabular-nums uppercase tracking-[0.14em] text-[var(--ink-faint)] group-hover:text-[var(--accent-brand-deep)]">
                      {s.marker.replace("§ ", "")}
                    </span>
                    <span>{s.title}</span>
                  </a>
                </li>
              ))}
            </ol>
            <div className="mt-6 pt-4 border-t" style={{ borderColor: "var(--rule-hairline)" }}>
              <p className="text-[11px] leading-relaxed text-[var(--ink-faint)]">
                Klik op een sectie om door te springen. Sticky-nav bovenaan blijft zichtbaar.
              </p>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-32">{children}</main>
      </div>

      {/* Footer */}
      <footer
        className="border-t mt-20 px-6 py-10 md:px-10"
        style={{ borderColor: "var(--rule-hairline)" }}
      >
        <div className="mx-auto max-w-[1400px] flex flex-wrap items-baseline justify-between gap-4">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--ink-muted)]">
            JAIP · Portal Roadmap Design Preview
          </p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
            Niet voor productie · Verwijder na sprint-implementatie
          </p>
        </div>
      </footer>
    </div>
  );
}
