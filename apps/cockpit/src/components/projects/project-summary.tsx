import { Sparkles } from "lucide-react";
import { timeAgo } from "@/lib/date-utils";

interface ProjectSummaryProps {
  content: string | null;
  version?: number;
  createdAt?: string;
}

export function ProjectSummary({ content, createdAt }: ProjectSummaryProps) {
  return (
    <section className="mb-6 rounded-lg bg-[#006B3F]/[0.03] px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-3.5 w-3.5 text-[#006B3F]/60" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
          Project Summary
        </h3>
        {createdAt && (
          <span className="text-[10px] text-muted-foreground/55">{timeAgo(createdAt)}</span>
        )}
      </div>
      {content ? (
        <p className="text-[15px] leading-relaxed text-foreground/85">{content}</p>
      ) : (
        <p className="text-sm text-muted-foreground/60 italic">Nog geen samenvatting beschikbaar</p>
      )}
    </section>
  );
}
