"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@repo/ui/utils";

// CC-005 — tab-navigatie boven project-detail. Layout-level zodat elke
// sub-route (Overzicht, Inbox, ...) deze nav consistent toont zonder
// per-page duplicatie. Pathname-based active detection.
//
// Productie-grade tab-bar: sliding indicator, hover-preview, sticky
// glass-morphism on scroll, edge-fade mask op mobile, full WAI-ARIA
// Tabs Pattern keyboard nav (←/→, Home/End, roving tabindex).

interface TabConfig {
  key: string;
  label: string;
  suffix: string;
  count?: number;
  badge?: number;
}

const STATIC_TABS: Omit<TabConfig, "badge">[] = [
  { key: "overview", label: "Overzicht", suffix: "" },
  { key: "activity", label: "Activiteit", suffix: "/activity" },
  { key: "insights", label: "Inzichten", suffix: "/insights" },
  { key: "inbox", label: "Inbox", suffix: "/inbox" },
];

export function ProjectTabs({ projectId, inboxBadge }: { projectId: string; inboxBadge?: number }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  const tabs: TabConfig[] = STATIC_TABS.map((tab) =>
    tab.key === "inbox" && inboxBadge && inboxBadge > 0 ? { ...tab, badge: inboxBadge } : tab,
  );

  const activeKey =
    tabs.find((tab) => {
      const href = `${base}${tab.suffix}`;
      return tab.suffix === "" ? pathname === base : pathname.startsWith(href);
    })?.key ?? tabs[0]!.key;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(false);

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
      <div ref={sentinelRef} aria-hidden className="h-px" />
      <div
        className={cn(
          "sticky top-0 z-30 transition-[background,backdrop-filter,border-color,box-shadow] duration-300",
          scrolled
            ? "border-b border-border/70 bg-background/70 shadow-[0_1px_0_0_rgb(0_0_0/0.02)] backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <TabBar tabs={tabs} projectId={projectId} activeKey={activeKey} base={base} />
      </div>
    </>
  );
}

function TabBar({
  tabs,
  projectId,
  activeKey,
  base,
}: {
  tabs: TabConfig[];
  projectId: string;
  activeKey: string;
  base: string;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [activeRect, setActiveRect] = useState<{ left: number; width: number } | null>(null);
  const [hoverRect, setHoverRect] = useState<{ left: number; width: number } | null>(null);

  const measure = useCallback((key: string | null): { left: number; width: number } | null => {
    if (!key) return null;
    const link = tabRefs.current[key];
    const list = listRef.current;
    if (!link || !list) return null;
    const linkRect = link.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    return { left: linkRect.left - listRect.left + list.scrollLeft, width: linkRect.width };
  }, []);

  useLayoutEffect(() => {
    const update = () => setActiveRect(measure(activeKey));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [activeKey, measure, projectId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const idx = tabs.findIndex((t) => t.key === activeKey);
    if (idx < 0) return;
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    tabRefs.current[tabs[next]!.key]?.focus();
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
          "[mask-image:linear-gradient(to_right,transparent_0,black_24px,black_calc(100%-24px),transparent_100%)]",
          "lg:[mask-image:none]",
        )}
      >
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

        {tabs.map((tab) => {
          const href = `${base}${tab.suffix}`;
          const isActive = activeKey === tab.key;
          return (
            <Link
              key={tab.key}
              ref={(el) => {
                tabRefs.current[tab.key] = el;
              }}
              id={`project-tab-${tab.key}`}
              href={href}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
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
                  "inline-flex items-center gap-2 px-3 font-heading transition-[font-weight,letter-spacing] duration-200",
                  isActive ? "font-semibold tracking-[-0.01em]" : "font-medium tracking-normal",
                )}
                style={{ fontFeatureSettings: '"ss01", "ss02", "cv01", "tnum"' }}
              >
                {tab.label}
                {tab.count !== undefined ? (
                  <span
                    aria-hidden
                    className={cn(
                      "font-mono text-[10.5px] tabular-nums transition-colors",
                      isActive ? "text-foreground/55" : "text-muted-foreground/60",
                    )}
                    style={{ fontFeatureSettings: '"tnum", "ss01"' }}
                  >
                    {tab.count}
                  </span>
                ) : null}
                {tab.badge ? (
                  <span
                    className={cn(
                      "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground ring-1 ring-inset ring-primary/40"
                        : "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 group-hover:bg-primary/15",
                    )}
                  >
                    {tab.badge}
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
