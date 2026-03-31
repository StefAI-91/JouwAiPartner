import { CohereClient } from "cohere-ai";

let _cohere: CohereClient | null = null;

function getCohere(): CohereClient {
  if (!_cohere) {
    _cohere = new CohereClient({ token: process.env.COHERE_API_KEY });
  }
  return _cohere;
}

const EMBEDDING_MODEL = "embed-v4.0";
const EMBEDDING_DIMENSIONS = 1024;

type InputType = "search_document" | "search_query";

/**
 * Embed a single text string using Cohere embed-v4 (v2 API).
 * Returns a number[] of length 1024.
 *
 * @param inputType - "search_document" for storage, "search_query" for search
 */
export async function embedText(
  text: string,
  inputType: InputType = "search_document",
): Promise<number[]> {
  const response = await getCohere().v2.embed({
    model: EMBEDDING_MODEL,
    texts: [text],
    inputType,
    embeddingTypes: ["float"],
    outputDimension: EMBEDDING_DIMENSIONS,
  });

  const embeddings = response.embeddings as { float: number[][] };
  return embeddings.float[0];
}

/**
 * Embed multiple texts in a single API call (batch, v2 API).
 * Cohere supports up to 96 texts per request.
 * Returns number[][] in same order as input.
 *
 * @param inputType - "search_document" for storage, "search_query" for search
 */
export async function embedBatch(
  texts: string[],
  inputType: InputType = "search_document",
): Promise<number[][]> {
  const BATCH_SIZE = 96;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const response = await getCohere().v2.embed({
      model: EMBEDDING_MODEL,
      texts: batch,
      inputType,
      embeddingTypes: ["float"],
      outputDimension: EMBEDDING_DIMENSIONS,
    });

    const embeddings = response.embeddings as { float: number[][] };
    allEmbeddings.push(...embeddings.float);
  }

  return allEmbeddings;
}

export { EMBEDDING_DIMENSIONS };
