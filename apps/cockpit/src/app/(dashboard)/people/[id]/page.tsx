export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@repo/database/supabase/server";
import { getPersonById } from "@repo/database/queries/people";
import { listOrganizations } from "@repo/database/queries/organizations";
import { Badge } from "@repo/ui/badge";
import { Mail, Users } from "lucide-react";
import Link from "next/link";
import { EditPerson } from "@/features/directory/components/edit-person";

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [person, organizations] = await Promise.all([
    getPersonById(id, supabase),
    listOrganizations(supabase),
  ]);

  if (!person) notFound();

  return (
    <div className="space-y-6 px-4 py-8 lg:px-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/people" className="hover:underline">
            People
          </Link>
          <span>/</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <h1>{person.name}</h1>
          <EditPerson
            person={person}
            organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {person.role && <span>{person.role}</span>}
          {person.team && (
            <Badge variant="outline" className="text-xs">
              {person.team}
            </Badge>
          )}
          {person.email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" />
              {person.email}
            </span>
          )}
        </div>
        {person.organization && (
          <p className="mt-1 text-sm text-muted-foreground">
            Organization: {person.organization.name}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="rounded-xl bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>
            Participated in {person.meeting_count} meeting{person.meeting_count !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
