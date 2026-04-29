import Link from "next/link";
import { Layers } from "lucide-react";
import { cn } from "@repo/ui/utils";
import type { IssueRow } from "@repo/database/queries/issues";
import type { IssueTopicMembership } from "@repo/database/queries/topics";
import { IssueRowItem } from "./issue-row";

/**
 * Type-pill voor topic-section-headers. Bug = rood, feature = paars,
 * onbekende type's vallen terug op een neutrale border. Klein + uppercase
 * mono zodat hij visueel rust toevoegt naast de topic-titel, niet schreeuwt.
 */
function TopicTypePill({ type }: { type: string | undefined }) {
  if (!type) return null;
  const config: Record<string, { label: string; className: string }> = {
    bug: { label: "Bug", className: "border-red-200 bg-red-50 text-red-700" },
    feature: {
      label: "Feature",
      className: "border-purple-200 bg-purple-50 text-purple-700",
    },
  };
  const c = config[type] ?? {
    label: type,
    className: "border-border bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 font-mono text-[0.6rem] font-medium uppercase tracking-wider leading-none",
        c.className,
      )}
    >
      {c.label}
    </span>
  );
}

interface IssueListProps {
  issues: IssueRow[];
  thumbnails?: Map<string, string>;
  topicMembership?: Map<string, IssueTopicMembership>;
  topics: { id: string; title: string; type?: string }[];
  groupedByTopic?: boolean;
  /** Vereist als groupedByTopic — voor de "Open topic"-link in section-headers. */
  projectId?: string;
  /**
   * PR-020 — Override voor de "Niet gegroepeerd"-sectie. Bevat alle
   * ongegroepeerde open issues (cross-status), zodat een actief status-
   * filter geen verbanden tussen stadia verbergt. Topic-secties blijven
   * het filter respecteren — alleen de inbox is breder.
   */
  crossStatusUngrouped?: IssueRow[];
  /**
   * PR-020 — Aantal open-status issues per topic, ongeacht de huidige
   * UI-filters. Verschil met de gerenderde count toont een "+N buiten
   * je filter"-hint op de topic-section-header zodat de developer ziet
   * dat er onder hetzelfde topic nog werk in andere stadia ligt.
   */
  topicOpenCounts?: Map<string, number>;
}

export function IssueList({
  issues,
  thumbnails,
  topicMembership,
  topics,
  groupedByTopic,
  projectId,
  crossStatusUngrouped,
  topicOpenCounts,
}: IssueListProps) {
  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">Geen issues gevonden</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Pas je filters aan of maak een nieuw issue aan.
        </p>
      </div>
    );
  }

  if (groupedByTopic) {
    return (
      <GroupedByTopic
        issues={issues}
        thumbnails={thumbnails}
        topicMembership={topicMembership}
        topics={topics}
        projectId={projectId}
        crossStatusUngrouped={crossStatusUngrouped}
        topicOpenCounts={topicOpenCounts}
      />
    );
  }

  return (
    <div className="divide-y-0">
      {issues.map((issue) => (
        <IssueRowItem
          key={issue.id}
          issue={issue}
          thumbnailPath={thumbnails?.get(issue.id)}
          topic={topicMembership?.get(issue.id)}
          topics={topics}
        />
      ))}
    </div>
  );
}

/**
 * Render issues geclusterd per topic. Sectie-volgorde: alle topics waarvoor
 * issues bestaan in alfabetische volgorde, "Niet gegroepeerd" als laatste.
 * Topics zonder issues in de huidige view tonen we niet — anders krijg je
 * een hoop lege secties bij een actieve status- of priority-filter.
 */
