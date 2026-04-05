import Document from "../models/Document.js";
import Flashcard from "../models/Flashcard.js";
import Quiz from "../models/Quiz.js";
import ChatHistory from "../models/ChatHistory.js";
import * as geminiService from "../utils/geminiService.js";
import { loadProcessedContent } from "../utils/documentContentStore.js";
import { ensureDocumentContent } from "../utils/documentProcessing.js";
import { findRelevantChunks } from "../utils/textChunker.js";
import { semanticRetrieveChunks } from "../utils/ragService.js";
import { vectorlessRetrieveChunks } from "../utils/vectorlessRagService.js";
import {
  generateFlashcardsFromChunks,
  generateQuizFromChunks,
} from "../utils/studyGenerator.js";

const PERSON_OR_TERM_STOP_WORDS = new Set([
  "who",
  "what",
  "when",
  "where",
  "why",
  "how",
  "which",
  "whom",
  "whose",
  "is",
  "was",
  "were",
  "are",
  "did",
  "does",
  "do",
  "the",
  "a",
  "an",
  "about",
  "explain",
  "tell",
  "me",
]);

const isSubstantiveChunk = (chunk) => {
  const text = String(chunk?.content || "").trim();
  if (!text || chunk?.isLikelyIndex) {
    return false;
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const lineCount = lines.length;
  const sentenceCount = (text.match(/[.!?]/g) || []).length;
  const shortLineCount = lines.filter((line) => line.split(/\s+/).length <= 4).length;
  const shortLineRatio = lineCount > 0 ? shortLineCount / lineCount : 0;

  return wordCount >= 45 && (sentenceCount >= 2 || lineCount <= 4) && !(lineCount >= 10 && shortLineRatio > 0.45);
};

const extractFocusTopic = (text = "") => {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return "";
  }

  const explicitTopicMatch = normalized.match(/["']([^"']+)["']/);
  if (explicitTopicMatch?.[1]) {
    return explicitTopicMatch[1].trim();
  }

  const titleCasedPhrases = normalized.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g) || [];
  const strongPhrase = titleCasedPhrases.find((phrase) =>
    phrase
      .split(/\s+/)
      .every((word) => !PERSON_OR_TERM_STOP_WORDS.has(word.toLowerCase())),
  );
  if (strongPhrase) {
    return strongPhrase.trim();
  }

  const words = normalized
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !PERSON_OR_TERM_STOP_WORDS.has(word));

  return words.slice(0, 4).join(" ").trim();
};

const buildGenerationContext = (content, maxChunks = 24) => {
  if (!content?.chunks?.length) {
    return content?.text || "";
  }

  const substantiveChunks = content.chunks.filter(isSubstantiveChunk);
  const nonIndexChunks = content.chunks.filter((chunk) => !chunk.isLikelyIndex);
  const sourceChunks =
    substantiveChunks.length > 0
      ? substantiveChunks
      : nonIndexChunks.length > 0
        ? nonIndexChunks
        : content.chunks;

  if (sourceChunks.length <= maxChunks) {
    return sourceChunks
      .map((chunk) => `[Page ${chunk.pageNumber ?? "?"}] ${chunk.content}`)
      .join("\n\n");
  }

  const selectedChunks = [];
  const lastIndex = sourceChunks.length - 1;

  for (let slot = 0; slot < maxChunks; slot += 1) {
    const index = Math.round((slot * lastIndex) / Math.max(1, maxChunks - 1));
    const chunk = sourceChunks[index];

    if (!chunk || selectedChunks.some((entry) => entry.chunkIndex === chunk.chunkIndex)) {
      continue;
    }

    selectedChunks.push(chunk);
  }

  return selectedChunks
    .map((chunk) => `[Page ${chunk.pageNumber ?? "?"}] ${chunk.content}`)
    .join("\n\n");
};

const buildRetrievedContext = (chunks = []) =>
  chunks
    .map((chunk) => {
      const headingLabel = chunk.heading ? ` | Heading: ${chunk.heading}` : "";
      return `[Page ${chunk.pageNumber ?? "?"}, Chunk ${chunk.chunkIndex}${headingLabel}] ${chunk.content}`;
    })
    .join("\n\n");

