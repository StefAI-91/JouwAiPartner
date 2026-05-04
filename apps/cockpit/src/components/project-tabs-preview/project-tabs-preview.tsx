"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Pencil, Trash2 } from "lucide-react";
import { cn } from "@repo/ui/utils";
import { PANEL_META, PanelContent, type PanelKey } from "./panels";

/**
 * Variant 1 — top-tabs, sleek production-grade. Sliding active
 * indicator, glass-morphism on scroll, ghost-underline on hover,
 * edge-fade mask op mobile, full keyboard nav (WAI-ARIA Tabs Pattern).
 */

const TAB_COUNTS: Partial<Record<PanelKey, number>> = {
  activity: 25,
  insights: 22,
};

export function ProjectTabsPreview() {
  const [active, setActive] = useState<PanelKey>("overview");
  return (
    <div className="flex min-h-full flex-col">
      <ProjectShell active={active} onActiveChange={setActive} />
    </div>
  );
}

function ProjectShell({
  active,
  onActiveChange,
}: {
  active: PanelKey;
  onActiveChange: (key: PanelKey) => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([entry]) => setScrolled(!entry?.isIntersecting), {
      threshold: 0,
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      {/* Subtle top-corner preview marker — niet meer een dominante balk */}
      <div className="pointer-events-none fixed right-3 top-3 z-50 hidden items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground shadow-sm backdrop-blur-md md:flex">
        <span className="size-1.5 rounded-full bg-primary" />
        Preview · variant A
        <Link
          href="/project-sidebar-preview"
          className="ml-1 text-foreground/70 underline-offset-4 hover:text-foreground hover:underline"
        >
          → B
        </Link>
      </div>

      {/* Eyebrow + project header */}
      <header className="px-4 pt-8 pb-5 lg:px-10 lg:pt-10">
        <Breadcrumb />
        <ProjectTitle />
      </header>

      {/* Sentinel voor sticky-detection */}
      <div ref={sentinelRef} aria-hidden className="h-px" />

      {/* Tab bar */}
      <div
        className={cn(
          "sticky top-0 z-30 transition-[background,backdrop-filter,border-color,box-shadow] duration-300",
          scrolled
            ? "border-b border-border/70 bg-background/70 shadow-[0_1px_0_0_rgb(0_0_0/0.02)] backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <TabBar active={active} onActiveChange={onActiveChange} />
      </div>

      {/* Panel — fade-in on tab change */}
      <main className="flex-1 px-4 py-10 lg:px-10 lg:py-12">
        <div
          key={active}
          role="tabpanel"
          id={`panel-${active}`}
          aria-labelledby={`tab-${active}`}
          className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
        >
          <PanelContent panel={active} />
        </div>
      </main>
    </>
  );
}

/* ── Eyebrow breadcrumb ─────────────────────────────────────────────── */

function Breadcrumb() {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-2 flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80"
    >
      <Link href="/projects" className="transition-colors hover:text-foreground">
        Projecten
      </Link>
      <ChevronRight className="size-3 opacity-50" />
      <span className="text-foreground/70">Unova</span>
    </nav>
  );
}

/* ── Project title ─────────────────────────────────────────────────── */

function ProjectTitle() {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">Unova B.V.</p>
        <h1
          className="mt-0.5 truncate font-heading text-3xl font-semibold leading-tight tracking-[-0.025em] text-foreground"
          style={{ fontFeatureSettings: '"ss01", "ss02", "cv01"' }}
        >
          Unova
        </h1>
      </div>
      <div className="flex items-center gap-1">
        <IconButton label="Bewerk project" icon={Pencil} />
        <IconButton label="Verwijder project" icon={Trash2} />
      </div>
    </div>
  );
}

function IconButton({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="group inline-flex size-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all hover:border-border hover:bg-card hover:text-foreground hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <Icon className="size-3.5 transition-transform group-hover:scale-110" />
    </button>
  );
}

/* ── Tab bar with sliding indicator ─────────────────────────────────── */

function TabBar({
  active,
  onActiveChange,
}: {
  active: PanelKey;
  onActiveChange: (key: PanelKey) => void;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<PanelKey, HTMLButtonElement | null>>({
    overview: null,
    activity: null,
    insights: null,
    inbox: null,
  });
  const [activeRect, setActiveRect] = useState<{ left: number; width: number } | null>(null);
  const [hoverRect, setHoverRect] = useState<{ left: number; width: number } | null>(null);

  const measure = useCallback((key: PanelKey | null): { left: number; width: number } | null => {
    if (!key) return null;
    const btn = tabRefs.current[key];
    const list = listRef.current;
    if (!btn || !list) return null;
    const btnRect = btn.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    return { left: btnRect.left - listRect.left + list.scrollLeft, width: btnRect.width };
  }, []);

  // Measure active position whenever it changes / on resize
  useLayoutEffect(() => {
    const update = () => setActiveRect(measure(active));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [active, measure]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const idx = PANEL_META.findIndex((t) => t.key === active);
    if (idx < 0) return;
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % PANEL_META.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + PANEL_META.length) % PANEL_META.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = PANEL_META.length - 1;
    else return;
    e.preventDefault();
    const nextKey = PANEL_META[next]!.key;
    onActiveChange(nextKey);
    tabRefs.current[nextKey]?.focus();
  };

  return (
    <div className="relative">
      <div
        ref={listRef}
        role="tablist"
        aria-label="Project secties"
        onKeyDown={handleKeyDown}
        onMouseLeave={() => setHoverRect(null)}
        className={cn(
          "scrollbar-none relative flex gap-1 overflow-x-auto px-4 lg:px-10",
          // Edge-fade mask zodat scrollend overflow zacht in/uit fadeerd
          "[mask-image:linear-gradient(to_right,transparent_0,black_24px,black_calc(100%-24px),transparent_100%)]",
          "lg:[mask-image:none]",
        )}
      >
        {/* Hover ghost-indicator — schuift voor je klikt */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute bottom-0 h-px rounded-full bg-foreground/30 transition-all duration-200 ease-out",
            hoverRect ? "opacity-100" : "opacity-0",
          )}
          style={{
            transform: `translateX(${hoverRect?.left ?? 0}px)`,
            width: hoverRect?.width ?? 0,
          }}
        />

        {/* Active sliding indicator */}
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 h-[2px] rounded-full bg-primary"
          style={{
            transform: `translateX(${activeRect?.left ?? 0}px)`,
            width: activeRect?.width ?? 0,
            transition:
              "transform 280ms cubic-bezier(0.16, 1, 0.3, 1), width 280ms cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow: "0 0 12px rgb(0 107 63 / 0.35), 0 -1px 0 0 rgb(255 255 255 / 0.4) inset",
          }}
        />

        {PANEL_META.map((tab) => {
          const isActive = active === tab.key;
          const count = TAB_COUNTS[tab.key];
          return (
            <button
              key={tab.key}
              ref={(el) => {
                tabRefs.current[tab.key] = el;
              }}
              id={`tab-${tab.key}`}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`panel-${tab.key}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onActiveChange(tab.key)}
              onMouseEnter={() => setHoverRect(measure(tab.key))}
              onFocus={() => setHoverRect(measure(tab.key))}
              className={cn(
                "group relative shrink-0 px-1 py-3.5 text-[13px] outline-none transition-colors duration-200",
                "focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/80",
              )}
            >
              <span
                className={cn(
                  "inline-flex items-center gap-2 px-3",
                  "font-heading transition-[font-weight,letter-spacing] duration-200",
                  isActive ? "font-semibold tracking-[-0.01em]" : "font-medium tracking-normal",
                )}
                style={{ fontFeatureSettings: '"ss01", "ss02", "cv01", "tnum"' }}
              >
                {tab.label}
                {count !== undefined ? (
                  <span
                    aria-hidden
                    className={cn(
                      "font-mono text-[10.5px] tabular-nums transition-colors",
                      isActive ? "text-foreground/55" : "text-muted-foreground/60",
                    )}
                    style={{ fontFeatureSettings: '"tnum", "ss01"' }}
                  >
                    {count}
                  </span>
                ) : null}
                {tab.badge ? (
                  <span
                    className={cn(
                      "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
                      "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",
                      "transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground ring-primary/40"
                        : "group-hover:bg-primary/15",
                    )}
                  >
                    {tab.badge}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
