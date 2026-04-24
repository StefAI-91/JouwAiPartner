import type { IssueRow } from "@repo/database/queries/issues";
import { IssueRowItem } from "./issue-row";

export function IssueList({
  issues,
  thumbnails,
}: {
  issues: IssueRow[];
  thumbnails?: Map<string, string>;
}) {
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

  return (
    <div className="divide-y-0">
      {issues.map((issue) => (
        <IssueRowItem key={issue.id} issue={issue} thumbnailPath={thumbnails?.get(issue.id)} />
      ))}
    </div>
  );
}