const buildCoverageGenerationContext = (content, maxChars = 42000) => {
  const chunks = Array.isArray(content?.chunks) ? content.chunks : [];
  if (!chunks.length) {
    return content?.text || "";
  }

  const selected = [];
  const seenChunkIndices = new Set();
  const seenPages = new Set();
  const seenHeadings = new Set();
  let totalChars = 0;

  const tryAddChunk = (chunk) => {
    if (!chunk || seenChunkIndices.has(chunk.chunkIndex) || chunk.isLikelyIndex) {
      return false;
    }

    const block = `[Page ${chunk.pageNumber ?? "?"}${chunk.heading ? ` | Heading: ${chunk.heading}` : ""}]\n${chunk.content}`;
    if (totalChars + block.length + 2 > maxChars) {
      return false;
    }

    selected.push(block);
    seenChunkIndices.add(chunk.chunkIndex);
    seenPages.add(chunk.pageNumber ?? "?");
    if (chunk.heading) {
      seenHeadings.add(chunk.heading.toLowerCase());
    }
    totalChars += block.length + 2;
    return true;
  };

  const byPage = new Map();
  chunks.forEach((chunk) => {
    const pageNumber = chunk.pageNumber ?? 0;
    if (!byPage.has(pageNumber)) {
      byPage.set(pageNumber, []);
    }
    byPage.get(pageNumber).push(chunk);
  });

  for (const pageChunks of byPage.values()) {
    const headingChunks = pageChunks.filter((chunk) => chunk.heading && isSubstantiveChunk(chunk));
    const substantiveChunks = pageChunks.filter((chunk) => isSubstantiveChunk(chunk));
    tryAddChunk(headingChunks[0] || substantiveChunks[0] || pageChunks[0]);
    tryAddChunk(headingChunks[1] || substantiveChunks[1] || pageChunks[1]);
  }

  for (const chunk of chunks) {
    if (!chunk.heading || !isSubstantiveChunk(chunk)) {
      continue;
    }
    const headingKey = chunk.heading.toLowerCase();
    if (!seenHeadings.has(headingKey)) {
      tryAddChunk(chunk);
    }
  }

  for (const chunk of chunks) {
    if (selected.length >= 80) {
      break;
    }
    tryAddChunk(chunk);
  }

  return selected.join("\n\n");
};

const normalizeCardText = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeQuestionFamily = (value = "") =>
  normalizeCardText(value)
    .replace(/^(what|which|who|whom|whose|when|where|why|how)\s+(is|are|was|were|does|do|did)\s+/, "")
    .replace(/^(what happened in the|what happened in|what is|who was|who is|what does|what did|which statement about|why is|how does)\s+/, "")
    .replace(/\b(mean|means|important|work)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

const mergeUniqueFlashcards = (primary = [], secondary = [], limit = 5) => {
  const seenQuestions = new Set();
  const seenFamilies = new Set();
  const seenAnswers = new Set();
  const merged = [];

  for (const card of [...primary, ...secondary]) {
    const questionKey = normalizeCardText(card?.question || "");
    const familyKey = normalizeQuestionFamily(card?.question || "");
    const answerKey = normalizeCardText(card?.answer || "");
    if (
      !questionKey ||
      seenQuestions.has(questionKey) ||
      (familyKey && seenFamilies.has(familyKey)) ||
      (answerKey && seenAnswers.has(answerKey))
    ) {
      continue;
    }

    seenQuestions.add(questionKey);
    if (familyKey) {
      seenFamilies.add(familyKey);
    }
    if (answerKey) {
      seenAnswers.add(answerKey);
    }
    merged.push(card);

    if (merged.length >= limit) {
      break;
    }
  }

  return merged;
};

const selectRotatingFlashcards = (cards = [], count = 5, rotationIndex = 0) => {
  if (cards.length <= count) {
    return cards.slice(0, count);
  }

  const start = ((rotationIndex || 0) * count) % cards.length;
  const selected = [];
  const seen = new Set();

  for (let offset = 0; offset < cards.length && selected.length < count; offset += 1) {
    const index = (start + offset) % cards.length;
    const card = cards[index];
    const key = normalizeCardText(card?.question || "");
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    selected.push(card);
  }

  return selected;
};

const getDocumentAndContent = async (documentId, userId) => {
  const document = await Document.findOne({
    _id: documentId,
    userId,
  });

  if (!document) {
    return null;
  }

  await ensureDocumentContent(document);
  const content = await loadProcessedContent(document);
  return { document, content };
};

const getBestSearchChunks = (chunks = []) => {
  const substantiveChunks = chunks.filter(isSubstantiveChunk);
  if (substantiveChunks.length > 0) {
    return substantiveChunks;
  }

  const nonIndexChunks = chunks.filter((chunk) => !chunk.isLikelyIndex);
  return nonIndexChunks.length > 0 ? nonIndexChunks : chunks;
};

const getFocusedContextPayload = async (content, query, maxChunks = 5) => {
  const bestChunks = getBestSearchChunks(content?.chunks || []);
  const focusTopic = extractFocusTopic(query);
  const allowedChunkIndices = bestChunks.map((chunk) => chunk.chunkIndex);
  const { chunks: vectorlessChunks, trace } = vectorlessRetrieveChunks(
    {
      ...content,
      chunks: bestChunks,
    },
    focusTopic || query,
    maxChunks,
  );
  const semanticChunks = await semanticRetrieveChunks(
    content,
    focusTopic || query,
    maxChunks,
    allowedChunkIndices,
  );
  const lexicalChunks = findRelevantChunks(bestChunks, focusTopic || query, maxChunks);
  const relevantChunks = mergeUniqueChunks(vectorlessChunks, semanticChunks, lexicalChunks).slice(0, maxChunks);
  console.log(
    "Retrieved Chunks:",
    relevantChunks.map((chunk) => ({
      chunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber,
      heading: chunk.heading || "",
      matchedWords: chunk.matchedWords || [],
      score: chunk.score,
      retrievalSource: chunk.retrievalSource || "lexical",
      preview: String(chunk.content || "").slice(0, 220),
    })),
  );
  if (trace.length > 0) {
    console.log("Vectorless retrieval trace:", trace);
  }

  return {
    focusTopic,
    relevantChunks,
    context: buildRetrievedContext(relevantChunks),
    retrievalTrace: trace,
  };
};

const normalizeForMatch = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenizeForMatch = (value = "") =>
  normalizeForMatch(value)
    .split(/\s+/)
    .filter(Boolean);

const getEditDistance = (left = "", right = "") => {
  const a = String(left || "");
  const b = String(right || "");
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let row = 0; row <= a.length; row += 1) matrix[row][0] = row;
  for (let column = 0; column <= b.length; column += 1) matrix[0][column] = column;

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
};

