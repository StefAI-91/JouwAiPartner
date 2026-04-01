/**
 * Escape LIKE/ILIKE wildcard characters in user input.
 * Prevents % and _ from being interpreted as wildcards.
 */
export function escapeLike(input: string): string {
  return input.replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Format verification status for MCP tool output.
 * Shows verification info: who verified and when, or draft/AI status.
 */
export function formatVerificatieStatus(
  verificationStatus: string | null,
  verifiedByName: string | null,
  verifiedAt: string | null,
  confidence: number | null,
  correctedBy: string | null,
): string {
  if (verificationStatus === "verified") {
    const dateStr = verifiedAt
      ? new Date(verifiedAt).toLocaleDateString("nl-NL")
      : null;
    if (verifiedByName && dateStr) {
      return `Verified by ${verifiedByName} on ${dateStr}`;
    }
    if (verifiedByName) {
      return `Verified by ${verifiedByName}`;
    }
    if (dateStr) {
      return `Verified on ${dateStr}`;
    }
    return "Verified";
  }

  if (verificationStatus === "rejected") {
    return "Rejected";
  }

  if (correctedBy) {
    return "Corrected (verification pending)";
  }

  if (confidence != null) {
    return `AI draft (confidence: ${Math.round(confidence * 100)}%)`;
  }

  return "Draft";
}

/**
 * Lookup profile names for verified_by UUIDs.
 * Returns a map of UUID -> full_name.
 */
export async function lookupProfileNames(
  supabase: { from: (table: string) => { select: (cols: string) => { in: (col: string, values: string[]) => Promise<{ data: { id: string; full_name: string | null }[] | null }> } } },
  verifiedByIds: string[],
): Promise<Record<string, string>> {
  if (verifiedByIds.length === 0) return {};

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", verifiedByIds);

  if (!profiles) return {};

  return Object.fromEntries(
    profiles.map((p) => [p.id, p.full_name || "Onbekend"]),
  );
}

/**
 * Extract unique non-null verified_by UUIDs from an array of items.
 */
export function collectVerifiedByIds(
  items: { verified_by?: string | null }[],
): string[] {
  return [
    ...new Set(
      items.map((i) => i.verified_by).filter((id): id is string => id != null),
    ),
  ];
}
