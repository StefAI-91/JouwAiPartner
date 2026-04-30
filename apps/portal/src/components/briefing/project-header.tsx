import { ExternalLink } from "lucide-react";
import { STATUS_LABELS, type ProjectStatus } from "@repo/database/constants/projects";
import type { PortalBriefingHeader } from "@repo/database/queries/portal";

interface ProjectHeaderProps {
  header: PortalBriefingHeader;
}

/**
 * CP-010 — Briefing-header. Toont de drie publieke project-kerngegevens
 * (organisatie, naam, status) plus de actie-elementen die de klant nodig
 * heeft: preview-knop, productie-knop, statische screenshot. Ontbrekende
 * velden vallen weg — geen lege placeholders.
 */
export function ProjectHeader({ header }: ProjectHeaderProps) {
  const statusLabel = STATUS_LABELS[header.status as ProjectStatus] ?? header.status;
  const hasDeployLinks = Boolean(header.preview_url || header.production_url);

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

      {header.screenshot_url ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-muted" />
              <span className="size-2.5 rounded-full bg-muted" />
              <span className="size-2.5 rounded-full bg-muted" />
            </div>
            {header.production_url ? (
              <span className="font-mono text-[11px] text-muted-foreground">
                {new URL(header.production_url).host}
              </span>
            ) : null}
            <span className="text-[11px] text-muted-foreground/70">screenshot</span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={header.screenshot_url}
            alt={`Screenshot van ${header.name}`}
            loading="lazy"
            className="aspect-[16/7] w-full object-cover"
          />
        </div>
      ) : null}
    </header>
  );
}
