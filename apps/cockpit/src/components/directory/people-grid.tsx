import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, ChevronRight } from "lucide-react";
import type { PersonListItem } from "@repo/database/queries/people";

export function PeopleGrid({ people }: { people: PersonListItem[] }) {
  if (people.length === 0) {
    return (
      <div className="py-12 text-center">
        <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <h3 className="mt-4 font-heading text-lg font-semibold">No people yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          People will appear here once meetings are processed.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {people.map((person) => (
        <Link
          key={person.id}
          href={`/people/${person.id}`}
          className="group block rounded-[2rem] bg-white p-5 shadow-sm transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold">{person.name}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {person.role && <span>{person.role}</span>}
                {person.team && (
                  <Badge variant="outline" className="h-4 text-[10px]">
                    {person.team}
                  </Badge>
                )}
                {person.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {person.email}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      ))}
    </div>
  );
}
