"use client";

import { Clock, Snowflake } from "lucide-react";
import { THEMES } from "../mock-data";
import { VariantCard } from "../theme-lab";

function tempColor(temp: string) {
  switch (temp) {
    case "hot":
      return { bg: "bg-red-500", ring: "ring-red-500/20", text: "text-red-600", label: "Hot" };
    case "warm":
      return {
        bg: "bg-amber-500",
        ring: "ring-amber-500/20",
        text: "text-amber-600",
        label: "Warm",
      };
    case "cool":
      return {
        bg: "bg-sky-400",
        ring: "ring-sky-400/20",
        text: "text-sky-600",
        label: "Cool",
      };
    case "cold":
      return {
        bg: "bg-zinc-300",
        ring: "ring-zinc-300/30",
        text: "text-zinc-500",
        label: "Cold",
      };
    default:
      return {
        bg: "bg-blue-500",
        ring: "ring-blue-500/20",
        text: "text-blue-600",
        label: "New",
      };
  }
}

export function SectionB() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <VariantB6 />
      <VariantB7 />
      <VariantB8 />
      <VariantB9 />
      <VariantB10 />
    </div>
  );
}

/* B6 — Pulse strip met sparklines ──────────────────────── */

function Sparkline({ data, color = "currentColor" }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  const w = 64;
  const h = 22;
  const stepX = w / (data.length - 1);
  const points = data.map((v, i) => `${i * stepX},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={(data.length - 1) * stepX}
        cy={h - (data[data.length - 1] / max) * h}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

function VariantB6() {
  return (
    <VariantCard
      id="B6"
      title="Theme pulse strip"
      subtitle="Sparkline per thema over laatste 4 weken. Hot vs stil in één oogopslag."
      tunable={["Tijdsvenster", "Sparkline-stijl", "Sortering hot→cold"]}
      span={2}
    >
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 md:grid-cols-3 lg:grid-cols-5">
          {THEMES.map((t) => {
            const c = tempColor(t.temp);
            return (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-1 hover:bg-accent/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium text-foreground">
                    {t.emoji} {t.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {t.mentions30d}× · {t.lastMentionedDays}d geleden
                  </div>
                </div>
                <div className={c.text}>
                  <Sparkline data={t.sparkline} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </VariantCard>
  );
}

/* B7 — Hot/cold indicator dots ──────────────────────────── */

function VariantB7() {
  return (
    <VariantCard
      id="B7"
      title="Hot/cold indicator dots"
      subtitle="Kleine gekleurde dot bij elke pill. Rood = hot deze week, grijs = lang stil."
      tunable={["Drempels per temp", "Kleuren-schaal", "Tooltip-inhoud"]}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500 ring-2 ring-red-500/20" /> Hot
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500 ring-2 ring-amber-500/20" /> Warm
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-400 ring-2 ring-sky-400/20" /> Cool
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-300 ring-2 ring-zinc-300/30" /> Cold
          </span>
        </div>
        <div className="flex flex-wrap gap-2 rounded-xl border border-border/60 bg-muted/20 p-3">
          {THEMES.map((t) => {
            const c = tempColor(t.temp);
            return (
              <span
                key={t.id}
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1.5 text-[12.5px] font-medium"
              >
                <span className={`h-2 w-2 rounded-full ${c.bg} ring-2 ${c.ring}`} />
                {t.name}
              </span>
            );
          })}
        </div>
      </div>
    </VariantCard>
  );
}

/* B8 — Time-spent donut ────────────────────────────────── */

function VariantB8() {
  const totalShare = THEMES.reduce((sum, t) => sum + t.share, 0);
  const colors = [
    "#006b3f",
    "#059669",
    "#0891b2",
    "#d97706",
    "#dc2626",
    "#7c3aed",
    "#db2777",
    "#2563eb",
    "#65a30d",
    "#a1a1aa",
  ];
  const circumference = 2 * Math.PI * 54;
  const segments = THEMES.reduce<{ id: string; color: string; dash: number; offset: number }[]>(
    (acc, t, i) => {
      const dash = (t.share / totalShare) * circumference;
      const offset = acc.reduce((sum, s) => sum + s.dash, 0);
      acc.push({ id: t.id, color: colors[i], dash, offset });
      return acc;
    },
    [],
  );
  return (
    <VariantCard
      id="B8"
      title="Time-spent donut"
      subtitle="Percentage van jullie gespreksdomein per thema. Confronterend en scherp."
      tunable={["Aggregatie-venster", "Top-N vs alles", "Kleurenschema"]}
    >
      <div className="flex items-center gap-6 rounded-xl border border-border/60 bg-muted/20 p-5">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="54" fill="none" stroke="#e5e7eb" strokeWidth="20" />
          {segments.map((s) => (
            <circle
              key={s.id}
              cx="70"
              cy="70"
              r="54"
              fill="none"
              stroke={s.color}
              strokeWidth="20"
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              strokeDashoffset={-s.offset}
              transform="rotate(-90 70 70)"
            />
          ))}
          <text
            x="70"
            y="68"
            textAnchor="middle"
            className="fill-foreground font-semibold"
            fontSize="16"
          >
            30 dgn
          </text>
          <text x="70" y="84" textAnchor="middle" className="fill-muted-foreground" fontSize="10">
            {totalShare}% verdeeld
          </text>
        </svg>
        <div className="flex-1 space-y-1">
          {THEMES.slice(0, 6).map((t, i) => (
            <div key={t.id} className="flex items-center gap-2 text-[12px]">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: colors[i] }} />
              <span className="flex-1 truncate text-foreground">{t.name}</span>
              <span className="font-mono text-[11px] text-muted-foreground">{t.share}%</span>
            </div>
          ))}
          <div className="pt-1 text-[11px] text-muted-foreground/70">+ 4 andere thema&apos;s</div>
        </div>
      </div>
    </VariantCard>
  );
}

/* B9 — Heatmap ─────────────────────────────────────────── */

function VariantB9() {
  const weeks = ["W12", "W13", "W14", "W15", "W16", "W17"];
  const cellValue = (t: (typeof THEMES)[number], weekIdx: number) => {
    const base = t.sparkline[weekIdx % t.sparkline.length] ?? 0;
    return Math.max(0, base + (weekIdx % 2 === 0 ? 1 : 0));
  };
  const cellColor = (v: number) => {
    if (v === 0) return "bg-muted/40";
    if (v <= 1) return "bg-primary/15";
    if (v <= 3) return "bg-primary/35";
    if (v <= 5) return "bg-primary/60";
    return "bg-primary";
  };
  return (
    <VariantCard
      id="B9"
      title="Theme × weken heatmap"
      subtitle="Grid van thema's vs weken. Patronen over kwartalen zichtbaar."
      tunable={["Cel-resolutie (week/dag)", "Kleur-intensiteit", "Sortering"]}
      span={2}
    >
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-muted/20 p-4">
        <div className="inline-block min-w-full">
          <div className="grid grid-cols-[160px_repeat(6,1fr)] gap-1">
            <div />
            {weeks.map((w) => (
              <div
                key={w}
                className="text-center font-mono text-[10px] font-medium text-muted-foreground"
              >
                {w}
              </div>
            ))}
            {THEMES.slice(0, 8).map((t) => (
              <div key={t.id} className="contents">
                <div className="truncate pr-2 text-[11.5px] font-medium text-foreground">
                  {t.emoji} {t.name}
                </div>
                {weeks.map((w, i) => {
                  const v = cellValue(t, i);
                  return (
                    <div
                      key={w}
                      className={`h-7 rounded ${cellColor(v)} flex items-center justify-center text-[9px] font-mono text-foreground/70 transition-colors hover:ring-2 hover:ring-primary/40`}
                      title={`${t.name} · ${w} · ${v} mentions`}
                    >
                      {v > 0 ? v : ""}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </VariantCard>
  );
}

/* B10 — Neglect alerts ─────────────────────────────────── */

function VariantB10() {
  const neglected = THEMES.filter((t) => t.lastMentionedDays > 14);
  return (
    <VariantCard
      id="B10"
      title="Neglect alerts"
      subtitle="Thema's die lang stil zijn — was dat bewust?"
      tunable={["Drempel (dgn)", "Max getoond", "Dismissable"]}
    >
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <Clock className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-amber-900">
              {neglected.length} thema&apos;s zijn al &gt; 2 weken stil
            </div>
            <div className="text-[11px] text-amber-700/80">
              Was dat bewust of moeten ze weer op tafel?
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          {neglected.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-[12px]"
            >
              <span className="flex items-center gap-2 text-foreground">
                <Snowflake className="h-3 w-3 text-sky-500" />
                {t.emoji} {t.name}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {t.lastMentionedDays}d
              </span>
            </div>
          ))}
        </div>
      </div>
    </VariantCard>
  );
}
