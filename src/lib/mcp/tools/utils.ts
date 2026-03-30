/**
 * Escape LIKE/ILIKE wildcard characters in user input.
 * Prevents % and _ from being interpreted as wildcards.
 */
export function escapeLike(input: string): string {
  return input.replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Format verification status for MCP tool output.
 * Shows "AI (confidence: 87%)" or "Geverifieerd door [naam]".
 */
export function formatVerificatieStatus(
  confidence: number | null,
  correctedBy: string | null,
): string | null {
  if (correctedBy) {
    return `Geverifieerd (gecorrigeerd)`;
  }
  if (confidence != null) {
    return `AI (confidence: ${Math.round(confidence * 100)}%)`;
  }
  return null;
}
