import Link from "next/link";
import {
  countIssuesPerTopic,
  listTopics,
  type ListTopicsFilters,
} from "@repo/database/queries/topics";
import { createPageClient } from "@repo/auth/helpers";
import {
  TOPIC_LIFECYCLE_STATUSES,
  TOPIC_TYPES,
  type TopicLifecycleStatus,
  type TopicType,
} from "@repo/database/constants/topics";
import { TopicCard } from "./topic-card";

interface TopicListProps {
  projectId: string;
  filters: {
    type?: TopicType;
    status?: TopicLifecycleStatus;
  };
}

/**
 * Topic-lijst voor `/topics?project=…`. Server Component — leest filters
 * uit query-params, doet 2 queries (list + counts) en rendert kaarten.
 * Filters zijn `<select>` met form-action zodat de keuze in de URL belandt
 * (server-state, geen client-state-management — past bij Next 16-conventie).
 */
export async function TopicList({ projectId, filters }: TopicListProps) {
  const supabase = await createPageClient();
  const queryFilters: ListTopicsFilters = {};
  if (filters.type) queryFilters.type = filters.type;
  if (filters.status) queryFilters.status = filters.status;

  const topics = await listTopics(projectId, queryFilters, supabase);
  const counts = await countIssuesPerTopic(
    topics.map((t) => t.id),
    supabase,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <form
          method="get"
          className="flex flex-wrap items-center gap-2 text-sm"
          aria-label="Filter topics"
        >
          <input type="hidden" name="project" value={projectId} />
          <label className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Type</span>
            <select
              name="type"
              defaultValue={filters.type ?? ""}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Alle</option>
              {TOPIC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Status</span>
            <select
              name="status"
              defaultValue={filters.status ?? ""}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Alle</option>
              {TOPIC_LIFECYCLE_STATUSES.filter((s) => s !== "wont_do_proposed_by_client").map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ),
              )}
            </select>
          </label>
          <button
            type="submit"
            className="h-8 rounded-md border border-border px-3 text-sm transition-colors hover:bg-muted"
          >
            Toepassen
          </button>
        </form>
        <Link
          href={`/topics/new?project=${projectId}`}
          className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
        >
          Nieuw topic
        </Link>
      </div>

      {topics.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          Nog geen topics voor dit project. Klik &ldquo;Nieuw topic&rdquo; om te beginnen.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {topics.map((topic) => (
            <li key={topic.id}>
              <TopicCard topic={topic} linkedCount={counts.get(topic.id) ?? 0} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
