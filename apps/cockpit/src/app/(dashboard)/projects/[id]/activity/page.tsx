export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@repo/database/supabase/server";
import { getProjectById } from "@repo/database/queries/projects";
import { getSegmentsByProjectId } from "@repo/database/queries/meetings/project-summaries";
import { ActivitySections } from "@/features/projects/components/activity-sections";

export const metadata = {
  title: "Activiteit · Project · Cockpit",
};

export default async function ProjectActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [project, segments] = await Promise.all([
    getProjectById(id, supabase),
    getSegmentsByProjectId(id, supabase),
  ]);

  if (!project) notFound();

  return (
    <div className="px-4 py-8 lg:px-10">
      <ActivitySections meetings={project.meetings} emails={project.emails} segments={segments} />
    </div>
  );
}
