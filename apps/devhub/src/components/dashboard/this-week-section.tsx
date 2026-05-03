import Link from "next/link";
import { Flame, Settings2 } from "lucide-react";
import type { IssueRow } from "@repo/database/queries/issues";
import { ThisWeekGroup } from "./this-week-group";

interface ThisWeekSectionProps {
  urgent: IssueRow[];
  active: IssueRow[];
}

interface AssigneeBucket {
  /** display-naam, of `null` voor unassigned */
  name: string | null;
  issues: IssueRow[];
}

/**
 * Groepeer issues per assignee. Unassigned-bucket komt onderaan zodat de
 * lijst stabiel sorteert (named buckets op naam, daarna unassigned).
 */
function groupByAssignee(issues: IssueRow[]): AssigneeBucket[] {
  const named = new Map<string, AssigneeBucket>();
  const unassigned: IssueRow[] = [];

  for (const issue of issues) {
    // "Kapot toegewezen" telt als unassigned: assigned_to bestaat wel als
    // UUID maar de profile-join geeft geen bruikbare naam (verwijderde
    // user, lege full_name, alleen whitespace). Liever in de Niemand-
    // bucket met Claim-knop dan een anonieme avatar zonder context.
    const fullName = issue.assigned_person?.full_name?.trim() ?? "";
    if (!issue.assigned_to || !fullName) {
      unassigned.push(issue);
      continue;
    }
    const key = issue.assigned_to;
    let bucket = named.get(key);
    if (!bucket) {
      bucket = { name: fullName, issues: [] };
      named.set(key, bucket);
    }
    bucket.issues.push(issue);
  }

  const sortedNamed = [...named.values()].sort((a, b) =>
    (a.name ?? "").localeCompare(b.name ?? "", "nl"),
  );

  if (unassigned.length === 0) return sortedNamed;
  return [...sortedNamed, { name: null, issues: unassigned }];
}

export function ThisWeekSection({ urgent, active }: ThisWeekSectionProps) {
  const urgentBuckets = groupByAssignee(urgent);
  const activeBuckets = groupByAssignee(active);
  const isEmpty = urgent.length === 0 && active.length === 0;

  if (isEmpty) {
    return (
      <section className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="text-2xl">🌿</span>
          <div>
            <p className="font-medium">Geen urgente of actieve issues</p>
            <p className="text-sm text-muted-foreground">
              Mooi moment om P2 of P3 op te pakken via{" "}
              <Link href="/issues" className="text-primary hover:underline">
                /issues
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="text-base font-semibold">Deze week</h2>
        <span className="text-xs text-muted-foreground">
          Urgent &amp; actief — wat speelt er in het team
        </span>
      </header>

      {/* Subsectie: Urgent */}
      <div className="border-b border-border">
        <div className="flex items-center gap-2 bg-red-50/40 px-5 py-2.5">
          <Flame className="size-4 text-red-600" />
          <h3 className="text-sm font-semibold text-red-700">
            Urgent — open P0 + P1 ({urgent.length})
          </h3>
          <span className="ml-auto text-xs text-muted-foreground">Wat moet deze week gebeuren</span>
        </div>
        {urgent.length === 0 ? (
          <p className="px-5 py-3 text-sm text-muted-foreground">Geen urgente issues open.</p>
        ) : (
          urgentBuckets.map((bucket, idx) => (
            <ThisWeekGroup
              key={bucket.name ?? `unassigned-urgent-${idx}`}
              name={bucket.name}
              issues={bucket.issues}
              showClaim={bucket.name === null}
            />
          ))
        )}
      </div>

      {/* Subsectie: Actief */}
      <div>
        <div className="flex items-center gap-2 bg-amber-50/40 px-5 py-2.5">
          <Settings2 className="size-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-amber-700">
            Actief in behandeling ({active.length})
          </h3>
          <span className="ml-auto text-xs text-muted-foreground">Wat loopt nu</span>
        </div>
        {active.length === 0 ? (
          <p className="px-5 py-3 text-sm text-muted-foreground">Niemand werkt op iets nu.</p>
        ) : (
          activeBuckets.map((bucket, idx) => (
            <ThisWeekGroup
              key={bucket.name ?? `unassigned-active-${idx}`}
              name={bucket.name}
              issues={bucket.issues}
            />
          ))
        )}
      </div>
    </section>
  );
}
