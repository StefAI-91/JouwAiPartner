import { type IssueType } from "@repo/database/constants/issues";

/**
 * Klantvriendelijke labels voor DevHub issue-types. Wijkt bewust af van de
 * interne `ISSUE_TYPE_LABELS` (DevHub-centric: Bug/Functionaliteit/Vraag) door
 * portal-taal te gebruiken. Sleutelruimte komt uit `IssueType` zodat de TS
 * compiler bij een nieuw type hier vangt.
 */
export const TYPE_MAP: Record<IssueType, string> = {
  bug: "Melding",
  feature_request: "Wens",
  question: "Vraag",
};

export function translateType(internalType: string): string {
  return TYPE_MAP[internalType as IssueType] ?? internalType;
}
