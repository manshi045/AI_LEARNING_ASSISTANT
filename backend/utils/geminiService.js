import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const aiClient = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const truncate = (value = "", maxChars = 24000) =>
  value.length > maxChars ? `${value.slice(0, maxChars)}\n\n[truncated]` : value;

const cleanText = (value = "") =>
  value
    .replace(/\s+/g, " ")
    .replace(/\s([,.!?;:])/g, "$1")
    .trim();

const stripDocumentBoilerplate = (value = "") =>
  value
    .replace(/Reprint\s+\d{4}-\d{2}/gi, " ")
    .replace(/--\s*\d+\s+of\s+\d+\s*--/g, " ")
    .replace(/\bPage\s+\d+\b/gi, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const getSentences = (text = "") =>
  stripDocumentBoilerplate(text)
    .replace(/\s*([●•◦▪])\s*/g, "\n$1 ")
    .split(/(?<=[.!?])\s+|\n+/)
    .flatMap((sentence) =>
      cleanText(sentence)
        .split(/\s*;\s+(?=[A-Z0-9])|\s+(?=\(?[a-z]\)\s)|\s+(?=\d+\.\s)/)
        .map((part) => cleanText(part.replace(/^[●•◦▪]\s*/, "")))
        .filter(Boolean),
    )
    .filter((sentence) => sentence.length > 24);

const isLikelyLowValueSentence = (sentence = "") => {
  const lower = sentence.toLowerCase();
  const tocWords = ["table of contents", "contents", "index", "chapter", "unit", "module"];
  const hits = tocWords.filter((word) => lower.includes(word)).length;
  const dottedLeaderCount = (lower.match(/\.{4,}/g) || []).length;
  const reprintHit = /reprint\s+\d{4}-\d{2}/.test(lower);
  const themeHits = (lower.match(/\btheme\s+[a-z]\b/g) || []).length;
  const sentenceWordCount = cleanText(sentence).split(/\s+/).filter(Boolean).length;
  const punctuationCount = (sentence.match(/[.!?]/g) || []).length;
  const shortFragments = sentence
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.split(/\s+/).length <= 4).length;
  const lineCount = sentence.split(/\n+/).map((line) => line.trim()).filter(Boolean).length;

  return (
    hits >= 2 ||
    dottedLeaderCount > 0 ||
    reprintHit ||
    themeHits >= 2 ||
    /\[\s*\]/.test(sentence) ||
    /exploring society: india and beyond/i.test(lower) ||
    /india and the world: land and the people/i.test(lower) ||
    /^fig\.\s*\d+/i.test(cleanText(sentence)) ||
    /let'?s explore/i.test(lower) ||
    /don'?t miss out/i.test(lower) ||
    /questions, activities and projects/i.test(lower) ||
    (sentenceWordCount >= 18 && punctuationCount === 0) ||
    (lineCount >= 6 && shortFragments / lineCount > 0.55)
  );
};

