export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@repo/database/supabase/server";
import { getVerifiedMeetingById } from "@repo/database/queries/meetings";
import { MeetingDetailView } from "@/components/meetings/meeting-detail";

async function getSelectOptions(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [{ data: people }, { data: orgs }, { data: projects }] = await Promise.all([
    supabase.from("people").select("id, name, role, organization:organizations(name)").order("name"),
    supabase.from("organizations").select("id, name, type").order("name"),
    supabase.from("projects").select("id, name").order("name"),
  ]);
  return {
    people: (people ?? []) as { id: string; name: string; role: string | null; organization: { name: string } | null }[],
    organizations: (orgs ?? []) as { id: string; name: string; type: string }[],
    projects: (projects ?? []) as { id: string; name: string }[],
  };
}

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [meeting, options] = await Promise.all([
    getVerifiedMeetingById(id, supabase),
    getSelectOptions(supabase),
  ]);

  if (!meeting) notFound();

  return (
    <MeetingDetailView
      meeting={meeting}
      allPeople={options.people}
      organizations={options.organizations}
      projects={options.projects}
    />
  );
}