const isFuzzyTokenMatch = (left = "", right = "") => {
  const a = normalizeForMatch(left);
  const b = normalizeForMatch(right);
  if (!a || !b) {
    return false;
  }

  if (a === b) {
    return true;
  }

  if (a.length <= 4 || b.length <= 4) {
    return false;
  }

  const distance = getEditDistance(a, b);
  return distance <= 1 || (Math.max(a.length, b.length) >= 7 && distance <= 2);
};

const countMatchedTokens = (queryTokens = [], chunkTokens = []) =>
  queryTokens.reduce(
    (sum, token) =>
      sum + (chunkTokens.some((chunkToken) => isFuzzyTokenMatch(token, chunkToken)) ? 1 : 0),
    0,
  );

const QUESTION_MATCH_STOP_WORDS = new Set([
  ...PERSON_OR_TERM_STOP_WORDS,
  "from",
  "into",
  "under",
  "than",
  "then",
  "also",
]);

const getExactConceptChunks = (content, concept = "") => {
  const normalizedConcept = normalizeForMatch(concept);
  if (!normalizedConcept) {
    return [];
  }

  return (content?.chunks || []).filter((chunk) => {
    const heading = normalizeForMatch(chunk.heading || "");
    const text = normalizeForMatch(chunk.content || "");
    return heading.includes(normalizedConcept) || text.includes(normalizedConcept);
  });
};

