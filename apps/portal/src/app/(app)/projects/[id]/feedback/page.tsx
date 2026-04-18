import { notFound } from "next/navigation";
import { createPageClient } from "@repo/auth/helpers";
import { getPortalProjectDashboard } from "@repo/database/queries/portal";
import { FeedbackForm } from "@/components/feedback/feedback-form";

export default async function ProjectFeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createPageClient();
  const project = await getPortalProjectDashboard(id, supabase);

  if (!project) notFound();

  return (
    <div className="flex flex-1 flex-col gap-5 px-6 py-8">
      <div className="max-w-2xl space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Feedback versturen</h2>
        <p className="text-sm text-muted-foreground">
          Deel een bug, wens of vraag over {project.name}. Je feedback komt direct bij het team
          terecht en je kunt de voortgang volgen in de issues-lijst.
        </p>
      </div>

      <div className="max-w-2xl">
        <FeedbackForm projectId={project.id} projectName={project.name} />
      </div>
    </div>
  );
}
