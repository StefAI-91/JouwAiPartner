import { ArrowUpRight, Clock3, CornerDownRight } from "lucide-react";
import { Badge } from "@repo/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { inProgress, roadmapColumns, waitingOnYou } from "../_data/preview";

export function InProgressCard({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-baseline justify-between px-5">
        <CardTitle>Nu in behandeling</CardTitle>
        <a className="inline-flex items-center gap-1 text-[12px] text-primary underline-offset-4 hover:underline">
          Hele backlog <ArrowUpRight className="size-3" />
        </a>
      </CardHeader>
      <CardContent className="px-0">
        <ul className="divide-y divide-border/60">
          {inProgress.map((item) => (
            <li
              key={item.id}
              className="grid grid-cols-12 items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted/30"
            >
              <span className="col-span-2 font-mono text-[11px] text-muted-foreground/80 lg:col-span-1">
                {item.id}
              </span>
              <span className="col-span-10 font-medium text-foreground lg:col-span-6">
                {item.title}
              </span>
              <span className="col-span-6 text-[13px] text-muted-foreground lg:col-span-2">
                {item.owner}
              </span>
              <span className="col-span-3 text-[12px] text-muted-foreground/80 lg:col-span-2">
                <Clock3 className="mr-1 inline size-3" /> {item.since}
              </span>
              <span className="col-span-3 lg:col-span-1">
                <Badge variant="secondary" className="text-[10.5px]">
                  {item.bucket}
                </Badge>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function WaitingOnYouCard() {
  return (
    <Card className="ring-amber-500/20">
      <CardHeader className="px-5">
        <CardTitle className="flex items-center gap-2">
          <CornerDownRight className="size-4 text-amber-600" />
          Wacht op jou
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5">
        <ul className="space-y-4">
          {waitingOnYou.map((item) => (
            <li
              key={item.title}
              className="border-t border-border/60 pt-3 first:border-t-0 first:pt-0"
            >
              <p className="font-heading text-[15px] font-medium leading-snug">{item.title}</p>
              <div className="mt-1 flex items-center gap-2 text-[12px] text-muted-foreground">
                <Clock3 className="size-3" /> {item.since}
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Houdt tegen: <span className="text-foreground/90">{item.blocking}</span>
              </p>
            </li>
          ))}
        </ul>
        <button className="mt-4 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted/40">
          Lever aan / reageer
        </button>
      </CardContent>
    </Card>
  );
}

export function RoadmapSection() {
  const toneRing = {
    success: "ring-success/25",
    warning: "ring-amber-500/30",
    muted: "ring-border",
  } as const;
  const toneDot = {
    success: "bg-success",
    warning: "bg-amber-500",
    muted: "bg-muted-foreground/40",
  } as const;
  const toneLabel = {
    success: "text-success",
    warning: "text-amber-700",
    muted: "text-muted-foreground",
  } as const;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Roadmap — keuzes deze maand
        </h2>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Wat we doen, wat wacht, wat we bewust laten liggen
        </span>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {roadmapColumns.map((col) => (
          <Card key={col.label} className={toneRing[col.tone]}>
            <CardHeader className="px-5 pb-2">
              <div
                className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider ${toneLabel[col.tone]}`}
              >
                <span className={`inline-block size-2 rounded-full ${toneDot[col.tone]}`} />
                {col.label}
              </div>
            </CardHeader>
            <CardContent className="px-5">
              <ul className="space-y-4">
                {col.items.map((item) => (
                  <li
                    key={item.name}
                    className="border-t border-border/60 pt-3 first:border-t-0 first:pt-0"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-heading text-[15px] font-medium leading-snug">
                        {item.name}
                      </p>
                      <span className="font-mono text-[12px] text-muted-foreground">
                        {item.est}
                      </span>
                    </div>
                    {item.note && (
                      <p className="mt-1 text-[12px] italic text-muted-foreground">{item.note}</p>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function SlaCard() {
  const rows = [
    { label: "P1 — kritiek", target: "< 2u", actual: "38m", ok: true },
    { label: "P2 — hoog", target: "< 8u", actual: "3u 14m", ok: true },
    { label: "P3 — midden", target: "< 24u", actual: "26u 12m", ok: false },
    { label: "P4 — laag", target: "< 5d", actual: "2d 4u", ok: true },
  ];
  return (
    <Card>
      <CardHeader className="flex flex-row items-baseline justify-between px-5">
        <CardTitle>SLA — april 2026</CardTitle>
        <span className="font-mono text-sm">
          <span className="text-success">9</span>
          <span className="text-muted-foreground"> / 10 geslaagd</span>
        </span>
      </CardHeader>
      <CardContent className="px-5">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((row) => (
            <div
              key={row.label}
              className={`rounded-lg border border-border/60 bg-card/40 px-4 py-3 ${
                row.ok ? "" : "ring-1 ring-amber-500/40"
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {row.label}
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-mono text-[18px] font-semibold leading-none">
                  <span className={row.ok ? "text-success" : "text-amber-600"}>{row.actual}</span>
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  doel {row.target}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-muted-foreground">
          Eén P3-overschrijding deze maand. Reden: feedback-loop met jou over ticket{" "}
          <span className="font-mono text-foreground/90">JAP-617</span> duurde 19u langer dan
          gepland. Geen patroon.
        </p>
      </CardContent>
    </Card>
  );
}
