import { Monitor, Server } from "lucide-react";

interface AreaSummariesProps {
  frontendSummary: string | null;
  backendSummary: string | null;
}

export function AreaSummaries({ frontendSummary, backendSummary }: AreaSummariesProps) {
  if (!frontendSummary && !backendSummary) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {frontendSummary && (
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Frontend</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{frontendSummary}</p>
        </div>
      )}
      {backendSummary && (
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Server className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Backend</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{backendSummary}</p>
        </div>
      )}
    </div>
  );
}
