import Link from "next/link";
import { Flame, Settings2 } from "lucide-react";
import type { IssueRow } from "@repo/database/queries/issues";
import type { TeamMember } from "@repo/database/queries/team";
import { ThisWeekGroup } from "./this-week-group";

interface ThisWeekSectionProps {
  urgent: IssueRow[];
  active: IssueRow[];
  /**
   * Teamleden voor naam-lookup. Een issue.assigned_to is alleen een uuid;
   * we hebben deze lijst nodig om er een leesbare naam (of email als
   * fallback) bij te tonen. Zelfde patroon als issue-detail sidebar.
   */
  people: TeamMember[];
}

interface AssigneeBucket {
  /** display-naam, of `null` voor unassigned */
  name: string | null;
  issues: IssueRow[];
}

/**
 * Resolve assignee uuid naar een display-naam. Voorkeur: full_name uit de
 * embedded join (snel, geen extra round-trip). Als die leeg is, val terug
 * op de people-list (full_name → email). Volgt het patroon uit
 * `getProfileNameById` in queries/team.ts.
 */
function resolveAssigneeName(issue: IssueRow, peopleById: Map<string, TeamMember>): string | null {
  const embedded = issue.assigned_person?.full_name?.trim();
  if (embedded) return embedded;

  if (!issue.assigned_to) return null;
  const member = peopleById.get(issue.assigned_to);
  if (!member) return null;

  const memberName = member.full_name?.trim();
  if (memberName) return memberName;
  return member.email ?? null;
}

/**
 * Groepeer issues per assignee. Unassigned-bucket komt onderaan zodat de
 * lijst stabiel sorteert (named buckets op naam, daarna unassigned).
 */
function groupByAssignee(
  issues: IssueRow[],
  peopleById: Map<string, TeamMember>,
): AssigneeBucket[] {
  const named = new Map<string, AssigneeBucket>();
  const unassigned: IssueRow[] = [];

  for (const issue of issues) {
    const displayName = resolveAssigneeName(issue, peopleById);
    if (!issue.assigned_to || !displayName) {
      unassigned.push(issue);
      continue;
    }
    const key = issue.assigned_to;
    let bucket = named.get(key);
    if (!bucket) {
      bucket = { name: displayName, issues: [] };
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

export function ThisWeekSection({ urgent, active, people }: ThisWeekSectionProps) {
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const urgentBuckets = groupByAssignee(urgent, peopleById);
  const activeBuckets = groupByAssignee(active, peopleById);
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