const getExactQuestionChunks = (content, question = "") => {
  const normalizedQuestion = normalizeForMatch(question);
  if (!normalizedQuestion) {
    return [];
  }

  const chunks = content?.chunks || [];
  const relationshipMatch =
    normalizedQuestion.match(/^who\s+(?:was\s+)?(wife|husband|spouse|son|daughter|father|mother)\s+of\s+(.+?)$/i) ||
    normalizedQuestion.match(/^who\s+was\s+the\s+(wife|husband|spouse|son|daughter|father|mother)\s+of\s+(.+?)$/i);
  if (relationshipMatch?.[1] && relationshipMatch?.[2]) {
    const relationType = relationshipMatch[1].toLowerCase();
    const target = normalizeForMatch(relationshipMatch[2]);
    const targetTokens = tokenizeForMatch(target).filter((token) => token.length > 2);
    const relationshipSignals = {
      wife: ["married", "wife"],
      husband: ["married", "husband"],
      spouse: ["married", "wife", "husband", "spouse"],
      son: ["son", "eldest", "father", "mother"],
      daughter: ["daughter", "father", "mother"],
      father: ["father", "son", "daughter", "succeeded"],
      mother: ["mother", "son", "daughter"],
    };

    const relationshipChunks = chunks.filter((chunk) => {
      const combined = normalizeForMatch(`${chunk.heading || ""} ${chunk.content || ""}`);
      const combinedTokens = tokenizeForMatch(combined);
      const matchedTargetTokens = countMatchedTokens(targetTokens, combinedTokens);
      const targetCoverage = targetTokens.length > 0 ? matchedTargetTokens / targetTokens.length : 0;
      const hasRelationshipSignal = (relationshipSignals[relationType] || []).some((signal) => combined.includes(signal));

      return hasRelationshipSignal && (combined.includes(target) || targetCoverage >= 0.5);
    });

    if (relationshipChunks.length > 0) {
      return relationshipChunks;
    }
  }

  const founderMatch =
    normalizedQuestion.match(/^who founded\s+(.+?)$/i) ||
    normalizedQuestion.match(/^who was the founder of\s+(.+?)$/i);
  if (founderMatch?.[1]) {
    const target = normalizeForMatch(founderMatch[1]);
    const targetTokens = tokenizeForMatch(target).filter((token) => token.length > 2);

    const founderChunks = chunks.filter((chunk) => {
      const heading = normalizeForMatch(chunk.heading || "");
      const text = normalizeForMatch(chunk.content || "");
      const combined = `${heading} ${text}`.trim();
      const hasFounderSignal = /\b(founder|founded)\b/.test(combined);
      const targetCoverage =
        targetTokens.length > 0 && targetTokens.every((token) => combined.includes(token));

      return hasFounderSignal && (combined.includes(target) || targetCoverage);
    });

    if (founderChunks.length > 0) {
      return founderChunks;
    }
  }

  const identityMatch = normalizedQuestion.match(/^(who|what)\s+(is|was|were|are)\s+(.+)$/i);
  if (identityMatch?.[3]) {
    const subject = normalizeForMatch(identityMatch[3]).replace(/^(the|a|an)\s+/i, "");
    const subjectTokens = tokenizeForMatch(subject).filter((token) => token.length > 2);

    if (subject) {
      const identityChunks = chunks.filter((chunk) => {
        const heading = normalizeForMatch(chunk.heading || "");
        const text = normalizeForMatch(chunk.content || "");
        const combined = `${heading} ${text}`.trim();
        const hasSubject = combined.includes(subject) || subjectTokens.every((token) => combined.includes(token));
        const hasIdentitySignal = new RegExp(`\\b${subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b\\s+(was|is|were|are)\\b`, "i").test(text);

        return hasSubject && (heading.includes(subject) || hasIdentitySignal);
      });

      if (identityChunks.length > 0) {
        return identityChunks;
      }
    }
  }

  return chunks.filter((chunk) => {
    const heading = normalizeForMatch(chunk.heading || "");
    const text = normalizeForMatch(chunk.content || "");
    return heading.includes(normalizedQuestion) || text.includes(normalizedQuestion);
  }).length > 0
    ? chunks.filter((chunk) => {
      const heading = normalizeForMatch(chunk.heading || "");
      const text = normalizeForMatch(chunk.content || "");
      return heading.includes(normalizedQuestion) || text.includes(normalizedQuestion);
    })
    : chunks
      .map((chunk) => {
        const heading = normalizeForMatch(chunk.heading || "");
        const text = normalizeForMatch(chunk.content || "");
        const combined = `${heading} ${text}`.trim();
        const combinedTokens = tokenizeForMatch(combined);
        const questionTokens = tokenizeForMatch(question).filter(
          (token) => token.length > 2 && !QUESTION_MATCH_STOP_WORDS.has(token),
        );
        const matchedTokenCount = countMatchedTokens(questionTokens, combinedTokens);
        const coverage = questionTokens.length > 0 ? matchedTokenCount / questionTokens.length : 0;

        return {
          chunk,
          coverage,
          matchedTokenCount,
        };
      })
      .filter(({ matchedTokenCount, coverage }) => matchedTokenCount >= 2 && coverage >= 0.6)
      .sort((a, b) => b.coverage - a.coverage || b.matchedTokenCount - a.matchedTokenCount)
      .slice(0, 5)
      .map(({ chunk }) => chunk);
};

const mergeUniqueChunks = (...chunkGroups) => {
  const seen = new Set();
  const merged = [];

  for (const group of chunkGroups) {
    for (const chunk of group || []) {
      const key = chunk?._id || chunk?.chunkIndex;
      if (key === undefined || seen.has(key)) {
        continue;
      }

      seen.add(key);
      merged.push(chunk);
    }
  }

  return merged;
};

