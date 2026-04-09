import type { IssueRow } from "@repo/database/queries/issues";
import { IssueRowItem } from "./issue-row";

export function IssueList({ issues }: { issues: IssueRow[] }) {
  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">No issues found</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Try adjusting your filters or create a new issue.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y-0">
      {issues.map((issue) => (
        <IssueRowItem key={issue.id} issue={issue} />
      ))}
    </div>
  );
}
