import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { cn } from "@repo/ui/utils";

interface PanelCardProps {
  title: string;
  icon: ComponentType<LucideProps>;
  iconClassName?: string;
  iconBgClassName?: string;
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function PanelCard({
  title,
  icon: Icon,
  iconClassName,
  iconBgClassName,
  meta,
  className,
  children,
}: PanelCardProps) {
  return (
    <Card className={cn("flex h-full flex-col", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("rounded-lg p-1.5", iconBgClassName ?? "bg-muted")}>
              <Icon className={cn("size-4", iconClassName ?? "text-foreground")} />
            </div>
            <CardTitle>{title}</CardTitle>
          </div>
          {meta && (
            <span className="text-xs text-muted-foreground" data-testid="panel-meta">
              {meta}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">{children}</CardContent>
    </Card>
  );
}

export function PanelEmpty({ children }: { children: ReactNode }) {
  return <p className="text-sm italic text-muted-foreground">{children}</p>;
}

export function SourceLink({ meeting }: { meeting: { id: string; title: string | null } | null }) {
  if (!meeting) return null;
  return (
    <a
      href={`/meetings/${meeting.id}`}
      className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
    >
      bron: {meeting.title ?? "meeting"}
    </a>
  );
}
