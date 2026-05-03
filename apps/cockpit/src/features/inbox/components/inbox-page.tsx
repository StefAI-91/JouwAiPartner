import { redirect } from "next/navigation";
import { createPageClient } from "@repo/auth/helpers";
import { getCurrentProfile } from "@repo/auth/access";
import {
  countInboxItemsForTeam,
  listInboxItemsForTeam,
  INBOX_LIST_LIMIT,
} from "@repo/database/queries/inbox";
import { listAccessibleProjects } from "@repo/database/queries/projects/access";
import { InboxHeader, type InboxFilter } from "./inbox-header";
import { InboxList } from "./inbox-list";
import { InboxEmptyState } from "./empty-state";

/**
 * Composition-root voor `/inbox`. CC-008 — filtering staat in de DB
 * (`listInboxItemsForTeam(profileId, { filter })`). Resultaten zijn gecapt
 * op `INBOX_LIST_LIMIT` (200); UI cued de ceiling met een banner zodat de
 * PM weet dat er meer items zijn dan getoond.
 *
 * `projectId` (CC-005) scopet de view naar één project — gebruikt door de
 * per-project inbox-tab. `undefined` = globale view.
 */
export async function InboxPage({
  filter,
  projectId,
}: {
  filter: InboxFilter;
  projectId?: string;
}) {
  const supabase = await createPageClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) redirect("/login");

  const [listResult, counts, projects] = await Promise.all([
    listInboxItemsForTeam(profile.id, { projectId, filter }, supabase),
    countInboxItemsForTeam(profile.id, { projectId }, supabase),
    listAccessibleProjects(profile.id, supabase),
  ]);

  const { items, hasMore } = listResult;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      <InboxHeader counts={counts} projects={projects} initialProjectId={projectId} />
      {hasMore && (
        <div className="border-b border-border/40 bg-warning/5 px-6 py-2 text-[12px] text-foreground/70">
          Er zijn meer dan {INBOX_LIST_LIMIT} items — verfijn het filter of selecteer een project om
          de rest te zien.
        </div>
      )}
      {items.length === 0 ? <InboxEmptyState filter={filter} /> : <InboxList items={items} />}
    </div>
  );
}
