import { AlertTriangle, Mail, Clock } from "lucide-react";

interface TabHeaderProps {
  variant: "mobile" | "desktop";
  followupCount: number;
  riskCount: number;
}

export function TabHeader({ variant, followupCount, riskCount }: TabHeaderProps) {
  const isMobile = variant === "mobile";
  const padX = isMobile ? "px-4" : "px-6";
  const padTop = isMobile ? "pt-3" : "pt-4";
  const padBot = isMobile ? "pb-2" : "pb-3";
  const trigger = isMobile ? "px-2.5 py-1.5" : "px-3 py-1.5";
  const label = isMobile ? "Opvolgen" : "Opvolgsuggesties";

  return (
    <div
      className={`flex items-center justify-between border-b border-border ${padX} ${padTop} ${padBot}`}
    >
      <div className="flex items-center gap-1">
        <button
          className={`flex items-center gap-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted ${trigger}`}
        >
          <AlertTriangle className="size-4 text-red-500" />
          Risico&apos;s
          <span className="rounded-full bg-red-100 px-1.5 text-[10px] font-semibold text-red-700">
            {riskCount}
          </span>
        </button>
        <button
          className={`flex items-center gap-1.5 rounded-md border-b-2 border-primary bg-primary/10 text-sm font-medium text-primary ${trigger}`}
        >
          <Mail className="size-4 text-amber-500" />
          {label}
          <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700">
            {followupCount}
          </span>
        </button>
      </div>

      {!isMobile && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="size-3 text-primary" />
          AI volgt automatisch op — snooze wat niet hoeft
        </p>
      )}
    </div>
  );
}

export function MobileSubHeader() {
  return (
    <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
      <p className="flex items-center gap-1 text-[11px] leading-tight text-muted-foreground">
        <Clock className="size-3 text-primary" />
        AI volgt deze automatisch op
      </p>
      <button className="text-[11px] text-muted-foreground/70 hover:text-foreground">
        Hoe werkt dit?
      </button>
    </div>
  );
}