const dedupeSentences = (sentences = []) => {
  const seen = new Set();
  return sentences.filter((sentence) => {
    const key = sentence.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const formatBulletList = (items = []) => items.map((item) => `- ${item}`).join("\n");

const shortenText = (text = "", maxWords = 24) => {
  const words = cleanText(text).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return words.join(" ");
  }
  return `${words.slice(0, maxWords).join(" ")}...`;
};

const hasWeakLeadPhrase = (text = "") =>
  /^(it|they|this|that|these|those|there|here|everyone|someone|somebody|people|we|you|he|she|i)\b/i.test(
    cleanText(text),
  );

const hasDiscourseMarker = (text = "") =>
  /\b(on the one hand|on the other hand|for example|for instance|in conclusion|however|therefore)\b/i.test(
    cleanText(text),
  );

const isInstructionalExampleSentence = (text = "") => {
  const normalized = cleanText(text);
  const lower = normalized.toLowerCase();

  return (
    /^(let us|let's|now|suppose|assume|imagine|consider|observe|write down|discuss|look at|take|draw|think of)\b/i.test(
      normalized,
    ) ||
    /\b(let us|let's|suppose|assume that|now consider|consider a|consider an|observe the|write down|discuss with|look at the figure)\b/i.test(
      lower,
    ) ||
    /\bfor example\b/i.test(lower) ||
    /\brectangle\b.*\bwidth\b/i.test(lower)
  );
};

const hasQuestionFrameIssue = (text = "") => {
  const normalized = cleanText(text);
  return (
    /^(what|which)\s+(is|are)\s+(what|why|how|when|where|which|who|can|could|should|would|does|do|did|is|are|was|were)\b/i.test(
      normalized,
    ) ||
    /^(what|which)\s+(is|are)\s+(a|an|the)\s+.+\s+(is|are|was|were|can|could|should|would)\b/i.test(
      normalized,
    )
  );
};

const normalizeSentenceCase = (text = "") => {
  const normalized = cleanText(text);
  if (!normalized) {
    return "";
  }

  return normalized.replace(/^[a-z]/, (char) => char.toUpperCase());
};

const ensureTerminalPunctuation = (text = "", punctuation = ".") => {
  const normalized = cleanText(text).replace(/[;,:\-–—]+$/, "");
  if (!normalized) {
    return "";
  }

  return /[.!?]$/.test(normalized) ? normalized : `${normalized}${punctuation}`;
};

const cleanSourceSentenceContext = (text = "") =>
  cleanText(text)
    .replace(/^[A-Z][A-Z\s()0-9:,-]{3,}\s*[●•-]?\s*/g, "")
    .replace(/^[A-Za-z\s]+\(\d{4}\s*-\s*\d{4}\)\s*/g, "")
    .replace(
      /^.*?(?=\b[A-Z][A-Za-z-]+(?:\s+[A-Z][A-Za-z-]+){0,2}\s+(?:was|were|is|are|means|wrote|captured|defeated|marched|took|proclaimed|assumed|won|reached|launched|succeeded)\b)/,
      "",
    )
    .trim();

const sanitizeStudyText = (text = "", { maxWords = 28, punctuation = "." } = {}) =>
  ensureTerminalPunctuation(normalizeSentenceCase(shortenText(text, maxWords)), punctuation);

const sanitizeFullStudyText = (text = "", punctuation = ".") =>
  ensureTerminalPunctuation(normalizeSentenceCase(cleanText(text)), punctuation);

const isFragmentLike = (text = "") => {
  const normalized = cleanText(text);
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;

  return (
    !normalized ||
    wordCount < 5 ||
    /^[^A-Za-z0-9]+/.test(normalized) ||
    /^[a-z]/.test(normalized) ||
    hasWeakLeadPhrase(normalized) ||
    hasDiscourseMarker(normalized) ||
    isInstructionalExampleSentence(normalized) ||
    /^(and|but|or|so|because|therefore|however|thus)\b/i.test(normalized) ||
    /\.\.\.$/.test(normalized)
  );
};

const selectBestAnswerText = (...candidates) => {
  for (const candidate of candidates) {
    const normalized = sanitizeStudyText(candidate);
    if (normalized && !isLowValueLine(normalized) && !isFragmentLike(normalized)) {
      return normalized;
    }
  }

  return sanitizeStudyText(candidates.find(Boolean) || "");
};

const isBadTopicCandidate = (topic = "") => {
  const normalized = cleanText(topic).replace(/^["'`(]+|["'`),.:;]+$/g, "");
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;

  return (
    !normalized ||
    wordCount > 8 ||
    /^[a-z]/.test(normalized) ||
    /[=:]/.test(normalized) ||
    hasWeakLeadPhrase(normalized) ||
    hasDiscourseMarker(normalized) ||
    isInstructionalExampleSentence(normalized) ||
    /,$/.test(normalized) ||
    /^(and|or|but|because|well|effective|famous|important|importance|only|also|increased|in creation|the creative process|worshipper|great devotee)\b/i.test(normalized) ||
    /^(all|term|republic|state|head of state|even before|before the term|the use|such a line|seems to)\b/i.test(normalized) ||
    /^(the one hand|the other hand|it is|there is|there are|everyone agrees)/i.test(normalized) ||
    isLowValueLine(normalized)
  );
};

const looksLikeQuestion = (text = "") => {
  const normalized = cleanText(text);
  return /^(what|why|how|when|where|which|who|whom|whose|can|could|should|would|does|do|did|is|are|was|were|explain|describe|compare)\b/i.test(
    normalized,
  );
};

const isWeakFlashcardQuestion = (question = "") => {
  const normalized = cleanText(question);
  return (
    !normalized ||
    normalized.split(/\s+/).length < 4 ||
    hasQuestionFrameIssue(normalized) ||
    hasWeakLeadPhrase(normalized.replace(/^(what|why|how|when|where|which|who|whom|whose|can|could|should|would|does|do|did|is|are|was|were)\s+/i, "")) ||
    isInstructionalExampleSentence(normalized) ||
    /^(what is|what are)\s+(everyone|there|it|this|that|these|those|the one hand|the other hand)\b/i.test(
      normalized,
    ) ||
    /^(what|which|who|whom|how)\s+(is|are|was|were|does|did)\s+(all|term|state|republic|head of state|even before|before the term|such a line|seems to)\b/i.test(
      normalized,
    ) ||
    /^what should you remember about\b/i.test(normalized) ||
    /[●•]/.test(normalized) ||
    /^(what|who|why|how)\s+(did|does|is|are|was|were)\s+(and|or|but|well|effective|only|also)\b/i.test(
      normalized,
    ) ||
    hasDiscourseMarker(normalized)
  );
};

const isWeakAnswerText = (answer = "") => {
  const normalized = cleanText(answer);
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;

  return (
    !normalized ||
    wordCount < 2 ||
    /^[a-z]/.test(normalized) ||
    /^[A-Za-z]\.?$/.test(normalized) ||
    /^(all|term|state|republic|head of state|he|she|it|they|this|that)\.?$/i.test(normalized) ||
    isFragmentLike(normalized) ||
    isLowValueLine(normalized)
  );
};

const extractTopicFromSentence = (sentence = "") => {
  const cleaned = cleanText(sentence).replace(/^[\-\d.\s]+/, "");
  const lower = cleaned.toLowerCase();
  const patterns = [" is ", " are ", " refers to ", " means ", " includes ", " consists of ", " can be "];

  for (const pattern of patterns) {
    const index = lower.indexOf(pattern);
    if (index > 3) {
      return shortenText(cleaned.slice(0, index), 8);
    }
  }

  return shortenText(cleaned, 8);
};

const normalizeTopic = (topic = "") => {
  const normalized = cleanText(topic)
    .replace(/^["'`(]+|["'`),.:;!?]+$/g, "")
    .replace(/^(a|an|the)\s+/i, (match) => match.toLowerCase());

  return isBadTopicCandidate(normalized) ? "" : normalized;
};

const shouldUseWhatIsQuestion = (topic = "") => {
  const normalized = cleanText(topic);
  return /^(republic|democracy|monarchy|constitution|parliament|citizenship|secularism|federalism|sovereignty|liberty|equality|justice|rights?|duties)$/i.test(
    normalized,
  );
};

const hasQuestionQualityIssue = (question = "") => {
  const normalized = cleanText(question);
  const lower = normalized.toLowerCase();
  const subject =
    normalized.match(/^(who was|what is|why is|how does|what should you remember about|what happened in)\s+(.+?)\??$/i)?.[2] ||
    "";

  return (
    !normalized ||
    /\b(the document|according to the document|explained in the document|the text)\b/i.test(normalized) ||
    /\b(means|consisted|fixed|used|which|that|and it)\b/.test(lower) ||
    /\bthe most important work\b/.test(lower) ||
    /\bpersonal status of a person\b/.test(lower) ||
    subject.split(/\s+/).filter(Boolean).length > 6 ||
    /\b(succeeded|defeated|captured|marched|took|proclaimed|assumed|won|destroyed|reached|negotiate)\b/i.test(subject)
  );
};

const buildFlashcardQuestion = (topic, sourceSentence = "") => {
  const safeTopic = normalizeTopic(topic);
  if (!safeTopic) {
    return "";
  }
  const lowerSentence = cleanText(sourceSentence).toLowerCase();

  if (/\b(babur|humayun|akbar|jahangir|shah jahan|aurangazeb|sher shah|nur jahan)\b/i.test(safeTopic)) {
    return `Who was ${safeTopic}?`;
  }

  if (/\bbattle\b|\bwar\b|\brevolt\b|\bcampaign\b/i.test(lowerSentence)) {
    return `What is important about ${safeTopic}?`;
  }

  if (/\bwhy\b/.test(lowerSentence) || /\bbecause\b/.test(lowerSentence)) {
    return `Why is ${safeTopic} important?`;
  }

  if (/\bhow\b/.test(lowerSentence) || /\bprocess\b/.test(lowerSentence)) {
    return `How does ${safeTopic} work?`;
  }

  if (shouldUseWhatIsQuestion(safeTopic)) {
    return `What is ${safeTopic.toLowerCase()}?`;
  }

  if (safeTopic.split(/\s+/).length <= 5 && !isBadTopicCandidate(safeTopic)) {
    return `What is ${safeTopic}?`;
  }

  return "";
};

const buildQuizQuestion = (topic, sourceSentence = "") => {
  const safeTopic = normalizeTopic(topic);
  if (!safeTopic) {
    return "";
  }
  const lowerSentence = cleanText(sourceSentence).toLowerCase();

  if (/\bwhy\b/.test(lowerSentence) || /\bbecause\b/.test(lowerSentence)) {
    return `Why is ${safeTopic} important according to the document?`;
  }

  if (/\bhow\b/.test(lowerSentence) || /\bprocess\b/.test(lowerSentence)) {
    return `How does ${safeTopic} work according to the context?`;
  }

  return `Which statement about ${safeTopic} is correct?`;
};

const normalizeQuestionText = (question = "", fallbackTopic = "", sourceSentence = "") => {
  const normalized = normalizeSentenceCase(question).replace(/[.:;]+$/, "");
  if (
    looksLikeQuestion(normalized) &&
    !isWeakFlashcardQuestion(normalized) &&
    !hasQuestionQualityIssue(normalized)
  ) {
    return normalized.endsWith("?") ? normalized : `${normalized}?`;
  }

  return buildFlashcardQuestion(fallbackTopic, sourceSentence);
};

const isWeakQuizStem = (question = "") => {
  const normalized = cleanText(question);
  return (
    !normalized ||
    normalized.split(/\s+/).length < 6 ||
    hasQuestionFrameIssue(normalized) ||
    hasWeakLeadPhrase(normalized) ||
    hasDiscourseMarker(normalized) ||
    isInstructionalExampleSentence(normalized) ||
    /^(what is|what are)\s+(everyone|there|it|this|that|these|those)\b/i.test(normalized)
  );
};

const sanitizeOptionText = (text = "") => sanitizeStudyText(text, { maxWords: 20 });

const hasDistinctOptions = (options = []) => {
  const normalized = options.map((option) => cleanText(option).toLowerCase());
  return new Set(normalized).size === options.length;
};

const isConceptRichSentence = (sentence = "") => {
  const normalized = cleanText(sentence);
  const lower = normalized.toLowerCase();
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;

  return (
    !isLikelyLowValueSentence(normalized) &&
    !isInstructionalExampleSentence(normalized) &&
    !isFragmentLike(normalized) &&
    wordCount >= 8 &&
    (
      /\b(is|are|refers to|means|defined as|consists of|includes|because|therefore|important|used to|helps|causes|results in|leads to|shows that|describes)\b/i.test(
        lower,
      ) ||
      /\bconcept|process|function|purpose|role|difference|importance|feature|characteristic|advantage|disadvantage\b/i.test(
        lower,
      )
    )
  );
};

const toLines = (text = "") =>
  stripDocumentBoilerplate(text)
    .split(/\n+/)
    .map((line) => cleanText(line))
    .filter(Boolean);

const isLowValueLine = (line = "") => {
  const normalized = cleanText(line);
  if (!normalized) {
    return true;
  }

  const lower = normalized.toLowerCase();
  const wordCount = normalized.split(/\s+/).length;
  const titleLike = /^[\w '&,/:-]+$/.test(normalized) && !/[.!?]/.test(normalized);

  return (
    isLikelyLowValueSentence(normalized) ||
    isInstructionalExampleSentence(normalized) ||
    /^theme\s+[a-z]/i.test(normalized) ||
    /^chapter\s+\d+/i.test(normalized) ||
    /^\d+\s*[.)-]?\s*$/.test(normalized) ||
    /^fig\.\s*\d+/i.test(normalized) ||
    /\[\s*\]/.test(normalized) ||
    /exploring society: india and beyond/i.test(lower) ||
    /india and the world: land and the people/i.test(lower) ||
    /^(response|important points|key points|summary)$/i.test(lower) ||
    (wordCount <= 3 && titleLike) ||
    (wordCount <= 8 && titleLike && /theme|chapter|social science|india and beyond/i.test(lower))
  );
};

const dedupeLines = (lines = []) => uniqueBy(lines, (line) => line.toLowerCase());

const normalizeHeadingText = (line = "") =>
  cleanText(line)
    .replace(/^[•●\-*]\s*/, "")
    .replace(/\(\d{4}\s*-\s*\d{4}\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

const isSectionHeading = (line = "") => {
  const normalized = normalizeHeadingText(line);
  if (!normalized) {
    return false;
  }

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const upperLike = /^[A-Z][A-Z\s'&/-]+$/.test(normalized);
  const titleLike = /^[A-Z][A-Za-z\s'&/-]+$/.test(normalized) && wordCount <= 4;

  return (
    wordCount <= 6 &&
    !/[.!?]/.test(normalized) &&
    !isLowValueLine(normalized) &&
    !isInstructionalExampleSentence(normalized) &&
    (upperLike || titleLike)
  );
};

const extractStructuredSections = (text = "") => {
  const lines = stripDocumentBoilerplate(text)
    .split(/\n+/)
    .map((line) => cleanText(line))
    .filter(Boolean);

  const sections = [];
  let currentSection = null;

  for (const line of lines) {
    if (isSectionHeading(line)) {
      if (currentSection && currentSection.content.length > 0) {
        sections.push({
          heading: currentSection.heading,
          content: currentSection.content.join(" "),
        });
      }

      currentSection = {
        heading: normalizeHeadingText(line),
        content: [],
      };
      continue;
    }

    if (!currentSection) {
      continue;
    }

    currentSection.content.push(line);
  }

  if (currentSection && currentSection.content.length > 0) {
    sections.push({
      heading: currentSection.heading,
      content: currentSection.content.join(" "),
    });
  }

  return sections.filter((section) => section.heading && section.content);
};

const extractSubjectFromQuestion = (question = "") => {
  const normalized = cleanText(question).replace(/\?$/, "");
  const match = normalized.match(
    /^(who|what|why|how)\s+(?:is|was|were|are|does|did)\s+(.+)$/i,
  );

  if (!match) {
    return normalized;
  }

  return cleanText(match[2]).replace(/^(the|a|an)\s+/i, "");
};

const getFocusedSentencesForSubject = (subject = "", text = "", limit = 3) => {
  const subjectTokens = tokenize(subject);
  if (subjectTokens.length === 0) {
    return [];
  }

  return dedupeSentences(
    getSentences(text)
      .filter((sentence) => !isLowValueLine(sentence) && !isInstructionalExampleSentence(sentence))
      .map((sentence) => {
        const lower = sentence.toLowerCase();
        const matchCount = subjectTokens.reduce((sum, token) => sum + (lower.includes(token) ? 1 : 0), 0);
        return {
          sentence,
          score: matchCount / subjectTokens.length,
        };
      })
      .filter((entry) => entry.score >= 0.5)
      .sort((a, b) => b.score - a.score || a.sentence.length - b.sentence.length)
      .slice(0, limit)
      .map((entry) => entry.sentence),
  );
};

const sanitizeBulletText = (text = "", minBullets = 3) => {
  const bulletLines = toLines(text)
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => cleanText(line.replace(/^[-*]\s+/, "")))
    .filter((line) => !isLowValueLine(line) && line.split(/\s+/).length >= 6);

  const cleanedLines = dedupeLines(bulletLines);
  return cleanedLines.length >= minBullets ? cleanedLines : [];
};

const hasHealthyCoverage = (text = "", minLines = 3) => sanitizeBulletText(text, minLines).length >= minLines;

const summarizeConceptFromSentences = (concept, sentences = []) => {
  const bullets = dedupeLines(
    sentences
      .map((sentence) => shortenText(sentence, 24))
      .filter((sentence) => !isLowValueLine(sentence)),
  ).slice(0, 4);

  if (bullets.length === 0) {
    return `${concept}\n- This concept is not clearly explained in the readable body text of the document.`;
  }

  return `${concept}\n${formatBulletList(bullets)}`;
};

const isWeakFlashcard = (card) =>
  !card?.question ||
  !card?.answer ||
  card.question.length < 12 ||
  card.answer.length < 15 ||
  card.answer.split(/\s+/).length > 35 ||
  isWeakFlashcardQuestion(card.question) ||
  isWeakAnswerText(card.answer) ||
  isFragmentLike(card.answer) ||
  /[●•]/.test(cleanText(card.answer)) ||
  /^(also|and|or|but|of)\b/i.test(cleanText(card.answer));

const normalizeFlashcard = (card, fallbackSentence) => {
  const sourceSentence = cleanSourceSentenceContext(fallbackSentence || card?.answer || "");
  const topic = normalizeTopic(extractProminentTopic(sourceSentence) || extractTopicFromSentence(sourceSentence));
  const answer = selectBestAnswerText(card?.answer, sourceSentence);
  const question = normalizeQuestionText(card?.question || "", topic, sourceSentence);

  return {
    question,
    answer,
    difficulty: ["easy", "medium", "hard"].includes(card?.difficulty) ? card.difficulty : "medium",
  };
};

const isWeakQuizQuestion = (question) =>
  !question?.question ||
  isWeakQuizStem(question.question) ||
  !Array.isArray(question.options) ||
  question.options.length !== 4 ||
  !question.correctAnswer ||
  !question.explanation ||
  isFragmentLike(question.correctAnswer) ||
  !hasDistinctOptions(question.options);

const tokenize = (text = "") =>
  cleanText(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);

const getEditDistance = (left = "", right = "") => {
  const a = cleanText(left).toLowerCase();
  const b = cleanText(right).toLowerCase();
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
  const a = cleanText(left).toLowerCase();
  const b = cleanText(right).toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length <= 4 || b.length <= 4) return false;

  const distance = getEditDistance(a, b);
  return distance <= 1 || (Math.max(a.length, b.length) >= 7 && distance <= 2);
};

const hasFuzzyPhraseMatch = (phrase = "", text = "") => {
  const phraseTokens = tokenize(phrase);
  const textTokens = tokenize(text);
  if (phraseTokens.length === 0 || textTokens.length === 0) {
    return false;
  }

  const matchedTokenCount = phraseTokens.reduce(
    (sum, token) => sum + (textTokens.some((textToken) => isFuzzyTokenMatch(token, textToken)) ? 1 : 0),
    0,
  );

  return matchedTokenCount / phraseTokens.length >= 0.5;
};

const getWordFrequencies = (text = "") => {
  const frequencies = new Map();
  for (const word of tokenize(text)) {
    frequencies.set(word, (frequencies.get(word) || 0) + 1);
  }
  return frequencies;
};

const scoreSentenceImportance = (sentence, frequencies) => {
  const words = tokenize(sentence);
  const baseScore = words.reduce((sum, word) => sum + (frequencies.get(word) || 0), 0);
  const densityBoost = new Set(words).size * 0.6;
  return baseScore + densityBoost;
};

const getImportantSentences = (text, limit = 8) => {
  const frequencies = getWordFrequencies(text);
  return dedupeSentences(
    getSentences(text)
      .filter((sentence) => isConceptRichSentence(sentence))
      .map((sentence) => ({
        sentence,
        score: scoreSentenceImportance(sentence, frequencies),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.sentence),
  );
};

const extractDefinitionCandidates = (text) => {
  const sentences = getSentences(text).filter((sentence) => isConceptRichSentence(sentence));
  const patterns = [
    /(.+?)\s+is defined as\s+(.+)/i,
    /(.+?)\s+refers to\s+(.+)/i,
    /(.+?)\s+is the process of\s+(.+)/i,
    /(.+?)\s+means\s+(.+)/i,
    /(.+?)\s+is\s+(.+)/i,
    /(.+?)\s+are\s+(.+)/i,
  ];

  const candidates = [];
  for (const sentence of sentences) {
    for (const pattern of patterns) {
      const match = sentence.match(pattern);
      if (!match) continue;

      const topic = shortenText(match[1], 8);
      const explanation = shortenText(match[2], 24);
      const invalidTopic =
        isBadTopicCandidate(topic) ||
        /^(it|they|this|that|these|those|there|here|we|you|he|she)$/i.test(topic);

      if (!invalidTopic && explanation.length > 20 && isConceptRichSentence(sentence)) {
        candidates.push({
          topic,
          answer: explanation,
          sourceSentence: sentence,
        });
        break;
      }
    }
  }

  return candidates.slice(0, 24);
};

const uniqueBy = (items, keyFn) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const normalizeComparisonText = (text = "") =>
  cleanText(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeQuestionFamily = (question = "") =>
  normalizeComparisonText(question)
    .replace(/^(what|which|who|whom|whose|when|where|why|how)\s+(is|are|was|were|does|do|did)\s+/, "")
    .replace(/^(what happened in the|what happened in|what is|who was|who is|what does|what did|which statement about|why is|how does)\s+/, "")
    .replace(/\b(mean|means|important|according to the context|according to the document|work)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

const extractSentenceSubject = (sentence = "") => {
  const normalized = cleanSourceSentenceContext(sentence);
  const match = normalized.match(
    /^([A-Z][A-Za-z-]+(?:\s+[A-Z][A-Za-z-]+){0,2})\s+(was|were|is|are|means|wrote|captured|defeated|marched|took|proclaimed|assumed|won|reached|launched|succeeded)\b/,
  );

  return match?.[1] || "";
};

const extractHeadingEntityFromSentence = (sentence = "") => {
  const normalized = cleanText(sentence);
  const match = normalized.match(/^([A-Z][A-Z]+(?:\s+(?:and\s+)?[A-Z][A-Z]+){0,3})\s*[●•-]/);
  if (!match?.[1]) {
    return "";
  }

  const candidate = cleanText(match[1])
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());

  return isBadTopicCandidate(candidate) ? "" : candidate;
};

const getFlashcardTopicKey = (card) => normalizeQuestionFamily(extractSubjectFromQuestion(card?.question || ""));
const getFlashcardFactKey = (card) => normalizeComparisonText(card?.answer || "");

const mergeDiverseFlashcards = (primary = [], fallback = [], limit = 10) => {
  const uniqueQuestions = uniqueBy(
    [...primary, ...fallback].filter(
      (item) =>
        item?.question &&
        item?.answer &&
        !isLowValueLine(item.question) &&
        !isWeakAnswerText(item.answer),
    ),
    (item) => `${normalizeComparisonText(item.question)}::${normalizeComparisonText(item.answer)}`,
  );

  const uniqueFacts = uniqueBy(
    uniqueQuestions,
    (item) => `${getFlashcardTopicKey(item)}::${getFlashcardFactKey(item)}`,
  );

  const topicDiverse = uniqueBy(
    uniqueFacts.filter((item) => getFlashcardTopicKey(item)),
    (item) => getFlashcardTopicKey(item),
  );

  if (topicDiverse.length >= limit) {
    return topicDiverse.slice(0, limit);
  }

  return uniqueBy(
    [...topicDiverse, ...uniqueFacts],
    (item) => `${normalizeComparisonText(item.question)}::${normalizeComparisonText(item.answer)}`,
  ).slice(0, limit);
};

const selectRotatingSlice = (items = [], count = 5, rotationIndex = 0) => {
  if (items.length <= count) {
    return items.slice(0, count);
  }

  const start = ((rotationIndex % items.length) + items.length) % items.length;
  const rotated = [...items.slice(start), ...items.slice(0, start)];
  return rotated.slice(0, count);
};

const filterOutPreviouslyUsedCards = (
  cards = [],
  excludedQuestions = [],
  excludedAnswers = [],
) => {
  const excludedQuestionKeys = new Set(
    excludedQuestions.map((question) => normalizeComparisonText(question)).filter(Boolean),
  );
  const excludedQuestionFamilies = new Set(
    excludedQuestions.map((question) => normalizeQuestionFamily(question)).filter(Boolean),
  );
  const excludedAnswerKeys = new Set(
    excludedAnswers.map((answer) => normalizeComparisonText(answer)).filter(Boolean),
  );

  return cards.filter(
    (card) =>
      !excludedQuestionKeys.has(normalizeComparisonText(card?.question || "")) &&
      !excludedQuestionFamilies.has(normalizeQuestionFamily(card?.question || "")) &&
      !excludedAnswerKeys.has(getFlashcardFactKey(card)),
  );
};

const extractProminentTopic = (sentence = "") => {
  const headingEntity = extractHeadingEntityFromSentence(sentence);
  if (headingEntity) {
    return headingEntity;
  }

  const normalized = cleanText(sentence)
    .replace(/^[A-Z][A-Z\s()0-9-]{4,}\s*[●•-]?\s*/g, "")
    .replace(/^[●•-]\s*/, "");

  const battleMatch = normalized.match(/\b(Battle of [A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\b/);
  if (battleMatch?.[1]) {
    return battleMatch[1];
  }

  const titledMatch = normalized.match(
    /^([A-Z][a-zA-Z-]+(?:\s+[A-Z][a-zA-Z-]+){0,2})\s+(was|means|wrote|captured|defeated|marched|took|proclaimed|assumed|won|founded|succeeded)\b/,
  );
  if (titledMatch?.[1]) {
    return titledMatch[1];
  }

  const capitalizedPhrases = normalized.match(/\b([A-Z][A-Za-z-]+(?:\s+[A-Z][A-Za-z-]+){0,3})\b/g) || [];
  const candidate = capitalizedPhrases.find(
    (phrase) =>
      !/^(The|On|In|He|She|It|This|That|These|Those)$/i.test(phrase),
  );

  return candidate || "";
};

const buildSentenceFlashcardQuestion = (sentence = "") => {
  const topic = normalizeTopic(extractProminentTopic(sentence));
  const normalized = cleanText(sentence);
  const lower = normalized.toLowerCase();

  if (!topic) {
    return "";
  }

  if (/battle of/i.test(topic)) {
    return `What happened in the ${topic}?`;
  }

  if (/\bmeans\b/i.test(normalized)) {
    if (shouldUseWhatIsQuestion(topic)) {
      return `What is ${topic.toLowerCase()}?`;
    }
    return `What does ${topic} mean?`;
  }

  if (/\bcomposed\b/i.test(lower) && topic) {
    return `What did ${topic} compose?`;
  }

  if (/\bwrote\b/i.test(lower) && topic) {
    return `What did ${topic} write?`;
  }

  if (/\b(babur|humayun|akbar|jahangir|shah jahan|aurangazeb|sher shah|nur jahan|ibrahim lodi|rana sanga)\b/i.test(topic)) {
    return `Who was ${topic}?`;
  }

  if (/\b(1526|1527|1528|1529|1530|1539|1540|1556|1605|1628|1658|1707)\b/.test(lower)) {
    return `What should you remember about ${topic}?`;
  }

  return buildFlashcardQuestion(topic, sentence);
};

const buildDeterministicFlashcardQuestion = (sentence = "") => {
  const cleaned = cleanSourceSentenceContext(sentence);
  const lower = cleaned.toLowerCase();
  const topic = normalizeTopic(
    extractProminentTopic(cleaned) || extractSentenceSubject(cleaned) || extractTopicFromSentence(cleaned),
  );
  const subject = normalizeTopic(extractSentenceSubject(cleaned));
  const battleMatch = cleaned.match(/\b(Battle of [A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\b/);
  const personMatch = cleaned.match(
    /\b(Babur|Humayun|Akbar|Jahangir|Shah Jahan|Aurangzeb|Sher Shah|Nur Jahan|Ibrahim Lodi|Rana Sanga|Rana Pratap Singh)\b/,
  );

  if (battleMatch?.[1]) {
    return `What happened in the ${battleMatch[1]}?`;
  }

  if (/\bzat means\b/i.test(lower)) {
    return "What does zat mean?";
  }

  if (/\bstate.?s share was one third\b/i.test(lower)) {
    return "What was the state's share of average produce?";
  }

  if (/\brevenue was fixed on the average yield\b/i.test(lower)) {
    return "How was revenue fixed?";
  }

  if (/\blowest rank was 10\b/i.test(lower)) {
    return "What was the rank range in the mansabdari system?";
  }

  if (/\breimposed jizya and pilgrim tax\b/i.test(lower)) {
    return "What was reimposed in 1679?";
  }

  if (/\bhamzanama\b/i.test(lower)) {
    return "What was Hamzanama?";
  }

  if (personMatch?.[1] && /\bwas\b/i.test(lower)) {
    return `Who was ${personMatch[1]}?`;
  }

  if (/\bwrote\b.+\bmemoirs\b/i.test(cleaned) && subject) {
    return `What did ${subject} write?`;
  }

  if ((/\bfounder of\b/i.test(lower) || /\beldest son of\b/i.test(lower)) && subject) {
    return `Who was ${subject}?`;
  }

  if (/\bmeans\b/i.test(lower) && topic) {
    if (shouldUseWhatIsQuestion(topic)) {
      return `What is ${topic.toLowerCase()}?`;
    }
    return `What does ${topic} mean?`;
  }

  if (/\bdefeated\b/i.test(lower) && subject) {
    return `Whom did ${subject} defeat?`;
  }

  if (/\bcaptured\b/i.test(lower) && subject) {
    return `What did ${subject} capture?`;
  }

  if (/\blaunched\b.+\bexpeditions\b/i.test(lower) && subject) {
    return `What expeditions did ${subject} launch?`;
  }

  if (/\bproclaimed himself\b/i.test(lower) && subject) {
    return `What title did ${subject} proclaim?`;
  }

  if (/\bassumed the title\b/i.test(lower) && subject) {
    return `What title did ${subject} assume?`;
  }

  if (/\bwas due to\b/i.test(lower) && subject) {
    return `Why was ${subject} successful?`;
  }

  return buildSentenceFlashcardQuestion(cleaned);
};

const buildDeterministicFlashcardCandidates = (sentence = "") => {
  const cleaned = cleanSourceSentenceContext(sentence);
  const lower = cleaned.toLowerCase();
  const headingEntity = normalizeTopic(extractHeadingEntityFromSentence(sentence));
  const subject = normalizeTopic(extractSentenceSubject(cleaned) || headingEntity);
  const topic = normalizeTopic(
    headingEntity || extractProminentTopic(sentence) || extractSentenceSubject(cleaned) || extractTopicFromSentence(cleaned),
  );
  const battleMatch = cleaned.match(/\b(Battle of [A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\b/);
  const yearMatch = cleaned.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  const betweenMatch = cleaned.match(/between\s+([A-Z][A-Za-z\s]+?)\s+and\s+([A-Z][A-Za-z\s]+?)(?:,| who|\.|$)/i);
  const capturedMatch = cleaned.match(/\bcaptured\s+([A-Z][A-Za-z\s-]+?)(?:\s+from|\s+in|\.|,|$)/i);
  const titleMatch = cleaned.match(/\b(?:proclaimed himself as|assumed the title)\s+["“]?([^"”.]+)["”]?/i);
  const memoirMatch = cleaned.match(/\bwrote (?:his )?memoirs,\s*([^,.]+)\b/i);
  const languageMatch = cleaned.match(/\bin the ([A-Z][A-Za-z-]+) language\b/i);
  const definitionMatch = cleaned.match(/\b([A-Za-z-]+)\s+means\s+([^,.]+)/i);

  const prompts = [];

  if (battleMatch?.[1]) {
    prompts.push(`What happened in the ${battleMatch[1]}?`);
    if (yearMatch?.[1]) {
      prompts.push(`When did the ${battleMatch[1]} take place?`);
    }
    if (betweenMatch?.[1] && betweenMatch?.[2]) {
      prompts.push(`Who fought in the ${battleMatch[1]}?`);
    }
  }

  if (
    definitionMatch?.[1] &&
    !/^(effective|only|famous|important|increased|well|great|pure|all)$/i.test(cleanText(definitionMatch[1]))
  ) {
    const definitionTopic = cleanText(definitionMatch[1]);
    prompts.push(
      shouldUseWhatIsQuestion(definitionTopic)
        ? `What is ${definitionTopic.toLowerCase()}?`
        : `What does ${definitionTopic} mean?`,
    );
  }

  if (/\bstate.?s share was one third\b/i.test(lower)) {
    prompts.push("What was the state's share of average produce?");
  }

  if (/\brevenue was fixed on the average yield\b/i.test(lower)) {
    prompts.push("How was revenue fixed?");
  }

  if (/\blowest rank was 10\b/i.test(lower)) {
    prompts.push("What was the rank range in the mansabdari system?");
  }

  if (/\breimposed jizya and pilgrim tax\b/i.test(lower)) {
    prompts.push("What was reimposed in 1679?");
  }

  if (/\bhamzanama\b/i.test(lower)) {
    prompts.push("What was Hamzanama?");
  }

  if (subject && /\bfounder of\b/i.test(lower)) {
    prompts.push(`Who was ${subject}?`);
  }

  if (subject && /\beldest son of\b/i.test(lower)) {
    prompts.push(`Who was ${subject}?`);
  }

  if (subject && /\bcomposed\b/i.test(lower)) {
    prompts.push(`What did ${subject} compose?`);
  }

  if (subject && /\bwrote\b/i.test(lower) && !/\bmemoirs\b/i.test(lower)) {
    prompts.push(`What did ${subject} write?`);
  }

  if (subject && /\bsucceeded\b/i.test(lower)) {
    prompts.push(`Whom did ${subject} succeed?`);
  }

  if (subject && /\blaunched\b.+\bexpeditions\b/i.test(lower)) {
    prompts.push(`What expeditions did ${subject} launch?`);
  }

  if (subject && /\bdefeated\b/i.test(lower)) {
    prompts.push(`Whom did ${subject} defeat?`);
  }

  if (subject && capturedMatch?.[1]) {
    prompts.push(`What did ${subject} capture?`);
  }

  if (subject && titleMatch?.[1]) {
    prompts.push(`What title did ${subject} assume?`);
  }

  if (subject && memoirMatch?.[1]) {
    prompts.push(`What did ${subject} write?`);
  }

  if (subject && languageMatch?.[1] && /\bmother tongue\b/i.test(lower)) {
    prompts.push(`What was ${subject}'s mother tongue?`);
  }

  if (subject && /\bwas due to\b/i.test(lower)) {
    prompts.push(`Why was ${subject} successful?`);
  }

  if (topic) {
    prompts.push(buildDeterministicFlashcardQuestion(cleaned));
  }

  return uniqueBy(
    prompts
      .filter(Boolean)
      .map((question) => ({
        question,
        answer: selectBestAnswerText(cleaned),
      })),
    (item) => normalizeComparisonText(item.question),
  );
};

const buildDeterministicFlashcards = (
  text,
  count,
  excludedQuestions = [],
  excludedAnswers = [],
) => {
  const sentenceCandidates = dedupeSentences(
    getSentences(text).filter(
      (sentence) =>
        !isLowValueLine(sentence) &&
        !isInstructionalExampleSentence(sentence) &&
        cleanText(sentence).split(/\s+/).filter(Boolean).length >= 8,
    ),
  ).flatMap((sentence, index) => {
    const cleaned = cleanSourceSentenceContext(sentence);
    const scoreBase =
      (/\b(Battle of|founder|eldest son|title|defeated|captured|launched|memoirs|Empire|dynasty)\b/i.test(cleaned)
        ? 4
        : 0) +
      (/\b\d{4}\b/.test(cleaned) ? 2 : 0) +
      Math.max(0, 20 - index * 0.2);

    return buildDeterministicFlashcardCandidates(cleaned).map((card, candidateIndex) => ({
      ...card,
      difficulty: ["easy", "medium", "hard"][(index + candidateIndex) % 3],
      _score: scoreBase - candidateIndex * 0.15,
    }));
  });

  const lineCandidates = dedupeLines(
    splitChunkIntoStudyLines(text).filter(
      (line) =>
        !isLowValueLine(line) &&
        !isInstructionalExampleSentence(line) &&
        cleanText(line).split(/\s+/).filter(Boolean).length >= 5,
    ),
  ).flatMap((line, index) => {
    const cleaned = cleanSourceSentenceContext(line);
    return buildDeterministicFlashcardCandidates(cleaned).map((card, candidateIndex) => ({
      ...card,
      difficulty: ["easy", "medium", "hard"][(index + candidateIndex + 1) % 3],
      _score: Math.max(0, 14 - index * 0.08) - candidateIndex * 0.1,
    }));
  });

  const sectionCandidates = extractStructuredSections(text).flatMap((section, index) => {
    const heading = normalizeTopic(section.heading);
    if (!heading) {
      return [];
    }

    const sectionLines = dedupeLines(
      splitChunkIntoStudyLines(section.content).filter(
        (line) =>
          !isLowValueLine(line) &&
          !isInstructionalExampleSentence(line) &&
          cleanText(line).split(/\s+/).filter(Boolean).length >= 5,
      ),
    ).slice(0, 6);

    const syntheticLines = [
      ...sectionLines,
      `${heading} ${section.content}`.slice(0, 500),
    ];

    return syntheticLines.flatMap((line, lineIndex) =>
      buildDeterministicFlashcardCandidates(line).map((card, candidateIndex) => ({
        ...card,
        difficulty: ["easy", "medium", "hard"][(index + lineIndex + candidateIndex) % 3],
        _score: 18 - index * 0.2 - lineIndex * 0.12 - candidateIndex * 0.08,
      })),
    );
  });

  return filterOutPreviouslyUsedCards(
    mergeDiverseFlashcards(
      [...sentenceCandidates, ...lineCandidates, ...sectionCandidates]
        .filter(
          (card) =>
            card.question &&
            card.answer &&
            !hasQuestionQualityIssue(card.question) &&
            !isWeakFlashcard(card),
        )
        .sort((a, b) => b._score - a._score),
      [],
      count * 4,
    ),
    excludedQuestions,
    excludedAnswers,
  ).map(({ _score, ...card }) => card);
};

const buildQuizOptions = (correctAnswer, distractorPool = []) => {
  const options = uniqueBy(
    [
      correctAnswer,
      ...distractorPool.map((option) => sanitizeOptionText(option)),
    ]
      .filter(Boolean)
      .map((value) => ({ value: sanitizeOptionText(value) })),
    (item) => normalizeComparisonText(item.value),
  )
    .map((item) => item.value)
    .filter(Boolean);

  return options.slice(0, 4);
};

const buildDeterministicQuiz = (text, count, generationIndex = 0) => {
  const flashcards = buildDeterministicFlashcards(text, Math.max(count * 8, 24), [], []);
  const answerPool = flashcards.map((card) => card.answer).filter(Boolean);
  const questions = flashcards
    .map((card, index) => {
      const distractors = answerPool.filter(
        (answer) => normalizeComparisonText(answer) !== normalizeComparisonText(card.answer),
      );

      const options = buildQuizOptions(card.answer, distractors);
      if (options.length < 4) {
        return null;
      }

      return {
        question: card.question,
        options,
        correctAnswer: sanitizeOptionText(card.answer),
        explanation: sanitizeStudyText(card.answer),
        difficulty: card.difficulty || ["easy", "medium", "hard"][index % 3],
      };
    })
    .filter(Boolean)
    .slice(0, Math.max(count * 6, 18));

  return selectRotatingSlice(questions, count, generationIndex * count);
};

const buildLastResortFlashcards = (text, count, excludedQuestions = []) => {
  const sentencePool = dedupeSentences(
    getSentences(text).filter(
      (sentence) =>
        !isLowValueLine(sentence) &&
        !isInstructionalExampleSentence(sentence) &&
        cleanText(sentence).split(/\s+/).length >= 8,
    ),
  ).slice(0, Math.max(count * 8, 24));

  const cards = sentencePool.map((sentence, index) =>
    normalizeFlashcard(
      {
        question: buildSentenceFlashcardQuestion(sentence),
        answer: selectBestAnswerText(sentence),
        difficulty: ["easy", "medium", "hard"][index % 3],
      },
      sentence,
    ),
  );

  return filterOutPreviouslyUsedQuestions(
    mergeDiverseFlashcards(cards, [], count * 3),
    excludedQuestions,
  ).filter((card) => !isWeakFlashcard(card));
};

const mergeUniqueByQuestion = (primary = [], fallback = [], limit = 10) =>
  uniqueBy(
    [...primary, ...fallback].filter((item) => item?.question && !isLowValueLine(item.question)),
    (item) => item.question.toLowerCase(),
  ).slice(0, limit);

const filterOutPreviouslyUsedQuestions = (cards = [], excludedQuestions = []) => {
  const excluded = new Set(
    excludedQuestions
      .map((question) => normalizeComparisonText(question))
      .filter(Boolean),
  );
  const excludedFamilies = new Set(
    excludedQuestions
      .map((question) => normalizeQuestionFamily(question))
      .filter(Boolean),
  );

  return cards.filter(
    (card) =>
      !excluded.has(normalizeComparisonText(card?.question || "")) &&
      !excludedFamilies.has(normalizeQuestionFamily(card?.question || "")),
  );
};

const buildSupplementalFlashcards = (text, count, excludedQuestions = []) => {
  const supplementalCards = getImportantSentences(text, Math.max(count * 6, 18)).map((sentence, index) => {
    const topic = normalizeTopic(extractTopicFromSentence(sentence));
    return normalizeFlashcard(
      {
        question: buildFlashcardQuestion(topic, sentence),
        answer: selectBestAnswerText(sentence),
        difficulty: ["easy", "medium", "hard"][index % 3],
      },
      sentence,
    );
  });

  return filterOutPreviouslyUsedQuestions(
    mergeDiverseFlashcards(supplementalCards, [], count * 3),
    excludedQuestions,
  ).filter((card) => !isWeakFlashcard(card));
};

const ensureFlashcardCount = (cards = [], text, count, excludedQuestions = []) => {
  const primaryCards = filterOutPreviouslyUsedQuestions(cards, excludedQuestions).filter(
    (card) => !isWeakFlashcard(card),
  );

  if (primaryCards.length >= count) {
    return primaryCards.slice(0, count);
  }

  const fallbackCards = fallbackFlashcards(text, count * 3, excludedQuestions);
  const supplementalCards = buildSupplementalFlashcards(text, count * 3, excludedQuestions);
  const lastResortCards = buildLastResortFlashcards(text, count * 3, excludedQuestions);

  return mergeDiverseFlashcards(
    primaryCards,
    [...fallbackCards, ...supplementalCards, ...lastResortCards],
    count,
  ).filter((card) => !isWeakFlashcard(card));
};

const selectRelevantSentences = (text, query = "", limit = 6) => {
  const queryWords = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);

  const sentences = getSentences(text).filter((sentence) => isConceptRichSentence(sentence));
  const scored = sentences.map((sentence) => {
    const lower = sentence.toLowerCase();
    const score = queryWords.reduce(
      (sum, word) => sum + (lower.includes(word) ? 1 : 0),
      0,
    );
    return { sentence, score };
  });

  return scored
    .sort((a, b) => b.score - a.score || b.sentence.length - a.sentence.length)
    .slice(0, limit)
    .map((entry) => entry.sentence);
};

const isUsefulSectionHeading = (heading = "") => {
  const normalized = normalizeHeadingText(heading);
  const lower = normalized.toLowerCase();
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;

  return (
    Boolean(normalized) &&
    !isLowValueLine(normalized) &&
    wordCount >= 1 &&
    wordCount <= 5 &&
    !/[.?]/.test(normalized) &&
    !/^[a-z]/.test(normalized) &&
    !/^(to\b|here\b|across\b|down\b|india\b|modern city\b|bengaluru\b|noodles\b|locating places on earth\b)/i.test(lower) &&
    !/^(let'?s explore|the big questions|questions, activities and projects|before we move on|important points)$/i.test(lower) &&
    !/\b(draw|assume|consider|simply|meaning|explanation|attached to|joined|representing)\b/i.test(lower)
  );
};

const isSummaryPointCandidate = (sentence = "") => {
  const normalized = cleanText(sentence);
  const lower = normalized.toLowerCase();

  return (
    Boolean(normalized) &&
    !normalized.includes("?") &&
    !isLowValueLine(normalized) &&
    !isInstructionalExampleSentence(normalized) &&
    !/\bnoodles\b/i.test(lower) &&
    !/\(if you do not know|which measures|this graph shows|experienced the first two|everyone agrees|the one hand|on the other hand/i.test(lower) &&
    !/^(the one hand|on the one hand|the latter|the former|but let us|let us|imagine|consider|suppose|hint:|return to|draw|discuss|observe)\b/i.test(lower) &&
    !/\b(let'?s explore|fig\.|questions, activities and projects|don[’']?t miss out)\b/i.test(lower)
  );
};

const splitChunkIntoStudyLines = (text = "") =>
  stripDocumentBoilerplate(text)
    .replace(/\s*([●•◦▪])\s*/g, "\n$1 ")
    .split(/[●•◦▪\n]+|(?<=[.!?])\s+(?=[A-Z])|;\s+(?=[A-Z0-9])/)
    .map((line) => cleanText(line))
    .filter(Boolean);

const splitLineIntoDefinitionUnits = (text = "") =>
  cleanText(text)
    .split(/(?<=[.!?])\s+|\s+(?=\d+\.\s)|\s+(?=[A-Z][A-Za-z-]*\s*[-–]\s*i[-–]\s*[A-Za-z-]+\s*[-–])/)
    .map((line) => cleanText(line.replace(/^\d+\.\s*/, "")))
    .filter(Boolean);

const extractConciseDefinitionAnswer = (line = "", target = "") => {
  const normalizedLine = cleanText(line);
  const normalizedTarget = cleanText(target)
    .replace(/^(the|a|an)\s+/i, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedLine || !normalizedTarget) {
    return "";
  }

  const escapedTarget = normalizedTarget.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const directPatterns = [
    new RegExp(`^${escapedTarget}\\s+(?:is|are|was|were|means|refers to|is defined as)\\s+(.+)$`, "i"),
    new RegExp(`^${escapedTarget}\\s*[-–:]\\s*(.+)$`, "i"),
  ];

  for (const pattern of directPatterns) {
    const match = normalizedLine.match(pattern);
    if (match?.[1]) {
      return cleanText(match[1]);
    }
  }

  const aliasPatterns = [
    /^(.+?)\s+(?:is|are|was|were)\s+called\s+(.+)$/i,
    /^(.+?)\s+(?:is|are|was|were)\s+known as\s+(.+)$/i,
    /^(.+?)\s*,?\s+also called\s+(.+)$/i,
  ];

  for (const pattern of aliasPatterns) {
    const match = normalizedLine.match(pattern);
    const base = cleanText(match?.[1] || "");
    const alias = cleanText(match?.[2] || "");
    if (!base || !alias) {
      continue;
    }

    const aliasNormalized = alias.replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    if (aliasNormalized.includes(normalizedTarget.toLowerCase())) {
      if (/^(this|these|it|they)$/i.test(base)) {
        return cleanText(alias.split(",")[0]);
      }

      return base;
    }
  }

  return "";
};

const expandDefinitionWithContext = (answer = "", lines = [], lineIndex = -1) => {
  const normalizedAnswer = cleanText(answer);
  const previousLine = cleanText(lines[lineIndex - 1] || "");
  const currentLine = cleanText(lines[lineIndex] || "");

  if (
    /\bcardinal directions?\b/i.test(normalizedAnswer) &&
    /\bfour directions\b/i.test(previousLine) &&
    /\bnorth\b/i.test(previousLine) &&
    /\beast\b/i.test(previousLine) &&
    /\bsouth\b/i.test(previousLine) &&
    /\bwest\b/i.test(previousLine)
  ) {
    return "North, east, south and west directions";
  }

  if (
    /\bintermediate directions?\b/i.test(normalizedAnswer) &&
    /\bnortheast\b/i.test(currentLine) &&
    /\bsoutheast\b/i.test(currentLine) &&
    /\bsouthwest\b/i.test(currentLine) &&
    /\bnorthwest\b/i.test(currentLine)
  ) {
    return "Northeast, southeast, southwest and northwest directions";
  }

  return normalizedAnswer;
};

const cleanSummaryPoint = (point = "", heading = "") => {
  const normalized = cleanText(point)
    .replace(/^[●•-]\s*/, "")
    .replace(/^Mausoleum at /i, "Sher Shah built a mausoleum at ")
    .trim();

  const headingSubjectMatch = normalizeHeadingText(heading).match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\b/);
  const subject = headingSubjectMatch?.[1] || "";

  if (!subject) {
    return normalized;
  }

  return normalized
    .replace(/^He\b/i, subject)
    .replace(/^His\b/i, `${subject}'s`)
    .replace(/^She\b/i, subject);
};

const replaceLeadingPronounWithConcept = (text = "", concept = "") => {
  const normalized = cleanText(text);
  if (!normalized || !concept) {
    return normalized;
  }

  return normalized
    .replace(/^He\b/i, concept)
    .replace(/^His\b/i, `${concept}'s`)
    .replace(/^She\b/i, concept)
    .replace(/^Her\b/i, `${concept}'s`)
    .replace(/^It\b/i, concept);
};

const toTitleCase = (text = "") =>
  cleanText(text)
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());

const isGenericHeadingLabel = (heading = "") =>
  /^(estimate|military conquests|religious policy|relations with rajputs|land revenue administration|war of succession|paintings and music|language and literature|administration)$/i.test(
    normalizeHeadingText(heading),
  );

const inferEntityFromHeading = (heading = "") => {
  const normalized = normalizeHeadingText(heading);
  if (!normalized || isGenericHeadingLabel(normalized)) {
    return "";
  }

  const ofMatch = normalized.match(/\bOF\s+([A-Z][A-Z\s'-]+)$/);
  if (ofMatch?.[1]) {
    return toTitleCase(ofMatch[1]);
  }

  if (/^[A-Z][A-Z\s'-]+$/.test(normalized) && normalized.split(/\s+/).length <= 4) {
    return toTitleCase(normalized);
  }

  if (/^[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}$/.test(normalized)) {
    return normalized;
  }

  return "";
};

const extractNamedSubjectFromLine = (line = "") => {
  const normalized = cleanText(line);
  if (!normalized) {
    return "";
  }

  const roleLeadMatch = normalized.match(
    /^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+(was|is|were|are|wrote|assumed|succeeded|captured|defeated|marched|proclaimed|introduced|died|married|conquered|founded)\b/,
  );
  if (roleLeadMatch?.[1]) {
    if (/^(he|she|his|her|it|they)$/i.test(roleLeadMatch[1])) {
      return "";
    }

    return roleLeadMatch[1];
  }

  const embeddedRoleMatch = normalized.match(
    /\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+(was|is|were|are|wrote|assumed|succeeded|captured|defeated|marched|proclaimed|introduced|died|married|conquered|founded)\b/,
  );
  if (embeddedRoleMatch?.[1]) {
    if (/^(he|she|his|her|it|they)$/i.test(embeddedRoleMatch[1])) {
      return "";
    }

    return embeddedRoleMatch[1];
  }

  const founderLeadMatch = normalized.match(
    /^The founder of\s+.+?\s+was\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\b/i,
  );
  if (founderLeadMatch?.[1]) {
    if (/^(he|she|his|her|it|they)$/i.test(founderLeadMatch[1])) {
      return "";
    }

    return founderLeadMatch[1];
  }

  return "";
};

const resolvePronounSubject = (lines = [], lineIndex = -1, heading = "") => {
  for (let index = lineIndex - 1; index >= 0; index -= 1) {
    const candidate = extractNamedSubjectFromLine(lines[index]);
    if (candidate) {
      return candidate;
    }
  }

  return inferEntityFromHeading(heading);
};

const extractReignEntityFromLine = (line = "") => {
  const normalized = cleanText(line);
  if (!normalized) {
    return "";
  }

  const reignMatch =
    normalized.match(/\bduring\s+the\s+reign\s+of\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\b/i) ||
    normalized.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})['’]s\s+reign\b/i);

  return reignMatch?.[1] ? cleanText(reignMatch[1]) : "";
};

const cleanResolvedEntity = (value = "") =>
  cleanText(value)
    .replace(/^during\s+/i, "")
    .replace(/^the\s+reign\s+of\s+/i, "")
    .trim();

const isUsefulSummaryChunk = (chunk = {}) => {
  const content = cleanText(chunk.content || "");
  const heading = normalizeHeadingText(chunk.heading || "");
  const lowerHeading = heading.toLowerCase();

  return (
    Boolean(content) &&
    !chunk.isLikelyIndex &&
    !isLikelyLowValueSentence(content) &&
    !/^(let'?s explore|questions, activities and projects|across|down|india|locating places on earth|noodles|the big questions)$/i.test(
      lowerHeading,
    ) &&
    !/\b(crossword|notes and doodles|draw|activity|projects)\b/i.test(`${lowerHeading} ${content.toLowerCase()}`)
  );
};

const buildSummaryPointsFromChunks = (chunks = [], limit = 40) => {
  const selected = [];
  const usedKeys = new Set();
  const headingCounts = new Map();

  for (const chunk of chunks) {
    if (!isUsefulSummaryChunk(chunk)) {
      continue;
    }

    const heading = normalizeHeadingText(chunk.heading || "");
    const headingKey = heading.toLowerCase() || `page-${chunk.pageNumber || "?"}`;
    const perHeadingLimit = heading ? 4 : 2;
    const currentCount = headingCounts.get(headingKey) || 0;
    if (currentCount >= perHeadingLimit) {
      continue;
    }

    const sentences = splitChunkIntoStudyLines(chunk.content || "")
      .map((sentence) => cleanSummaryPoint(sentence, heading))
      .filter((sentence) => isSummaryPointCandidate(sentence))
      .map((sentence) => sanitizeFullStudyText(sentence))
      .filter(Boolean);

    for (const point of sentences) {
      const key = point.toLowerCase();
      if (usedKeys.has(key)) {
        continue;
      }

      selected.push(point);
      usedKeys.add(key);
      headingCounts.set(headingKey, (headingCounts.get(headingKey) || 0) + 1);
      if ((headingCounts.get(headingKey) || 0) >= perHeadingLimit || selected.length >= limit) {
        break;
      }
    }

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
};

const buildSummarySectionsFromChunks = (chunks = []) => {
  const sections = [];
  let current = null;

  for (const chunk of chunks) {
    const heading = normalizeHeadingText(chunk.heading || "");
    const content = cleanText(chunk.content || "");
    if (!content || isLikelyLowValueSentence(content)) {
      continue;
    }

    if (isUsefulSectionHeading(heading)) {
      if (current?.points?.length) {
        sections.push(current);
      }

      current = {
        heading,
        points: [],
      };
    } else if (!current) {
      current = {
        heading: "",
        points: [],
      };
    }

    const points = getSentences(content)
      .filter((sentence) => isSummaryPointCandidate(sentence))
      .map((sentence) => sanitizeStudyText(sentence, { maxWords: 24 }))
      .filter(Boolean)
      .slice(0, 2);

    current.points.push(...points);
  }

  if (current?.points?.length) {
    sections.push(current);
  }

  return sections
    .map((section) => ({
      heading: section.heading,
      points: dedupeLines(section.points).slice(0, 3),
    }))
    .filter((section) => section.points.length > 0);
};

const fallbackSummary = (input) => {
  const text = typeof input === "string" ? input : input?.text || "";
  const chunks = Array.isArray(input?.chunks) ? input.chunks : [];

  const chunkPoints = buildSummaryPointsFromChunks(chunks, 40);
  if (chunkPoints.length > 0) {
    return `Important points:\n${formatBulletList(chunkPoints)}`;
  }

  const textSections = extractStructuredSections(text)
    .map((section) => ({
      points: dedupeLines(
        getSentences(section.content)
          .filter((sentence) => isSummaryPointCandidate(sentence))
          .map((sentence) => sanitizeFullStudyText(sentence)),
      ).slice(0, 2),
    }))
    .filter((section) => section.points.length > 0)
    .slice(0, 8);

  if (textSections.length > 0) {
    return `Important points:\n${formatBulletList(textSections.flatMap((section) => section.points).slice(0, 40))}`;
  }

  const sentences = getImportantSentences(text, 8)
    .filter((sentence) => !isLowValueLine(sentence))
    .map((sentence) => sanitizeFullStudyText(sentence))
    .slice(0, 6);

  if (sentences.length === 0) {
    return "Important points could not be extracted because the PDF did not contain enough readable body text.";
  }

  return `Important points:\n${formatBulletList(sentences)}`;
};

const extractDirectIdentityAnswer = (question = "", contextChunks) => {
  const normalizedQuestion = cleanText(question);
  const subject = extractSubjectFromQuestion(normalizedQuestion);
  const subjectLower = subject.toLowerCase();

  if (!/^(who|what)\s+(is|was|were|are)\b/i.test(normalizedQuestion) || !subjectLower) {
    return "";
  }

  const chunks = Array.isArray(contextChunks)
    ? contextChunks
    : [{ content: String(contextChunks || ""), heading: "" }];
  const matches = [];

  for (const chunk of chunks) {
    const heading = normalizeHeadingText(chunk.heading || "");
    const lines = splitChunkIntoStudyLines(chunk.content || "");

    for (const rawLine of lines) {
      const line = cleanText(rawLine);
      const lower = line.toLowerCase();
      const subjectPattern = subjectLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const appositiveMatch = line.match(
        new RegExp(`\\b(${subjectPattern})\\s*\\(([^)]+)\\)\\s+was\\b`, "i"),
      );
      if (
        appositiveMatch?.[1] &&
        appositiveMatch?.[2] &&
        !line.includes("?") &&
        !isInstructionalExampleSentence(line) &&
        !isLowValueLine(line)
      ) {
        matches.push({
          score: 10,
          text: sanitizeFullStudyText(`${appositiveMatch[1]} was ${cleanText(appositiveMatch[2])}`),
        });
      }

      if (
        lower.includes(subjectLower) &&
        !line.includes("?") &&
        !isInstructionalExampleSentence(line) &&
        !isLowValueLine(line) &&
        new RegExp(`\\b${subjectPattern}\\b\\s+(was|is|were|are)\\b`, "i").test(lower)
      ) {
        let score = 1;
        if (new RegExp(`^${subjectPattern}\\s+(was|is|were|are)\\b`, "i").test(lower)) score += 5;
        if (new RegExp(`\\b${subjectPattern}\\s*\\(`, "i").test(line)) score += 4;
        if (new RegExp(`\\b(one of the|founder|greatest|emperor|monarch|ruler)\\b`, "i").test(lower)) score += 2;
        if (/\bborn in\b/i.test(lower)) score -= 2;
        matches.push({
          score,
          text: sanitizeFullStudyText(replaceLeadingPronounWithConcept(line, heading || subject)),
        });
      }
    }
  }

  if (matches.length > 0) {
    return matches.sort((a, b) => b.score - a.score || a.text.length - b.text.length)[0].text;
  }

  return "";
};

const extractDirectFactAnswer = (question = "", contextChunks) => {
  const normalizedQuestion = cleanText(question);
  const lowerQuestion = normalizedQuestion.toLowerCase();
  const chunks = Array.isArray(contextChunks)
    ? contextChunks
    : [{ content: String(contextChunks || ""), heading: "" }];
  const builtTarget =
    normalizedQuestion.match(/^who\s+built\s+(.+?)\??$/i)?.[1] ||
    normalizedQuestion.match(/^who\s+constructed\s+(.+?)\??$/i)?.[1] ||
    "";

  if (builtTarget) {
    const target = cleanText(builtTarget).replace(/^(the|a|an)\s+/i, "");
    const targetLower = target.toLowerCase();
    const targetTokens = tokenize(target);
    const candidates = [];

    for (const chunk of chunks) {
      const lines = splitChunkIntoStudyLines(chunk.content || "");

      lines.forEach((rawLine, lineIndex) => {
        const line = cleanText(rawLine);
        const lower = line.toLowerCase();
        if (!line || line.includes("?") || isInstructionalExampleSentence(line) || isLowValueLine(line)) {
          return;
        }

        const matchedTokenCount = targetTokens.reduce(
          (sum, token) => sum + (lower.includes(token) ? 1 : 0),
          0,
        );
        const coverage = targetTokens.length > 0 ? matchedTokenCount / targetTokens.length : 0;
        if (coverage < 0.6 || !/\b(built|constructed|completed)\b/i.test(lower)) {
          return;
        }

        let answer = "";
        const directBuilderMatch =
          line.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+built\b/i) ||
          line.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+also\s+built\b/i) ||
          line.match(/built by\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})/i) ||
          line.match(/completed by\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})/i);

        if (directBuilderMatch?.[1]) {
          answer = cleanText(directBuilderMatch[1]);
        }

        if (!answer) {
          for (let index = lineIndex; index >= 0; index -= 1) {
            const reignEntity = extractReignEntityFromLine(lines[index]);
            if (reignEntity) {
              answer = reignEntity;
              break;
            }
          }
        }

        if (!answer) {
          answer = resolvePronounSubject(lines, lineIndex, chunk.heading || "");
        }

        if (!answer) {
          return;
        }

        answer = cleanResolvedEntity(answer);
        if (!answer) {
          return;
        }

        let score = coverage * 10;
        if (directBuilderMatch?.[1]) score += 5;
        if (extractReignEntityFromLine(line) || extractReignEntityFromLine(lines[Math.max(0, lineIndex - 1)] || "")) score += 3;
        if (/^\bthe\b/i.test(line)) score -= 1;

        candidates.push({
          score,
          answer,
        });
      });
    }

    if (candidates.length > 0) {
      return candidates.sort((a, b) => b.score - a.score || a.answer.length - b.answer.length)[0].answer;
    }
  }
  const relationMatch =
    normalizedQuestion.match(/^who\s+(?:was\s+)?wife of\s+(.+?)\??$/i) ||
    normalizedQuestion.match(/^who\s+was\s+the\s+wife of\s+(.+?)\??$/i) ||
    normalizedQuestion.match(/^who\s+(?:was\s+)?husband of\s+(.+?)\??$/i) ||
    normalizedQuestion.match(/^who\s+was\s+the\s+husband of\s+(.+?)\??$/i) ||
    normalizedQuestion.match(/^who\s+(?:was\s+)?spouse of\s+(.+?)\??$/i) ||
    normalizedQuestion.match(/^who\s+was\s+the\s+spouse of\s+(.+?)\??$/i) ||
    normalizedQuestion.match(/^who\s+(?:was\s+)?son of\s+(.+?)\??$/i) ||
    normalizedQuestion.match(/^who\s+was\s+the\s+son of\s+(.+?)\??$/i) ||
    normalizedQuestion.match(/^who\s+(?:was\s+)?daughter of\s+(.+?)\??$/i) ||
    normalizedQuestion.match(/^who\s+was\s+the\s+daughter of\s+(.+?)\??$/i) ||
    normalizedQuestion.match(/^who\s+(?:was\s+)?father of\s+(.+?)\??$/i) ||
    normalizedQuestion.match(/^who\s+was\s+the\s+father of\s+(.+?)\??$/i) ||
    normalizedQuestion.match(/^who\s+(?:was\s+)?mother of\s+(.+?)\??$/i) ||
    normalizedQuestion.match(/^who\s+was\s+the\s+mother of\s+(.+?)\??$/i) ||
    "";

  if (relationMatch?.[1]) {
    const target = cleanText(relationMatch[1]).replace(/^(the|a|an)\s+/i, "");
    const targetLower = target.toLowerCase();
    const isWifeQuery = /\bwife of\b/i.test(normalizedQuestion);
    const isHusbandQuery = /\bhusband of\b/i.test(normalizedQuestion);
    const isSpouseQuery = /\bspouse of\b/i.test(normalizedQuestion);
    const isSonQuery = /\bson of\b/i.test(normalizedQuestion);
    const isDaughterQuery = /\bdaughter of\b/i.test(normalizedQuestion);
    const isFatherQuery = /\bfather of\b/i.test(normalizedQuestion);
    const isMotherQuery = /\bmother of\b/i.test(normalizedQuestion);
    const candidates = [];

    for (const chunk of chunks) {
      for (const rawLine of splitChunkIntoStudyLines(chunk.content || "")) {
        const line = cleanText(rawLine);
        const lower = line.toLowerCase();
        if (!line || line.includes("?") || isInstructionalExampleSentence(line) || isLowValueLine(line)) {
          continue;
        }

        if (!lower.includes(targetLower) && !hasFuzzyPhraseMatch(target, line)) {
          continue;
        }

        let answer = "";
        let score = 0;

        if ((isWifeQuery || isHusbandQuery || isSpouseQuery) && /\bmarried\b/i.test(lower)) {
          const spouseBeforeTargetMatch = line.match(
            /^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\s+married\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})/i,
          );
          if (spouseBeforeTargetMatch?.[1] && spouseBeforeTargetMatch?.[2]) {
            const firstPerson = cleanText(spouseBeforeTargetMatch[1]);
            const secondPerson = cleanText(spouseBeforeTargetMatch[2]);
            if (firstPerson.toLowerCase().includes(targetLower) || hasFuzzyPhraseMatch(target, firstPerson)) answer = secondPerson;
            if (secondPerson.toLowerCase().includes(targetLower) || hasFuzzyPhraseMatch(target, secondPerson)) answer = firstPerson;
          }

          const marriedObjectMatch = line.match(
            /(?:When\s+)?([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}).+?\bhe married\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,4}?)(?=\s+on\b|\s+in\b|[.,;]|$)/i,
          );
          if (!answer && marriedObjectMatch?.[1] && marriedObjectMatch?.[2]) {
            const subject = cleanText(marriedObjectMatch[1]);
            const spouse = cleanText(marriedObjectMatch[2]);
            if (subject.toLowerCase().includes(targetLower) || hasFuzzyPhraseMatch(target, subject)) {
              answer = spouse;
            }
          }

          if (answer) {
            score += 10;
            if (new RegExp(`\\b${targetLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lower)) score += 2;
          }
        }

        if ((isSonQuery || isDaughterQuery) && /\bson of\b|\bdaughter of\b/i.test(lower)) {
          const relationRegex = isSonQuery
            ? /^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\s+was\s+the\s+eldest\s+son of\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})/i
            : /^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\s+was\s+the\s+daughter of\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})/i;
          const relationMatchLine = line.match(relationRegex);
          if (relationMatchLine?.[1] && relationMatchLine?.[2] && cleanText(relationMatchLine[2]).toLowerCase().includes(targetLower)) {
            answer = cleanText(relationMatchLine[1]);
            score += 10;
          }
        }

        if ((isFatherQuery || isMotherQuery) && /\bfather\b|\bmother\b/i.test(lower)) {
          const relationRegex = isFatherQuery
            ? /^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\s+succeeded\s+his\s+father\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})/i
            : /^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}).+?\bmother\b\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})/i;
          const relationMatchLine = line.match(relationRegex);
          if (relationMatchLine?.[1] && relationMatchLine?.[2] && cleanText(relationMatchLine[1]).toLowerCase().includes(targetLower)) {
            answer = cleanText(relationMatchLine[2]);
            score += 10;
          }
        }

        if (answer) {
          candidates.push({ score, answer });
        }
      }
    }

    if (candidates.length > 0) {
      return candidates.sort((a, b) => b.score - a.score || a.answer.length - b.answer.length)[0].answer;
    }
  }
  const actionMatch =
    normalizedQuestion.match(/^who\s+(.+?)\??$/i);

  if (actionMatch?.[1] && !/^(was|is|were|are)\b/i.test(actionMatch[1])) {
    const actionText = cleanText(actionMatch[1]);
    const actionTokens = tokenize(actionText);
    const candidates = [];

    for (const chunk of chunks) {
      const lines = splitChunkIntoStudyLines(chunk.content || "");

      lines.forEach((rawLine, lineIndex) => {
        const line = cleanText(rawLine);
        const lower = line.toLowerCase();
        if (!line || line.includes("?") || isInstructionalExampleSentence(line) || isLowValueLine(line)) {
          return;
        }

        const matchedTokenCount = actionTokens.reduce(
          (sum, token) => sum + (lower.includes(token) ? 1 : 0),
          0,
        );
        const coverage = actionTokens.length > 0 ? matchedTokenCount / actionTokens.length : 0;
        if (coverage < 0.6) {
          return;
        }

        const explicitSubject = extractNamedSubjectFromLine(line);
        const resolvedSubject = explicitSubject || resolvePronounSubject(lines, lineIndex, chunk.heading || "");
        if (!resolvedSubject) {
          return;
        }

        let score = coverage * 10;
        if (/^(he|she|his|her)\b/i.test(line)) score += 2;
        if (explicitSubject) score += 4;
        if (inferEntityFromHeading(chunk.heading || "")) score += 1;

        candidates.push({
          score,
          answer: resolvedSubject,
        });
      });
    }

    if (candidates.length > 0) {
      return candidates.sort((a, b) => b.score - a.score || a.answer.length - b.answer.length)[0].answer;
    }
  }
  const definitionTarget =
    normalizedQuestion.match(/^what\s+(?:is|was|are|were)\s+(.+?)\??$/i)?.[1] ||
    normalizedQuestion.match(/^define\s+(.+?)\??$/i)?.[1] ||
    (!looksLikeQuestion(normalizedQuestion) && extractSubjectFromQuestion(normalizedQuestion).split(/\s+/).filter(Boolean).length <= 6
      ? extractSubjectFromQuestion(normalizedQuestion)
      : "") ||
    "";

  if (definitionTarget) {
    const target = cleanText(definitionTarget).replace(/^(the|a|an)\s+/i, "");
    const normalizedTarget = target.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
    const targetTokens = tokenize(target);
    const candidates = [];

    for (const chunk of chunks) {
      const lines = splitChunkIntoStudyLines(chunk.content || "");
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const rawLine = lines[lineIndex];
        for (const unit of splitLineIntoDefinitionUnits(rawLine)) {
          const line = cleanText(unit);
          const lower = line.toLowerCase();
          if (!line || line.includes("?") || isInstructionalExampleSentence(line) || isLowValueLine(line)) {
            continue;
          }

          const normalizedLine = lower.replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
          const matchedTokenCount = targetTokens.reduce(
            (sum, token) => sum + (normalizedLine.includes(token) ? 1 : 0),
            0,
          );
          const coverage = targetTokens.length > 0 ? matchedTokenCount / targetTokens.length : 0;
          const hasDefinitionSignal =
            /\b(is|was|are|were|means|refers to|called as|in charge of|known as)\b/i.test(lower);

          if ((coverage < 0.6 && !normalizedLine.includes(normalizedTarget)) || !hasDefinitionSignal) {
            continue;
          }

          let score = coverage * 10;
          if (new RegExp(`^${normalizedTarget.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(normalizedLine)) {
            score += 5;
          }
          if (/\b(in charge of|means|refers to|called as|known as)\b/i.test(lower)) score += 3;
          if (line.length < 180) score += 1;

          const conciseAnswer = expandDefinitionWithContext(
            extractConciseDefinitionAnswer(line, target),
            lines,
            lineIndex,
          );
          if (conciseAnswer) {
            score += 6;
          }

          candidates.push({
            score,
            text: conciseAnswer ? sanitizeFullStudyText(conciseAnswer) : sanitizeFullStudyText(line),
          });
        }
      }
    }

    if (candidates.length > 0) {
      return candidates.sort((a, b) => b.score - a.score || a.text.length - b.text.length)[0].text;
    }
  }
  const yearTarget =
    normalizedQuestion.match(/^what happened in\s+(\d{4})\??$/i)?.[1] ||
    normalizedQuestion.match(/^what occurred in\s+(\d{4})\??$/i)?.[1] ||
    normalizedQuestion.match(/^what happened during\s+(\d{4})\??$/i)?.[1] ||
    "";

  if (yearTarget) {
    const candidates = [];

    for (const chunk of chunks) {
      const headingEntity = inferEntityFromHeading(chunk.heading || "");

      for (const rawLine of splitChunkIntoStudyLines(chunk.content || "")) {
        const line = cleanText(rawLine);
        const lower = line.toLowerCase();
        if (!line || line.includes("?") || isInstructionalExampleSentence(line) || isLowValueLine(line)) {
          continue;
        }

        if (!new RegExp(`\\b${yearTarget}\\b`).test(lower)) {
          continue;
        }

        let resolvedLine = line;
        if (/^(he|she|his|her)\b/i.test(line) && headingEntity) {
          resolvedLine = replaceLeadingPronounWithConcept(line, headingEntity);
        }

        let score = 5;
        if (new RegExp(`^in\\s+${yearTarget}\\b`, "i").test(line)) score += 4;
        if (/\b(captured|defeated|won|marched|died|married|recovered|assumed|proclaimed|introduced|issued|promulgated|abolished|executed|annexed)\b/i.test(lower)) score += 3;
        if (headingEntity) score += 1;

        candidates.push({
          score,
          text: sanitizeFullStudyText(resolvedLine),
        });
      }
    }

    if (candidates.length > 0) {
      return candidates.sort((a, b) => b.score - a.score || a.text.length - b.text.length)[0].text;
    }
  }
  const wroteTarget =
    normalizedQuestion.match(/^who wrote\s+(.+?)\??$/i)?.[1] ||
    normalizedQuestion.match(/^who authored\s+(.+?)\??$/i)?.[1] ||
    "";

  if (wroteTarget) {
    const target = cleanText(wroteTarget).toLowerCase();
    const targetTokens = tokenize(wroteTarget);
    const candidates = [];

    for (const chunk of chunks) {
      const lines = splitChunkIntoStudyLines(chunk.content || "");

      lines.forEach((rawLine, lineIndex) => {
        const line = cleanText(rawLine);
        const lower = line.toLowerCase();
        if (!line || line.includes("?") || isInstructionalExampleSentence(line) || isLowValueLine(line)) {
          return;
        }

        const matchedTokenCount = targetTokens.reduce(
          (sum, token) => sum + (lower.includes(token) ? 1 : 0),
          0,
        );
        const coverage = targetTokens.length > 0 ? matchedTokenCount / targetTokens.length : 0;
        const hasWritingSignal = /\b(wrote|written|authored|author of|memoirs?)\b/i.test(lower);

        if (coverage < 0.6 || !hasWritingSignal) {
          return;
        }

        const explicitSubject = extractNamedSubjectFromLine(line);
        const resolvedSubject = explicitSubject || resolvePronounSubject(lines, lineIndex, chunk.heading || "");
        if (!resolvedSubject) {
          return;
        }

        let score = coverage * 10;
        if (explicitSubject) score += 4;
        if (/^(he|she|his|her)\b/i.test(line)) score += 2;
        if (lower.includes(target)) score += 2;

        candidates.push({
          score,
          answer: resolvedSubject,
        });
      });
    }

    if (candidates.length > 0) {
      return candidates.sort((a, b) => b.score - a.score || a.answer.length - b.answer.length)[0].answer;
    }
  }

  const founderTarget =
    normalizedQuestion.match(/^who founded\s+(.+?)\??$/i)?.[1] ||
    normalizedQuestion.match(/^who was the founder of\s+(.+?)\??$/i)?.[1] ||
    "";

  if (founderTarget) {
    const target = cleanText(founderTarget).toLowerCase();

    for (const chunk of chunks) {
      for (const rawLine of splitChunkIntoStudyLines(chunk.content || "")) {
        const line = cleanText(rawLine);
        const lower = line.toLowerCase();
        const match = line.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+was the founder of\s+(.+?)\.$/i);
        if (match?.[1] && match?.[2]) {
          const foundTarget = cleanText(match[2]).toLowerCase();
          if (foundTarget.includes(target) || target.includes(foundTarget)) {
            return cleanText(match[1]);
          }
        }

        if (lower.includes(target) && /\bwas the founder of\b/i.test(lower)) {
          const personMatch = line.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\b/);
          if (personMatch?.[1]) {
            return cleanText(personMatch[1]);
          }
        }
      }
    }
  }

  if (/^when did\b/i.test(lowerQuestion) || /^what title did\b/i.test(lowerQuestion)) {
    return "";
  }

  const descriptorMatch = normalizedQuestion.match(/^who\s+(?:was|is|were|are)\s+(.+?)\??$/i);
  if (descriptorMatch?.[1]) {
    const descriptor = cleanText(descriptorMatch[1]).replace(/^(the|a|an)\s+/i, "");
    const descriptorTokens = tokenize(descriptor);

    if (descriptorTokens.length > 0) {
      const candidates = [];

      for (const chunk of chunks) {
        const lines = splitChunkIntoStudyLines(chunk.content || "");

        lines.forEach((rawLine, lineIndex) => {
          const line = cleanText(rawLine);
          const lower = line.toLowerCase();
          if (!line || line.includes("?") || isInstructionalExampleSentence(line) || isLowValueLine(line)) {
            return;
          }

          const matchedTokenCount = descriptorTokens.reduce(
            (sum, token) => sum + (lower.includes(token) ? 1 : 0),
            0,
          );
          const coverage = matchedTokenCount / descriptorTokens.length;
          if (coverage < 0.6) {
            return;
          }

          const explicitSubject = extractNamedSubjectFromLine(line);
          const resolvedSubject = explicitSubject || resolvePronounSubject(lines, lineIndex, chunk.heading || "");
          if (!resolvedSubject) {
            return;
          }

          let score = coverage * 10;
          if (/^(he|she|his|her)\b/i.test(line)) score += 2;
          if (explicitSubject) score += 4;
          if (inferEntityFromHeading(chunk.heading || "")) score += 1;

          candidates.push({
            score,
            answer: resolvedSubject,
          });
        });
      }

      if (candidates.length > 0) {
        return candidates.sort((a, b) => b.score - a.score || a.answer.length - b.answer.length)[0].answer;
      }
    }
  }

  return "";
};

const fallbackAnswer = (question, contextChunks) => {
  const identityAnswer = extractDirectIdentityAnswer(question, contextChunks);
  if (identityAnswer) {
    return identityAnswer;
  }

  const directFactAnswer = extractDirectFactAnswer(question, contextChunks);
  if (directFactAnswer) {
    return directFactAnswer;
  }

  const context = Array.isArray(contextChunks)
    ? contextChunks.map((chunk) => chunk.content || "").join(" ")
    : contextChunks || "";
  const subject = extractSubjectFromQuestion(question);
  const focusedSentences = getFocusedSentencesForSubject(subject, context, 3);

  if (focusedSentences.length > 0) {
    return focusedSentences
      .map((sentence) => sanitizeStudyText(sentence))
      .slice(0, 2)
      .join(" ");
  }

  const sentences = dedupeSentences(selectRelevantSentences(context, question, 8))
    .filter((sentence) => !isLowValueLine(sentence))
    .slice(0, 4);

  if (sentences.length === 0) {
    return "I could not find a reliable answer in the uploaded document for that question. Try asking about a specific concept or chapter heading from the PDF.";
  }

  return summarizeConceptFromSentences(question, sentences);
};

const fallbackFlashcards = (text, count, excludedQuestions = []) => {
  const sectionCards = extractStructuredSections(text).flatMap((section, index) => {
    const topic = normalizeTopic(section.heading);
    const firstSentence = getFocusedSentencesForSubject(topic, section.content, 1)[0]
      || getSentences(section.content).find((sentence) => !isLowValueLine(sentence));

    if (!topic || !firstSentence) {
      return [];
    }

    const isPerson = /\b(babur|humayun|akbar|jahangir|shah jahan|aurangazeb|sher shah|nur jahan)\b/i.test(topic);
    return [{
      question: isPerson ? `Who was ${topic}?` : `What should you remember about ${topic}?`,
      answer: selectBestAnswerText(firstSentence, section.content),
      difficulty: index % 3 === 0 ? "easy" : index % 3 === 1 ? "medium" : "hard",
    }];
  });

  const definitionCards = extractDefinitionCandidates(text).map((entry, index) => ({
    question: buildFlashcardQuestion(entry.topic, entry.sourceSentence),
    answer: selectBestAnswerText(entry.answer, entry.sourceSentence),
    difficulty: index % 3 === 0 ? "easy" : index % 3 === 1 ? "medium" : "hard",
  }));

  const sentenceCards = getImportantSentences(text, Math.max(count * 2, 10)).map((sentence, index) => {
    const topic = normalizeTopic(extractTopicFromSentence(sentence));
    return {
      question: buildFlashcardQuestion(topic, sentence),
      answer: selectBestAnswerText(sentence),
      difficulty: index % 3 === 0 ? "easy" : index % 3 === 1 ? "medium" : "hard",
    };
  });

  const whyHowCards = extractDefinitionCandidates(text).flatMap((entry, index) => {
    const cards = [];
    const lower = cleanText(entry.sourceSentence).toLowerCase();

    if (!/\bwhy\b/.test(lower)) {
      cards.push({
        question: `Why is ${entry.topic} important?`,
        answer: selectBestAnswerText(entry.sourceSentence),
        difficulty: index % 2 === 0 ? "medium" : "hard",
      });
    }

    cards.push({
      question: `What should you remember about ${entry.topic}?`,
      answer: selectBestAnswerText(entry.answer, entry.sourceSentence),
      difficulty: index % 2 === 0 ? "easy" : "medium",
    });

    return cards;
  });

  return filterOutPreviouslyUsedQuestions(
    mergeDiverseFlashcards([...sectionCards, ...definitionCards, ...sentenceCards], whyHowCards, count * 3),
    excludedQuestions,
  )
    .filter(
      (card) =>
        card.question &&
        !isWeakFlashcard(card) &&
        !isLowValueLine(card.question) &&
        !isLowValueLine(card.answer),
    )
    .slice(0, count);
};

const fallbackQuiz = (text, count) => {
  const sectionQuestions = extractStructuredSections(text).flatMap((section, index) => {
    const topic = normalizeTopic(section.heading);
    const firstSentence = getFocusedSentencesForSubject(topic, section.content, 1)[0]
      || getSentences(section.content).find((sentence) => !isLowValueLine(sentence));

    if (!topic || !firstSentence) {
      return [];
    }

    const correct = sanitizeOptionText(firstSentence);

    return [{
      question: /\b(babur|humayun|akbar|jahangir|shah jahan|aurangazeb|sher shah|nur jahan)\b/i.test(topic)
        ? `Who was ${topic}?`
        : buildQuizQuestion(topic, firstSentence),
      options: [
        correct,
        sanitizeOptionText(`${topic} was not discussed in the document.`),
        sanitizeOptionText(`${topic} was only mentioned as a heading.`),
        sanitizeOptionText(`The document gives a different explanation for ${topic}.`),
      ],
      correctAnswer: correct,
      explanation: sanitizeStudyText(firstSentence),
      difficulty: index % 3 === 0 ? "easy" : index % 3 === 1 ? "medium" : "hard",
    }];
  });

  const definitions = extractDefinitionCandidates(text);
  const pool = getImportantSentences(text, Math.max(count * 3, 12));

  const questions = definitions.slice(0, count).map((entry, index) => {
    const distractorPool = definitions
      .filter((candidate) => candidate.topic.toLowerCase() !== entry.topic.toLowerCase())
      .map((candidate) => shortenText(candidate.answer, 20))
      .filter(Boolean);

    const genericDistractors = [
      `${entry.topic} is not discussed in the document.`,
      `${entry.topic} is only listed as a heading without any explanation.`,
      `The document describes ${entry.topic} in the opposite way.`,
    ];

    const options = uniqueBy(
      [shortenText(entry.answer, 20), ...distractorPool, ...genericDistractors].map((value) => ({ value })),
      (item) => item.value.toLowerCase(),
    )
      .slice(0, 4)
      .map((item) => item.value);

    while (options.length < 4) {
      options.push(`The document does not provide this explanation for ${entry.topic}.`);
    }

    return {
      question: buildQuizQuestion(entry.topic, entry.sourceSentence),
      options: options.map((option) => sanitizeOptionText(option)),
      correctAnswer: sanitizeOptionText(entry.answer),
      explanation: sanitizeStudyText(entry.sourceSentence),
      difficulty: index % 3 === 0 ? "easy" : index % 3 === 1 ? "medium" : "hard",
    };
  });

  if (questions.length >= count) {
    return questions.slice(0, count);
  }

  const supplemental = pool.map((sentence, index) => {
    const topic = normalizeTopic(extractTopicFromSentence(sentence));
    const correct = sanitizeOptionText(sentence);
    return {
      question: buildQuizQuestion(topic, sentence),
      options: [
        correct,
        `${topic} is not explained in the document.`,
        `The document rejects ${topic} completely.`,
        `${topic} is mentioned only as a chapter title.`,
      ].map((option) => sanitizeOptionText(option)),
      correctAnswer: correct,
      explanation: sanitizeStudyText(sentence),
      difficulty: index % 3 === 0 ? "easy" : index % 3 === 1 ? "medium" : "hard",
    };
  });

  return mergeUniqueByQuestion([...sectionQuestions, ...questions, ...supplemental], [], count);
};

const extractJson = (rawText) => {
  const fencedMatch = rawText.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return JSON.parse(fencedMatch[1]);
  }

  const arrayMatch = rawText.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return JSON.parse(arrayMatch[0]);
  }

  const objectMatch = rawText.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return JSON.parse(objectMatch[0]);
  }

  throw new Error("No JSON found in model response");
};

const isLowQualityModelText = (text = "") => {
  const lines = toLines(text);
  if (lines.length === 0) {
    return true;
  }

  const noisyLines = lines.filter((line) => isLowValueLine(line)).length;
  const bulletLines = lines.filter((line) => /^[-*]\s+/.test(line)).length;

  return noisyLines / lines.length > 0.4 || (bulletLines > 0 && !hasHealthyCoverage(text, 3));
};

const generateWithModel = async (prompt) => {
  if (!aiClient) {
    return null;
  }

  const response = await aiClient.models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  return response.text?.trim() || "";
};

const buildDifficultyDistribution = (count, template) => {
  const totalTemplate = Object.values(template).reduce((sum, value) => sum + value, 0);
  if (count === totalTemplate) {
    return template;
  }

  const scaled = Object.fromEntries(
    Object.entries(template).map(([key, value]) => [key, Math.floor((value / totalTemplate) * count)]),
  );

  let assigned = Object.values(scaled).reduce((sum, value) => sum + value, 0);
  const order = Object.entries(template).sort((a, b) => b[1] - a[1]).map(([key]) => key);
  let cursor = 0;

  while (assigned < count) {
    scaled[order[cursor % order.length]] += 1;
    assigned += 1;
    cursor += 1;
  }

  return scaled;
};

const buildSummaryPrompt = (context) => `
You are an expert AI tutor.

Task:
Using ONLY the document context below, write a student-friendly revision summary.

Rules:
- Extract only important ideas that are actually explained in the text.
- Ignore index pages, table of contents, chapter lists, repeated headings, and page furniture.
- Do not write generic filler.
- Do not copy headings as standalone bullets.
- Focus on definitions, concepts, processes, rules, relationships, causes, effects, and examples.
- Prefer exam-relevant concepts over illustrative classroom examples.
- Skip rhetorical questions, activities, instructions, and side notes.
- Keep each bullet short but meaningful.
- Reject any line that is just a title, section name, page label, or figure caption.
- If the document begins with contents/index text, skip it and summarize the actual chapter content instead.

Return plain text in exactly this format:
Important points:
- point 1
- point 2
- point 3

Document context:
${context}
`.trim();

const buildConceptPrompt = (concept, context) => `
You are an expert AI tutor.

Task:
Explain "${concept}" using ONLY the document context below.

Rules:
- Use only information supported by the context.
- Ignore index pages, contents pages, chapter lists, and heading-only text.
- Do not give a vague answer.
- Stay tightly focused on "${concept}" only.
- Do not include nearby but unrelated names, events, artworks, rulers, or examples from the same chunk.
- If the concept is not actually explained in the context, say that clearly.
- Focus on the real meaning, important properties, process, purpose, or role of the concept.
- Do not paste chapter names or lists of headings as explanation points.

Return plain text in this format:
${concept}
- important point 1
- important point 2
- important point 3

Document context:
${context}
`.trim();

const buildChatPrompt = (question, context) => `
You are a friendly and highly knowledgeable tutor.

Your goal is to help the student understand concepts clearly, not just give answers.

Follow these rules:
1. Use ONLY the document context below
2. Explain concepts in simple and easy-to-understand language
3. Break down complex ideas step-by-step when needed
4. Use examples or analogies whenever helpful
5. Do not assume prior knowledge unless clearly required
6. Keep answers concise but clear
7. Avoid unnecessary jargon
8. Encourage understanding, not memorization
9. Do NOT return table of contents, index text, or heading-only text as the answer
10. If the context is ambiguous or insufficient, clearly say so
11. Never answer with a list of chapter names, index items, or figure captions
12. Answer ONLY the asked question, not every topic mentioned nearby
13. If the question is about a person, place, ruler, term, or event, identify that item directly in the first sentence
14. Do not mix unrelated facts from neighboring paragraphs

When solving problems:
- Show the step-by-step reasoning briefly
- Explain each step
- Highlight common mistakes if relevant

Tone:
- Supportive and friendly
- Like a patient teacher

Student question:
${question}

Document context:
${context}
`.trim();

const buildFlashcardPrompt = (context, requestedCount, poolCount, focusTopic = "", excludedQuestions = []) => `
${(() => {
  const distribution = buildDifficultyDistribution(poolCount, { easy: 3, medium: 3, hard: 2 });
  const focusRule = focusTopic
    ? `Focus only on "${focusTopic}". Discard any chunk or sentence that is not clearly about "${focusTopic}".`
    : "Cover as many distinct pages, headings, subtopics, and factual lines from the context as possible.";
  const exclusionRule = excludedQuestions.length > 0
    ? `9. Do not repeat or closely paraphrase any previously generated flashcard question from this list:
${excludedQuestions.map((question) => `   - ${question}`).join("\n")}
10. Prefer different concepts, angles, examples, or facts than the prior flashcards.`
    : `9. Prefer a varied mix of concepts, angles, and facts so the set feels fresh.`;
  return `You are an AI tutor creating exhaustive revision flashcards.

Use ONLY the provided context. Do not use outside knowledge.

Task:
- Generate a large candidate pool of exactly ${poolCount} high-quality flashcards.
- These flashcards will later be split into 5-card sets, so maximize coverage first.
- The user-facing set size is ${requestedCount}, but you must return ${poolCount} candidates now.
- ${focusRule}

Rules:
1. Every question must be specific and answerable from the context.
2. Every answer must be concise, factual, and grounded in the context.
3. Do not write generic stems such as:
   - "What does the document explain..."
   - "What is discussed in the text..."
   - "Why is it important?"
4. Prefer concrete stems like:
   - "Who was ...?"
   - "When did ... happen?"
   - "What happened at ...?"
   - "Why did ... succeed?"
   - "What gave ... an advantage?"
5. Ignore unrelated nearby facts even if they appear in the same file.
6. Skip content that is unclear, heading-only, index-like, or repetitive.
7. If there is not enough reliable context for a card, skip that concept instead of inventing.
8. Keep each answer within 1-2 sentences.
11. Try to extract more than one flashcard from a page when that page contains multiple facts.
12. Cover all useful question types when possible: who, what, when, where, why, how, which, whom, whose.
13. Use different question angles from the same fact when valid, for example:
   - "Who built ...?"
   - "What did X build?"
   - "Which monument was built by X?"
14. Prioritize every meaningful heading, subsection, list item, definition, relationship, date, place, role, cause, effect, work, monument, battle, or feature that can support a valid flashcard.
${exclusionRule}

Difficulty distribution:
- ${distribution.easy} Easy
- ${distribution.medium} Medium
- ${distribution.hard} Hard

Return ONLY valid JSON as an array:
[
  {
    "question": "string",
    "answer": "string",
    "difficulty": "easy|medium|hard"
  }
]

Document context:
${context}`})()}
`.trim();

const buildQuizPrompt = (context, count, focusTopic = "") => `
${(() => {
  const distribution = buildDifficultyDistribution(count, { easy: 3, medium: 4, hard: 3 });
  const focusRule = focusTopic
    ? `Focus only on "${focusTopic}" and discard unrelated facts.`
    : "Use only the strongest facts and concepts in the context.";
  return `You are an expert teacher and exam setter.

Generate exactly ${count} high-quality MCQs from the given context.

Use ONLY the provided context. ${focusRule}

Strict rules:
1. Each question must be specific, factual, and revision-worthy.
2. Do not write generic stems like "What does the document explain...".
3. Do not mix Babur-style questions with Humayun-style facts from neighboring chunks.
4. Each question must have 4 options and exactly 1 correct answer.
5. Options must be plausible, mutually exclusive, and not obviously fake.
6. The explanation must briefly justify the correct answer using the context.
7. Skip unclear or weak concepts instead of inventing content.
8. Ignore contents pages, chapter lists, page labels, and heading-only lines.
9. Prefer questions about people, events, dates, causes, outcomes, roles, and distinguishing features.
10. If the context centers on one topic, keep all questions tightly focused on that topic.

Difficulty distribution:
- ${distribution.easy} Easy
- ${distribution.medium} Medium
- ${distribution.hard} Hard

Return ONLY valid JSON as an array:
[
  {
    "question": "string",
    "options": ["string", "string", "string", "string"],
    "correctAnswer": "string",
    "explanation": "string",
    "difficulty": "easy|medium|hard"
  }
]

Document context:
${context}`})()}
`.trim();

const parseCards = (raw, count) => {
  const parsed = extractJson(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Flashcard response was not an array");
  }

  return parsed
    .map((card) => ({
      question: cleanText(card.question || ""),
      answer: cleanText(card.answer || ""),
      sourceSentence: cleanText(card.answer || ""),
      difficulty: ["easy", "medium", "hard"].includes(card.difficulty) ? card.difficulty : "medium",
    }))
    .filter(
      (card) =>
        card.question &&
        card.answer &&
        !isLikelyLowValueSentence(card.answer) &&
        !isLowValueLine(card.question) &&
        !isLowValueLine(card.answer) &&
        !isFragmentLike(card.answer) &&
        !isWeakFlashcardQuestion(card.question),
    )
    .map((card) => normalizeFlashcard(card, card.sourceSentence))
    .filter((card) => !isWeakFlashcard(card))
    .slice(0, count);
};

const parseQuiz = (raw, count) => {
  const parsed = extractJson(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Quiz response was not an array");
  }

  return parsed
    .map((question) => ({
      question: cleanText(question.question || ""),
      options: Array.isArray(question.options)
        ? question.options.map((option) => sanitizeOptionText(option)).filter(Boolean).slice(0, 4)
        : [],
      correctAnswer: sanitizeOptionText(question.correctAnswer || ""),
      explanation: sanitizeStudyText(question.explanation || ""),
      difficulty: ["easy", "medium", "hard"].includes(question.difficulty)
        ? question.difficulty
        : "medium",
    }))
    .filter(
      (question) =>
        question.question &&
        question.options.length === 4 &&
        question.correctAnswer &&
        question.explanation &&
        !isLikelyLowValueSentence(question.explanation) &&
        !isLowValueLine(question.question) &&
        !isLowValueLine(question.correctAnswer) &&
        !isWeakQuizStem(question.question) &&
        !isFragmentLike(question.correctAnswer) &&
        question.options.every((option) => !isLowValueLine(option) && !isFragmentLike(option)) &&
        hasDistinctOptions(question.options),
    )
    .filter((question) => !isWeakQuizQuestion(question))
    .slice(0, count);
};

export const generateSummary = async (documentContent) => {
  const text = typeof documentContent === "string"
    ? documentContent
    : String(documentContent?.text || "");
  const chunks = Array.isArray(documentContent?.chunks) ? documentContent.chunks : [];
  const context = truncate(text, 18000);

  return fallbackSummary({
    text: context,
    chunks,
  });
};

export const explainConcept = async (concept, context) => {
  const conceptText = cleanText(concept);
  const conceptLower = conceptText.toLowerCase();
  const contextText = typeof context === "string" ? context : String(context?.text || context?.context || "");
  const contextChunks = Array.isArray(context?.chunks) ? context.chunks : [];

  const exactMatchingChunks = contextChunks.filter((chunk) => {
    const heading = normalizeHeadingText(chunk.heading || "").toLowerCase();
    const content = cleanText(chunk.content || "").toLowerCase();
    return heading.includes(conceptLower) || content.includes(conceptLower);
  });

  if (exactMatchingChunks.length > 0) {
    const exactPoints = dedupeLines(
      exactMatchingChunks.flatMap((chunk) =>
        splitChunkIntoStudyLines(chunk.content || "")
          .map((line) => cleanSummaryPoint(line, chunk.heading || ""))
          .map((line) => replaceLeadingPronounWithConcept(line, conceptText))
          .filter((line) => !isLowValueLine(line) && !isInstructionalExampleSentence(line))
          .map((line) => sanitizeFullStudyText(line)),
      ),
    ).slice(0, 4);

    if (exactPoints.length > 0) {
      return `${conceptText}\n${formatBulletList(exactPoints)}`;
    }

    const relaxedPoints = dedupeLines(
      exactMatchingChunks.flatMap((chunk) =>
        splitChunkIntoStudyLines(chunk.content || "")
          .map((line) => replaceLeadingPronounWithConcept(cleanText(line), conceptText))
          .filter((line) => line.split(/\s+/).filter(Boolean).length >= 5)
          .map((line) => sanitizeFullStudyText(line)),
      ),
    ).slice(0, 4);

    if (relaxedPoints.length > 0) {
      return `${conceptText}\n${formatBulletList(relaxedPoints)}`;
    }
  }

  const prioritizedText = exactMatchingChunks.length > 0
    ? exactMatchingChunks.map((chunk) => chunk.content || "").join(" ")
    : contextText;

  const trimmedContext = truncate(prioritizedText, 14000);
  const focusedSentences = getFocusedSentencesForSubject(conceptText, trimmedContext, 4)
    .filter((sentence) => cleanText(sentence).toLowerCase().includes(conceptLower));
  if (focusedSentences.length > 0) {
    return `${conceptText}\n${formatBulletList(focusedSentences.map((sentence) => sanitizeFullStudyText(sentence)).slice(0, 4))}`;
  }

  const prompt = buildConceptPrompt(conceptText, trimmedContext);

  try {
    const result = await generateWithModel(prompt);
    if (!result || isLowQualityModelText(result)) {
      return fallbackAnswer(conceptText, trimmedContext);
    }

    const lines = sanitizeBulletText(result, 1).slice(0, 4);
    if (lines.length === 0) {
      return fallbackAnswer(conceptText, trimmedContext);
    }

    return `${conceptText}\n${formatBulletList(lines)}`;
  } catch (error) {
    console.error("Concept explanation failed, using fallback:", error.message);
    return fallbackAnswer(conceptText, trimmedContext);
  }
};

export const chatWithContext = async (question, contextChunks) => {
  const normalizedQuestion = cleanText(question);
  const context = Array.isArray(contextChunks)
    ? contextChunks
        .map(
          (chunk) =>
            `[Page ${chunk.pageNumber ?? "?"}, Chunk ${chunk.chunkIndex}] ${chunk.content || ""}`,
        )
        .join("\n\n")
    : String(contextChunks || "");

  const directAnswer = fallbackAnswer(question, contextChunks);
  if (directAnswer && !/could not find enough relevant content/i.test(directAnswer)) {
    const subject = extractSubjectFromQuestion(question);
    const isShortConceptPrompt =
      !looksLikeQuestion(normalizedQuestion) &&
      subject &&
      subject.split(/\s+/).filter(Boolean).length <= 6;

    if ((/^(who|what)\s+(is|was|were|are)\b/i.test(normalizedQuestion) && subject) || isShortConceptPrompt) {
      return directAnswer;
    }
  }

  const trimmedContext = truncate(context, 14000);
  const prompt = buildChatPrompt(question, trimmedContext);

  try {
    const result = await generateWithModel(prompt);
    return result && !isLowQualityModelText(result) ? result : fallbackAnswer(question, contextChunks);
  } catch (error) {
    console.error("Chat response failed, using fallback:", error.message);
    return fallbackAnswer(question, contextChunks);
  }
};

export const generateFlashcards = async (
  documentText,
  count = 5,
  focusTopic = "",
  excludedQuestions = [],
  excludedAnswers = [],
  generationIndex = 0,
) => {
  const context = truncate(documentText, 18000);
  const poolCount = Math.max(count * 5, 25);
  const deterministicPool = buildDeterministicFlashcards(
    context,
    Math.max(count * 20, 80),
    excludedQuestions,
    excludedAnswers,
  );
  const prompt = buildFlashcardPrompt(context, count, poolCount, focusTopic, excludedQuestions);
  const fallbackPool = mergeDiverseFlashcards(
    deterministicPool,
    ensureFlashcardCount(deterministicPool.slice(0, count), context, count, excludedQuestions),
    Math.max(poolCount, deterministicPool.length),
  ).filter((card) => !isWeakFlashcard(card));

  if (fallbackPool.length >= poolCount && !focusTopic) {
    return selectRotatingSlice(fallbackPool, count, generationIndex * count);
  }

  try {
    const raw = await generateWithModel(prompt);
    if (!raw) {
      return selectRotatingSlice(fallbackPool, count, generationIndex * count);
    }

    const llmPool = parseCards(raw, poolCount * 2);
    const mergedPool = mergeDiverseFlashcards(
      llmPool,
      fallbackPool,
      Math.max(poolCount, fallbackPool.length, llmPool.length),
    ).filter((card) => !isWeakFlashcard(card));

    if (mergedPool.length === 0) {
      return selectRotatingSlice(fallbackPool, count, generationIndex * count);
    }

    const finalPool = filterOutPreviouslyUsedQuestions(mergedPool, excludedQuestions);
    return selectRotatingSlice(finalPool, count, generationIndex * count);
  } catch (error) {
    console.error("Flashcard generation failed, using fallback:", error.message);
    return selectRotatingSlice(fallbackPool, count, generationIndex * count);
  }
};

export const generateQuiz = async (documentText, count = 5, focusTopic = "", generationIndex = 0) => {
  const context = truncate(documentText, 18000);
  const deterministicQuestions = buildDeterministicQuiz(context, count, generationIndex);

  if (deterministicQuestions.length >= count) {
    return deterministicQuestions.slice(0, count);
  }

  const prompt = buildQuizPrompt(context, count, focusTopic);
  const fallbackQuestions = mergeUniqueByQuestion(
    deterministicQuestions,
    fallbackQuiz(context, count),
    count,
  ).filter((question) => !isWeakQuizQuestion(question));

  try {
    const raw = await generateWithModel(prompt);
    if (!raw) {
      return fallbackQuestions;
    }

    const questions = parseQuiz(raw, count);
    if (questions.length === 0) {
      return fallbackQuestions;
    }

    return mergeUniqueByQuestion(questions, fallbackQuestions, count).filter(
      (question) => !isWeakQuizQuestion(question),
    );
  } catch (error) {
    console.error("Quiz generation failed, using fallback:", error.message);
    return fallbackQuestions;
  }
};
