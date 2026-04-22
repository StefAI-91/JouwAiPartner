"use client";

import { useState } from "react";
import { Compass, HeartPulse, Microscope, Bell } from "lucide-react";
import { SectionA } from "./variants/section-a";
import { SectionB } from "./variants/section-b";
import { SectionC } from "./variants/section-c";
import { SectionD } from "./variants/section-d";

const SECTIONS = [
  {
    id: "a",
    label: "A · Discovery",
    icon: Compass,
    title: "Hoe vind je een thema?",
    intro:
      "Navigatie-patronen. Vijf varianten om snel bij het juiste thema te komen — van pills op de dashboard tot een command palette.",
    count: 5,
  },
  {
    id: "b",
    label: "B · Health",
    icon: HeartPulse,
    title: "Hoe voelt het veld in één oogopslag?",
    intro:
      "Overzicht-patronen. Niet één thema openen, maar de stand van álle thema's tegelijk aflezen — waar is de energie, waar is het stil.",
    count: 5,
  },
  {
    id: "c",
    label: "C · Deep-dive",
    icon: Microscope,
    title: "Wat als je een thema opent?",
    intro:
      "Detail-patronen. Wanneer je klikt op een thema, wat zie je dan? Tabs, timeline, narrative, quotes per persoon, side-by-side.",
    count: 5,
  },
  {
    id: "d",
    label: "D · Ambient",
    icon: Bell,
    title: "Wat komt vanzelf naar je toe?",
    intro:
      "Passieve patronen. Geen UI die wacht tot je klikt — digest mails, banners, breadcrumbs en nudges die het platform laat opborrelen.",
    count: 4,
  },
];

export function ThemeLab() {
  const [active, setActive] = useState<"a" | "b" | "c" | "d">("a");

  return (
    <div>
      {/* Sticky section nav */}
      <nav className="sticky top-4 z-30 mb-10 flex gap-1 rounded-2xl border border-border/60 bg-card/80 p-1.5 shadow-sm backdrop-blur-md">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = active === section.id;
          return (
            <a
              key={section.id}
              href={`#section-${section.id}`}
              onClick={() => setActive(section.id as "a" | "b" | "c" | "d")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{section.label}</span>
              <span
                className={`hidden rounded-md px-1.5 py-0.5 text-[10px] font-mono md:inline ${
                  isActive ? "bg-primary-foreground/20" : "bg-muted/60"
                }`}
              >
                {section.count}
              </span>
            </a>
          );
        })}
      </nav>

      {/* Sections */}
      <div className="space-y-24">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <section key={section.id} id={`section-${section.id}`} className="scroll-mt-24">
              <div className="mb-8 flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Sectie {section.id.toUpperCase()} · {section.count} varianten
                  </div>
                  <h2 className="font-heading mt-1 text-[26px] font-semibold leading-tight tracking-tight text-foreground">
                    {section.title}
                  </h2>
                  <p className="mt-2 max-w-[640px] text-[14px] leading-relaxed text-muted-foreground">
                    {section.intro}
                  </p>
                </div>
              </div>

              {section.id === "a" && <SectionA />}
              {section.id === "b" && <SectionB />}
              {section.id === "c" && <SectionC />}
              {section.id === "d" && <SectionD />}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Gedeelde variant-wrapper
   ──────────────────────────────────────────────────────────── */

export function VariantCard({
  id,
  title,
  subtitle,
  tunable,
  children,
  span = 1,
}: {
  id: string;
  title: string;
  subtitle: string;
  tunable: string[];
  children: React.ReactNode;
  span?: 1 | 2;
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card ${
        span === 2 ? "lg:col-span-2" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border/50 bg-muted/30 px-5 py-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
              {id}
            </span>
            <h3 className="text-[14px] font-semibold text-foreground">{title}</h3>
          </div>
          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{subtitle}</p>
        </div>
        <div className="hidden max-w-[220px] text-right lg:block">
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
            Tunable
          </div>
          <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground/80">
            {tunable.join(" · ")}
          </div>
        </div>
      </div>
      <div className="flex-1 p-5">{children}</div>
    </div>
  );
}
