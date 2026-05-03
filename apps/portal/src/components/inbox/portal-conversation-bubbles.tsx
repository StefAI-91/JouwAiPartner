import type { ConversationMessage } from "@repo/database/queries/inbox";

/**
 * CC-006 — Portal-zijde bubbles. iMessage-stijl: eigen bericht (klant)
 * rechts in donker, team links in licht. Plain text met
 * `whitespace-pre-line` — geen markdown in v1.
 *
 * `currentProfileId` bepaalt de zijde. Klant ziet eigen replies rechts;
 * team-replies links. Spiegel van `apps/cockpit/.../conversation-bubbles.tsx`
 * maar met portal-token-set en "klant rechts"-perspectief.
 */
export function PortalConversationBubbles({
  messages,
  currentProfileId,
}: {
  messages: ConversationMessage[];
  currentProfileId: string;
}) {
  return (
    <div className="flex-1 space-y-3 px-1 py-4">
      {messages.map((msg, i) => {
        const day = formatDayKey(msg.created_at);
        const prevDay = i > 0 ? formatDayKey(messages[i - 1]!.created_at) : null;
        const showDivider = day !== prevDay;
        const isMine = msg.sender_profile_id === currentProfileId;
        return (
          <div key={msg.id}>
            {showDivider ? <DateDivider iso={msg.created_at} /> : null}
            <Bubble msg={msg} alignment={isMine ? "right" : "left"} />
          </div>
        );
      })}
    </div>
  );
}

function formatDayKey(iso: string): string {
  return iso.slice(0, 10);
}

function DateDivider({ iso }: { iso: string }) {
  const label = formatDayLabel(iso);
  return (
    <div className="relative my-4 flex items-center justify-center">
      <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-border/60" />
      <span className="relative bg-background px-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
        {label}
      </span>
    </div>
  );
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dayStart = new Date(d);
  dayStart.setHours(0, 0, 0, 0);

  if (dayStart.getTime() === today.getTime()) return "Vandaag";
  if (dayStart.getTime() === yesterday.getTime()) return "Gisteren";
  const months = [
    "jan",
    "feb",
    "mrt",
    "apr",
    "mei",
    "jun",
    "jul",
    "aug",
    "sep",
    "okt",
    "nov",
    "dec",
  ];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function Bubble({ msg, alignment }: { msg: ConversationMessage; alignment: "left" | "right" }) {
  const isRight = alignment === "right";
  const initial = (msg.sender?.full_name ?? "?").charAt(0).toUpperCase();
  const name = msg.sender?.full_name ?? "Onbekend";
  const ts = formatTime(msg.created_at);

  return (
    <div className={`mb-3 flex gap-2.5 ${isRight ? "flex-row-reverse" : "flex-row"}`}>
      <span
        className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ring-1 ${
          isRight
            ? "bg-foreground/[0.06] text-foreground ring-foreground/[0.12]"
            : "bg-primary/10 text-primary ring-primary/20"
        }`}
      >
        {initial}
      </span>
      <div className={`max-w-[80%] ${isRight ? "items-end" : "items-start"} flex flex-col`}>
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-medium text-foreground">{name.split(" ")[0]}</span>
          <span className="text-[10px] tabular-nums text-muted-foreground/60">{ts}</span>
        </div>
        <div
          className={`mt-1 whitespace-pre-line rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ring-1 ${
            // PR-026 — eigen-bubble was zwart op desktop te zwaar; lichtere
            // primary-tint met dezelfde "rechts = jij"-affordance.
            isRight
              ? "rounded-tr-md bg-primary/10 text-foreground ring-primary/20"
              : "rounded-tl-md bg-background text-foreground ring-foreground/[0.08]"
          }`}
        >
          {msg.body}
        </div>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}
