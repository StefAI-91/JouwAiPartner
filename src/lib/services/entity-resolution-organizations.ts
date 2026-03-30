import { getAllOrganizations } from "@/lib/queries/organizations";

export interface OrgMatchResult {
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
