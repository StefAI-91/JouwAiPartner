import { createClient } from "@repo/database/supabase/server";
import { listAccessibleProjects } from "@repo/database/queries/project-access";
import { getLatestProjectReview } from "@repo/database/queries/project-reviews";
import { getIssueCounts } from "@repo/database/queries/issues";
import { ReviewOverview } from "@/components/review/review-overview";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const params = await searchParams;
  const projectId = params.project;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const projects = await listAccessibleProjects(user?.id ?? "", supabase);

  if (!projectId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          Selecteer een project om de AI review te bekijken.
        </p>
      </div>
    );
  }

  const [review, counts] = await Promise.all([
    getLatestProjectReview(projectId, supabase),
    getIssueCounts(projectId, supabase),
  ]);

  const project = projects.find((p) => p.id === projectId);

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-lg font-semibold">AI Review</h1>
        <p className="text-sm text-muted-foreground">
          AI-analyse van alle issues voor {project?.name ?? "dit project"}
        </p>
      </div>

      <ReviewOverview
        projectId={projectId}
        projectName={project?.name ?? "Onbekend"}
        review={review}
        counts={counts}
      />
    </div>
  );
}
