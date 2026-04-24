import { Info, Zap } from "lucide-react";
import { timeAgoDays } from "@repo/ui/format";
import { ProjectProgressStrip } from "./project-progress-strip";
import { RegenerateSummaryButton } from "./regenerate-summary-button";

interface SummaryContent {
  content: string;
  version: number;
  created_at: string;
}

interface ProjectSummaryCardProps {
  projectId: string;
  startDate: string | null;
  deadline: string | null;
  context: SummaryContent | null;
  briefing: SummaryContent | null;
}

export function ProjectSummaryCard({
  projectId,
  startDate,
  deadline,
  context,
  briefing,
}: ProjectSummaryCardProps) {
  const hasSummary = Boolean(context || briefing);

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <ProjectProgressStrip startDate={startDate} deadline={deadline} />

      {hasSummary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Context
              </h2>
              {context && (
                <span className="text-[10px] text-muted-foreground/70">
                  v{context.version} · {timeAgoDays(context.created_at)}
                </span>
              )}
            </div>
            {context ? (
              <p className="text-sm leading-relaxed text-foreground/85">{context.content}</p>
            ) : (
              <p className="text-sm italic text-muted-foreground/70">
                Nog geen context beschikbaar
              </p>
            )}
          </div>

          <div className="px-6 py-5 bg-amber-50/30">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-3.5 w-3.5 text-amber-600" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Briefing
              </h2>
              {briefing && (
                <span className="text-[10px] text-muted-foreground/70">
                  v{briefing.version} · {timeAgoDays(briefing.created_at)}
                </span>
              )}
            </div>
            {briefing ? (
              <p className="text-sm leading-relaxed text-foreground/85">{briefing.content}</p>
            ) : (
              <p className="text-sm italic text-muted-foreground/70">
                Nog geen briefing beschikbaar
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="px-6 py-8 text-center">
          <p className="text-sm italic text-muted-foreground">
            Nog geen samenvatting beschikbaar — verifieer een meeting om context en briefing te
            genereren.
          </p>
        </div>
      )}

      <div className="border-t border-gray-100 px-6 py-2.5 flex items-center justify-between bg-gray-50/50">
        <span className="text-[11px] text-muted-foreground">
          Automatisch bijgewerkt na elke verified meeting of e-mail
        </span>
        <RegenerateSummaryButton entityType="project" entityId={projectId} />
      </div>
    </section>
  );
}
