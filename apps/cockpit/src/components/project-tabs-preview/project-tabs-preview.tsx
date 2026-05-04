"use client";

import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Inbox,
  Info,
  Lightbulb,
  Mail,
  MessageSquare,
  Pencil,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { cn } from "@repo/ui/utils";

type TabKey = "overview" | "activity" | "insights" | "inbox";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overzicht" },
  { key: "activity", label: "Activiteit" },
  { key: "insights", label: "Inzichten" },
  { key: "inbox", label: "Inbox" },
];

export function ProjectTabsPreview() {
  const [active, setActive] = useState<TabKey>("overview");

  return (
    <div className="flex min-h-full flex-col">
      <PreviewBanner />

      <nav
        className="flex gap-1 overflow-x-auto border-b border-border px-4 lg:px-10"
        role="tablist"
      >
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.key)}
              className={cn(
                "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {tab.key === "inbox" && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-700">
                  3
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 px-4 py-8 lg:px-10">
        <ProjectHeader />

        <div className="mt-8">
          {active === "overview" && <OverviewTab />}
          {active === "activity" && <ActivityTab />}
          {active === "insights" && <InsightsTab />}
          {active === "inbox" && <InboxTab />}
        </div>
      </div>
    </div>
  );
}

/* ── Banner ─────────────────────────────────────────────────────────── */

function PreviewBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 lg:px-10">
      <span className="font-semibold">Preview</span> · mock-pagina voor 4-tab voorstel
      project-detail. Klik door de tabs om de splitsing te zien.
    </div>
  );
}

/* ── Header (gedeeld tussen alle tabs) ──────────────────────────────── */

