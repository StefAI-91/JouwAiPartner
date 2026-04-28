import { Users, Building2, Sparkles } from "lucide-react";
import { InboxCard } from "./inbox-card";
import { MOCK_INBOX, countByBucket, type InboxBucket } from "./mock-inbox";

interface InboxPageFrameProps {
  variant: "mobile" | "desktop";
  /** Tab die in deze frame als actief getoond wordt. */
  activeBucket: InboxBucket;
}

export function InboxPageFrame({ variant, activeBucket }: InboxPageFrameProps) {
  const counts = countByBucket(MOCK_INBOX);
  const items = MOCK_INBOX.filter((i) => i.bucket === activeBucket);
  const compact = variant === "mobile";

  return (
    <div className="flex flex-col">
      {/* Page header */}
      <header
        className={`border-b border-border bg-card ${
          compact ? "px-4 pt-4 pb-3" : "px-6 pt-5 pb-4"
        }`}
      >
        <div className="flex items-center gap-2">
          <Sparkles className={`text-primary ${compact ? "size-4" : "size-5"}`} />
          <h1 className={`font-semibold text-foreground ${compact ? "text-base" : "text-lg"}`}>
            AI-coach
          </h1>
        </div>
        <p className={`mt-1 ${compact ? "text-[11px]" : "text-xs"} text-muted-foreground`}>
          Suggesties voor opvolging — bevestig wat je wilt laten doen.
        </p>
      </header>

      {/* Tabs */}
      <div
        className={`flex gap-1 border-b border-border bg-card ${
          compact ? "px-2 pt-2" : "px-4 pt-3"
        }`}
      >
        <Tab
          icon={<Building2 className="size-4" />}
          label={compact ? "Klant" : "Klanten"}
          count={counts.klant}
          active={activeBucket === "klant"}
          tone="amber"
          compact={compact}
        />
        <Tab
          icon={<Users className="size-4" />}
          label={compact ? "Intern" : "Team"}
          count={counts.intern}
          active={activeBucket === "intern"}
          tone="primary"
          compact={compact}
        />
      </div>

      {/* List */}
      <div className={`space-y-2 bg-muted/40 ${compact ? "p-3" : "p-6"}`}>
        {items.map((item) => (
          <InboxCard key={item.id} item={item} variant={variant} />
        ))}
      </div>
    </div>
  );
}

function Tab({
  icon,
  label,
  count,
  active,
  tone,
  compact,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  tone: "amber" | "primary";
  compact: boolean;
}) {
  const activeBg = active ? "bg-primary/10 text-primary border-b-2 border-primary" : "";
  const padding = compact ? "px-2.5 py-1.5" : "px-3 py-2";
  const countCls = tone === "amber" ? "bg-amber-100 text-amber-700" : "bg-primary/15 text-primary";

  return (
    <button
      className={`flex items-center gap-1.5 rounded-md text-sm font-medium transition-colors ${padding} ${
        active ? activeBg : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {icon}
      {label}
      <span className={`rounded-full px-1.5 text-[10px] font-semibold ${countCls}`}>{count}</span>
    </button>
  );
}
