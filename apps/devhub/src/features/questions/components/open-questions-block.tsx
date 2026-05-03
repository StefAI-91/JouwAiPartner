import { createPageClient } from "@repo/auth/helpers";
import { listQuestionsForProject } from "@repo/database/queries/client-questions";
import { QuestionThread } from "./question-thread";

/**
 * PR-023 — blok "Open klantvragen" voor DevHub.
 *
 * v1 plaatsing: op de topic-detail page (zie sprint-aanname A — DevHub heeft
 * nog geen project-detail page). Toont alle open vragen voor het project van
 * dit topic, met inline expand naar replies + team-reply-form.
 *
 * Org wordt afgeleid uit het project (één org per project in v1).
 */
export interface OpenQuestionsBlockProps {
  projectId: string;
  /** Optioneel: filter op één topic. Default: alle open vragen voor het project. */
  topicId?: string;
  /** Heading-tekst — overschrijfbaar zodat dezelfde block ook op een issue past. */
  heading?: string;
}

export async function OpenQuestionsBlock({
  projectId,
  topicId,
  heading = "Open klantvragen",
}: OpenQuestionsBlockProps) {
  const supabase = await createPageClient();

  const { data: project } = await supabase
    .from("projects")
    .select("organization_id")
    .eq("id", projectId)
    .single();

  if (!project?.organization_id) {
    // Project zonder organisatie kan geen klantvragen hebben — toon niets.
    return null;
  }

  const all = await listQuestionsForProject(
    projectId,
    project.organization_id as string,
    { status: "open" },
    supabase,
  );

  const questions = topicId ? all.filter((q) => q.topic_id === topicId) : all;

  if (questions.length === 0) {
    return (
      <section aria-labelledby="open-questions-heading" className="rounded-lg border bg-card p-4">
        <h2
          id="open-questions-heading"
          className="text-sm font-medium tracking-tight text-foreground"
        >
          {heading}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Geen openstaande vragen{topicId ? " voor dit topic" : ""}.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="open-questions-heading" className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2
          id="open-questions-heading"
          className="text-sm font-medium tracking-tight text-foreground"
        >
          {heading}
        </h2>
        <span className="text-xs text-muted-foreground">{questions.length} open</span>
      </div>
      <ul className="space-y-2">
        {questions.map((q) => (
          <QuestionThread key={q.id} question={q} />
        ))}
      </ul>
    </section>
  );
}
