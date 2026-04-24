import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, AlertTriangle } from "lucide-react";
import type { ThemeRow } from "@repo/database/queries/themes";
import type { ThemeNarrativeWithStaleness } from "@repo/database/queries/themes";
import { NarrativeRegenerateButton } from "@/features/themes/components/narrative-regenerate-button";

export interface NarrativeTabProps {
  theme: ThemeRow;
  narrative: ThemeNarrativeWithStaleness | null;
  canEdit: boolean;
}

/**
 * TH-014 (UI-400, UI-402..408) — De Verhaal-tab. Editorial-memo stijl:
 * serif-lede bovenaan, zes secties als doorlopende leeservaring, amber
 * accent op de blind-spots-sectie, signaal-check als muted voetnoot.
 *
 * States:
 *   - `narrative === null` → eerste pipeline-run heeft nog niet gedraaid
 *     voor dit thema (nieuwe thema, geen meetings, of hook faalde). Empty-
 *     state met uitleg.
 *   - `narrative.is_insufficient` → guardrail sentinel (<2 meetings).
 *     Specifieke empty-state.
 *   - `narrative.is_stale` → banner bovenaan, content blijft getoond.
 *   - Happy path → alle niet-null secties getoond.
 */
export function NarrativeTab({ theme, narrative, canEdit }: NarrativeTabProps) {
  if (narrative === null) {
    return <EmptyStateNoRun theme={theme} canEdit={canEdit} />;
  }

  if (narrative.is_insufficient) {
    return (
      <EmptyStateInsufficient
        theme={theme}
        meetingsCount={narrative.meetings_count_at_generation}
      />
    );
  }

  return (
    <article className="mx-auto max-w-5xl pt-6 pb-16">
      {/* Meta-rij: AI-badge links, regenerate-knop rechts (alleen admin) */}
      <div className="mx-auto mb-8 flex max-w-[680px] items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3.5" aria-hidden="true" />
          <span>Door AI gesynthetiseerd</span>
          <span className="text-muted-foreground/50">·</span>
          <span>{formatRelativeTime(narrative.generated_at)}</span>
        </div>
        {canEdit && <NarrativeRegenerateButton themeId={theme.id} />}
      </div>

      {/* Staleness banner */}
      {narrative.is_stale && (
        <div className="mx-auto mb-8 flex max-w-[680px] items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <p>Er zijn nieuwe meetings sinds deze synthese — wordt binnenkort bijgewerkt.</p>
        </div>
      )}

      {/* Lede (briefing) */}
      <section className="mx-auto mb-14 max-w-[680px]">
        <SectionEyebrow>De kern</SectionEyebrow>
        <p className="font-serif-display text-[1.75rem] leading-[1.35] tracking-tight text-foreground">
          {narrative.briefing}
        </p>
      </section>

      {/* Patronen */}
      {narrative.patterns && (
        <NarrativeSection eyebrow="Wat we terug zien komen" body={narrative.patterns} />
      )}

      {/* Alignment */}
      {narrative.alignment && (
        <NarrativeSection eyebrow="Waar jullie samen staan" body={narrative.alignment} />
      )}

      {/* Frictie */}
      {narrative.friction && (
        <NarrativeSection eyebrow="Waar het schuurt" body={narrative.friction} />
      )}

      {/* Wat nog hangt */}
      {narrative.open_points && (
        <NarrativeSection eyebrow="Wat nog hangt" body={narrative.open_points} />
      )}

      {/* De blinde vlek — hero sectie met warme accent */}
      {narrative.blind_spots && (
        <section className="mx-auto mb-14 max-w-[680px]">
          <div className="rounded-lg border-l-[3px] border-warning bg-warning/10 px-6 py-7 md:px-8">
            <SectionEyebrow tone="warning">De blinde vlek</SectionEyebrow>
            <NarrativeBody body={narrative.blind_spots} tone="warning" />
          </div>
        </section>
      )}

      {/* Signaal-check — voetnoot onderin */}
      <footer className="mx-auto max-w-[680px] border-t border-border/60 pt-8">
        <SectionEyebrow>Signaal-check</SectionEyebrow>
        <dl className="space-y-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
          <div className="flex gap-3">
            <dt className="w-40 shrink-0 font-medium text-foreground/80">Signaal-sterkte</dt>
            <dd>
              <SignalStrengthPill strength={narrative.signal_strength} />
              <span className="ml-2">
                · {narrative.meetings_count_at_generation} meetings als basis
              </span>
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-40 shrink-0 font-medium text-foreground/80">Wat mist</dt>
            <dd>{narrative.signal_notes}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-40 shrink-0 font-medium text-foreground/80">Bron</dt>
            <dd>
              Per-meeting summaries · laatst bijgewerkt {formatRelativeTime(narrative.updated_at)}
            </dd>
          </div>
        </dl>
      </footer>
    </article>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SectionEyebrow({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "warning";
}) {
  const toneClass = tone === "warning" ? "text-warning-foreground/80" : "text-muted-foreground";
  return (
    <p className={`mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] ${toneClass}`}>
      {children}
    </p>
  );
}

function NarrativeSection({ eyebrow, body }: { eyebrow: string; body: string }) {
  return (
    <section className="mx-auto mb-14 max-w-[680px]">
      <SectionEyebrow>{eyebrow}</SectionEyebrow>
      <NarrativeBody body={body} />
    </section>
  );
}

const NARRATIVE_PROSE_CLASSES = [
  "prose prose-sm max-w-none text-foreground/85",
  "[&_p]:text-[1.0625rem] [&_p]:leading-[1.75] [&_p]:my-4",
  "[&_ul]:my-4 [&_ul]:pl-5 [&_ul]:space-y-2",
  "[&_li]:text-[1.0625rem] [&_li]:leading-relaxed [&_li]:marker:text-muted-foreground/40",
  "[&_strong]:text-foreground [&_strong]:font-semibold",
  "[&_blockquote]:my-4 [&_blockquote]:ml-0 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-5 [&_blockquote]:py-0.5 [&_blockquote]:not-italic",
  "[&_blockquote_p]:font-serif-display [&_blockquote_p]:italic [&_blockquote_p]:text-[1.125rem] [&_blockquote_p]:leading-snug [&_blockquote_p]:text-foreground/75",
  "[&_em]:not-italic [&_em]:font-medium [&_em]:text-foreground",
].join(" ");

const NARRATIVE_PROSE_WARNING_CLASSES = [
  "prose prose-sm max-w-none",
  "[&_p]:text-[1.0625rem] [&_p]:leading-[1.75] [&_p]:my-4 [&_p]:text-warning-foreground/90",
  "[&_p:first-child]:font-serif-display [&_p:first-child]:text-[1.375rem] [&_p:first-child]:leading-snug [&_p:first-child]:text-warning-foreground",
  "[&_ul]:my-4 [&_ul]:pl-5 [&_ul]:space-y-2",
  "[&_li]:text-[1.0625rem] [&_li]:leading-relaxed [&_li]:text-warning-foreground/90",
  "[&_strong]:text-warning-foreground [&_strong]:font-semibold",
  "[&_blockquote]:my-4 [&_blockquote]:ml-0 [&_blockquote]:border-l-2 [&_blockquote]:border-warning/60 [&_blockquote]:pl-5 [&_blockquote]:py-0.5 [&_blockquote]:not-italic",
  "[&_em]:not-italic [&_em]:font-medium",
].join(" ");

function NarrativeBody({ body, tone = "default" }: { body: string; tone?: "default" | "warning" }) {
  const classes = tone === "warning" ? NARRATIVE_PROSE_WARNING_CLASSES : NARRATIVE_PROSE_CLASSES;
  return (
    <div className={classes}>
      <Markdown remarkPlugins={[remarkGfm]}>{body}</Markdown>
    </div>
  );
}

function SignalStrengthPill({
  strength,
}: {
  strength: "sterk" | "matig" | "zwak" | "onvoldoende";
}) {
  const variants: Record<typeof strength, { label: string; dot: string; text: string }> = {
    sterk: { label: "Sterk", dot: "bg-success", text: "text-foreground" },
    matig: { label: "Matig", dot: "bg-warning", text: "text-foreground" },
    zwak: { label: "Zwak", dot: "bg-muted-foreground/70", text: "text-muted-foreground" },
    onvoldoende: {
      label: "Onvoldoende",
      dot: "bg-muted-foreground/40",
      text: "text-muted-foreground",
    },
  };
  const v = variants[strength];
  return (
    <span className={`inline-flex items-center gap-1.5 ${v.text}`}>
      <span className={`size-1.5 rounded-full ${v.dot}`} aria-hidden="true" />
      {v.label}
    </span>
  );
}

// ─── Empty states ───────────────────────────────────────────────────────────

function EmptyStateNoRun({ theme, canEdit }: { theme: ThemeRow; canEdit: boolean }) {
  return (
    <article className="mx-auto max-w-5xl pt-6 pb-16">
      <div className="mx-auto max-w-[680px] rounded-lg border border-dashed border-border bg-muted/30 px-8 py-12 text-center">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Verhaal
        </p>
        <h2 className="mt-3 font-serif-display text-2xl text-foreground">
          Nog geen narrative voor dit thema
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Zodra er minstens twee meetings met een samenvatting onder{" "}
          <span className="font-medium text-foreground">{theme.name}</span> zijn binnengekomen,
          verschijnt hier de gesynthetiseerde thema-pagina.
        </p>
        {canEdit && (
          <div className="mt-5 flex justify-center">
            <NarrativeRegenerateButton themeId={theme.id} />
          </div>
        )}
      </div>
    </article>
  );
}

function EmptyStateInsufficient({
  theme,
  meetingsCount,
}: {
  theme: ThemeRow;
  meetingsCount: number;
}) {
  const needed = 2;
  return (
    <article className="mx-auto max-w-5xl pt-6 pb-16">
      <div className="mx-auto max-w-[680px] rounded-lg border border-dashed border-border bg-muted/30 px-8 py-12 text-center">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Verhaal
        </p>
        <h2 className="mt-3 font-serif-display text-2xl text-foreground">Dit thema is nog jong</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Na meer meetings verschijnt hier het verhaal van{" "}
          <span className="font-medium text-foreground">{theme.name}</span>. We synthetiseren pas
          bij twee of meer meetings om hallucinatie op dun signaal te voorkomen.
        </p>
        <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-background px-3 py-1 text-xs text-muted-foreground">
          <span className="font-mono text-foreground">
            {meetingsCount} / {needed}
          </span>
          <span>meetings</span>
        </div>
      </div>
    </article>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return "onbekend";
  const diffMs = Date.now() - target;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "zojuist";
  if (minutes < 60) return `${minutes} min geleden`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} u geleden`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d geleden`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} w geleden`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mnd geleden`;
  return `${Math.floor(months / 12)} jaar geleden`;
}
