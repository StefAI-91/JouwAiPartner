import { embedText } from "@/lib/embeddings";
import { getAllProjects, matchProjectsByEmbedding } from "@/lib/queries/projects";
import { updateProjectAliases } from "@/actions/projects";

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

  // Step 1: Exact match on name (in-memory instead of DB call)
  if (cachedProjects) {
    const exactMatch = cachedProjects.find(
      (p) => p.name.toLowerCase().includes(nameLower) || nameLower.includes(p.name.toLowerCase()),
    );
    if (exactMatch) {
      return { matched: true, project_id: exactMatch.id, match_type: "exact" };
    }

    // Step 2: Alias match
    const aliasMatch = cachedProjects.find((p) =>
      p.aliases?.some(
        (alias: string) =>
          alias.toLowerCase().includes(nameLower) || nameLower.includes(alias.toLowerCase()),
      ),
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
export async function resolveAllEntities(entities: {
  projects: string[];
  clients: string[];
}): Promise<Map<string, string | null>> {
  const resolutions = new Map<string, string | null>();
  const allNames = [...new Set([...entities.projects, ...entities.clients])];

  if (allNames.length === 0) return resolutions;

  // Pre-fetch all projects once (avoids N+1 in alias matching)
  const allProjects = await getAllProjects();

  for (const name of allNames) {
    const result = await resolveProjectWithCache(name, allProjects);
    resolutions.set(name, result.project_id);
  }

  return resolutions;
}
