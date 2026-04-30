import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";
import { listWidgetProjectsWithDomains } from "@repo/database/queries/widget";
import { WidgetDomainsCard } from "./widget-domains-card";

export default async function WidgetSettingsPage() {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  if (!(await isAdmin(user.id))) {
    redirect("/settings");
  }

  const projects = await listWidgetProjectsWithDomains();

  const loaderUrl =
    process.env.NEXT_PUBLIC_JAIP_WIDGET_LOADER_URL ?? "https://widget.jouw-ai-partner.nl/loader.js";

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-lg font-semibold">Widget-domeinen</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Beheer welke domeinen via <code className="text-[0.75rem]">/api/ingest/widget</code>{" "}
        feedback mogen sturen voor een project. Verwijder een domein om de feedback-knop op die site
        stil te leggen.
      </p>

      {projects.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">Geen projecten gevonden.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {projects.map((project) => (
            <WidgetDomainsCard
              key={project.id}
              projectId={project.id}
              projectName={project.name}
              domains={project.domains}
              loaderUrl={loaderUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}
