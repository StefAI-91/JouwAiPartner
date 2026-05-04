export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@repo/database/supabase/server";
import { getProjectById } from "@repo/database/queries/projects";
import { InsightsSections } from "@/features/projects/components/insights-sections";

export const metadata = {
  title: "Inzichten · Project · Cockpit",
};

export default async function ProjectInsightsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const project = await getProjectById(id, supabase);

  if (!project) notFound();

  return (
    <div className="px-4 py-8 lg:px-10">
      <InsightsSections
        extractions={project.extractions}
        emailExtractions={project.email_extractions}
      />
    </div>
  );
}
