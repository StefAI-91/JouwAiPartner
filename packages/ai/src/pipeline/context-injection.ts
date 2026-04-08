import { getActiveProjectsForContext } from "@repo/database/queries/projects";
import { getAllOrganizations } from "@repo/database/queries/organizations";
import { getPeopleForContext } from "@repo/database/queries/people";
import type { ActiveProjectForContext } from "@repo/database/queries/projects";

// Limits to keep the context prompt within reasonable token budgets
const MAX_PROJECTS = 50;
const MAX_ORGANIZATIONS = 50;
const MAX_PEOPLE = 100;

export interface EntityContext {
  projects: ActiveProjectForContext[];
  contextString: string;
}

/**
 * Fetch known entities from DB and format as prompt context string
 * for the Gatekeeper's project identification.
 * Limits results to prevent prompt bloat at scale.
 */
export async function buildEntityContext(): Promise<EntityContext> {
  const [projects, organizations, people] = await Promise.all([
    getActiveProjectsForContext(),
    getAllOrganizations(),
    getPeopleForContext(),
  ]);

  // Limit to prevent unbounded prompt growth
  const limitedProjects = projects.slice(0, MAX_PROJECTS);
  const limitedOrganizations = organizations.slice(0, MAX_ORGANIZATIONS);
  const limitedPeople = people.slice(0, MAX_PEOPLE);

  const sections: string[] = [];

  // Projects section
  if (limitedProjects.length > 0) {
    const projectLines = limitedProjects.map((p) => {
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
  if (limitedOrganizations.length > 0) {
    const orgLines = limitedOrganizations.map((o) => {
      const aliases =
        o.aliases && o.aliases.length > 0
          ? ` (aliassen: ${o.aliases.map((a: string) => `"${a}"`).join(", ")})`
          : "";
      return `- "${o.name}"${aliases}`;
    });
    sections.push(`Bekende organisaties:\n${orgLines.join("\n")}`);
  }

  // People section (with role + email for party_type identification)
  if (limitedPeople.length > 0) {
    const personLines = limitedPeople.map((p) => {
      const parts: string[] = [`"${p.name}"`];
      if (p.role) parts.push(`rol: ${p.role}`);
      if (p.email) parts.push(`email: ${p.email}`);
      if (p.organization_name) parts.push(`organisatie: ${p.organization_name}`);
      return `- ${parts.join(", ")}`;
    });
    sections.push(`Bekende personen:\n${personLines.join("\n")}`);
  }

  return {
    projects,
    contextString: sections.length > 0 ? sections.join("\n\n") : "",
  };
}
