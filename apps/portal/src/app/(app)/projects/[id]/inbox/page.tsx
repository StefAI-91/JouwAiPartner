import { notFound } from "next/navigation";
import { createPageClient } from "@repo/auth/helpers";
import { getPortalProjectDashboard } from "@repo/database/queries/portal";
import { listOpenQuestionsForProject } from "@repo/database/queries/client-questions";
import { QuestionList } from "@/components/inbox/question-list";

export default async function ProjectInboxPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createPageClient();

  const project = await getPortalProjectDashboard(id, supabase);
  if (!project) notFound();
  if (!project.organization) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 lg:px-12 lg:py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Vragen van het team</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Dit project heeft geen gekoppelde organisatie. Neem contact op met het team.
        </p>
      </div>
    );
  }

  const questions = await listOpenQuestionsForProject(
    project.id,
    project.organization.id,
    supabase,
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 lg:px-12 lg:py-16">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {project.organization.name} · {project.name}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Vragen van het team
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Het team heeft hier een paar vragen voor jullie. Beantwoord ze hieronder — de vraag
          verdwijnt zodra je antwoord geeft.
        </p>
      </header>

      <QuestionList projectId={project.id} questions={questions} />
    </div>
  );
}
