import { ExternalLink } from "lucide-react";
import { STATUS_LABELS, type ProjectStatus } from "@repo/database/constants/projects";
import type { PortalBriefingHeader } from "@repo/database/queries/portal";

interface ProjectHeaderProps {
  header: PortalBriefingHeader;
}

/**
 * CP-010 — Briefing-header. Toont de drie publieke project-kerngegevens
 * (organisatie, naam, status) plus de actie-elementen die de klant nodig
 * heeft: preview-knop, productie-knop, en een live preview van de
 * productie-site via iframe (fallback: handmatige screenshot). Ontbrekende
 * velden vallen weg — geen lege placeholders.
 *
 * Iframe-aanpak: veel sites blokkeren framing via X-Frame-Options of CSP
 * `frame-ancestors`. Voor die gevallen blijft `screenshot_url` als
 * handmatige fallback bestaan; vul die alleen in als de live frame leeg
 * blijkt.
 */
export function ProjectHeader({ header }: ProjectHeaderProps) {
  const statusLabel = STATUS_LABELS[header.status as ProjectStatus] ?? header.status;
  const hasDeployLinks = Boolean(header.preview_url || header.production_url);
  const previewHost = header.production_url ? safeHost(header.production_url) : null;

  return (
    <header className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          {header.organization ? (
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {header.organization.name}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{header.name}</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              <span className="size-1.5 rounded-full bg-primary" />
              {statusLabel}
            </span>
          </div>
        </div>
        {hasDeployLinks ? (
          <div className="flex flex-wrap gap-2">
            {header.preview_url ? (
              <a
                href={header.preview_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium shadow-soft transition-colors hover:bg-muted"
              >
                Bekijk preview
                <ExternalLink className="size-4 text-muted-foreground" />
              </a>
            ) : null}
            {header.production_url ? (
              <a
                href={header.production_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-foreground bg-foreground px-3.5 py-2 text-sm font-medium text-background shadow-soft transition-colors hover:bg-foreground/90"
              >
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Bekijk productie
                <ExternalLink className="size-4" />
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      {header.production_url || header.screenshot_url ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-muted" />
              <span className="size-2.5 rounded-full bg-muted" />
              <span className="size-2.5 rounded-full bg-muted" />
            </div>
            {previewHost ? (
              <span className="font-mono text-[11px] text-muted-foreground">{previewHost}</span>
            ) : null}
            <span className="text-[11px] text-muted-foreground/70">
              {header.production_url ? "live" : "screenshot"}
            </span>
          </div>
          {header.production_url ? (
            <iframe
              src={header.production_url}
              title={`Live preview van ${header.name}`}
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              referrerPolicy="no-referrer"
              className="aspect-[16/7] w-full bg-background"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={header.screenshot_url ?? ""}
              alt={`Screenshot van ${header.name}`}
              loading="lazy"
              className="aspect-[16/7] w-full object-cover"
            />
          )}
        </div>
      ) : null}
    </header>
  );
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
