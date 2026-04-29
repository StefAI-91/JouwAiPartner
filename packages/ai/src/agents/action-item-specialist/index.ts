// Re-export voor backward compat: alle externe imports gebruiken
// `@repo/ai/agents/action-item-specialist` of `../../agents/action-item-specialist`
// en moeten de volledige publieke API hier vinden.

export type {
  ActionItemPromptVersion,
  ActionItemSpecialistParticipant,
  ActionItemSpecialistContext,
  ActionItemSpecialistRunOptions,
  ActionItemSpecialistRunMetrics,
  ActionItemGatedItem,
  ActionItemSpecialistRunResult,
  ActionItemTwoStageRunMetrics,
  ActionItemTwoStageRunResult,
  ActionItemTwoStageRunOptions,
  ActionItemSpotterRunResult,
} from "./types";

export {
  ACTION_ITEM_SPECIALIST_DEFAULT_PROMPT_VERSION,
  ACTION_ITEM_SPECIALIST_MODEL,
  ACTION_ITEM_SPECIALIST_PROMPT_VERSION,
  runActionItemSpecialist,
  getActionItemSpecialistSystemPrompt,
} from "./single-stage";

export {
  runActionItemCandidateSpotter,
  runActionItemSpecialistTwoStage,
  getActionItemCandidateSpotterPrompt,
  getActionItemJudgePrompt,
} from "./two-stage";

export { validateFollowupAction, getActionItemActionValidatorPrompt } from "./validator";
export type { ActionItemActionValidatorInput, ActionItemActionValidatorResult } from "./validator";

export { checkActionItemGate, extractTranscriptContext } from "./shared";
