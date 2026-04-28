import { FolderKanban, Settings, MessageSquare, FileText } from "lucide-react";
import { SECTIONS } from "./mock-data";

const MOCK_PROJECTS = [
  { id: "p-cai", name: "CAI Studio", active: true },
  { id: "p-mendel", name: "Mendel Online", active: false },
  { id: "p-veerle", name: "Veerle Werkruimte", active: false },
];

const NAV_TOP = [
  { href: "#", label: "Projecten", icon: FolderKanban, active: false },
  { href: "#feedback", label: "Feedback", icon: MessageSquare, active: false },
];

const NAV_PROJECT = [
  { href: "#roadmap", label: "Roadmap", active: true, marker: "01" },
  { href: "#topic-detail", label: "Topic-detail", active: false, marker: "02" },
  { href: "#reports-archive", label: "Rapporten", active: false, marker: "07" },
  { href: "#feedback", label: "Feedback", active: false, marker: null },
];

/**
 * Sidebar-inhoud — gedeeld tussen desktop-aside (PreviewSidebar)
 * en mobile drawer (PreviewMobileNav).
 *
 * onLinkClick wordt door de drawer gebruikt om bij navigatie de drawer
 * te sluiten. Op desktop is het een no-op.
 */
export function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const handleClick = () => {
    if (onLinkClick) onLinkClick();
  };

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ backgroundColor: "var(--paper-deep)" }}>
      {/* Logo / brand */}
      <div
        className="flex h-14 shrink-0 items-center gap-2.5 px-5 border-b"
        style={{ borderColor: "var(--rule-hairline)" }}
      >
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-md"
          style={{
            backgroundColor: "var(--accent-brand)",
            color: "var(--paper)",
          }}
        >
          <FileText className="size-4" />
        </span>
        <div className="leading-tight">
          <p className="font-display text-[14px] tracking-tight text-[var(--ink)]">
            Jouw AI Partner
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
            Klantportaal
          </p>
        </div>
      </div>

      {/* Workspace tag */}
      <div className="px-3 py-3 border-b shrink-0" style={{ borderColor: "var(--rule-hairline)" }}>
        <button
          type="button"
          className="group flex w-full items-center justify-between rounded-md border bg-[var(--paper-elevated)] px-3 py-2 text-left transition-colors hover:bg-white"
          style={{ borderColor: "var(--rule-hairline)" }}
        >
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
              Werkruimte
            </p>
            <p className="mt-0.5 font-display text-[13px] tracking-tight text-[var(--ink)] truncate">
              CAI Automations
            </p>
          </div>
          <span
            aria-hidden
            className="font-mono text-[10px] text-[var(--ink-faint)] group-hover:text-[var(--ink-soft)]"
          >
            ⇅
          </span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Top-level nav */}
        <ol className="space-y-0.5">
          {NAV_TOP.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                onClick={handleClick}
                className={`group flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors ${
                  item.active
                    ? "bg-[var(--accent-brand-soft)] text-[var(--accent-brand-deep)]"
                    : "text-[var(--ink-soft)] hover:bg-[var(--paper-cream)] hover:text-[var(--ink)]"
                }`}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="font-medium">{item.label}</span>
              </a>
            </li>
          ))}
        </ol>

        {/* Projects */}
        <div>
          <p className="px-3 mb-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
            Jouw projecten
          </p>
          <ol className="space-y-0.5">
            {MOCK_PROJECTS.map((p) => (
              <li key={p.id}>
                <a
                  href="#"
                  onClick={handleClick}
                  className={`flex items-center justify-between rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                    p.active
                      ? "bg-[var(--accent-brand-soft)] text-[var(--accent-brand-deep)]"
                      : "text-[var(--ink-soft)] hover:bg-[var(--paper-cream)] hover:text-[var(--ink)]"
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  {p.active ? (
                    <span
                      aria-hidden
                      className="size-1 rounded-full"
                      style={{ backgroundColor: "var(--accent-brand)" }}
                    />
                  ) : null}
                </a>
              </li>
            ))}
          </ol>
        </div>

        {/* Active project sub-nav */}
        <div>
          <p className="px-3 mb-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
            CAI Studio
          </p>
          <ol className="space-y-0.5">
            {NAV_PROJECT.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  onClick={handleClick}
                  className={`flex items-center justify-between rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                    item.active
                      ? "bg-[var(--paper-elevated)] text-[var(--ink)] border"
                      : "text-[var(--ink-soft)] hover:bg-[var(--paper-cream)] hover:text-[var(--ink)]"
                  }`}
                  style={item.active ? { borderColor: "var(--rule-hairline)" } : undefined}
                >
                  <span>{item.label}</span>
                  {item.marker ? (
                    <span
                      className="font-mono num-tabular text-[9px] tabular-nums tracking-[0.1em] text-[var(--ink-faint)]"
                      aria-hidden
                    >
                      {item.marker}
                    </span>
                  ) : null}
                </a>
              </li>
            ))}
          </ol>
        </div>

        {/* Preview-only TOC */}
        <div className="border-t pt-4" style={{ borderColor: "var(--rule-hairline)" }}>
          <div className="flex items-baseline justify-between px-3 mb-2">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
              Preview-secties
            </p>
            <span
              className="font-mono num-tabular text-[9px] tabular-nums text-[var(--ink-faint)]"
              aria-hidden
            >
              {SECTIONS.length.toString().padStart(2, "0")}
            </span>
          </div>
          <ol className="space-y-0.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={handleClick}
                  className="group flex items-baseline gap-2.5 rounded-md px-3 py-1 text-[12px] text-[var(--ink-muted)] hover:bg-[var(--paper-cream)] hover:text-[var(--ink)]"
                >
                  <span className="font-mono num-tabular text-[9px] tabular-nums uppercase tracking-[0.14em] text-[var(--ink-faint)] group-hover:text-[var(--accent-brand-deep)] w-5 shrink-0">
                    {s.marker.replace("§ ", "")}
                  </span>
                  <span className="truncate">{s.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t px-4 py-3 shrink-0" style={{ borderColor: "var(--rule-hairline)" }}>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-[var(--ink-muted)] hover:bg-[var(--paper-cream)] hover:text-[var(--ink-soft)]"
        >
          <Settings className="size-3.5" />
          <span>Instellingen</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Desktop-only sidebar (≥lg). Op kleinere schermen wordt PreviewMobileNav gebruikt.
 */
export function PreviewSidebar() {
  return (
    <aside
      className="hidden w-60 shrink-0 border-r lg:sticky lg:top-0 lg:flex lg:h-screen"
      style={{ borderColor: "var(--rule-hairline)" }}
    >
      <SidebarContent />
    </aside>
  );
}
