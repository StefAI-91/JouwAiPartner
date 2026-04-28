import { Sparkles, Mail, Send, Bell, FileText, Moon, Edit3 } from "lucide-react";
import type { InboxItem } from "./mock-inbox";

const ACTION_ICONS = {
  "draft-mail": Mail,
  "send-ping": Send,
  remind: Bell,
  summarise: FileText,
} as const;

interface InboxCardProps {
  item: InboxItem;
  variant: "mobile" | "desktop";
}

export function InboxCard({ item, variant }: InboxCardProps) {
  const Icon = ACTION_ICONS[item.primaryAction.kind];
  const compact = variant === "mobile";

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className={`flex items-start gap-3 ${compact ? "p-3.5" : "p-4"}`}>
        <AiAvatar compact={compact} />
        <div className="min-w-0 flex-1 space-y-2">
          {/* Context-row */}
          <div
            className={`flex flex-wrap items-center gap-1.5 ${
              compact ? "text-[10px]" : "text-[11px]"
            } text-muted-foreground`}
          >
            <span className="font-medium text-foreground/70">{item.context}</span>
            <span>·</span>
            <span>{item.age}</span>
          </div>

          {/* AI message */}
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

          {/* Optional preview */}
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

          {/* Actions row */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              className={`inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 ${
                compact ? "text-[11px]" : "text-xs"
              } font-medium text-primary-foreground hover:opacity-90`}
            >
              <Icon className="size-3.5" />
              {item.primaryAction.label}
            </button>
            <button
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 ${
                compact ? "text-[11px]" : "text-xs"
              } text-muted-foreground hover:bg-muted hover:text-foreground`}
              title="Wijzig aanpak voor AI"
            >
              <Edit3 className="size-3.5" />
              Wijzig
            </button>
            <button
              className={`ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1.5 ${
                compact ? "text-[11px]" : "text-xs"
              } text-muted-foreground hover:bg-muted hover:text-foreground`}
              title="Niet nu — AI vraagt later opnieuw, data blijft bewaard"
            >
              <Moon className="size-3.5" />
              {compact ? "" : "Niet nu"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function AiAvatar({ compact }: { compact: boolean }) {
  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ${
        compact ? "size-7" : "size-9"
      }`}
      title="AI-coach"
    >
      <Sparkles className={compact ? "size-3.5" : "size-4"} />
    </div>
  );
}