export const generateFlashcards = async (req, res, next) => {
  try {
    const { documentId, focusTopic = "" } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: "Please provide documentId",
        statusCode: 400,
      });
    }

    const payload = await getDocumentAndContent(documentId, req.user._id);
    if (!payload) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
        statusCode: 404,
      });
    }

    const { document, content } = payload;
    const focus = extractFocusTopic(focusTopic);
    const chunkSource = focus
      ? (await getFocusedContextPayload(content, focus, 8)).relevantChunks
      : content?.chunks || [];
    const existingFlashcardSets = await Flashcard.find({
      userId: req.user._id,
      documentId: document._id,
    }).select("cards.question cards.answer");
    const previouslyGeneratedQuestions = [
      ...new Set(
        existingFlashcardSets.flatMap((set) =>
          (set.cards || [])
            .map((card) => String(card?.question || "").trim())
            .filter(Boolean),
        ),
      ),
    ];
    const previouslyGeneratedAnswers = [
      ...new Set(
        existingFlashcardSets.flatMap((set) =>
          (set.cards || [])
            .map((card) => String(card?.answer || "").trim())
            .filter(Boolean),
        ),
      ),
    ];
    const requestedCount = 5;
    const generationContext = focus
      ? buildRetrievedContext(chunkSource)
      : buildCoverageGenerationContext(content);

    const llmCards = await geminiService.generateFlashcards(
      generationContext,
      requestedCount,
      focus,
      previouslyGeneratedQuestions,
      previouslyGeneratedAnswers,
      existingFlashcardSets.length,
    );
    const broadFallbackPool = generateFlashcardsFromChunks(content?.chunks || [], 60, {
      excludedQuestions: previouslyGeneratedQuestions,
      excludedAnswers: [],
    });
    const focusedFallbackPool = generateFlashcardsFromChunks(chunkSource, 25, {
      excludedQuestions: previouslyGeneratedQuestions,
      excludedAnswers: [],
    });
    const flashcardPool = mergeUniqueFlashcards(
      llmCards,
      [...focusedFallbackPool, ...broadFallbackPool],
      120,
    );
    const cards = selectRotatingFlashcards(
      flashcardPool,
      requestedCount,
      existingFlashcardSets.length,
    );

    if (cards.length === 0) {
      return res.status(422).json({
        success: false,
        error: "No good-quality flashcards could be generated from this document right now.",
        statusCode: 422,
      });
    }

    const flashcardSet = await Flashcard.create({
      userId: req.user._id,
      documentId: document._id,
      cards: cards.map((card) => ({
        question: card.question,
        answer: card.answer,
        difficulty: card.difficulty,
        reviewCount: 0,
        isStarred: false,
      })),
    });

    res.status(201).json({
      success: true,
      data: flashcardSet,
      message:
        cards.length < requestedCount
          ? `Generated ${cards.length} flashcards in one set from a pool of ${flashcardPool.length}.`
          : `Flashcards generated successfully from a pool of ${flashcardPool.length}.`,
    });
  } catch (error) {
    next(error);
  }
};

