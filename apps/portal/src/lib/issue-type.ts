/**
 * Klantvriendelijke labels voor DevHub issue-types. Wordt gebruikt op de
 * portal-issue lijst + detailpagina.
 */
export const TYPE_MAP: Record<string, string> = {
  bug: "Melding",
  feature_request: "Wens",
  question: "Vraag",
};

export function translateType(internalType: string): string {
  return TYPE_MAP[internalType] ?? internalType;
}
