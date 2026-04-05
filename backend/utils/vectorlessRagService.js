const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "if",
  "then",
  "than",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "into",
  "during",
  "about",
  "above",
  "below",
  "between",
  "through",
  "before",
  "after",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "he",
  "she",
  "they",
  "them",
  "his",
  "her",
  "their",
  "we",
  "you",
  "i",
  "what",
  "which",
  "who",
  "whom",
  "whose",
  "when",
  "where",
  "why",
  "how",
  "do",
  "does",
  "did",
  "have",
  "has",
  "had",
  "can",
  "could",
  "will",
  "would",
  "should",
  "may",
  "might",
  "also",
  "only",
  "just",
]);

const normalizeText = (value = "") =>
  String(value || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const normalizeForMatch = (value = "") =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value = "") =>
  normalizeForMatch(value)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

const countMatches = (queryTokens = [], candidateTokens = []) => {
  if (!queryTokens.length || !candidateTokens.length) {
    return 0;
  }

  const candidateSet = new Set(candidateTokens);
  return queryTokens.reduce((sum, token) => sum + (candidateSet.has(token) ? 1 : 0), 0);
};

const unique = (values = []) => [...new Set(values.filter(Boolean))];

const takeTopKeywords = (text = "", limit = 10) => {
  const counts = new Map();
  tokenize(text).forEach((token) => {
    counts.set(token, (counts.get(token) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([token]) => token);
};

const getPageTitle = (pageText = "", pageChunks = []) => {
  const heading = pageChunks.find((chunk) => chunk?.heading)?.heading;
  if (heading) {
    return heading;
  }

  const firstLine = normalizeText(pageText).split("\n").map((line) => line.trim()).find(Boolean);
  return firstLine || `Page ${pageChunks[0]?.pageNumber || "?"}`;
};

export const buildPageIndex = (pages = [], chunks = []) => {
  const chunkGroups = new Map();
  chunks.forEach((chunk) => {
    const pageNumber = chunk?.pageNumber ?? 0;
    if (!chunkGroups.has(pageNumber)) {
      chunkGroups.set(pageNumber, []);
    }
    chunkGroups.get(pageNumber).push(chunk);
  });

  const pageNodes = pages.map((page) => {
    const pageNumber = page?.pageNumber ?? 0;
    const pageChunks = chunkGroups.get(pageNumber) || [];
    const pageText = normalizeText(page?.text || "");
    const headings = unique(pageChunks.map((chunk) => normalizeText(chunk.heading || "")));
    const pageTitle = getPageTitle(pageText, pageChunks);
    const combinedHeadingText = headings.join(" | ");
    const preview = pageText.split(/\n+/).join(" ").slice(0, 260);

    return {
      id: `page-${pageNumber}`,
      type: "page",
      pageNumber,
      title: pageTitle,
      headings,
      chunkIndices: pageChunks.map((chunk) => chunk.chunkIndex),
      keywords: takeTopKeywords(`${pageTitle} ${combinedHeadingText} ${pageText}`, 12),
      preview,
    };
  });

  const sectionMap = new Map();
  chunks.forEach((chunk) => {
    const heading = normalizeText(chunk?.heading || "");
    if (!heading) {
      return;
    }

    if (!sectionMap.has(heading)) {
      sectionMap.set(heading, {
        id: `section-${heading.toLowerCase().replace(/[^\w]+/g, "-")}`,
        type: "section",
        heading,
        pageNumbers: new Set(),
        chunkIndices: new Set(),
        contentSamples: [],
      });
    }

    const section = sectionMap.get(heading);
    section.pageNumbers.add(chunk.pageNumber ?? 0);
    section.chunkIndices.add(chunk.chunkIndex);
    if (section.contentSamples.length < 3 && chunk.content) {
      section.contentSamples.push(String(chunk.content).slice(0, 220));
    }
  });

  const sectionNodes = [...sectionMap.values()].map((section) => ({
    ...section,
    pageNumbers: [...section.pageNumbers].sort((left, right) => left - right),
    chunkIndices: [...section.chunkIndices],
    keywords: takeTopKeywords(
      `${section.heading} ${section.contentSamples.join(" ")}`,
      10,
    ),
  }));

  return {
    type: "root",
    title: "Document",
    totalPages: pageNodes.length,
    pageNodes,
    sectionNodes,
  };
};

const scorePageNode = (pageNode, query, queryTokens) => {
  const queryText = normalizeForMatch(query);
  const titleText = normalizeForMatch(pageNode.title || "");
  const headingText = normalizeForMatch((pageNode.headings || []).join(" "));
  const keywordTokens = pageNode.keywords || [];
  const titleTokens = tokenize(titleText);
  const headingTokens = tokenize(headingText);

  let score = 0;
  score += countMatches(queryTokens, titleTokens) * 6;
  score += countMatches(queryTokens, headingTokens) * 4;
  score += countMatches(queryTokens, keywordTokens) * 3;

  if (titleText && queryText.includes(titleText)) {
    score += 8;
  }

  if (headingText && queryText && headingText.includes(queryText)) {
    score += 10;
  }

  return score;
};

const scoreSectionNode = (sectionNode, query, queryTokens) => {
  const queryText = normalizeForMatch(query);
  const headingText = normalizeForMatch(sectionNode.heading || "");
  const headingTokens = tokenize(headingText);
  const keywordTokens = sectionNode.keywords || [];

  let score = 0;
  score += countMatches(queryTokens, headingTokens) * 7;
  score += countMatches(queryTokens, keywordTokens) * 4;

  if (headingText && queryText.includes(headingText)) {
    score += 12;
  }

  if (headingText.includes(queryText) && queryText.length > 4) {
    score += 12;
  }

  return score;
};

const scoreChunk = (chunk, pageBoost, sectionBoost, query, queryTokens) => {
  const headingText = normalizeForMatch(chunk?.heading || "");
  const contentText = normalizeForMatch(chunk?.content || "");
  const combinedText = `${headingText} ${contentText}`.trim();
  const combinedTokens = tokenize(combinedText);
  const contentMatches = countMatches(queryTokens, combinedTokens);

  let score = pageBoost + sectionBoost + contentMatches * 3;

  if (headingText) {
    score += countMatches(queryTokens, tokenize(headingText)) * 5;
  }

  const queryText = normalizeForMatch(query);
  if (queryText && combinedText.includes(queryText)) {
    score += 10;
  }

  return score;
};

export const vectorlessRetrieveChunks = (content = {}, query = "", maxChunks = 5) => {
  const pageIndex = content?.pageIndex;
  const chunks = Array.isArray(content?.chunks) ? content.chunks : [];
  const queryText = normalizeText(query);
  const queryTokens = tokenize(queryText);

  if (!pageIndex?.pageNodes?.length || !chunks.length || !queryText) {
    return { chunks: [], trace: [] };
  }

  const chunkMap = new Map(chunks.map((chunk) => [chunk.chunkIndex, chunk]));

  const rankedPages = (pageIndex.pageNodes || [])
    .map((pageNode) => ({
      ...pageNode,
      score: scorePageNode(pageNode, queryText, queryTokens),
    }))
    .filter((pageNode) => pageNode.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(3, maxChunks));

  const rankedSections = (pageIndex.sectionNodes || [])
    .map((sectionNode) => ({
      ...sectionNode,
      score: scoreSectionNode(sectionNode, queryText, queryTokens),
    }))
    .filter((sectionNode) => sectionNode.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(4, maxChunks));

  const pageBoostMap = new Map(rankedPages.map((pageNode) => [pageNode.pageNumber, pageNode.score]));
  const sectionBoostMap = new Map();
  rankedSections.forEach((sectionNode) => {
    sectionNode.chunkIndices.forEach((chunkIndex) => {
      sectionBoostMap.set(
        chunkIndex,
        Math.max(sectionBoostMap.get(chunkIndex) || 0, sectionNode.score),
      );
    });
  });

  const rankedChunks = chunks
    .map((chunk) => ({
      ...chunk,
      score: scoreChunk(
        chunk,
        pageBoostMap.get(chunk.pageNumber) || 0,
        sectionBoostMap.get(chunk.chunkIndex) || 0,
        queryText,
        queryTokens,
      ),
      retrievalSource: "vectorless",
    }))
    .filter((chunk) => (pageBoostMap.has(chunk.pageNumber) || sectionBoostMap.has(chunk.chunkIndex)) && chunk.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, maxChunks)
    .map((chunk) => ({
      ...chunkMap.get(chunk.chunkIndex),
      score: chunk.score,
      retrievalSource: "vectorless",
    }));

  return {
    chunks: rankedChunks,
    trace: [
      ...rankedPages.map((page) => ({
        level: "page",
        label: `Page ${page.pageNumber}: ${page.title}`,
        score: page.score,
      })),
      ...rankedSections.slice(0, 5).map((section) => ({
        level: "section",
        label: section.heading,
        score: section.score,
      })),
    ],
  };
};
