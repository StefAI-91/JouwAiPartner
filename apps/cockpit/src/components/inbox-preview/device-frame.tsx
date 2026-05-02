import type { ReactNode } from "react";

interface DeviceFrameProps {
  url: string;
  caption: string;
  index: string;
  children: ReactNode;
  /**
   * Tonal accent voor het kapje boven de frame. `team` = teal/inkt voor cockpit,
   * `client` = warmer green voor portal. Subtiel onderscheid, geen luide kleuren.
   */
  variant: "team" | "client";
}

/**
 * macOS-achtige browser-window-shell. Nooit gebruikt in productie — uitsluitend
 * voor de inbox-blueprint preview-pagina (visualisatie van CC-001/CC-005/CC-006).
 */
export function DeviceFrame({ url, caption, index, children, variant }: DeviceFrameProps) {
  const accentClass =
    variant === "team"
      ? "from-[oklch(0.45_0.12_175)]/0 via-[oklch(0.45_0.12_175)]/40 to-[oklch(0.45_0.12_175)]/0"
      : "from-primary/0 via-primary/40 to-primary/0";

  return (
    <figure className="flex flex-col">
      {/* Caption strip boven het frame: index-nummer + role-label */}
      <header className="mb-4 flex items-baseline justify-between gap-4 px-1">
        <div className="flex items-baseline gap-3">
          <span className="font-serif-display text-2xl leading-none text-foreground/40 italic">
            {index}
          </span>
          <span className="text-[11px] tracking-[0.18em] text-muted-foreground/80 uppercase">
            {caption}
          </span>
        </div>
        <span aria-hidden className={`h-px w-24 bg-gradient-to-r ${accentClass} hidden sm:block`} />
      </header>

      <div className="relative">
        {/* Soft elevation behind the frame */}
        <div
          aria-hidden
          className="absolute -inset-x-6 -bottom-8 -top-2 -z-10 rounded-[2rem] bg-gradient-to-b from-foreground/[0.02] via-transparent to-foreground/[0.04] blur-xl"
        />

        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/[0.08] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.18),0_8px_20px_-12px_rgba(0,0,0,0.12)]">
          {/* Window chrome — traffic lights + URL bar */}
          <div className="flex items-center gap-3 border-b border-border/60 bg-muted/40 px-4 py-3 backdrop-blur-sm">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#FF5F57] ring-1 ring-black/5" />
              <span className="h-3 w-3 rounded-full bg-[#FEBC2E] ring-1 ring-black/5" />
              <span className="h-3 w-3 rounded-full bg-[#28C840] ring-1 ring-black/5" />
            </div>
            <div className="ml-2 flex flex-1 items-center gap-2 rounded-md bg-background/70 px-3 py-1.5 ring-1 ring-foreground/[0.06]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-3 w-3 text-success/70"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="font-mono text-[11px] text-muted-foreground">{url}</span>
            </div>
          </div>

          {/* Inner viewport */}
          <div className="bg-background relative">{children}</div>
        </div>
      </div>
    </figure>
  );
}
