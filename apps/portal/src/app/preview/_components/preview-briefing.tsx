import { ArrowUpRight, CheckCircle2, MessageSquareText, Sparkles } from "lucide-react";
import { Badge } from "@repo/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { closedThisWeek, openRisks } from "../_data/preview";

export function BriefingCard() {
  return (
    <Card className="bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent ring-primary/15">
      <CardHeader className="px-5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="size-3.5" />
          Hoofdpunt van de week
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-5">
        <p
          className="text-[20px] leading-[1.45] text-foreground/95 lg:text-[22px]"
          style={{ fontFamily: "var(--font-serif-display, var(--font-heading))" }}
        >
          Backend-stabiliteit verbeterd na het inlog-incident van vrijdag.{" "}
          <span className="text-foreground">Drie meldingen gesloten</span> met dezelfde root cause
          in de Userback-koppeling. Eén feature wacht expliciet op{" "}
          <span className="text-primary">jouw keuze</span> — zie roadmap onderaan.
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
          <Badge variant="secondary" className="font-mono text-[10.5px]">
            agent · claude-sonnet-4.6
          </Badge>
          <span>·</span>
          <span>
            Gecontroleerd door <span className="font-medium text-foreground">Wouter</span> vanmorgen
            09:14
          </span>
          <span>·</span>
          <a className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
            bron-issues <ArrowUpRight className="size-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export function ClosedThisWeekCard({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-baseline justify-between px-5">
        <CardTitle>Gesloten deze week</CardTitle>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Symptoom · oorzaak · effect
        </span>
      </CardHeader>
      <CardContent className="px-0">
        <ul className="divide-y divide-border/60">
          {closedThisWeek.map((item) => (
            <li
              key={item.id}
              className="group/closed grid gap-3 px-5 py-4 transition-colors hover:bg-muted/30"
            >
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-mono text-[11px] text-muted-foreground/80">{item.id}</span>
                <span className="font-heading text-[16px] font-medium leading-tight text-foreground">
                  {item.title}
                </span>
                <Badge
                  variant={
                    item.severity === "Critical"
                      ? "destructive"
                      : item.severity === "Hoog"
                        ? "secondary"
                        : "outline"
                  }
                  className="text-[10.5px]"
                >
                  {item.severity}
                </Badge>
                <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-success">
                  <CheckCircle2 className="size-3.5" />
                  sinds {item.since}
                </span>
              </div>
              <div className="grid gap-1.5 text-[13px] leading-relaxed text-muted-foreground">
                <Row label="Symptoom" value={item.symptom} />
                <Row label="Oorzaak" value={item.cause} />
                <Row label="Fix" value={item.fix} />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground/80">
                <span>{item.effect}</span>
                <span>·</span>
                <span>
                  Door <span className="font-medium text-foreground">{item.closedBy}</span>
                </span>
                <button className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground opacity-0 transition group-hover/closed:opacity-100 hover:bg-muted/40 hover:text-foreground">
                  <MessageSquareText className="size-3" /> reageer
                </button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[78px_1fr] gap-3">
      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}

export function SidePanelCards() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-baseline justify-between px-5">
          <CardTitle>Open risico&apos;s</CardTitle>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
            eerlijk lijstje
          </span>
        </CardHeader>
        <CardContent className="px-5">
          <ul className="space-y-4">
            {openRisks.map((risk) => (
              <li
                key={risk.title}
                className={`border-l-2 pl-3 ${
                  risk.tone === "warning" ? "border-amber-500" : "border-border"
                }`}
              >
                <p className="font-heading text-[14px] font-medium leading-snug text-foreground">
                  {risk.title}
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                  {risk.impact}
                </p>
                <p className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {risk.status}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
