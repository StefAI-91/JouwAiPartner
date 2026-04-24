import type { TimelineMonthGroup } from "../utils/group-timeline-by-month";
import { TimelineEntryItem } from "./timeline-entry";

interface TimelineMonthSectionProps {
  group: TimelineMonthGroup;
}

export function TimelineMonthSection({ group }: TimelineMonthSectionProps) {
  return (
    <section data-month={group.month}>
      <header className="sticky top-0 z-[5] -ml-1 pl-1 py-2 mb-3 border-b border-gray-200 backdrop-blur-sm bg-[#fafaf9]/90">
        <div className="flex items-baseline gap-2">
          <h3 className="text-base font-bold text-foreground">{group.label}</h3>
          <span className="text-xs text-muted-foreground">
            · {group.entries.length} {group.entries.length === 1 ? "touchpoint" : "touchpoints"}
          </span>
        </div>
      </header>
      <div className="space-y-3">
        {group.entries.map((entry, i) => (
          <TimelineEntryItem key={`${entry.date}-${i}`} entry={entry} />
        ))}
      </div>
    </section>
  );
}
