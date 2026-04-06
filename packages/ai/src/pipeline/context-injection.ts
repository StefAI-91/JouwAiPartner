import { getActiveProjectsForContext } from "@repo/database/queries/projects";
import { getAllOrganizations } from "@repo/database/queries/organizations";
import { getPeopleForContext } from "@repo/database/queries/people";
import type { ActiveProjectForContext } from "@repo/database/queries/projects";

export interface EntityContext {
  projects: ActiveProjectForContext[];
  contextString: string;
}

/**
 * Fetch known entities from DB and format as prompt context string
 * for the Gatekeeper's project identification.
 */
export async function buildEntityContext(): Promise<EntityContext> {
  const [projects, organizations, people] = await Promise.all([
    getActiveProjectsForContext(),
    getAllOrganizations(),
    getPeopleForContext(),
  ]);

  const sections: string[] = [];

  // Projects section
  if (projects.length > 0) {
    const projectLines = projects.map((p) => {
      const parts = [`"${p.name}" (id: ${p.id}`];
      if (p.organization_name) parts.push(`organisatie: ${p.organization_name}`);
      if (p.aliases.length > 0) {
        parts.push(`aliassen: ${p.aliases.map((a) => `"${a}"`).join(", ")}`);
      }
      return `- ${parts.join(", ")})`;
    });
    sections.push(`Bekende projecten:\n${projectLines.join("\n")}`);
  }

  // Organizations section
  if (organizations.length > 0) {
    const orgLines = organizations.map((o) => {
      const aliases =
        o.aliases && o.aliases.length > 0
          ? ` (aliassen: ${o.aliases.map((a: string) => `"${a}"`).join(", ")})`
          : "";
      return `- "${o.name}"${aliases}`;
    });
    sections.push(`Bekende organisaties:\n${orgLines.join("\n")}`);
  }

  // People section
  if (people.length > 0) {
    const personLines = people.map((p) => {
      const orgSuffix = p.organization_name ? ` (organisatie: ${p.organization_name})` : "";
      return `- "${p.name}"${orgSuffix}`;
    });
    sections.push(`Bekende personen:\n${personLines.join("\n")}`);
  }

  return {
    projects,
    contextString: sections.length > 0 ? sections.join("\n\n") : "",
  };
}
