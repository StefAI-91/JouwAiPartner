export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@repo/database/supabase/server";
import { getVerifiedMeetingById } from "@repo/database/queries/meetings";
import { MeetingDetailView } from "@/components/meetings/meeting-detail";

async function getSelectOptions(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [{ data: orgs }, { data: projects }] = await Promise.all([
    supabase.from("organizations").select("id, name").order("name"),
    supabase.from("projects").select("id, name").order("name"),
  ]);
  return {
    organizations: (orgs ?? []) as { id: string; name: string }[],
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
      organizations={options.organizations}
      projects={options.projects}
    />
  );
}
