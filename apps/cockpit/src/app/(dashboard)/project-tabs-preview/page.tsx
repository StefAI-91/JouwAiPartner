import { ProjectTabsPreview } from "@/components/project-tabs-preview/project-tabs-preview";

export const metadata = {
  title: "Project tabs preview · Cockpit",
};

/**
 * Mock-pagina voor het 4-tab voorstel op de project detail pagina.
 * Pure preview — geen DB, geen mutations. Mag verwijderd worden zodra
 * de definitieve tab-structuur is gekozen.
 */
export default function ProjectTabsPreviewPage() {
  return <ProjectTabsPreview />;
}
