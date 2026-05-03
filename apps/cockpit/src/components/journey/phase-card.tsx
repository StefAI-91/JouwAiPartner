import { Card, CardContent, CardHeader } from "@repo/ui/card";
import {
  type Phase,
  colorClasses,
  statusLabel,
  statusBadgeClass,
} from "@/app/(dashboard)/journey/_data/phases";

export function PhaseCard({ phase }: { phase: Phase }) {
  const colors = colorClasses[phase.color];
  const Icon = phase.icon;

  return (
    <Card id={`phase-${phase.id}`} className={`scroll-mt-6 border-l-4 ${colors.border}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.bg} text-white shadow-sm`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">Fase {phase.number}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadgeClass[phase.status]}`}
                >
                  {statusLabel[phase.status]}
                </span>
              </div>
              <h3 className={`text-lg font-semibold ${colors.text}`}>{phase.name}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{phase.pmRole}</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <Block label="Trigger — wanneer activeert deze fase?">
            <p className="text-sm leading-relaxed text-foreground">{phase.trigger}</p>
          </Block>

          <Block label="Wat de AI prepareert">
            <ul className="space-y-1.5">
              {phase.aiPrepares.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-relaxed text-foreground">
                  <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${colors.bg}`} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Block>
        </div>

        <div className={`rounded-xl border ${colors.border} ${colors.bgSoft} p-4`}>
          <div className={`text-[11px] font-semibold uppercase tracking-wider ${colors.text}`}>
            Concrete deliverable
          </div>
          <div className="mt-1 text-base font-semibold text-foreground">
            {phase.deliverable.title}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-foreground/80">
            {phase.deliverable.description}
          </p>
        </div>

        <div className="grid gap-3 text-xs md:grid-cols-2">
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <span className="font-medium text-muted-foreground">UI-locatie: </span>
            <code className="font-mono text-foreground">{phase.uiLocation}</code>
          </div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <span className="font-medium text-muted-foreground">Stand vandaag: </span>
            <span className="text-foreground">{phase.statusNote}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}
