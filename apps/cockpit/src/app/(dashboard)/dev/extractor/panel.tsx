import type { ReactNode } from "react";
import { CopyButton } from "./copy-button";

export function Panel({
  title,
  count,
  accent,
  copyValue,
  children,
}: {
  title: string;
  count?: number;
  accent?: boolean;
  copyValue?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex max-h-[600px] flex-col overflow-hidden rounded-xl bg-card ring-1 ${
        accent ? "ring-primary/30" : "ring-foreground/10"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <p className="text-xs font-semibold">{title}</p>
        <div className="flex items-center gap-2">
          {count !== undefined && (
            <span className="text-[10px] text-muted-foreground">{count}</span>
          )}
          {copyValue && <CopyButton value={copyValue} />}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3">{children}</div>
    </div>
  );
}

export function summariseMetadata(meta: Record<string, unknown>): string {
  const entries = Object.entries(meta).filter(
    ([k, v]) => v !== null && v !== undefined && k !== "theme",
  );
  if (entries.length === 0) return "geen metadata";
  return entries
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" · ");
}
