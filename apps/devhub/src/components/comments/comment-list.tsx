import type { IssueCommentRow, IssueActivityRow } from "@repo/database/queries/issues";
import { timeAgo } from "@/components/shared/time-ago";
import { Avatar } from "@/components/shared/avatar";

function ActivityDescription({ activity }: { activity: IssueActivityRow }) {
  const actor = activity.actor?.full_name ?? "Systeem";

  switch (activity.action) {
    case "created":
      return (
        <>
          <strong>{actor}</strong> heeft dit issue aangemaakt
        </>
      );
    case "status_changed":
      return (
        <>
          <strong>{actor}</strong> heeft status gewijzigd van{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">{activity.old_value}</code>{" "}
          naar{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">{activity.new_value}</code>
        </>
      );
    case "priority_changed":
      return (
        <>
          <strong>{actor}</strong> heeft prioriteit gewijzigd van{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">{activity.old_value}</code>{" "}
          naar{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">{activity.new_value}</code>
        </>
      );
    case "assigned":
      return activity.new_value ? (
        <>
          <strong>{actor}</strong> heeft issue toegewezen aan <strong>{activity.new_value}</strong>
        </>
      ) : (
        <>
          <strong>{actor}</strong> heeft toewijzing verwijderd
        </>
      );
    case "commented":
      return (
        <>
          <strong>{actor}</strong> heeft een reactie geplaatst
        </>
      );
    case "label_added":
      return (
        <>
          <strong>{actor}</strong> heeft label{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">{activity.new_value}</code>{" "}
          toegevoegd
        </>
      );
    case "label_removed":
      return (
        <>
          <strong>{actor}</strong> heeft label{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">{activity.old_value}</code>{" "}
          verwijderd
        </>
      );
    case "field_changed":
      return (
        <>
          <strong>{actor}</strong> heeft <em>{activity.field}</em> gewijzigd
        </>
      );
    default:
      return (
        <>
          <strong>{actor}</strong> {activity.action}
        </>
      );
  }
}

type FeedItem =
  | { kind: "comment"; data: IssueCommentRow; at: string }
  | { kind: "activity"; data: IssueActivityRow; at: string };

function mergeFeed(comments: IssueCommentRow[], activities: IssueActivityRow[]): FeedItem[] {
  const items: FeedItem[] = [
    ...comments.map((c) => ({ kind: "comment" as const, data: c, at: c.created_at })),
    ...activities.map((a) => ({ kind: "activity" as const, data: a, at: a.created_at })),
  ];
  items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  return items;
}

export function CommentActivityFeed({
  comments,
  activities,
}: {
  comments: IssueCommentRow[];
  activities: IssueActivityRow[];
}) {
  const feed = mergeFeed(comments, activities);

  if (feed.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Nog geen activiteit.</p>;
  }

  return (
    <div className="space-y-0">
      {feed.map((item) => {
        if (item.kind === "comment") {
          const c = item.data;
          return (
            <div key={`c-${c.id}`} className="flex gap-3 border-b border-border py-3">
              <Avatar name={c.author?.full_name ?? null} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{c.author?.full_name ?? "Onbekend"}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{c.body}</p>
              </div>
            </div>
          );
        }

        // Activity entry - smaller, muted
        const a = item.data;
        return (
          <div
            key={`a-${a.id}`}
            className="flex items-center gap-3 border-b border-border/50 py-2 text-xs text-muted-foreground"
          >
            <span className="flex size-7 shrink-0 items-center justify-center">
              <span className="size-1.5 rounded-full bg-muted-foreground/40" />
            </span>
            <span className="flex-1">
              <ActivityDescription activity={a} />
            </span>
            <span className="shrink-0 text-[0.65rem]">{timeAgo(a.created_at)}</span>
          </div>
        );
      })}
    </div>
  );
}
