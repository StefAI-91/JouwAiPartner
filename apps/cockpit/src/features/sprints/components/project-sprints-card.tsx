import { Calendar } from "lucide-react";
import { listSprintsByProject } from "@repo/database/queries/sprints";
import { SprintRowEditor } from "./sprint-row-editor";
import { AddSprintButton } from "./add-sprint-button";

interface ProjectSprintsCardProps {
  projectId: string;
}

/**
 * Server component op de project-detailpagina (alleen renderen in dev-fase
 * — de wrapper-page checkt `project.status` ∈ delivery-steps en renderet
 * deze card alleen dan).
 *
 * Toont een lijstje sprints in volgorde van `order_index`, met inline-edit
 * per regel en een "+ Sprint toevoegen"-knop. Geen client-data-fetch — de
 * Server Action revalidateert de pagina na elke mutatie.
 */
export async function ProjectSprintsCard({ projectId }: ProjectSprintsCardProps) {
  const sprints = await listSprintsByProject(projectId);
  const lastDeliveryWeek = sprints[sprints.length - 1]?.delivery_week ?? null;
  const nextOrderIndex = sprints.length;

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <header className="flex items-center justify-between border-b border-gray-100 px-6 py-3.5 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sprints (klantportal)
          </h2>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Zichtbaar voor de klant in de portal-roadmap
        </span>
      </header>

      {sprints.length === 0 ? (
        <div className="px-6 py-6 text-center">
          <p className="text-sm italic text-muted-foreground/70">
            Nog geen sprints. Voeg je eerste sprint toe om de klant te informeren over wat en
            wanneer.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {sprints.map((sprint, index) => (
            <SprintRowEditor
              key={sprint.id}
              sprint={sprint}
              isFirst={index === 0}
              isLast={index === sprints.length - 1}
            />
          ))}
        </div>
      )}

      <div className="border-t border-gray-100 px-6 py-3 bg-gray-50/30">
        <AddSprintButton
          projectId={projectId}
          nextOrderIndex={nextOrderIndex}
          lastDeliveryWeek={lastDeliveryWeek}
        />
      </div>
    </section>
  );
}
