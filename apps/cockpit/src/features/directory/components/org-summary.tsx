import { Sparkles } from "lucide-react";
import { timeAgoDays as timeAgo } from "@repo/ui/format";

interface OrgSummaryProps {
  content: string | null;
  createdAt?: string;
}

export function OrgSummary({ content, createdAt }: OrgSummaryProps) {
  return (
    <section className="mb-6 rounded-lg bg-[#006B3F]/[0.03] px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-[#006B3F]/60" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
          Context
        </h3>
        {createdAt && (
          <span className="text-[10px] text-muted-foreground/55">{timeAgo(createdAt)}</span>
        )}
      </div>
      {content ? (
        <p className="text-[15px] leading-relaxed text-foreground/85">{content}</p>
      ) : (
        <p className="text-sm italic text-muted-foreground/60">
          Nog geen context-samenvatting beschikbaar
        </p>
      )}
    </section>
  );
}