export const generateQuiz = async (req, res, next) => {
  try {
    const { documentId, numQuestions = 5, title, focusTopic = "" } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: "Please provide documentId",
        statusCode: 400,
      });
    }

    const payload = await getDocumentAndContent(documentId, req.user._id);
    if (!payload) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
        statusCode: 404,
      });
    }

    const { document, content } = payload;
    const focus = extractFocusTopic(focusTopic);
    const chunkSource = focus
      ? (await getFocusedContextPayload(content, focus, 10)).relevantChunks
      : content?.chunks || [];
    const requestedQuestionCount = Number.parseInt(numQuestions, 10);
    const generationContext = focus
      ? buildRetrievedContext(chunkSource)
      : buildCoverageGenerationContext(content, 26000);
    const llmQuestions = await geminiService.generateQuiz(
      generationContext,
      requestedQuestionCount,
      focus,
    );
    const fallbackQuestions = generateQuizFromChunks(
      chunkSource,
      requestedQuestionCount,
    );
    const questions = llmQuestions.length >= requestedQuestionCount
      ? llmQuestions
      : fallbackQuestions;

    if (questions.length < requestedQuestionCount) {
      return res.status(422).json({
        success: false,
        error: `Could only generate ${questions.length} quiz questions for this document right now. No incomplete quiz was saved.`,
        statusCode: 422,
      });
    }

    const quiz = await Quiz.create({
      userId: req.user._id,
      documentId: document._id,
      title: title || `${document.title} - Quiz`,
      questions,
      totalQuestions: questions.length,
      userAnswers: [],
      score: 0,
    });

    res.status(201).json({
      success: true,
      data: quiz,
      message: "Quiz generated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const generateSummary = async (req, res, next) => {
  try {
    const { documentId } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: "Please provide documentId",
        statusCode: 400,
      });
    }

    const payload = await getDocumentAndContent(documentId, req.user._id);
    if (!payload) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
        statusCode: 404,
      });
    }

    const { document, content } = payload;
    const summary = await geminiService.generateSummary(content);

    res.status(200).json({
      success: true,
      data: {
        documentId: document._id,
        title: document.title,
        summary,
      },
      message: "Summary generated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const chat = async (req, res, next) => {
  try {
    const { documentId, question } = req.body;

    if (!documentId || !question) {
      return res.status(400).json({
        success: false,
        error: "Please provide documentId and question",
        statusCode: 400,
      });
    }

    const payload = await getDocumentAndContent(documentId, req.user._id);
    if (!payload) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
        statusCode: 404,
      });
    }

    const { document, content } = payload;
    const exactChunks = getExactQuestionChunks(content, question);
    const { relevantChunks } = await getFocusedContextPayload(content, question, 5);
    const combinedChunks = mergeUniqueChunks(exactChunks, relevantChunks);
    if (combinedChunks.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          question,
          answer:
            "I could not find enough relevant content in this document for that question. Try asking with the exact topic, person, chapter, or term name from the PDF.",
          relevantChunks: [],
          chatHistoryId: null,
        },
        message: "No relevant content found for this question",
      });
    }
    const chunkIndices = combinedChunks.map((chunk) => chunk.chunkIndex);

    let chatHistory = await ChatHistory.findOne({
      userId: req.user._id,
      documentId: document._id,
    });

    if (!chatHistory) {
      chatHistory = await ChatHistory.create({
        userId: req.user._id,
        documentId: document._id,
        messages: [],
      });
    }

    const answer = await geminiService.chatWithContext(question, combinedChunks);

    chatHistory.messages.push(
      {
        role: "user",
        content: question,
        timestamp: new Date(),
        relevantChunks: [],
      },
      {
        role: "assistant",
        content: answer,
        timestamp: new Date(),
        relevantChunks: chunkIndices,
      },
    );
    await chatHistory.save();

    res.status(200).json({
      success: true,
      data: {
        question,
        answer,
        relevantChunks: chunkIndices,
        chatHistoryId: chatHistory._id,
      },
      message: "Response generated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const explainConcept = async (req, res, next) => {
  try {
    const { documentId, concept } = req.body;

    if (!documentId || !concept) {
      return res.status(400).json({
        success: false,
        error: "Please provide documentId and concept",
        statusCode: 400,
      });
    }

    const payload = await getDocumentAndContent(documentId, req.user._id);
    if (!payload) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
        statusCode: 404,
      });
    }

    const { content } = payload;
    const exactChunks = getExactConceptChunks(content, concept);
    const { relevantChunks, context, focusTopic } = await getFocusedContextPayload(content, concept, 8);
    const combinedChunks = [
      ...exactChunks,
      ...relevantChunks.filter(
        (chunk) => !exactChunks.some((exactChunk) => exactChunk.chunkIndex === chunk.chunkIndex),
      ),
    ];

    if (combinedChunks.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          concept,
          explanation:
            "I could not find enough relevant content in this document for that concept. Try the exact concept name or chapter term from the PDF.",
          relevantChunks: [],
        },
        message: "No relevant content found for this concept",
      });
    }
    const explanation = await geminiService.explainConcept(focusTopic || concept, {
      text: buildRetrievedContext(combinedChunks),
      chunks: combinedChunks,
    });

    res.status(200).json({
      success: true,
      data: {
        concept,
        explanation,
        relevantChunks: combinedChunks.map((chunk) => chunk.chunkIndex),
      },
      message: "Explanation generated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getChatHistory = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: "Please provide documentId",
        statusCode: 400,
      });
    }

    const chatHistory = await ChatHistory.findOne({
      userId: req.user._id,
      documentId,
    }).select("messages");

    if (!chatHistory) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No chat history found for this document",
      });
    }

    res.status(200).json({
      success: true,
      data: chatHistory.messages,
      message: "Chat history retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
};
