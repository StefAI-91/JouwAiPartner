import { redirect } from "next/navigation";
import { createPageClient } from "@repo/auth/helpers";
import { getCurrentProfile } from "@repo/auth/access";
import {
  countInboxItemsForTeam,
  listInboxItemsForTeam,
  type InboxItem,
} from "@repo/database/queries/inbox";
import { InboxHeader, type InboxFilter } from "./inbox-header";
import { InboxList } from "./inbox-list";
import { InboxEmptyState } from "./empty-state";

/**
 * Composition-root voor `/inbox`. Filtert in JS na ophalen — de lijst is
 * meestal <100 items per team-member en de drie filters delen 80% van de
 * data, dus drie aparte queries draaien zou meer kosten dan winnen.
 */
export async function InboxPage({ filter }: { filter: InboxFilter }) {
  const supabase = await createPageClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) redirect("/login");

  const [items, counts] = await Promise.all([
    listInboxItemsForTeam(profile.id, supabase),
    countInboxItemsForTeam(profile.id, supabase),
  ]);

  const filtered = applyFilter(items, filter);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      <InboxHeader counts={counts} />
      {filtered.length === 0 ? <InboxEmptyState filter={filter} /> : <InboxList items={filtered} />}
    </div>
  );
}

function applyFilter(items: InboxItem[], filter: InboxFilter): InboxItem[] {
  switch (filter) {
    case "wacht_op_mij":
      // Items die op de PM wachten: needs_pm_review feedback + open questions
      // (waar klant heeft gereageerd, team moet terug-antwoorden).
      return items.filter((i) => {
        if (i.kind === "feedback") return i.issue.status === "needs_pm_review";
        // Een question is "wacht op mij" als er een klant-reply ná de team-reply zit,
        // of als het thread nog op `open` staat (waiting on team).
        // CC-001 simplified: open = wacht op klant, responded = wacht op klant. Open
        // questions zijn hier "wacht op klant" als status open is en ze hebben geen
        // recente klant-activiteit. Voor v1: open + last activity by client = wacht op mij.
        return i.thread.status === "open" && hasUnreadClientActivity(i);
      });
    case "wacht_op_klant":
      return items.filter((i) => i.kind === "question" && i.thread.status === "responded");
    case "geparkeerd":
      return items.filter((i) => i.kind === "feedback" && i.issue.status === "deferred");
  }
}

// Helper voor de "wacht op mij" beslissing op questions: laatste reply is van
// een ander dan team (in v1 geen role-info per reply, dus we benaderen het
// op count: als er replies zijn die ná de root komen, gaan we ervan uit dat
// er klant-input is). Pragmatisch tot CC-002 reply-role bijhoudt.
function hasUnreadClientActivity(item: Extract<InboxItem, { kind: "question" }>): boolean {
  return item.isUnread || item.thread.replies.length > 0;
}
