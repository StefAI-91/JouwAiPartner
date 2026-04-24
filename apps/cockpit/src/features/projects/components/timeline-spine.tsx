interface SpineMonth {
  key: string;
  shortLabel: string;
  isFuture?: boolean;
}

interface TimelineSpineProps {
  months: SpineMonth[];
  activeMonth: string | null;
  scrollPercent: number;
  kickoffLabel: string;
  deadlineLabel: string;
}

export function TimelineSpine({
  months,
  activeMonth,
  scrollPercent,
  kickoffLabel,
  deadlineLabel,
}: TimelineSpineProps) {
  return (
    <aside className="sticky top-0 h-full max-h-[640px]">
      <div className="relative h-full flex flex-col py-2">
        <div className="mb-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Kickoff
          </p>
          <p className="text-xs font-semibold text-foreground/80">{kickoffLabel}</p>
        </div>

        <div className="relative flex-1 mx-3">
          <div
            className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 rounded-full"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,107,63,0.4) 0%, rgba(0,107,63,0.15) 50%, rgba(0,107,63,0.05) 100%)",
            }}
          />
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 rounded-full transition-all duration-200"
            style={{ height: `${scrollPercent}%`, background: "#006B3F" }}
          />
          <div
            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-200"
            style={{ top: `${scrollPercent}%` }}
            aria-hidden
          >
            <div className="relative">
              <div className="absolute inset-0 h-3.5 w-3.5 rounded-full bg-[#006B3F] animate-ping opacity-40" />
              <div className="relative h-3.5 w-3.5 rounded-full bg-[#006B3F] border-2 border-white shadow" />
            </div>
          </div>

          <div className="absolute inset-0 flex flex-col justify-between py-1">
            {months.map((m) => {
              const isActive = m.key === activeMonth;
              return (
                <div key={m.key} className="relative">
                  <div
                    className="h-2 w-2 rounded-full mx-auto transition-all duration-300"
                    style={{
                      background: isActive ? "#006B3F" : m.isFuture ? "#e5e7eb" : "#d1d5db",
                      transform: isActive ? "scale(1.4)" : undefined,
                      boxShadow: isActive ? "0 0 0 4px rgba(0, 107, 63, 0.15)" : undefined,
                    }}
                  />
                  <span
                    className={`absolute left-full ml-2 top-1/2 -translate-y-1/2 text-[10px] font-medium whitespace-nowrap ${
                      m.isFuture ? "text-muted-foreground/50" : "text-muted-foreground"
                    }`}
                  >
                    {m.shortLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-600">
            Deadline
          </p>
          <p className="text-xs font-semibold text-foreground/80">{deadlineLabel}</p>
        </div>
      </div>
    </aside>
  );
}
