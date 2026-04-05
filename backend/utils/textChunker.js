const normalizeText = (value = "") =>
  value
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \f\v]+/g, " ")
    .replace(/\s*([●•◦▪])\s*/g, "\n$1 ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const tokenizeWords = (value = "") =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const normalizeHeading = (value = "") =>
  normalizeText(value)
    .replace(/^[•●\-*]\s*/, "")
    .replace(/\(\d{4}\s*-\s*\d{4}\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

const isHeadingLike = (value = "") => {
  const normalized = normalizeHeading(value);
  if (!normalized) {
    return false;
  }

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const upperLike = /^[A-Z][A-Z0-9\s'&/:-]+$/.test(normalized);
  const titleLike = /^[A-Z][A-Za-z0-9\s'&/:-]+$/.test(normalized);

  return (
    wordCount <= 8 &&
    !/[.!?]$/.test(normalized) &&
    (upperLike || titleLike)
  );
};

const isLikelyIndexChunk = (text = "") => {
  const normalized = normalizeText(text).toLowerCase();
  if (!normalized) {
    return true;
  }

  const tocSignals = ["table of contents", "contents", "index", "chapter", "unit", "module"];
  const signalHits = tocSignals.filter((signal) => normalized.includes(signal)).length;
  const dottedLeaderCount = (normalized.match(/\.{4,}/g) || []).length;
  const numberedLineCount = (normalized.match(/\b\d{1,4}\s*$/gm) || []).length;
  const pageMarkerCount = (normalized.match(/--\s*\d+\s+of\s+\d+\s*--/g) || []).length;
  const reprintCount = (normalized.match(/reprint\s+\d{4}-\d{2}/g) || []).length;
  const words = normalized.split(/\s+/).filter(Boolean);
  const uniqueWordCount = new Set(words).size;
  const lexicalDensity = words.length > 0 ? uniqueWordCount / words.length : 0;
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const shortLineCount = lines.filter((line) => line.split(/\s+/).length <= 4).length;
  const shortLineRatio = lines.length > 0 ? shortLineCount / lines.length : 0;
  const titleCaseHeadingCount = lines.filter(
    (line) =>
      line.length > 3 &&
      line.length < 60 &&
      /^[a-z0-9 '&,/:-]+$/i.test(line) &&
      !/[.!?]/.test(line),
  ).length;
  const headingRatio = lines.length > 0 ? titleCaseHeadingCount / lines.length : 0;

  return (
    signalHits >= 2 ||
    dottedLeaderCount >= 2 ||
    numberedLineCount >= 4 ||
    pageMarkerCount >= 1 ||
    reprintCount >= 1 ||
    (words.length > 25 && lexicalDensity < 0.4) ||
    (lines.length >= 8 && shortLineRatio > 0.55) ||
    (lines.length >= 8 && headingRatio > 0.65)
  );
};

const splitPageIntoSegments = (text) => {
  const normalized = normalizeText(text);
  if (!normalized) {
    return [];
  }

  const lines = normalized.split("\n").map((line) => line.trim());
  const segments = [];
  let paragraphBuffer = [];

  const flushParagraph = () => {
    const cleanedParagraph = paragraphBuffer.join(" ").trim();
    paragraphBuffer = [];

    if (!cleanedParagraph) {
      return;
    }

    if (cleanedParagraph.split(/\s+/).length <= 180) {
      segments.push({ type: "content", text: cleanedParagraph });
      return;
    }

    cleanedParagraph
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)
      .forEach((sentence) => {
        segments.push({ type: "content", text: sentence });
      });
  };

  for (const line of lines) {
    if (!line) {
      flushParagraph();
      continue;
    }

    if (/^[●•◦▪]/.test(line)) {
      flushParagraph();
      segments.push({
        type: "content",
        text: line.replace(/^[●•◦▪]\s*/, "").trim(),
      });
      continue;
    }

    if (isHeadingLike(line)) {
      flushParagraph();
      segments.push({ type: "heading", text: normalizeHeading(line) });
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushParagraph();
  return segments;
};

const getOverlapSegments = (segments = [], overlapWords = 50) => {
  const overlap = [];
  let wordCount = 0;

  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    const segmentWordCount = segment.text.split(/\s+/).filter(Boolean).length;

    overlap.unshift(segment);
    wordCount += segmentWordCount;

    if (wordCount >= overlapWords) {
      break;
    }
  }

  return overlap;
};

/**
 * Chunk PDF content into smaller parts while preserving page numbers.
 * @param {string | Array<{pageNumber: number, text: string}>} input
 * @param {number} chunkSize
 * @returns {Array<{content: string, pageNumber: number, chunkIndex: number, wordCount: number}>}
 */
export const chunkText = (input, chunkSize = 360, overlapWords = 50) => {
  const pages = Array.isArray(input)
    ? input
    : [{ pageNumber: 1, text: typeof input === "string" ? input : "" }];

  const chunks = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const segments = splitPageIntoSegments(page.text);
    let currentChunk = [];
    let currentWordCount = 0;
    let currentHeading = "";

    const pushChunk = () => {
      if (currentChunk.length === 0) {
        return;
      }

      const content = currentChunk.map((segment) => segment.text).join("\n\n");
      chunks.push({
        content,
        pageNumber: page.pageNumber,
        chunkIndex,
        wordCount: currentWordCount,
        heading: currentHeading,
        isLikelyIndex: isLikelyIndexChunk(content),
      });
      chunkIndex += 1;
    };

    for (const segment of segments) {
      if (segment.type === "heading") {
        pushChunk();
        currentChunk = [];
        currentWordCount = 0;
        currentHeading = segment.text;
        continue;
      }

      const segmentWordCount = segment.text.split(/\s+/).filter(Boolean).length;

      if (currentChunk.length > 0 && currentWordCount + segmentWordCount > chunkSize) {
        pushChunk();

        const overlapSegments = getOverlapSegments(currentChunk, overlapWords);
        currentChunk = [...overlapSegments, segment];
        currentWordCount = currentChunk.reduce(
          (sum, item) => sum + item.text.split(/\s+/).filter(Boolean).length,
          0,
        );
      } else {
        currentChunk.push(segment);
        currentWordCount += segmentWordCount;
      }
    }

    pushChunk();
  }

  return chunks;
};


/**
Find relevant chunks based on keyword matching
@param {Array{content: string, chunkIndex: number, wordCount: number}} chunks - Array of chunks
@param {string} query - Query to search for
@returns {Array{content: string, chunkIndex: number, wordCount: number}} - Array of relevant chunks
 */
export const findRelevantChunks = (chunks, query, maxChunks = 3) => {
    if (!chunks || chunks.length === 0 || !query){
        return [];
    }

    const stopWords = new Set([
        "the", "a", "an", "in", "on", "at", "to", "for", "with", "by",
        "is", "are", "was", "were", "be", "been", "being",
        "and", "or", "but", "if", "as", "of", "it", "its",
        "that", "this", "these", "those", "i", "you", "he", "she",
        "we", "they", "me", "him", "her", "us", "them",
        "my", "your", "his", "her", "our", "their",
        "which", "who", "whom", "whose", "what", "where", "when", "why",
        "how", "so", "then", "than", "about", "above", "below",
        "between", "through", "during", "before", "after", "since",
        "until", "while", "over", "under", "again", "further", "once",
        "here", "there", "all", "any", "both", "each", "few",
        "more", "most", "other", "some", "such", "no", "nor",
        "not", "only", "own", "same", "too", "very", "can", "will",
        "just", "don", "should", "now", "would", "could", "should",
    ]);

    const escapedQuery = query.toLowerCase().replace(/[^\w\s-]/g, " ");
    const queryWords = escapedQuery.split(/\s+/).filter(word => word && !stopWords.has(word));
    const prioritizedWords = queryWords.filter((word) => word.length > 3);
    const queryPhrase = queryWords
      .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("\\s+");

    if (queryWords.length === 0) {
        return chunks.slice(0, maxChunks).map(chunk => ({
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            pageNumber: chunk.pageNumber,
            _id: chunk._id,
            heading: chunk.heading || "",
        }));
    }


    const scoredChunks = chunks.map(chunk => {
        const chunkContent = chunk.content.toLowerCase();
        const headingContent = String(chunk.heading || "").toLowerCase();
        const normalizedHeading = headingContent.replace(/[^\w\s-]/g, " ").trim();
        const contentWords = chunkContent.split(/\s+/);
        const matchedWords = queryWords.filter(word => contentWords.includes(word) || headingContent.includes(word));
        const headingTokens = tokenizeWords(headingContent);
        const headingCoverage =
          prioritizedWords.length > 0
            ? prioritizedWords.filter((word) => headingTokens.includes(word)).length / prioritizedWords.length
            : 0;

        let score = 0;
        for (const word of queryWords){
            const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const exactMatches = (chunkContent.match(new RegExp(`\\b${escapedWord}\\b`, "g")) || []).length;
            score += exactMatches * 3;
            const partialMatches = (chunkContent.match(new RegExp(escapedWord, "g")) || []).length;
            score += Math.max(0, partialMatches - exactMatches) * 1.5;
            if (headingContent.includes(word)) {
              score += 6;
            }
        }

        //multiple query words found
        if(queryWords.length > 1){
            const phraseMatches = queryPhrase
              ? (chunkContent.match(new RegExp(queryPhrase, "g")) || []).length
              : 0;
            score += phraseMatches * 5;
        }

        if (headingCoverage > 0) {
          score += headingCoverage * 12;
        }
        if (normalizedHeading && queryWords.every((word) => normalizedHeading.includes(word))) {
          score += 18;
        }
        if (
          normalizedHeading &&
          prioritizedWords.length > 0 &&
          prioritizedWords.every((word) => headingTokens.includes(word))
        ) {
          score += 24;
        }

        //positional scoring
        const position = contentWords.findIndex(word => word === queryWords[0]);
        if(position !== -1){
            score += (contentWords.length - position) * 0.5;
        }

        //chunk length penalty
        const lengthPenalty = Math.max(0, chunk.wordCount - 300) / 10;
        score -= lengthPenalty;

        if (chunk.isLikelyIndex) {
            score -= 12;
        }

        return {
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            pageNumber: chunk.pageNumber,
            _id: chunk._id,
            heading: chunk.heading || "",
            isLikelyIndex: chunk.isLikelyIndex,
            score: score,
            rawScore: score,
            matchedWords,
            coverage:
              prioritizedWords.length > 0
                ? matchedWords.filter((word) => prioritizedWords.includes(word)).length / prioritizedWords.length
                : matchedWords.length > 0
                  ? 1
                  : 0,
            
        };
    });

    const positiveChunks = scoredChunks
      .filter((chunk) => chunk.score > 0)
      .sort((a, b) => b.score - a.score);

    const strongCoverageChunks = positiveChunks.filter(
      (chunk) => chunk.coverage >= 0.6 || chunk.matchedWords.length === queryWords.length,
    );
    const headingMatches = positiveChunks.filter((chunk) => {
      const headingTokens = tokenizeWords(chunk.heading);
      return prioritizedWords.some((word) => headingTokens.includes(word));
    });

    const rankedChunks = (strongCoverageChunks.length > 0 ? strongCoverageChunks : headingMatches.length > 0 ? headingMatches : positiveChunks)
      .slice(0, maxChunks);

    return rankedChunks;
};