function GroupedByTopic({
  issues,
  thumbnails,
  topicMembership,
  topics,
  projectId,
  crossStatusUngrouped,
  topicOpenCounts,
}: Omit<IssueListProps, "groupedByTopic">) {
  // Bucket per topic-id (null voor ungrouped). Map preserveert insertion-order.
  const grouped = new Map<string | null, IssueRow[]>();
  for (const issue of issues) {
    const topicId = topicMembership?.get(issue.id)?.id ?? null;
    if (!grouped.has(topicId)) grouped.set(topicId, []);
    grouped.get(topicId)!.push(issue);
  }

  const topicById = new Map(topics.map((t) => [t.id, t]));
  const sortedTopicIds = [...grouped.keys()]
    .filter((id): id is string => id !== null)
    .sort((a, b) => {
      const ta = topicById.get(a)?.title ?? "";
      const tb = topicById.get(b)?.title ?? "";
      return ta.localeCompare(tb, "nl");
    });
  // PR-020 — als de page een cross-status-pool meegaf, vervangt die de
  // in-filter ungrouped pool helemaal. De in-filter set is een subset van
  // de cross-status set (zelfde overige filters, alleen status weggelaten),
  // dus geen risico op dubbele rendering. `extraOutsideFilter` is wat de
  // user normaal niet zou hebben gezien — dat triggert de header-hint.
  const inFilterUngrouped = grouped.get(null) ?? [];
  const ungroupedIssues = crossStatusUngrouped ?? inFilterUngrouped;
  const extraOutsideFilter = crossStatusUngrouped
    ? Math.max(0, crossStatusUngrouped.length - inFilterUngrouped.length)
    : 0;

  return (
    <div className="flex flex-col gap-4 py-3">
      {sortedTopicIds.map((topicId) => {
        const sectionIssues = grouped.get(topicId)!;
        const meta = topicById.get(topicId);
        const title = meta?.title ?? "Onbekend topic";
        // PR-020 — verschil tussen totaal-open onder dit topic en wat de
        // huidige filter laat zien. Negeer als counts ontbreken of het
        // verschil 0 is. Inclusief safety-clamp tegen ranges (open count
        // kan in theorie achterlopen op live state — geen 'negatief' tonen).
        const totalOpen = topicOpenCounts?.get(topicId) ?? sectionIssues.length;
        const extraOutsideFilter = Math.max(0, totalOpen - sectionIssues.length);
        return (
          <section
            key={topicId}
            className="overflow-hidden rounded-lg border border-border bg-card shadow-md"
          >
            <header className="flex items-baseline justify-between gap-2 border-b border-zinc-700 bg-zinc-700 px-4 py-2.5 text-white">
              <div className="flex min-w-0 items-center gap-2">
                <TopicTypePill type={meta?.type} />
                <Link
                  href={
                    projectId ? `/topics/${topicId}?project=${projectId}` : `/topics/${topicId}`
                  }
                  className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold text-white hover:underline"
                >
                  <Layers className="size-3.5 shrink-0 text-white/70" />
                  <span className="truncate">{title}</span>
                </Link>
              </div>
              <div className="flex shrink-0 items-baseline gap-2">
                {extraOutsideFilter > 0 && (
                  <span
                    className="text-xs font-medium text-amber-300"
                    title="Onder dit topic zitten ook open issues in andere stadia (bv. triage of in_progress) die buiten je actieve filter vallen. Open het topic om alles te zien."
                  >
                    +{extraOutsideFilter} buiten je filter
                  </span>
                )}
                <span className="text-xs tabular-nums text-white/70">{sectionIssues.length}</span>
              </div>
            </header>
            <div className="divide-y-0">
              {sectionIssues.map((issue) => (
                <IssueRowItem
                  key={issue.id}
                  issue={issue}
                  thumbnailPath={thumbnails?.get(issue.id)}
                  topic={topicMembership?.get(issue.id)}
                  topics={topics}
                />
              ))}
            </div>
          </section>
        );
      })}

      {ungroupedIssues.length > 0 && (
        <section className="overflow-hidden rounded-lg border border-dashed border-border bg-card shadow-md">
          <header className="flex items-baseline justify-between gap-2 border-b border-dashed border-border bg-muted/20 px-4 py-2.5">
            <span className="text-sm font-semibold text-muted-foreground">Niet gegroepeerd</span>
            <div className="flex shrink-0 items-baseline gap-2">
              {extraOutsideFilter > 0 && (
                <span
                  className="text-xs font-medium text-amber-700"
                  title="Deze ongegroepeerde issues vallen buiten je actieve status-filter, maar worden hier getoond zodat je verbanden tussen stadia kunt herkennen."
                >
                  +{extraOutsideFilter} buiten je filter
                </span>
              )}
              <span className="text-xs tabular-nums text-muted-foreground">
                {ungroupedIssues.length}
              </span>
            </div>
          </header>
          <div className="divide-y-0">
            {ungroupedIssues.map((issue) => (
              <IssueRowItem
                key={issue.id}
                issue={issue}
                thumbnailPath={thumbnails?.get(issue.id)}
                topic={undefined}
                topics={topics}
                compact
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
