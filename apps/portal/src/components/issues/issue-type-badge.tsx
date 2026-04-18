import { Bug, HelpCircle, Lightbulb } from "lucide-react";
import { cn } from "@repo/ui/utils";
import { translateType } from "@/lib/issue-type";

interface IssueTypeBadgeProps {
  type: string;
  className?: string;
}

export function IssueTypeBadge({ type, className }: IssueTypeBadgeProps) {
  const label = translateType(type);
  const iconClass = "size-3";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground",
        className,
      )}
    >
      {type === "bug" ? (
        <Bug className={iconClass} />
      ) : type === "feature_request" ? (
        <Lightbulb className={iconClass} />
      ) : (
        <HelpCircle className={iconClass} />
      )}
      {label}
    </span>
  );
}
