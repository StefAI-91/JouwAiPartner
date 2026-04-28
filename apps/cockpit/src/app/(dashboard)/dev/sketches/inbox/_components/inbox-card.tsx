import { Sparkles, Mail, Bell, Moon, Edit3, Check } from "lucide-react";
import type { InboxItem } from "./mock-inbox";

interface InboxCardProps {
  item: InboxItem;
  variant: "mobile" | "desktop";
}

export function InboxCard({ item, variant }: InboxCardProps) {
  const compact = variant === "mobile";
  const isReminder = item.bucket === "intern";

  return (
    <article
      className={`overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md ${
        isReminder ? "border-border/60 bg-muted/20" : "border-border"
      }`}
    >
      <div className={`flex items-start gap-3 ${compact ? "p-3.5" : "p-4"}`}>
        <Avatar compact={compact} isReminder={isReminder} />
        <div className="min-w-0 flex-1 space-y-2">
          <div
            className={`flex flex-wrap items-center gap-1.5 ${
              compact ? "text-[10px]" : "text-[11px]"
            } text-muted-foreground`}
          >
            <span className="font-medium text-foreground/70">{item.context}</span>
            <span>·</span>
            <span>{item.age}</span>
          </div>

          <div>
            <p className={`${compact ? "text-[13px]" : "text-sm"} font-medium text-foreground`}>
              {item.greeting}
            </p>
            <p
              className={`${compact ? "text-[13px]" : "text-sm"} mt-0.5 leading-snug text-foreground/90`}
            >
              {item.body}
            </p>
          </div>

          {/* Mail-preview alleen bij klant + desktop */}
          {item.preview && !compact && (
            <details className="group/preview">
              <summary className="flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                <span className="group-open/preview:hidden">Preview tonen</span>
                <span className="hidden group-open/preview:inline">Preview verbergen</span>
              </summary>
              <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-md border border-border/60 bg-muted/40 p-2 text-[11px] leading-relaxed text-muted-foreground">
                {item.preview}
              </pre>
            </details>
          )}

          {isReminder ? (
            <ReminderActions compact={compact} />
          ) : (
            <ClientMailActions item={item} compact={compact} />
          )}
        </div>
      </div>
    </article>
  );
}

function ClientMailActions({ item, compact }: { item: InboxItem; compact: boolean }) {
  const textSize = compact ? "text-[11px]" : "text-xs";

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <button
        className={`inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 ${textSize} font-medium text-primary-foreground hover:opacity-90`}
      >
        <Mail className="size-3.5" />
        {item.mailLabel ?? "Draft mail"}
      </button>
      <button
        className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 ${textSize} text-muted-foreground hover:bg-muted hover:text-foreground`}
        title="Wijzig aanpak voor AI"
      >
        <Edit3 className="size-3.5" />
        Wijzig
      </button>
      <button
        className={`ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1.5 ${textSize} text-muted-foreground hover:bg-muted hover:text-foreground`}
        title="Niet nu — AI vraagt later opnieuw, data blijft bewaard"
      >
        <Moon className="size-3.5" />
        {compact ? "" : "Niet nu"}
      </button>
    </div>
  );
}

function ReminderActions({ compact }: { compact: boolean }) {
  const textSize = compact ? "text-[11px]" : "text-xs";

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <button
        className={`inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5 ${textSize} font-medium text-primary hover:bg-primary/10`}
        title="Ik pak het op — verdwijnt uit lijst"
      >
        <Check className="size-3.5" />
        Ik pak het op
      </button>
      <button
        className={`ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1.5 ${textSize} text-muted-foreground hover:bg-muted hover:text-foreground`}
        title="Herinner me later opnieuw"
      >
        <Moon className="size-3.5" />
        {compact ? "" : "Herinner later"}
      </button>
    </div>
  );
}

function Avatar({ compact, isReminder }: { compact: boolean; isReminder: boolean }) {
  const cls = isReminder ? "bg-amber-100 text-amber-700" : "bg-primary/15 text-primary";
  const Icon = isReminder ? Bell : Sparkles;
  const title = isReminder ? "Reminder — vraagt jouw aandacht" : "AI-coach — kan dit voor je doen";

  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-lg ${cls} ${
        compact ? "size-7" : "size-9"
      }`}
      title={title}
    >
      <Icon className={compact ? "size-3.5" : "size-4"} />
    </div>
  );
}
