import { embedText, embedBatch } from "../embeddings";
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
 * Resolve all entities from a Gatekeeper output.
 * Returns a map of name -> project_id.
 * Pre-fetches all projects once to avoid N+1 queries.
 */
export async function resolveAllEntities(
  entities: { projects: string[]; clients: string[] },
  contentId: string,
  contentTable: string,
): Promise<Map<string, string | null>> {
  const resolutions = new Map<string, string | null>();
  const allNames = [...new Set([...entities.projects, ...entities.clients])];

  if (allNames.length === 0) return resolutions;

  // Pre-fetch all projects once (avoids N+1 in alias matching)
  const allProjects = await getAllProjects();

  // First pass: resolve via in-memory matching (exact + alias)
  const unmatchedNames: string[] = [];
  for (const name of allNames) {
    const nameLower = name.toLowerCase();

    // Exact name match (case-insensitive)
    const exactMatch = allProjects?.find((p) => p.name.toLowerCase() === nameLower);
    if (exactMatch) {
      resolutions.set(name, exactMatch.id);
      continue;
    }

    // Substring match only for names >= 4 chars to avoid false positives
    const substringMatch = allProjects?.find((p) => {
      const pLower = p.name.toLowerCase();
      return pLower.length >= 4 && (pLower.includes(nameLower) || nameLower.includes(pLower));
    });
    if (substringMatch) {
      resolutions.set(name, substringMatch.id);
      continue;
    }

    // Alias match (exact only)
    const aliasMatch = allProjects?.find((p) =>
      p.aliases?.some((alias: string) => alias.toLowerCase() === nameLower),
    );
    if (aliasMatch) {
      resolutions.set(name, aliasMatch.id);
      continue;
    }
    unmatchedNames.push(name);
  }

  // Second pass: batch embed all unmatched names at once (fixes Q-04)
  if (unmatchedNames.length > 0) {
    const embeddings = await embedBatch(unmatchedNames, "search_query");
    for (let i = 0; i < unmatchedNames.length; i++) {
      const name = unmatchedNames[i];
      const embeddingMatches = await matchProjectsByEmbedding(embeddings[i]);
      if (embeddingMatches && embeddingMatches.length > 0) {
        const bestMatch = embeddingMatches[0];
        const currentAliases = bestMatch.aliases || [];
        if (!currentAliases.includes(name)) {
          await updateProjectAliases(bestMatch.id, [...currentAliases, name]);
        }
        resolutions.set(name, bestMatch.id);
      } else {
        resolutions.set(name, null);
      }
    }
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
