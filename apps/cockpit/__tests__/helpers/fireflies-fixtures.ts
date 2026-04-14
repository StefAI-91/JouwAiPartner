/**
 * Shared test fixtures for Fireflies transcript mocking.
 * Keeps test data aligned with the FirefliesTranscript interface.
 */

export interface FirefliesSummary {
  overview: string;
  notes: string;
  action_items: string;
  shorthand_bullet: string;
  keywords: string[];
  topics_discussed: string[];
}

export function emptyFirefliesSummary(): FirefliesSummary {
  return {
    overview: "",
    notes: "",
    action_items: "",
    shorthand_bullet: "",
    keywords: [],
    topics_discussed: [],
  };
}

interface SentenceInput {
  text: string;
  start_time: number;
  end_time: number;
  speaker_name: string;
}

/** Build a Fireflies sentence with a default index. */
export function firefliesSentence(
  input: SentenceInput,
  index = 0,
): SentenceInput & { index: number } {
  return { index, ...input };
}
