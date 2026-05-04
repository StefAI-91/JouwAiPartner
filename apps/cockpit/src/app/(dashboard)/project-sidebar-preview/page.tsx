import { ProjectSidebarPreview } from "@/components/project-tabs-preview/project-sidebar-preview";

export const metadata = {
  title: "Project sidebar preview · Cockpit",
};

/**
 * Mock-pagina voor variant B: 4-secties achter een linker sub-sidebar
 * (zoals portal het al doet binnen een project). Pure preview, geen
 * DB. Mag verwijderd worden zodra het nav-paradigma is gekozen.
 */
export default function ProjectSidebarPreviewPage() {
  return <ProjectSidebarPreview />;
}
