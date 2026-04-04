import { Building2, ChevronRight } from "lucide-react";

interface OrgProfileProps {
  organizationName: string;
  summaryContent: string | null;
  summaryCreatedAt: string | null;
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "vandaag";
  if (diffDays === 1) return "gisteren";
  return `${diffDays} dagen geleden`;
}

export function OrgProfile({ organizationName, summaryContent, summaryCreatedAt }: OrgProfileProps) {
  return (
    <section className="mb-8 rounded-lg bg-muted/40 px-5 py-4">
      <details className="group">
        <summary className="flex cursor-pointer items-center gap-2.5">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground/65" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
            {organizationName}
          </span>
          <ChevronRight className="h-3 w-3 text-muted-foreground/55 transition-transform group-open:rotate-90" />
        </summary>
        <div className="mt-3 pl-6">
          {summaryContent ? (
            <p className="text-[15px] leading-relaxed text-foreground/85">
              {summaryContent}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/60 italic">
              Nog geen organisatie-samenvatting beschikbaar
            </p>
          )}
          {summaryCreatedAt && (
            <p className="mt-2 text-[10px] text-muted-foreground/55">
              Bijgewerkt {timeAgo(summaryCreatedAt)}
            </p>
          )}
        </div>
      </details>
    </section>
  );
}
