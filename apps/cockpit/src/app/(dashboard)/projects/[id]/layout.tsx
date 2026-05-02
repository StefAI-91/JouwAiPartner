import { ProjectTabs } from "@/features/projects/components/project-tabs";

// CC-005 — layout boven elke `/projects/[id]/...` sub-route. Houdt tabs-nav
// stabiel zichtbaar tussen Overzicht en Inbox. Niet asynchroon — projectId
// wordt door de child-page geladen, layout heeft alleen de id nodig voor
// link-targets.

export default async function ProjectLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  return (
    <div className="flex min-h-full flex-col">
      <ProjectTabs projectId={id} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
