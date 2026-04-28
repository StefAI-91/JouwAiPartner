import { LogOut, ChevronRight } from "lucide-react";
import { PreviewMobileNav } from "./preview-mobile-nav";

/**
 * Preview-topbar — mimicked van apps/portal/src/components/layout/top-bar.tsx,
 * maar zonder echte signOut-action (preview heeft geen auth-context).
 *
 * Op mobiel staat de hamburger-trigger links die de PreviewMobileNav drawer opent.
 */
export function PreviewTopbar() {
  return (
    <header
      className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 md:px-6"
      style={{
        backgroundColor: "color-mix(in oklch, var(--paper) 92%, transparent)",
        borderColor: "var(--rule-hairline)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      {/* Left cluster: mobile hamburger + breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <PreviewMobileNav />

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 min-w-0">
          <a
            href="#"
            className="hidden md:inline font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-muted)] hover:text-[var(--ink-soft)]"
          >
            Projecten
          </a>
          <ChevronRight className="hidden md:inline size-3 text-[var(--ink-faint)]" aria-hidden />
          <a
            href="#"
            className="hidden sm:inline font-display text-[14px] tracking-tight text-[var(--ink-soft)] hover:text-[var(--ink)] truncate"
          >
            CAI Studio
          </a>
          <ChevronRight className="hidden sm:inline size-3 text-[var(--ink-faint)]" aria-hidden />
          <span className="font-display text-[14px] tracking-tight text-[var(--ink)] truncate">
            Roadmap
          </span>
        </nav>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="hidden md:inline font-mono text-[11px] tracking-tight text-[var(--ink-muted)]">
          stef@cai.studio
        </span>
        <span
          aria-hidden
          className="hidden md:block h-3 w-px"
          style={{ backgroundColor: "var(--rule-hairline)" }}
        />
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-[var(--paper-elevated)] px-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--ink-soft)] transition-colors hover:bg-white hover:text-[var(--ink)]"
          style={{ borderColor: "var(--rule-hairline)" }}
          aria-label="Uitloggen (preview — geen actie)"
        >
          <LogOut className="size-3.5" />
          <span className="hidden sm:inline">Uitloggen</span>
        </button>
      </div>
    </header>
  );
}
