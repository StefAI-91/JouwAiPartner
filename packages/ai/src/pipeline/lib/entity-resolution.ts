import { embedText } from "../../embeddings";
import { getAllProjects, matchProjectsByEmbedding } from "@repo/database/queries/projects";
import { updateProjectAliases } from "@repo/database/mutations/projects";
import { getAllOrganizations } from "@repo/database/queries/organizations";

interface MatchResult {
  matched: boolean;
  project_id: string | null;
  match_type: "exact" | "alias" | "embedding" | "none";
  similarity?: number;
}

/**
 * Resolve an extracted project/client name against the database.
 * 1. Exact match on name (ILIKE)
 * 2. Alias match (check aliases array)
 * 3. Embedding similarity match via match_projects RPC
 */
export async function resolveProject(extractedName: string): Promise<MatchResult> {
  const allProjects = await getAllProjects();
  return resolveProjectWithCache(extractedName, allProjects);
}

/**
 * Resolve a project name using a pre-fetched projects list (avoids N+1).
 */
async function resolveProjectWithCache(
  extractedName: string,
  cachedProjects: { id: string; name: string; aliases: string[] | null }[] | null,
): Promise<MatchResult> {
  const nameLower = extractedName.toLowerCase();

  // Step 1: Exact match on name (case-insensitive)
  if (cachedProjects) {
    const exactMatch = cachedProjects.find((p) => p.name.toLowerCase() === nameLower);
    if (exactMatch) {
      return { matched: true, project_id: exactMatch.id, match_type: "exact" };
    }

    // Step 1b: Substring match, but only if the project name is long enough (>=4 chars)
    // to avoid false positives on short names like "AI", "Demo", etc.
    const substringMatch = cachedProjects.find((p) => {
      const pLower = p.name.toLowerCase();
      return pLower.length >= 4 && (pLower.includes(nameLower) || nameLower.includes(pLower));
    });
    if (substringMatch) {
      return { matched: true, project_id: substringMatch.id, match_type: "exact" };
    }

    // Step 2: Alias match (exact only)
    const aliasMatch = cachedProjects.find((p) =>
      p.aliases?.some((alias: string) => alias.toLowerCase() === nameLower),
    );
    if (aliasMatch) {
      return {
        matched: true,
        project_id: aliasMatch.id,
        match_type: "alias",
      };
    }
  }

  // Step 3: Embedding match via match_projects RPC
  const embedding = await embedText(extractedName, "search_query");
  const embeddingMatches = await matchProjectsByEmbedding(embedding);

  if (embeddingMatches && embeddingMatches.length > 0) {
    const bestMatch = embeddingMatches[0];

    // Auto-add as alias
    const currentAliases = bestMatch.aliases || [];
    if (!currentAliases.includes(extractedName)) {
      await updateProjectAliases(bestMatch.id, [...currentAliases, extractedName]);
    }

    return {
      matched: true,
      project_id: bestMatch.id,
      match_type: "embedding",
      similarity: bestMatch.similarity,
    };
  }

  return { matched: false, project_id: null, match_type: "none" };
}

/**
 * Resolve client entities from Extractor output.
 * Project resolution is now handled by the Gatekeeper (sprint 023).
 * Returns a map of client name -> organization_id (or null).
 */
/**
 * Resolve client entities from Extractor output.
 * Skips names that are in the ignored_entities list (FUNC-093).
 */
export async function resolveClientEntities(
  clients: string[],
  ignoredNames?: Set<string>,
): Promise<Map<string, string | null>> {
  const resolutions = new Map<string, string | null>();
  if (clients.length === 0) return resolutions;

  const allOrgs = await getAllOrganizations();

  for (const name of clients) {
    const nameLower = name.toLowerCase();

    // FUNC-093: Skip resolution for ignored names
    if (ignoredNames?.has(nameLower)) {
      resolutions.set(name, null);
      continue;
    }

    const exactMatch = allOrgs.find((o) => o.name.toLowerCase() === nameLower);
    if (exactMatch) {
      resolutions.set(name, exactMatch.id);
      continue;
    }

    const aliasMatch = allOrgs.find((o) =>
      o.aliases?.some((alias: string) => alias.toLowerCase() === nameLower),
    );
    if (aliasMatch) {
      resolutions.set(name, aliasMatch.id);
      continue;
    }

    resolutions.set(name, null);
  }

  return resolutions;
}

interface OrgMatchResult {
  matched: boolean;
  organization_id: string | null;
  match_type: "exact" | "alias" | "none";
}

/**
 * Resolve an organization name against the database.
 * 1. Exact match on name (case-insensitive)
 * 2. Alias match (check aliases array)
 * 3. No match → returns null (caller stores unmatched_organization_name)
 */
export async function resolveOrganization(
  organizationName: string | null,
): Promise<OrgMatchResult> {
  if (!organizationName) {
    return { matched: false, organization_id: null, match_type: "none" };
  }

  const allOrgs = await getAllOrganizations();
  const nameLower = organizationName.toLowerCase();

  // Step 1: Exact match on name
  const exactMatch = allOrgs.find((o) => o.name.toLowerCase() === nameLower);
  if (exactMatch) {
    return { matched: true, organization_id: exactMatch.id, match_type: "exact" };
  }

  // Step 2: Alias match
  const aliasMatch = allOrgs.find((o) =>
    o.aliases?.some((alias: string) => alias.toLowerCase() === nameLower),
  );
  if (aliasMatch) {
    return { matched: true, organization_id: aliasMatch.id, match_type: "alias" };
  }

  // Step 3: No match
  return { matched: false, organization_id: null, match_type: "none" };
}
