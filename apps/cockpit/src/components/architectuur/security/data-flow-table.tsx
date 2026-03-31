import { ArrowRight } from "lucide-react";
import { SensitivityBadge } from "@/components/architectuur/security/sensitivity-badge";
import type { DataField } from "@/app/(dashboard)/architectuur/security/_data/integrations";

interface DataFlowTableProps {
  title: string;
  direction: "in" | "out";
  fields: DataField[];
}

export function DataFlowTable({ title, direction, fields }: DataFlowTableProps) {
  if (fields.length === 0) return null;

  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <ArrowRight className={`h-3 w-3 ${direction === "in" ? "rotate-180" : ""}`} />
        {title}
      </p>
      <div className="space-y-1.5">
        {fields.map((field) => (
          <div
            key={field.name}
            className="flex items-start gap-2 rounded-md border border-border/50 bg-muted/20 px-3 py-2"
          >
            <SensitivityBadge level={field.sensitivity} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">{field.name}</p>
              <p className="text-[11px] text-muted-foreground">{field.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