function ProjectHeader() {
  return (
    <div>
      <p className="text-sm font-medium text-foreground/70">Unova</p>
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Unova</h1>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Bewerk project"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Verwijder project"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Tab 1 · Overzicht ──────────────────────────────────────────────── */

function OverviewTab() {
  return (
    <div className="space-y-6">
      {/* Context + Briefing */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 divide-y divide-gray-100 md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="px-6 py-5">
            <div className="mb-2 flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Context
              </h2>
              <span className="text-[10px] text-muted-foreground/70">v5 · vandaag</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground/85">
              Unova is een mobiel platform voor jongeren met eetstoornissen op wachtlijsten, gebouwd
              door Unova (oprichter Britt Speijer) in samenwerking met Jouw AI Partner (Wouter en
              Stef). Het MVP omvat inlogfunctionaliteit via magic link, een intake-vragenlijst,
              AI-powered check-ins ('Een moment voor jou'), modules, profielbeheer en een
              escalatiepad voor acute hulpvragen.
            </p>
          </div>

          <div className="bg-amber-50/30 px-6 py-5">
            <div className="mb-2 flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-amber-600" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Briefing
              </h2>
              <span className="text-[10px] text-muted-foreground/70">v5 · vandaag</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground/85">
              De MVP fundering staat en Stef had 29 april een sessie met Britt om de laatste vragen
              door te lopen. Focus deze week ligt op de intake-vragenlijst en het escalatiepad.
              Deadline 6-13 mei met week speling voor kwaliteit.
            </p>
          </div>
        </div>
      </section>

      {/* Sprint banner */}
      <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              Huidige sprint
            </p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              Sprint 4 · Intake & escalatie
            </h3>
            <p className="mt-1 text-sm text-foreground/70">12 issues · 8 done · 4 in review</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>start 28 apr</p>
            <p>einde 5 mei</p>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">Tijdlijn</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-3">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
            <div>
              <p className="font-medium">Kickoff</p>
              <p className="text-xs text-muted-foreground">10 maart 2026</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
            <div>
              <p className="font-medium">PRD v2.1 ondertekend</p>
              <p className="text-xs text-muted-foreground">10 april 2026</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" />
            <div>
              <p className="font-medium">MVP-deadline</p>
              <p className="text-xs text-muted-foreground">6–13 mei 2026</p>
            </div>
          </li>
        </ul>
      </section>

      {/* Klanten */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Klanten met portal-toegang</h3>
          <button className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
            + Uitnodigen
          </button>
        </div>
        <ul className="space-y-2">
          <li className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm">
            <div>
              <p className="font-medium">Britt Speijer</p>
              <p className="text-xs text-muted-foreground">britt@unova.nl</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              actief
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}

/* ── Tab 2 · Activiteit ─────────────────────────────────────────────── */

function ActivityTab() {
  const [sub, setSub] = useState<"meetings" | "emails" | "segments">("meetings");

  return (
    <div>
      <div className="mb-5 flex gap-1 border-b border-border/50 pb-px">
        <SubTab active={sub === "meetings"} onClick={() => setSub("meetings")} icon={CalendarDays}>
          Meetings <Count>4</Count>
        </SubTab>
        <SubTab active={sub === "emails"} onClick={() => setSub("emails")} icon={Mail}>
          Emails <Count>12</Count>
        </SubTab>
        <SubTab active={sub === "segments"} onClick={() => setSub("segments")} icon={Sparkles}>
          Segmenten <Count>9</Count>
        </SubTab>
      </div>

      {sub === "meetings" && (
        <ul className="space-y-3">
          {[
            {
              title: "Wekelijkse stand-up Unova",
              date: "29 apr 2026",
              type: "Stand-up",
              verified: true,
            },
            { title: "PRD review met Britt", date: "10 apr 2026", type: "Review", verified: true },
            { title: "Kickoff Unova", date: "10 mrt 2026", type: "Kickoff", verified: true },
            { title: "Quick check intake", date: "5 apr 2026", type: "Sync", verified: false },
          ].map((m) => (
            <li
              key={m.title}
              className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div>
                <p className="text-sm font-semibold">{m.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{m.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                  {m.type}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    m.verified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
                  )}
                >
                  {m.verified ? "verified" : "draft"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {sub === "emails" && (
        <ul className="space-y-2">
          {[
            { subject: "Re: PRD v2.1 ondertekend", from: "britt@unova.nl", date: "10 apr" },
            { subject: "Magic link flow vraag", from: "britt@unova.nl", date: "8 apr" },
            { subject: "Escalatiepad eindversie", from: "wouter@jouwaipartner.nl", date: "3 apr" },
          ].map((e) => (
            <li
              key={e.subject}
              className="rounded-lg border border-gray-100 bg-white p-3 text-sm shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{e.subject}</p>
                <span className="text-xs text-muted-foreground">{e.date}</span>
              </div>
              <p className="text-xs text-muted-foreground">{e.from}</p>
            </li>
          ))}
        </ul>
      )}

      {sub === "segments" && (
        <ul className="space-y-3">
          {[
            {
              meeting: "Wekelijkse stand-up Unova",
              date: "29 apr 2026",
              kernpunten: ["Intake-flow afgerond", "Magic link werkt op staging"],
              vervolg: ["Britt test demo donderdag", "Stef stuurt links voor 1 mei"],
            },
            {
              meeting: "PRD review met Britt",
              date: "10 apr 2026",
              kernpunten: [
                "Risicoprofiel deterministisch (geen AI)",
                "Tone-of-voice: warm, buddy-achtig",
              ],
              vervolg: ["50 testcases opleveren voor MVP"],
            },
          ].map((s) => (
            <li key={s.meeting} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">{s.meeting}</p>
                <span className="text-xs text-muted-foreground">{s.date}</span>
              </div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Kernpunten
              </p>
              <ul className="mb-2 space-y-1 text-sm text-foreground/80">
                {s.kernpunten.map((k) => (
                  <li key={k}>
                    <span className="mr-1.5 text-muted-foreground">•</span>
                    {k}
                  </li>
                ))}
              </ul>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Vervolgstappen
              </p>
              <ul className="space-y-1 text-sm text-foreground/80">
                {s.vervolg.map((v) => (
                  <li key={v}>
                    <span className="mr-1.5 text-muted-foreground">→</span>
                    {v}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Tab 3 · Inzichten ──────────────────────────────────────────────── */

function InsightsTab() {
  const [sub, setSub] = useState<"actions" | "decisions" | "needs">("actions");

  return (
    <div>
      <div className="mb-5 flex gap-1 border-b border-border/50 pb-px">
        <SubTab active={sub === "actions"} onClick={() => setSub("actions")} icon={CheckCircle2}>
          Actiepunten <Count>7</Count>
        </SubTab>
        <SubTab active={sub === "decisions"} onClick={() => setSub("decisions")} icon={Sparkles}>
          Beslissingen <Count>4</Count>
        </SubTab>
        <SubTab active={sub === "needs"} onClick={() => setSub("needs")} icon={Lightbulb}>
          Behoeften & Inzichten <Count>11</Count>
        </SubTab>
      </div>

      {sub === "actions" && (
        <ul className="space-y-2">
          {[
            { text: "50 testcases samenstellen voor MVP", source: "PRD review · 10 apr" },
            { text: "Magic link flow uitrollen naar staging", source: "Stand-up · 29 apr" },
            {
              text: "Escalatiepad-copy laten reviewen door GZ-psycholoog",
              source: "Email · 3 apr",
            },
            { text: "Demo-omgeving inrichten voor Britt", source: "Stand-up · 29 apr" },
          ].map((a) => (
            <li
              key={a.text}
              className="rounded-lg border border-gray-100 bg-white p-3 text-sm shadow-sm"
            >
              <p className="font-medium">{a.text}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">uit: {a.source}</p>
            </li>
          ))}
        </ul>
      )}

      {sub === "decisions" && (
        <ul className="space-y-2">
          {[
            {
              text: "Risicoprofiel wordt deterministisch berekend, niet door AI",
              source: "PRD review · 10 apr",
            },
            { text: "Tone-of-voice: warm en buddy-achtig", source: "PRD review · 10 apr" },
            { text: "MVP-deadline 6–13 mei met week speling voor kwaliteit", source: "PRD v2.1" },
          ].map((d) => (
            <li
              key={d.text}
              className="rounded-lg border border-gray-100 bg-white p-3 text-sm shadow-sm"
            >
              <p className="font-medium">{d.text}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">uit: {d.source}</p>
            </li>
          ))}
        </ul>
      )}

      {sub === "needs" && (
        <ul className="space-y-2">
          {[
            {
              text: "Jongeren willen privacy — geen profiel met echte naam zichtbaar",
              source: "Onderzoek Britt",
            },
            {
              text: "Wachtlijst-jongeren ervaren acute momenten 's avonds laat",
              source: "Stand-up · 29 apr",
            },
            {
              text: "Buddy-toon werkt beter dan klinische taal in check-ins",
              source: "PRD review",
            },
          ].map((n) => (
            <li
              key={n.text}
              className="rounded-lg border border-gray-100 bg-white p-3 text-sm shadow-sm"
            >
              <p className="font-medium">{n.text}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">uit: {n.source}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Tab 4 · Inbox ──────────────────────────────────────────────────── */

function InboxTab() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Inbox className="size-4" />
        Open vragen en items voor PM-review
      </div>
      {[
        {
          icon: MessageSquare,
          title: "Britt: 'Kunnen we de check-in eerder dan 19:00 plannen?'",
          meta: "open vraag · gisteren",
          tone: "amber" as const,
        },
        {
          icon: CheckCircle2,
          title: "Action item: 'Demo-omgeving inrichten' — wacht op review",
          meta: "PM-review · 2 dagen oud",
          tone: "blue" as const,
        },
        {
          icon: Sparkles,
          title: "Extractie suggereert nieuw besluit over magic link timeout",
          meta: "open vraag · vandaag",
          tone: "amber" as const,
        },
      ].map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.title}
            className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white p-3 shadow-sm"
          >
            <span
              className={cn(
                "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                item.tone === "amber" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700",
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.meta}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function SubTab({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
        active
          ? "border-b-2 border-[#006B3F] text-[#006B3F]"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs">
      {children}
    </span>
  );
}
