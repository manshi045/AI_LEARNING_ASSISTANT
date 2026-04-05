import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004";
const EMBEDDING_DIMENSIONALITY = Number.parseInt(process.env.GEMINI_EMBEDDING_DIMENSIONALITY || "256", 10);
const EMBEDDING_BATCH_SIZE = Number.parseInt(process.env.GEMINI_EMBEDDING_BATCH_SIZE || "32", 10);
const SEMANTIC_RETRIEVAL_ENABLED = process.env.ENABLE_SEMANTIC_RAG === "true";

const aiClient = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const cleanText = (value = "") =>
  String(value || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const buildChunkEmbeddingText = (chunk = {}) =>
  [chunk.heading ? `Heading: ${chunk.heading}` : "", chunk.content || ""]
    .filter(Boolean)
    .join("\n\n")
    .trim();

const vectorMagnitude = (vector = []) =>
  Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));

const normalizeVector = (vector = []) => {
  const magnitude = vectorMagnitude(vector);
  if (!magnitude) {
    return vector.map(() => 0);
  }

  return vector.map((value) => value / magnitude);
};

const cosineSimilarity = (left = [], right = []) => {
  if (!left.length || !right.length || left.length !== right.length) {
    return 0;
  }

  let score = 0;
  for (let index = 0; index < left.length; index += 1) {
    score += left[index] * right[index];
  }

  return score;
};

const chunkArray = (items = [], size = 32) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const extractEmbeddingValues = (embeddingResponseItem = {}) => {
  const values =
    embeddingResponseItem?.values ||
    embeddingResponseItem?.embedding?.values ||
    [];

  return Array.isArray(values) ? values : [];
};

const embedTexts = async (texts = []) => {
  if (!aiClient || texts.length === 0) {
    return [];
  }

  const batches = chunkArray(texts, EMBEDDING_BATCH_SIZE);
  const vectors = [];

  for (const batch of batches) {
    const response = await aiClient.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: batch,
      config: {
        outputDimensionality: EMBEDDING_DIMENSIONALITY,
      },
    });

    const embeddings = response?.embeddings || [];
    embeddings.forEach((item) => {
      vectors.push(normalizeVector(extractEmbeddingValues(item)));
    });
  }

  return vectors;
};

export const buildChunkEmbeddings = async (chunks = []) => {
  if (!SEMANTIC_RETRIEVAL_ENABLED) {
    return [];
  }

  const preparedChunks = chunks
    .filter((chunk) => cleanText(chunk?.content))
    .map((chunk) => ({
      chunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber ?? 0,
      text: buildChunkEmbeddingText(chunk),
    }));

  if (preparedChunks.length === 0 || !aiClient) {
    return [];
  }

  try {
    const vectors = await embedTexts(preparedChunks.map((chunk) => chunk.text));
    return preparedChunks
      .map((chunk, index) => ({
        chunkIndex: chunk.chunkIndex,
        pageNumber: chunk.pageNumber,
        values: vectors[index] || [],
      }))
      .filter((item) => item.values.length > 0);
  } catch (error) {
    console.error("Embedding generation failed, falling back to lexical retrieval:", error.message);
    return [];
  }
};

export const semanticRetrieveChunks = async (
  content = {},
  query = "",
  maxChunks = 5,
  allowedChunkIndices = null,
) => {
  const normalizedQuery = cleanText(query);
  const chunkEmbeddings = Array.isArray(content?.chunkEmbeddings) ? content.chunkEmbeddings : [];
  const chunks = Array.isArray(content?.chunks) ? content.chunks : [];

  if (
    !SEMANTIC_RETRIEVAL_ENABLED ||
    !normalizedQuery ||
    !chunkEmbeddings.length ||
    !chunks.length ||
    !aiClient
  ) {
    return [];
  }

  try {
    const [queryVector] = await embedTexts([normalizedQuery]);
    if (!queryVector?.length) {
      return [];
    }

    const allowedSet = allowedChunkIndices ? new Set(allowedChunkIndices) : null;
    const chunkMap = new Map(chunks.map((chunk) => [chunk.chunkIndex, chunk]));

    return chunkEmbeddings
      .filter((entry) => entry?.values?.length && chunkMap.has(entry.chunkIndex))
      .filter((entry) => !allowedSet || allowedSet.has(entry.chunkIndex))
      .map((entry) => ({
        chunk: chunkMap.get(entry.chunkIndex),
        score: cosineSimilarity(queryVector, entry.values),
      }))
      .filter(({ score }) => Number.isFinite(score) && score > 0.15)
      .sort((left, right) => right.score - left.score)
      .slice(0, maxChunks)
      .map(({ chunk, score }) => ({
        ...chunk,
        score,
        retrievalSource: "semantic",
      }));
  } catch (error) {
    console.error("Semantic retrieval failed, falling back to lexical retrieval:", error.message);
    return [];
  }
};

export const getEmbeddingConfig = () => ({
  model: EMBEDDING_MODEL,
  dimensionality: EMBEDDING_DIMENSIONALITY,
  enabled: Boolean(aiClient) && SEMANTIC_RETRIEVAL_ENABLED,
});
