import { embedText } from "@/lib/embeddings";
import {
  getProjectByNameIlike,
  getAllProjects,
  matchProjectsByEmbedding,
} from "@/lib/queries/projects";
import { updateProjectAliases } from "@/lib/actions/projects";
import { insertPendingMatch } from "@/lib/actions/pending-matches";

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
  // Step 1: Exact match on name
  const exactMatch = await getProjectByNameIlike(extractedName);
  if (exactMatch) {
    return { matched: true, project_id: exactMatch.id, match_type: "exact" };
  }

  // Step 2: Alias match
  const allProjects = await getAllProjects();
  if (allProjects) {
    const aliasMatch = allProjects.find((p) =>
      p.aliases?.some(
        (alias: string) =>
          alias.toLowerCase().includes(extractedName.toLowerCase()) ||
          extractedName.toLowerCase().includes(alias.toLowerCase()),
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
 * Create a pending_matches entry for an unresolved name.
 */
export async function createPendingMatch(
  contentId: string,
  contentTable: string,
  extractedName: string,
  suggestedMatchId?: string,
  similarityScore?: number,
): Promise<void> {
  await insertPendingMatch({
    content_id: contentId,
    content_table: contentTable,
    extracted_name: extractedName,
    suggested_match_id: suggestedMatchId || null,
    similarity_score: similarityScore || null,
    status: "pending",
  });
}

/**
 * Resolve all entities from a Gatekeeper output.
 * Returns a map of name -> project_id.
 */
export async function resolveAllEntities(
  entities: { projects: string[]; clients: string[] },
  contentId: string,
  contentTable: string,
): Promise<Map<string, string | null>> {
  const resolutions = new Map<string, string | null>();
  const allNames = [...new Set([...entities.projects, ...entities.clients])];

  for (const name of allNames) {
    const result = await resolveProject(name);
    resolutions.set(name, result.project_id);

    if (!result.matched) {
      await createPendingMatch(contentId, contentTable, name);
    }
  }

  return resolutions;
}
