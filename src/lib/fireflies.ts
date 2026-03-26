const FIREFLIES_API = "https://api.fireflies.ai/graphql";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FirefliesTranscript {
  id: string;
  title: string;
  date: string;
  participants: string[];
  summary: {
    overview: string;
    action_items: string[];
    shorthand_bullet: string[];
    keywords: string[];
  };
  sentences: {
    index: number;
    text: string;
    speaker_name: string;
    start_time: number;
    end_time: number;
  }[];
}

export interface TranscriptChunk {
  text: string;
  speakers: string[];
  startTime: number;
  endTime: number;
  tokenEstimate: number;
}

// ---------------------------------------------------------------------------
// Fireflies GraphQL client
// ---------------------------------------------------------------------------

const TRANSCRIPT_QUERY = `
  query Transcript($id: String!) {
    transcript(id: $id) {
      id
      title
      date
      participants
      summary {
        overview
        action_items
        shorthand_bullet
        keywords
      }
      sentences {
        index
        text
        speaker_name
        start_time
        end_time
      }
    }
  }
`;

export async function fetchFirefliesTranscript(
  meetingId: string,
): Promise<FirefliesTranscript | null> {
  const apiKey = process.env.FIREFLIES_API_KEY;
  if (!apiKey) throw new Error("FIREFLIES_API_KEY is not set");

  const response = await fetch(FIREFLIES_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: TRANSCRIPT_QUERY,
      variables: { id: meetingId },
    }),
  });

  if (!response.ok) return null;

  const result = await response.json();
  return result.data?.transcript ?? null;
}

// ---------------------------------------------------------------------------
// Transcript chunking
// ---------------------------------------------------------------------------

const TARGET_CHUNK_TOKENS = 600;
const MAX_CHUNK_TOKENS = 800;
const CHARS_PER_TOKEN = 4;

export function chunkTranscript(
  sentences: FirefliesTranscript["sentences"],
): TranscriptChunk[] {
  if (sentences.length === 0) return [];

  const chunks: TranscriptChunk[] = [];
  let currentChunk: typeof sentences = [];
  let currentTokens = 0;

  for (let idx = 0; idx < sentences.length; idx++) {
    const sentence = sentences[idx];
    const sentenceTokens = Math.ceil(sentence.text.length / CHARS_PER_TOKEN);

    // Start new chunk if adding this sentence exceeds hard max
    if (
      currentTokens + sentenceTokens > MAX_CHUNK_TOKENS &&
      currentChunk.length > 0
    ) {
      chunks.push(buildChunk(currentChunk));
      // Keep last sentence as overlap for context continuity
      currentChunk = [currentChunk[currentChunk.length - 1]];
      currentTokens = Math.ceil(currentChunk[0].text.length / CHARS_PER_TOKEN);
    }

    currentChunk.push(sentence);
    currentTokens += sentenceTokens;

    // If we hit the target and there's a natural speaker change, break
    const nextSentence = sentences[idx + 1];
    if (
      currentTokens >= TARGET_CHUNK_TOKENS &&
      currentChunk.length > 1 &&
      nextSentence &&
      sentence.speaker_name !== nextSentence.speaker_name
    ) {
      chunks.push(buildChunk(currentChunk));
      currentChunk = [sentence]; // overlap
      currentTokens = sentenceTokens;
    }
  }

  // Flush remaining
  if (currentChunk.length > 0) {
    chunks.push(buildChunk(currentChunk));
  }

  return chunks;
}

function buildChunk(
  sentences: FirefliesTranscript["sentences"],
): TranscriptChunk {
  const text = sentences
    .map((s) => `${s.speaker_name}: ${s.text}`)
    .join("\n");

  const speakers = [...new Set(sentences.map((s) => s.speaker_name))];

  return {
    text,
    speakers,
    startTime: sentences[0].start_time,
    endTime: sentences[sentences.length - 1].end_time,
    tokenEstimate: Math.ceil(text.length / CHARS_PER_TOKEN),
  };
}
