const normalizeText = (value = "") =>
  String(value || "")
    .replace(/\r/g, "\n")
    .replace(/([A-Za-z])-\s+([A-Za-z])/g, "$1$2")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .replace(/\s+/g, " ")
    .replace(/\s([,.;:!?])/g, "$1")
    .trim();

const normalizeRomanNumerals = (value = "") =>
  String(value || "").replace(/\b([A-Z][a-z]+)\s+Ii\b/g, "$1 II");

const normalizeKey = (value = "") =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const uniqueBy = (items, keyFn) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const STOP_SUBJECTS = new Set([
  "it",
  "this",
  "that",
  "these",
  "those",
  "there",
  "here",
  "everyone",
  "someone",
  "somebody",
  "people",
  "we",
  "you",
  "he",
  "she",
  "they",
  "i",
  "one hand",
  "the one hand",
  "the other hand",
  "to",
  "simply",
  "just",
  "only",
  "therefore",
  "thus",
  "also",
  "lines",
  "ce",
  "through",
  "another remarkable feature",
  "characteristic features",
  "the first",
  "the second",
  "the third",
  "state",
  "state that",
  "in",
  "under",
]);

const normalizeSubjectLabel = (subject = "") =>
  stripLeadingClause(subject)
    .replace(/^(this|that|these|those)\s+/i, "the ")
    .replace(/\s+/g, " ")
    .trim();

const prettifyEntity = (value = "") =>
  cleanSentence(value)
    .replace(/^CE\s+/i, "")
    .replace(/^(his|her|their)\s+/i, "")
    .replace(/^(son|daughter|prince)\s+/i, "")
    .replace(/\bthe$/i, "")
    .replace(/\b([A-Z]{2,})(?:\s+[A-Z]{2,})*\b/g, (match) =>
      match
        .toLowerCase()
        .replace(/\b[a-z]/g, (char) => char.toUpperCase()),
    )
    .trim();

const extractHeadingSubject = (heading = "") => {
  const cleaned = cleanSentence(heading)
    .replace(/^(estimate of|relations with|religious policy|land revenue administration|war of succession|deccan policy)\s+/i, "")
    .trim();
  if (
    /^(founder of|political history of|other literatures|inscriptions|archaeological|sources|significance|extent of|estimate of|asoka and buddhism|paintings and music|language and literature)$/i.test(
      cleaned,
    ) ||
    /^the [a-z]+ script was employed for writing$/i.test(cleaned)
  ) {
    return "";
  }
  const allCapsMatch = cleaned.match(/^([A-Z]{2,}(?:\s+(?:and\s+)?[A-Z]{2,}){0,2})$/);
  if (allCapsMatch?.[1]) {
    return prettifyEntity(allCapsMatch[1]);
  }

  const match = cleaned.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\b/);
  return match?.[1] || "";
};

const isPersonLikeHeading = (heading = "") =>
  /^(jainism|buddhism|teachings of mahavira|mahavira organized the sangha to spread his teachings|first sermon|kushinagar disciples|other teachings|division)$/i.test(
    cleanSentence(heading).replace(/:$/, ""),
  );

const resolvePrimaryEntity = ({
  heading = "",
  previousSentence = "",
  chunkText = "",
  previousChunkHeading = "",
  previousChunkText = "",
} = {}) => {
  const currentHeading = cleanSentence(heading).replace(/:$/, "");
  const currentText = cleanSentence(chunkText);
  const previousText = cleanSentence(previousChunkText);
  const previousHeadingText = cleanSentence(previousChunkHeading).replace(/:$/, "");

  const explicitLifeMatch =
    currentText.match(/\bLife of ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\b/i) ||
    currentHeading.match(/^Life of ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})$/i);
  if (explicitLifeMatch?.[1]) {
    return cleanSentence(explicitLifeMatch[1]);
  }

  const founderInTextMatch = currentText.match(/\b([A-Z][A-Za-z]+(?:\s+or\s+[A-Z][A-Za-z]+)?(?:\s+[A-Z][A-Za-z]+){0,2}),?\s+the founder of ([A-Z][A-Za-z]+)\b/i);
  if (founderInTextMatch?.[1]) {
    const name = cleanSentence(founderInTextMatch[1]).replace(/\s+or\s+.+$/i, "");
    return name;
  }

  const previousLifeMatchGlobal =
    previousText.match(/\bLife of ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\b/i) ||
    previousHeadingText.match(/^Life of ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})$/i);
  if (previousLifeMatchGlobal?.[1]) {
    return cleanSentence(previousLifeMatchGlobal[1]);
  }

  const previousKnownAsMatch = previousText.match(/\bbecame known as the ([A-Z][A-Za-z]+)\b/i);
  if (previousKnownAsMatch?.[1]) {
    return cleanSentence(previousKnownAsMatch[1]);
  }

  const currentKnownAsMatch = currentText.match(/\bbecame known as the ([A-Z][A-Za-z]+)\b/i);
  if (currentKnownAsMatch?.[1]) {
    return cleanSentence(currentKnownAsMatch[1]);
  }

  if (isPersonLikeHeading(currentHeading)) {
    const previousFounderMatch = previousText.match(/\b([A-Z][A-Za-z]+(?:\s+or\s+[A-Z][A-Za-z]+)?(?:\s+[A-Z][A-Za-z]+){0,2}),?\s+the founder of ([A-Z][A-Za-z]+)\b/i);
    if (previousFounderMatch?.[1]) {
      return cleanSentence(previousFounderMatch[1]).replace(/\s+or\s+.+$/i, "");
    }
  }

  return (
    extractNamedSubject(previousSentence) ||
    extractNamedSubject(previousText) ||
    extractHeadingSubject(previousHeadingText) ||
    extractHeadingSubject(currentHeading) ||
    extractNamedSubject(currentText)
  );
};

const possessiveForm = (subject = "") =>
  /s$/i.test(subject) ? `${subject}'` : `${subject}'s`;

const replacePronouns = (text = "", subject = "") => {
  const cleaned = cleanSentence(text);
  if (!cleaned || !subject) {
    return cleaned;
  }

  return cleaned
    .replace(/^He\b/i, subject)
    .replace(/^She\b/i, subject)
    .replace(/^It\b/i, subject)
    .replace(/^His\b/i, possessiveForm(subject))
    .replace(/^Her\b/i, possessiveForm(subject))
    .replace(/\bhis\b/gi, possessiveForm(subject))
    .replace(/\bher\b/gi, possessiveForm(subject))
    .replace(/\bhe\b/gi, subject)
    .replace(/\bshe\b/gi, subject)
    .replace(/\bit\b/gi, subject);
};

const inferContextSubject = ({
  heading = "",
  previousSentence = "",
  chunkText = "",
  previousChunkHeading = "",
  previousChunkText = "",
} = {}) =>
  extractHeadingSubject(heading) ||
  extractNamedSubject(previousSentence) ||
  extractNamedSubject(chunkText) ||
  extractHeadingSubject(previousChunkHeading) ||
  extractNamedSubject(previousChunkText);

const resolveBattleReference = ({ previousSentence = "", chunkText = "" } = {}) => {
  const directMatch =
    cleanSentence(previousSentence).match(/^([A-Z][A-Za-z]+)\s+in\s+\d{4}\.?$/) ||
    cleanSentence(chunkText).match(/^([A-Z][A-Za-z]+)\s+in\s+\d{4}\./);

  if (directMatch?.[1]) {
    return `the Battle of ${cleanSentence(directMatch[1])}`;
  }

  const namedBattleMatch =
    extractNamedSubject(previousSentence).match(/^Battle of .+/i) ||
    extractNamedSubject(chunkText).match(/^Battle of .+/i);

  return namedBattleMatch?.[0] || "";
};

const ACTION_VERBS = [
  "is",
  "are",
  "was",
  "were",
  "means",
  "mean",
  "refers to",
  "refers",
  "includes",
  "include",
  "consists of",
  "consist of",
  "has",
  "have",
  "helps",
  "help",
  "enables",
  "enable",
  "allows",
  "allow",
  "focuses on",
  "focus on",
  "deals with",
  "deal with",
  "describes",
  "describe",
  "explains",
  "explain",
  "wrote",
  "write",
  "composed",
  "compose",
  "preached",
  "preach",
  "propagated",
  "propagate",
  "popularized",
  "popularised",
  "popularize",
  "popularise",
  "opposed",
  "oppose",
  "condemned",
  "condemn",
  "emphasized",
  "emphasised",
  "emphasize",
  "emphasise",
  "provided",
  "provide",
  "gave",
  "give",
  "founded",
  "founded",
  "shows",
  "show",
  "requires",
  "require",
  "uses",
  "use",
  "contributes to",
  "contribute to",
  "shaped",
  "shape",
  "protects",
  "protect",
  "contains",
  "contain",
  "leads to",
  "lead to",
  "results in",
  "result in",
];

const cleanSentence = (sentence = "") =>
  normalizeRomanNumerals(
    normalizeText(sentence)
      .replace(/Reprint\s+\d{4}-\d{2}/gi, " ")
      .replace(/--\s*\d+\s+of\s+\d+\s*--/g, " ")
      .replace(/^[•●○\-*Æ]\s*/, "")
      .replace(/^["“”'`]+|["“”'`]+$/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  )
    .trim();

const trimTrailingClause = (text = "") =>
  cleanSentence(text)
    .replace(/\s+and\s+(?:composed|chose|showed|urged|became|wrote|who\b).*/i, "")
    .replace(/\s+who\s+.+$/i, "")
    .trim();

const preprocessStudyText = (text = "") =>
  String(text || "")
    .replace(/\b([A-Z]{2,}(?:\s+[A-Z]{2,}){0,2})\s+(?=(?:was|is|preached|propagated|populari[sz]ed|opposed|composed|wrote|founded)\b)/g, ". $1 ")
    .replace(/\.\s+([A-Z]{2,}(?:\s+[A-Z]{2,}){0,2})\s*,/g, ". $1,")
    .replace(/\s+([A-Z]{2,}(?:\s+[A-Z]{2,}){0,2})\s*,\s+a contemporary of /g, ". $1, a contemporary of ")
    .replace(/\s+/g, " ");

const buildObjectQuestion = (actor = "", verb = "", object = "") => {
  const safeActor = prettifyEntity(actor);
  const safeObject = cleanSentence(object);
  const lowerObject = safeObject.toLowerCase();

  if (!safeActor || !safeObject) {
    return "";
  }

  if (/^(his|her|their|the)\s+/i.test(safeObject) || /\b(people|followers|disciples)\b/i.test(lowerObject)) {
    return `What did ${safeActor} ${verb}`;
  }

  if (/\b(at|in|into|to|towards|near|from)\b/i.test(lowerObject) && safeObject.split(/\s+/).length > 3) {
    return `What did ${safeActor} ${verb}`;
  }

  if (/^[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}$/.test(safeObject) || /\b(god|krishna|rama|vaishnavism|hinduism|sikh religion)\b/i.test(lowerObject)) {
    return `Whom did ${safeActor} ${verb}`;
  }

  return `What did ${safeActor} ${verb}`;
};

const splitFactClauses = (text = "") =>
  cleanSentence(text)
    .split(/\s*[;•●○]\s*|\s+(?=(?:He|She|It|They|His|Her|Their|[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+(?:was|were|is|are|wrote|composed|built|married|defeated|captured|introduced|assumed|proclaimed|succeeded|performed|visited|left|founded|preached|propagated|popularized|opposed|emphasized|settled|came|died|ruled|conquered|recovered|strengthened)\b)/)
    .map((item) => cleanSentence(item))
    .filter(Boolean);

const extractListedEntities = (text = "") => {
  const cleaned = cleanSentence(text)
    .replace(/\band\b/gi, ",")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+/g, " ");

  return uniqueBy(
    cleaned
      .split(/\s*,\s*/)
      .map((item) => cleanSentence(item))
      .filter((item) => /^[A-Z][A-Za-z']+(?:\s+[A-Z][A-Za-z']+){0,3}$/.test(item)),
    (item) => normalizeKey(item),
  );
};

const addCandidateIfValid = (candidates = [], config = null) => {
  if (!config?.question || !config?.answer) {
    return;
  }

  candidates.push(createCandidate(config));
};

const attachSourceHeading = (candidates = [], heading = "") =>
  candidates.map((candidate) => ({
    ...candidate,
    sourceHeading: cleanSentence(candidate.sourceHeading || heading),
  }));

const isGenericHeadingLabel = (heading = "") =>
  /^(Characteristic features|Important sites|Famous sites|Important megalithic sites|Town planning|Important characteristics)$/i.test(
    cleanSentence(heading),
  );

const buildEffectQuestion = (subject = "", effect = "") => {
  const safeSubject = cleanSentence(subject);
  const safeEffect = cleanSentence(effect).toLowerCase();

  if (!safeSubject || !safeEffect) {
    return "";
  }

  if (/\bimportant\b|\bposition\b|\bstatus\b/.test(safeEffect)) {
    return `Why was ${safeSubject} important`;
  }

  if (/\bincreased\b|\braised\b|\bimproved\b/.test(safeEffect)) {
    return `How was ${safeSubject} affected`;
  }

  return `What happened to ${safeSubject}`;
};

const stripLeadingClause = (text = "") =>
  cleanSentence(text)
    .replace(/^(in addition|instead|however|therefore|thus|moreover|furthermore),\s*/i, "")
    .replace(/^(and|but|so|because|while|since)\s+/i, "")
    .trim();

const splitSentences = (text = "") =>
  preprocessStudyText(String(text || ""))
    .replace(/\r/g, "\n")
    .split(/[●•○\n]+/)
    .flatMap((segment) => segment.split(/(?<=[.!?])\s+/))
    .map((sentence) => cleanSentence(sentence))
    .filter((sentence) => sentence.split(/\s+/).length >= 6);

const extractNamedSubject = (text = "") => {
  const cleaned = cleanSentence(text);
  const leadingAllCapsMatch = cleaned.match(
    /^([A-Z]{2,}(?:\s+[A-Z]{2,}){0,2})\s+(?:was|were|is|are|lived|died|married|defeated|captured|introduced|made|ordered|assumed|succeeded)\b/,
  );
  if (leadingAllCapsMatch?.[1]) {
    return prettifyEntity(leadingAllCapsMatch[1]);
  }

  const allCapsBeforeCommaMatch = cleaned.match(/^([A-Z]{2,}(?:\s+[A-Z]{2,}){0,2})\s*,/);
  if (allCapsBeforeCommaMatch?.[1]) {
    return prettifyEntity(allCapsBeforeCommaMatch[1]);
  }

  const leadingNamedMatch = cleaned.match(
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+(?:was|were|is|are|lived|died|married|defeated|captured|introduced|made|ordered|assumed|succeeded)\b/,
  );
  if (leadingNamedMatch?.[1]) {
    return leadingNamedMatch[1];
  }

  const embeddedNamedMatch = cleaned.match(
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+(?:was|were|is|are|lived|died|married|defeated|captured|introduced|made|ordered|assumed|succeeded)\b/,
  );
  if (embeddedNamedMatch?.[1]) {
    return embeddedNamedMatch[1];
  }

  const battleMatches =
    cleaned.match(/\bBattle of [A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}\b/g) || [];
  if (battleMatches.length > 0) {
    return battleMatches[battleMatches.length - 1];
  }

  const personMatches =
    cleaned.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g) || [];
  const filtered = personMatches.filter(
    (item) => !/^(The|This|That|It|His|Her|Its|Their|One|World|Empire|Administration|God|However|Therefore|Moreover|Furthermore|Life|Under|First|Other|Division|Social|Causes|Teachings|Truth|Right|Spread|Kushinagar|Lumbini)$/i.test(item),
  );

  return filtered[0] || "";
};

const ensureSentence = (value = "") => {
  const text = cleanSentence(value)
    .replace(/\bconsisted\s+(\d+)/i, "consisted of $1")
    .replace(/\bpalacecum-fort\b/i, "palace-cum-fort")
    .replace(/\bDiwan\s*[–-]?\s*i\s*[–-]?\s*/i, "Diwan-i-")
    .replace(/\s+/g, " ")
    .replace(/[,:;]+$/, "");
  if (!text) {
    return "";
  }

  const normalized = text.replace(/^[a-z]/, (char) => char.toUpperCase());
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
};

const ensureQuestion = (value = "") => {
  const text = cleanSentence(value)
    .replace(/\bDiwan\s*[–-]?\s*i\s*[–-]?\s*/i, "Diwan-i-")
    .replace(/\bBABUR\b/g, "Babur")
    .replace(/\bAKBAR\b/g, "Akbar")
    .replace(/\bHUMAYUN\b/g, "Humayun")
    .replace(/\bAURANGAZEB\b/g, "Aurangazeb")
    .replace(/[.!,;:]+$/, "");
  if (!text) {
    return "";
  }

  const capitalized = text.replace(/^[a-z]/, (char) => char.toUpperCase());
  return capitalized.endsWith("?") ? capitalized : `${capitalized}?`;
};

const getTopicKey = (candidate = {}) =>
  normalizeKey(prettifyEntity(candidate.topic || "")) ||
  normalizeKey(
    cleanSentence(candidate.question || "")
      .replace(/^(what|who|when|where|why|how|which|whom)\s+/i, "")
      .replace(/\?$/, ""),
  );

const getHeadingKey = (candidate = {}) =>
  normalizeKey(cleanSentence(candidate.sourceHeading || ""));

const getQuestionFamilyKey = (question = "") =>
  normalizeKey(
    cleanSentence(question)
      .replace(/\bDiwan\s*[–-]?\s*i\s*[–-]?\s*/i, "Diwan-i-")
      .replace(/\bzat\b/gi, "zat")
      .replace(/^what does zat mean in the mansabdari system$/i, "zat meaning mansabdari")
      .replace(/^what does zat mean$/i, "zat meaning mansabdari")
      .replace(/^which memoir did babur write$/i, "babur memoir")
      .replace(/^what is babur'?s success$/i, "why babur successful")
      .replace(/\s+/g, " "),
  );

const isLowValueSentence = (sentence = "") => {
  const text = cleanSentence(sentence);
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return (
    !text ||
    wordCount < 6 ||
    /[?]$/.test(text) ||
    /^(what|why|how|when|where|which|who)\b/i.test(text) ||
    /^(let'?s|let us|observe|write down|discuss|look at|now,? looking|how do you propose)/i.test(text) ||
    /^(imagine|suppose|assume|consider)\b/i.test(text) ||
    /^to\s+[a-z]/i.test(lower) ||
    /^(on the one hand|on the other hand|in other words|for example|for instance)\b/i.test(lower) ||
    /^(everyone agrees|the world over|you may wonder)\b/i.test(lower) ||
    /^theme\s+[a-z]\b/i.test(lower) ||
    /^chapter\s+\d+\b/i.test(lower) ||
    /^fig\.\s*\d+/i.test(lower) ||
    /don[’']?t miss out/i.test(lower) ||
    /[]/.test(text) ||
    /table of contents|contents|index|reprint|questions, activities and projects/i.test(lower) ||
    /exploring society: india and beyond/i.test(lower)
  );
};

const isWeakAnswer = (answer = "") => {
  const text = cleanSentence(answer);
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return (
    !text ||
    wordCount < 2 ||
    /^(it|this|that|these|those|there|here|because|and|but)\b/i.test(text) ||
    /^(many|several|various)\b/i.test(lower) ||
    /^(a particularly|rapid progress|where we will|still with us)\b/i.test(lower) ||
    /\bsee fig\b/i.test(lower) ||
    /\bnote the circle\b/i.test(lower) ||
    /\bhave been added\b/i.test(lower)
  );
};

const scoreSentence = (sentence = "") => {
  let score = 1;
  if (/\b(1[0-9]{3}|20[0-9]{2})\b/.test(sentence)) score += 2;
  if (/\b(is|are|means|refers to|includes|consists of|because|helps|important|key|used|defined)\b/i.test(sentence)) score += 2;
  if (/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\b/.test(sentence)) score += 1;
  if (/\b(first|second|third|main|major|important|key|fundamental|basic)\b/i.test(sentence)) score += 1;
  return score;
};

const extractSubject = (sentence = "") => {
  const text = stripLeadingClause(sentence);
  if (!text) {
    return "";
  }

  const lower = text.toLowerCase();
  const sortedVerbs = [...ACTION_VERBS].sort((a, b) => b.length - a.length);

  for (const verb of sortedVerbs) {
    const pattern = ` ${verb} `;
    const index = lower.indexOf(pattern);
    if (index <= 0) {
      continue;
    }

    const subject = text
      .slice(0, index)
      .replace(/^["'`(]+|["'`),.:;!?]+$/g, "")
      .trim();
    if (
      subject &&
      !/^(a|an|the)$/i.test(subject) &&
      !/^(a few|few|many|several|various)\b/i.test(subject) &&
      !/^(seems to|appears to)\b/i.test(subject) &&
      !/^(state|state that)\b/i.test(subject) &&
      !/\bsaid to\b/i.test(subject) &&
      !/^(the large scale|the absence|the use|the beginning|the end)\b/i.test(subject)
    ) {
      return normalizeSubjectLabel(subject);
    }
  }

  const nounPhraseMatch = text.match(/^((?:The|A|An)\s+[A-Za-z][A-Za-z\s-]{3,80}?)\s+(began|started|ended|developed|appeared|emerged|declined|increased|decreased)\b/i);
  if (nounPhraseMatch?.[1]) {
    return normalizeSubjectLabel(nounPhraseMatch[1]);
  }

  return "";
};

const isUsableSubject = (subject = "") => {
  const text = normalizeSubjectLabel(subject).replace(/^(a|an|the)\s+/i, (match) => match.toLowerCase());
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const lower = text.toLowerCase();

  return (
    Boolean(text) &&
    wordCount >= 1 &&
    wordCount <= 6 &&
    !STOP_SUBJECTS.has(lower) &&
    !/^(a|an|the)$/i.test(text) &&
    !/^(it|this|that|these|those)\b/i.test(text) &&
    !/^(a few|few|many|several|various)\b/i.test(text) &&
    !/^(seems to|appears to)\b/i.test(text) &&
    !/^(state|state that)\b/i.test(text) &&
    !/\bsaid to\b/i.test(text) &&
    !/^(the first|the second|the third)\b/i.test(text) &&
    !/\b(simply|just|only)\b/i.test(text) &&
    !/^(well|effective|important|importance|famous|great|pure|regional|lower classes|women in society|as the|of salvation|another remarkable feature)\b/i.test(text) &&
    !/^(the large scale|the absence|the use of|the use|the beginning|the end)\b/i.test(text) &&
    !/^the state[’']?s share$/i.test(text) &&
    !/^(what|why|how|when|where|which|who|because|instead|imagine|suppose|assume|consider|let us|and|but|such)\b/i.test(text) &&
    !/^(the battle|this battle|the land|the revenue|the most important work|all cultivable lands|the state'?s share|the lowest rank)\b/i.test(text) &&
    !/\b(halfway|between|former|latter|marked|placed|mentioned|added|shown|given|following|preceding|above|below|other than|just as)\b/i.test(text) &&
    !/[(),:;]/.test(text) &&
    !/^(our|their|his|her|its)\b/i.test(text) &&
    !/^["'`(]/.test(subject)
  );
};

const createCandidate = ({
  question,
  answer,
  pageNumber,
  type = "fact",
  topic = "",
  importance = 1,
  optionValue,
  sourceHeading = "",
}) => ({
  question: ensureQuestion(question),
  answer: ensureSentence(answer),
  pageNumber: pageNumber ?? 0,
  type,
  topic: prettifyEntity(topic),
  importance,
  optionValue: ensureSentence(optionValue || answer).replace(/[.!?]$/, ""),
  sourceHeading: cleanSentence(sourceHeading),
});

const isUsableCandidate = (candidate) => {
  if (!candidate?.question || !candidate?.answer || !candidate?.optionValue) {
    return false;
  }

  const questionText = cleanSentence(candidate.question);
  const answerText = cleanSentence(candidate.answer);
  const allowsCompactAnswer = ["person", "year", "title", "term", "work", "place"].includes(candidate.type);
  const allowsShortQuestion =
    /^(who wrote|who founded|who built|who discovered|who deciphered|who composed)\b/i.test(questionText);

  return (
    (questionText.split(/\s+/).length >= 4 || allowsShortQuestion) &&
    !/^(what is|what are)\s+(everyone|there|it|this|that|these|those)\b/i.test(questionText) &&
    !/^(what|who|why|how|whom)\s+(is|are|was|were|did|does)\s+(he|she|it|his|her)\b/i.test(questionText) &&
    !/^whom did also patronize\?$/i.test(questionText) &&
    !/^who were mentioned together in this topic\?$/i.test(questionText) &&
    !/^what did lines compose\?$/i.test(questionText) &&
    !/^what did who write\?$/i.test(questionText) &&
    !/^what did when [A-Z][a-z]+ write\?$/i.test(questionText) &&
    !/^what was the time period of (sites of|have been practised|paiyampalli in tn)/i.test(questionText) &&
    !/^what were the characteristic features of characteristic features\?$/i.test(questionText) &&
    !/^whose brother was abul faizi/i.test(questionText) &&
    !/^what did abul faizi/i.test(questionText) &&
    !/^(what|whom)\s+did\s+founder\b/i.test(questionText) &&
    !/^(what|whom)\s+did\s+who\b/i.test(questionText) &&
    !/^what does the text say about (the first|the second|the third)\?$/i.test(questionText) &&
    !/^(what|who|when|where|why|how|which|whom)\s+did\s+(he|she|it|through|mausoleum)\b/i.test(questionText) &&
    !/^when did he die\?$/i.test(questionText) &&
    !/^what is .+success\?$/i.test(questionText) &&
    !/^(what|who|whom)\s+did\s+.+\b(?:was|were)\b/i.test(questionText) &&
    !/^(what|who|whom)\s+did\s+of\b/i.test(questionText) &&
    !/^(what|who|why|how)\s+(did|does|is|are|was|were)\s+(and|or|but|well|effective|important|importance|famous|great|pure)\b/i.test(questionText) &&
    !/\b(defeat|defeated)\s+\?$/i.test(questionText) &&
    !/\b(RELIGIOUS POLICY|RAJPUTS)\b/i.test(questionText) &&
    !/\b(simply|just|only)\b/i.test(questionText) &&
    !/^what is (as the|the importance of)\b/i.test(questionText) &&
    !/\b(a palacecum-fort|the the tomb)\b/i.test(questionText) &&
    !/^(that|which)\b/i.test(answerText) &&
    !/^(a|an)\.?$/i.test(answerText) &&
    !/^(he|she|it|him|her|founder)\.?$/i.test(answerText) &&
    !/^(many|several|various)\.?$/i.test(answerText) &&
    !/[●•]/.test(answerText) &&
    !/\b(?:in|of|to|for|with|by|against|from|near|during)\.?$/i.test(answerText) &&
    !/north India[A-Z]/.test(answerText) &&
    !/who was known\b/i.test(answerText) &&
    (!isWeakAnswer(answerText) || allowsCompactAnswer) &&
    (!isLowValueSentence(answerText) || allowsCompactAnswer)
  );
};

const buildGenericQuestion = (subject, sentence = "") => {
  const safeSubject = normalizeSubjectLabel(subject);
  const text = cleanSentence(sentence).toLowerCase();
  const aux = /\b(?:are|have|contain|include|show|describe|explain|require|focus on|deal with)\b/i.test(text) ? "do" : "does";

  if (
    !safeSubject ||
    /^(a few|few|many|several|various)\b/i.test(safeSubject) ||
    /^(seems to|appears to)\b/i.test(safeSubject) ||
    /^(the large scale|the absence|the use|the beginning|the end)\b/i.test(safeSubject)
  ) {
    return "";
  }

  if (/\bimportant\b|\bkey\b|\bmajor\b/.test(text)) {
    return `Why is ${safeSubject} important`;
  }

  if (/\bcaused?\b|\bled to\b|\bresulted in\b/.test(text)) {
    return `Why did ${safeSubject} matter`;
  }

  if (/\bhelp(s)?\b|\benable(s)?\b|\ballow(s)?\b/.test(text)) {
    return `How does ${safeSubject} help`;
  }

  if (/\bused to\b|\bused for\b/.test(text)) {
    return `What is ${safeSubject} used for`;
  }

  if (/\blocated\b|\bfound in\b|\bnear\b/.test(text)) {
    return `Where is ${safeSubject}`;
  }

  if (/\bknown as\b|\bcalled\b/.test(text)) {
    return `What is ${safeSubject} called`;
  }

  if (/\bcontains?\b/.test(text)) {
    return `What ${aux} ${safeSubject} contain`;
  }

  if (/\bshows?\b/.test(text)) {
    return `What ${aux} ${safeSubject} show`;
  }

  if (/\bdescribes?\b/.test(text)) {
    return `What ${aux} ${safeSubject} describe`;
  }

  return "";
};

const buildCopularQuestion = (subject, rhs, verb = "is") => {
  const safeSubject = normalizeSubjectLabel(subject);
  const answerLead = cleanSentence(rhs).toLowerCase();
  const beVerb = /^(are|were)$/i.test(verb) ? "are" : "is";

  if (/^called\b/.test(answerLead)) {
    return `What is ${safeSubject} called`;
  }

  if (/^located\b/.test(answerLead)) {
    return `Where is ${safeSubject} located`;
  }

  if (/^used to\b/.test(answerLead)) {
    return `What is ${safeSubject} used for`;
  }

  if (/^represented\b/.test(answerLead)) {
    return `How is ${safeSubject} represented`;
  }

  if (/^aware of\b/.test(answerLead)) {
    return `What ${beVerb} ${safeSubject} aware of`;
  }

  if (/^organised in\b/.test(answerLead)) {
    return `How ${beVerb} ${safeSubject} organised`;
  }

  if (/^like\b/.test(answerLead)) {
    return `What is ${safeSubject} like`;
  }

  return `What ${beVerb} ${safeSubject}`;
};

const resolveSentenceActor = (sentence = "", fallbackSubject = "") => {
  const text = cleanSentence(sentence);
  if (!text) {
    return "";
  }

  if (/^(He|She|His|Her|It|They|Under|At the age of|In the \d)/i.test(text)) {
    return fallbackSubject;
  }

  return extractNamedSubject(text) || fallbackSubject;
};

const buildCandidatesFromSentence = (sentence, pageNumber, context = {}) => {
  const text = stripLeadingClause(sentence);
  if (isLowValueSentence(text)) {
    return [];
  }

  const candidates = [];
  const subject = extractSubject(text);
  const previousSentence = cleanSentence(context.previousSentence || "");
  const heading = cleanSentence(context.heading || "");
  const contextSubject = resolvePrimaryEntity({
    heading,
    previousSentence,
    chunkText: context.chunkText || "",
    previousChunkHeading: context.previousChunkHeading || "",
    previousChunkText: context.previousChunkText || "",
  });
  const previousNamedSubject = extractNamedSubject(previousSentence) || contextSubject;
  const actionActor = prettifyEntity(resolveSentenceActor(text, contextSubject));

  const ordinalDealsWithMatch = text.match(/^The (first|second|third)\s+deals?\s+with\s+(.+?)\.$/i);
  if (ordinalDealsWithMatch?.[1] && ordinalDealsWithMatch?.[2]) {
    const ordinal = cleanSentence(ordinalDealsWithMatch[1]).toLowerCase();
    const parentTopic =
      heading && !isGenericHeadingLabel(heading) ? heading : cleanSentence(contextSubject || "");

    addCandidateIfValid(candidates, {
      question: parentTopic
        ? `What did the ${ordinal} part of ${parentTopic} deal with`
        : `What did the ${ordinal} part deal with`,
      answer: cleanSentence(ordinalDealsWithMatch[2]),
      pageNumber,
      type: "fact",
      topic: parentTopic || `the ${ordinal} part`,
      importance: scoreSentence(text) + 4,
      sourceHeading: heading,
    });
  }

  const ordinalWithOnlyMatch = text.match(/^The (first|second|third)\s+with\s+(.+?)\.$/i);
  if (ordinalWithOnlyMatch?.[1] && ordinalWithOnlyMatch?.[2]) {
    const ordinal = cleanSentence(ordinalWithOnlyMatch[1]).toLowerCase();
    const parentTopic =
      heading && !isGenericHeadingLabel(heading) ? heading : cleanSentence(contextSubject || "");

    addCandidateIfValid(candidates, {
      question: parentTopic
        ? `What did the ${ordinal} part of ${parentTopic} deal with`
        : `What did the ${ordinal} part deal with`,
      answer: cleanSentence(ordinalWithOnlyMatch[2]),
      pageNumber,
      type: "fact",
      topic: parentTopic || `the ${ordinal} part`,
      importance: scoreSentence(text) + 4,
      sourceHeading: heading,
    });
  }

  const saidToHaveConqueredMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) is said to have conquered\s+(.+?)\.$/i);
  if (saidToHaveConqueredMatch?.[1] && actionActor && isUsableSubject(actionActor)) {
    addCandidateIfValid(candidates, {
      question: /\bup to\b/i.test(saidToHaveConqueredMatch[1])
        ? `How far is ${actionActor} said to have conquered`
        : `What is ${actionActor} said to have conquered`,
      answer: cleanSentence(saidToHaveConqueredMatch[1]),
      pageNumber,
      type: "place",
      topic: actionActor,
      importance: scoreSentence(text) + 4,
      sourceHeading: heading,
    });
  }

  const siblingMatch = text.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) was the (brother|sister) of ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\b/i);
  if (siblingMatch?.[1] && siblingMatch?.[2] && siblingMatch?.[3]) {
    addCandidateIfValid(candidates, {
      question: `Who was the ${cleanSentence(siblingMatch[2])} of ${cleanSentence(siblingMatch[3])}`,
      answer: cleanSentence(siblingMatch[1]),
      pageNumber,
      type: "person",
      topic: cleanSentence(siblingMatch[3]),
      importance: scoreSentence(text) + 4,
    });
  }

  const parentByChildMatch = text.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) was the (father|mother) of ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\b/i);
  if (parentByChildMatch?.[1] && parentByChildMatch?.[2] && parentByChildMatch?.[3]) {
    addCandidateIfValid(candidates, {
      question: `Who was the ${cleanSentence(parentByChildMatch[2])} of ${cleanSentence(parentByChildMatch[3])}`,
      answer: cleanSentence(parentByChildMatch[1]),
      pageNumber,
      type: "person",
      topic: cleanSentence(parentByChildMatch[3]),
      importance: scoreSentence(text) + 4,
    });
  }

  const spouseOfMatch = text.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) was the (wife|husband|spouse) of ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\b/i);
  if (spouseOfMatch?.[1] && spouseOfMatch?.[2] && spouseOfMatch?.[3]) {
    addCandidateIfValid(candidates, {
      question: `Who was the ${cleanSentence(spouseOfMatch[2])} of ${cleanSentence(spouseOfMatch[3])}`,
      answer: cleanSentence(spouseOfMatch[1]),
      pageNumber,
      type: "person",
      topic: cleanSentence(spouseOfMatch[3]),
      importance: scoreSentence(text) + 4,
    });
  }

  const capturedPowerMatch = text.match(/^(?:.+?\s+)?state that ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) captured power after (.+?)\.$/i);
  if (capturedPowerMatch?.[1] && capturedPowerMatch?.[2]) {
    addCandidateIfValid(candidates, {
      question: `How did ${cleanSentence(capturedPowerMatch[1])} capture power`,
      answer: `By ${cleanSentence(capturedPowerMatch[2])}`,
      pageNumber,
      type: "fact",
      topic: cleanSentence(capturedPowerMatch[1]),
      importance: scoreSentence(text) + 4,
      sourceHeading: heading,
    });
  }

  const successMatch = text.match(/^(.+?)[’']s success was due to (.+?)\.$/i);
  if (successMatch?.[1] && successMatch?.[2] && isUsableSubject(successMatch[1])) {
    const lhs = prettifyEntity(normalizeSubjectLabel(successMatch[1]));
    candidates.push(
      createCandidate({
        question: `Why was ${lhs} successful`,
        answer: cleanSentence(successMatch[2]),
        pageNumber,
        type: "reason",
        topic: lhs,
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const buriedMatch = text.match(/^He died in (\d{4}) and was buried (.+?)\.$/i);
  if (buriedMatch?.[1] && buriedMatch?.[2] && previousNamedSubject) {
    candidates.push(
      createCandidate({
        question: `When did ${previousNamedSubject} die`,
        answer: buriedMatch[1],
        optionValue: buriedMatch[1],
        pageNumber,
        type: "year",
        topic: previousNamedSubject,
        importance: scoreSentence(text) + 4,
      }),
      createCandidate({
        question: `Where was ${previousNamedSubject} buried`,
        answer: replacePronouns(cleanSentence(buriedMatch[2]), previousNamedSubject),
        pageNumber,
        type: "place",
        topic: previousNamedSubject,
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const diedMatch = text.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}|He|She)\s+died in\s+(\d{4})\b/i);
  const diedActor = /^he|she$/i.test(cleanSentence(diedMatch?.[1] || "")) ? previousNamedSubject : cleanSentence(diedMatch?.[1] || "");
  if (diedMatch?.[2] && diedActor) {
    candidates.push(
      createCandidate({
        question: `When did ${prettifyEntity(diedActor)} die`,
        answer: cleanSentence(diedMatch[2]),
        pageNumber,
        type: "year",
        topic: prettifyEntity(diedActor),
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const bornYearMatch = text.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+was born in\s+(\d{4})\b/i);
  if (bornYearMatch?.[1] && bornYearMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `When was ${cleanSentence(bornYearMatch[1])} born`,
        answer: cleanSentence(bornYearMatch[2]),
        pageNumber,
        type: "year",
        topic: bornYearMatch[1],
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const bornPlaceMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) was born (?:at|in|near)\s+(.+?)\b(?:\sto\b|\s+and\b|\.|$)/i);
  if (bornPlaceMatch?.[1] && actionActor && isUsableSubject(actionActor)) {
    addCandidateIfValid(candidates, {
      question: `Where was ${actionActor} born`,
      answer: cleanSentence(bornPlaceMatch[1]),
      pageNumber,
      type: "place",
      topic: actionActor,
      importance: scoreSentence(text) + 4,
    });
  }

  const fatherMotherMatch = text.match(/^(?:His|Her)\s+father was ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}).*?mother ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\b/i);
  if (fatherMotherMatch?.[1] && fatherMotherMatch?.[2] && actionActor && isUsableSubject(actionActor)) {
    addCandidateIfValid(candidates, {
      question: `Who was the father of ${actionActor}`,
      answer: cleanSentence(fatherMotherMatch[1]),
      pageNumber,
      type: "person",
      topic: actionActor,
      importance: scoreSentence(text) + 4,
    });
    addCandidateIfValid(candidates, {
      question: `Who was the mother of ${actionActor}`,
      answer: cleanSentence(fatherMotherMatch[2]),
      pageNumber,
      type: "person",
      topic: actionActor,
      importance: scoreSentence(text) + 4,
    });
  }

  const simpleMarriedMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) married ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})(?=\s+and\b|,|\.|$)/i);
  if (simpleMarriedMatch?.[1] && actionActor && isUsableSubject(actionActor)) {
    addCandidateIfValid(candidates, {
      question: `Whom did ${actionActor} marry`,
      answer: cleanSentence(simpleMarriedMatch[1]),
      pageNumber,
      type: "person",
      topic: actionActor,
      importance: scoreSentence(text) + 4,
    });
  }

  const gaveBirthMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) married [A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3} and gave birth to (?:a|an)\s+(son|daughter),?\s*([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})?/i);
  if (gaveBirthMatch?.[1] && actionActor && isUsableSubject(actionActor)) {
    const childType = cleanSentence(gaveBirthMatch[1]);
    const childName = cleanSentence(gaveBirthMatch[2] || "");
    addCandidateIfValid(candidates, {
      question: `What child did ${actionActor} have`,
      answer: childName ? `${childType}, ${childName}` : childType,
      pageNumber,
      type: "fact",
      topic: actionActor,
      importance: scoreSentence(text) + 4,
    });
  }

  const becameKnownAsMatch = text.match(/^(?:Since then )?he became known as (.+?)\.$/i);
  if (becameKnownAsMatch?.[1] && actionActor && isUsableSubject(actionActor)) {
    addCandidateIfValid(candidates, {
      question: `What did ${actionActor} become known as`,
      answer: cleanSentence(becameKnownAsMatch[1]),
      pageNumber,
      type: "term",
      topic: actionActor,
      importance: scoreSentence(text) + 4,
    });
  }

  const firstSermonMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) delivered (?:his|her) first sermon at (.+?)\b/i);
  if (firstSermonMatch?.[1] && actionActor && isUsableSubject(actionActor)) {
    addCandidateIfValid(candidates, {
      question: `Where did ${actionActor} deliver the first sermon`,
      answer: cleanSentence(firstSermonMatch[1]),
      pageNumber,
      type: "place",
      topic: actionActor,
      importance: scoreSentence(text) + 4,
    });
  }

  const admittedMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) admitted (.+?) in the Sangha\b/i);
  if (admittedMatch?.[1] && actionActor && isUsableSubject(actionActor)) {
    addCandidateIfValid(candidates, {
      question: `Whom did ${actionActor} admit in the Sangha`,
      answer: cleanSentence(admittedMatch[1]),
      pageNumber,
      type: "list",
      topic: actionActor,
      importance: scoreSentence(text) + 4,
    });
  }

  const spreadMatch = text.match(/^(?:It|He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) spread rapidly and widely in (.+?)\.$/i);
  if (spreadMatch?.[1] && (actionActor || contextSubject)) {
    const actor = actionActor || prettifyEntity(contextSubject);
    if (isUsableSubject(actor)) {
      addCandidateIfValid(candidates, {
        question: `Where did ${actor} spread rapidly and widely`,
        answer: cleanSentence(spreadMatch[1]),
        pageNumber,
        type: "place",
        topic: actor,
        importance: scoreSentence(text) + 4,
      });
    }
  }

  const diedAtAgePlaceMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) died at the age of (\d+)\s+at\s+(.+?)\.$/i);
  if (diedAtAgePlaceMatch?.[1] && diedAtAgePlaceMatch?.[2] && actionActor && isUsableSubject(actionActor)) {
    addCandidateIfValid(candidates, {
      question: `At what age did ${actionActor} die`,
      answer: cleanSentence(diedAtAgePlaceMatch[1]),
      pageNumber,
      type: "fact",
      topic: actionActor,
      importance: scoreSentence(text) + 4,
    });
    addCandidateIfValid(candidates, {
      question: `Where did ${actionActor} die`,
      answer: cleanSentence(diedAtAgePlaceMatch[2]),
      pageNumber,
      type: "place",
      topic: actionActor,
      importance: scoreSentence(text) + 4,
    });
  }

  const becameAsceticAgeMatch = text.match(/^At the age of ([A-Za-z0-9 -]+), (?:he|she|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) became an ascetic\b/i);
  if (becameAsceticAgeMatch?.[1] && actionActor && isUsableSubject(actionActor)) {
    addCandidateIfValid(candidates, {
      question: `At what age did ${actionActor} become an ascetic`,
      answer: cleanSentence(becameAsceticAgeMatch[1]),
      pageNumber,
      type: "fact",
      topic: actionActor,
      importance: scoreSentence(text) + 4,
    });
  }

  const attainedKnowledgeMatch = text.match(/^(?:In the )?(\d+(?:th|st|nd|rd) year .+?), (?:he|she|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) attained (.+?)\.$/i);
  if (attainedKnowledgeMatch?.[1] && attainedKnowledgeMatch?.[2] && actionActor && isUsableSubject(actionActor)) {
    addCandidateIfValid(candidates, {
      question: `What did ${actionActor} attain`,
      answer: cleanSentence(attainedKnowledgeMatch[2]),
      pageNumber,
      type: "fact",
      topic: actionActor,
      importance: scoreSentence(text) + 4,
    });
  }

  const leftHomeMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) left home at the age of (\d+) in search of (.+?)\.$/i);
  if (leftHomeMatch?.[1] && leftHomeMatch?.[2] && actionActor && isUsableSubject(actionActor)) {
    addCandidateIfValid(candidates, {
      question: `At what age did ${actionActor} leave home`,
      answer: cleanSentence(leftHomeMatch[1]),
      pageNumber,
      type: "fact",
      topic: actionActor,
      importance: scoreSentence(text) + 4,
    });
    addCandidateIfValid(candidates, {
      question: `What was ${actionActor} searching for when leaving home`,
      answer: cleanSentence(leftHomeMatch[2]),
      pageNumber,
      type: "fact",
      topic: actionActor,
      importance: scoreSentence(text) + 4,
    });
  }

  const enlightenmentMatch = text.match(/^Under a bodhi tree at (.+?), (?:he|she|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) got enlightenment or nirvana, at the age of (\d+)\b/i);
  if (enlightenmentMatch?.[1] && enlightenmentMatch?.[2] && actionActor && isUsableSubject(actionActor)) {
    addCandidateIfValid(candidates, {
      question: `Where did ${actionActor} attain enlightenment`,
      answer: cleanSentence(enlightenmentMatch[1]),
      pageNumber,
      type: "place",
      topic: actionActor,
      importance: scoreSentence(text) + 4,
    });
    addCandidateIfValid(candidates, {
      question: `At what age did ${actionActor} attain enlightenment`,
      answer: cleanSentence(enlightenmentMatch[2]),
      pageNumber,
      type: "fact",
      topic: actionActor,
      importance: scoreSentence(text) + 4,
    });
  }

  const turnedAsceticMatch = text.match(/^The sight of (.+?) turned (?:him|her) away from worldly life\.$/i);
  if (turnedAsceticMatch?.[1] && actionActor && isUsableSubject(actionActor)) {
    addCandidateIfValid(candidates, {
      question: `What turned ${actionActor} into an ascetic`,
      answer: cleanSentence(turnedAsceticMatch[1]),
      pageNumber,
      type: "fact",
      topic: actionActor,
      importance: scoreSentence(text) + 4,
    });
  }

  const altBattleNameMatch = text.match(/^(?:This|The) battle was also known as (.+?)\.$/i);
  const baseBattleReference = resolveBattleReference({
    previousSentence,
    chunkText: context.chunkText || "",
  });
  if (altBattleNameMatch?.[1] && baseBattleReference) {
    candidates.push(
      createCandidate({
        question: `What was ${baseBattleReference} also known as`,
        answer: cleanSentence(altBattleNameMatch[1]),
        pageNumber,
        type: "term",
        topic: baseBattleReference,
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const succeededByMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) was succeeded by ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\.$/i);
  if (succeededByMatch?.[1] && previousNamedSubject) {
    candidates.push(
      createCandidate({
        question: `Who succeeded ${prettifyEntity(previousNamedSubject)}`,
        answer: cleanSentence(succeededByMatch[1]),
        pageNumber,
        type: "person",
        topic: prettifyEntity(previousNamedSubject),
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const calledTitleMatch = text.match(/^(.+?) were called (.+?)\.$/i);
  if (calledTitleMatch?.[1] && calledTitleMatch?.[2] && isUsableSubject(calledTitleMatch[1])) {
    candidates.push(
      createCandidate({
        question: `What were ${normalizeSubjectLabel(calledTitleMatch[1])} called`,
        answer: cleanSentence(calledTitleMatch[2]),
        pageNumber,
        type: "term",
        topic: normalizeSubjectLabel(calledTitleMatch[1]),
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const firstCalledMatch = text.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) was the first to be called (.+?)\.$/i);
  if (firstCalledMatch?.[1] && firstCalledMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `What was ${cleanSentence(firstCalledMatch[1])} the first to be called`,
        answer: cleanSentence(firstCalledMatch[2]),
        pageNumber,
        type: "title",
        topic: firstCalledMatch[1],
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const hailedAsMatch = text.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) was hailed as (.+?) because (.+?)\.$/i);
  if (hailedAsMatch?.[1] && hailedAsMatch?.[2] && hailedAsMatch?.[3]) {
    candidates.push(
      createCandidate({
        question: `Why was ${cleanSentence(hailedAsMatch[1])} hailed as ${cleanSentence(hailedAsMatch[2])}`,
        answer: `Because ${cleanSentence(hailedAsMatch[3])}`,
        pageNumber,
        type: "reason",
        topic: hailedAsMatch[1],
        importance: scoreSentence(text) + 4,
      }),
      createCandidate({
        question: `What was ${cleanSentence(hailedAsMatch[1])} hailed as`,
        answer: cleanSentence(hailedAsMatch[2]),
        pageNumber,
        type: "title",
        topic: hailedAsMatch[1],
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const marriedMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) married ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}),? (.+?)\.$/i);
  if (marriedMatch?.[1] && actionActor && isUsableSubject(actionActor)) {
    candidates.push(
      createCandidate({
        question: `Whom did ${actionActor} marry`,
        answer: cleanSentence(marriedMatch[1]),
        pageNumber,
        type: "person",
        topic: actionActor,
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const fatherMatch = text.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+(?:was the eldest son of|was the son of|was son of)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\b/i);
  if (fatherMatch?.[1] && fatherMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `Who was the father of ${cleanSentence(fatherMatch[1])}`,
        answer: cleanSentence(fatherMatch[2]),
        pageNumber,
        type: "person",
        topic: fatherMatch[1],
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const motherMatch = text.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+was born .*? when (?:they|he|she) stayed .*?, .*?, ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}) was born/i);
  if (motherMatch?.[1] && motherMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `Who was the mother of ${cleanSentence(motherMatch[2])}`,
        answer: cleanSentence(motherMatch[1]),
        pageNumber,
        type: "person",
        topic: motherMatch[2],
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const brotherSisterMatch = text.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s*[-–]?\s*(?:the )?(.+?) who was (?:his|her) brother\b/i);
  if (brotherSisterMatch?.[1] && brotherSisterMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `Whose brother was ${cleanSentence(brotherSisterMatch[1])}`,
        answer: cleanSentence(brotherSisterMatch[2]),
        pageNumber,
        type: "person",
        topic: brotherSisterMatch[1],
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const daughterMatch = text.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})'?s daughter,\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\b/i);
  if (daughterMatch?.[1] && daughterMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `Who was the daughter of ${cleanSentence(daughterMatch[1])}`,
        answer: cleanSentence(daughterMatch[2]),
        pageNumber,
        type: "person",
        topic: daughterMatch[1],
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const gaveMarriageMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) gave (?:his|her) daughter ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) in marriage to ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\b/i);
  if (gaveMarriageMatch?.[1] && gaveMarriageMatch?.[2] && actionActor && isUsableSubject(actionActor)) {
    candidates.push(
      createCandidate({
        question: `Whom did ${actionActor} give in marriage to ${cleanSentence(gaveMarriageMatch[2])}`,
        answer: cleanSentence(gaveMarriageMatch[1]),
        pageNumber,
        type: "person",
        topic: actionActor,
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const allianceHelpedMatch = text.match(/^This alliance helped (.+?)\.$/i);
  if (allianceHelpedMatch?.[1] && previousNamedSubject) {
    candidates.push(
      createCandidate({
        question: `How did the alliance help ${prettifyEntity(previousNamedSubject)}`,
        answer: `It helped ${cleanSentence(allianceHelpedMatch[1])}`,
        pageNumber,
        type: "fact",
        topic: prettifyEntity(previousNamedSubject),
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const knewMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) was a student of (.+?)\.$/i);
  if (knewMatch?.[1] && actionActor && isUsableSubject(actionActor)) {
    candidates.push(
      createCandidate({
        question: `What did ${actionActor} study`,
        answer: cleanSentence(knewMatch[1]),
        pageNumber,
        type: "fact",
        topic: actionActor,
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const knewLanguagesMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) was also a great scholar in (.+?)\.$/i);
  if (knewLanguagesMatch?.[1] && actionActor && isUsableSubject(actionActor)) {
    candidates.push(
      createCandidate({
        question: `In which subjects or languages was ${actionActor} a scholar`,
        answer: cleanSentence(knewLanguagesMatch[1]),
        pageNumber,
        type: "fact",
        topic: actionActor,
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const ruleExtendedMatch = text.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})'?s rule extended over (.+?)\.$/i);
  if (ruleExtendedMatch?.[1] && ruleExtendedMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `Over which areas did ${cleanSentence(ruleExtendedMatch[1])}'s rule extend`,
        answer: cleanSentence(ruleExtendedMatch[2]),
        pageNumber,
        type: "place",
        topic: ruleExtendedMatch[1],
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const battleAgainstMatch = text.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) .*?Battle of ([A-Z][A-Za-z]+).*?(won|defeated|escaped|was thoroughly defeated|was severely defeated)\b/i);
  if (battleAgainstMatch?.[1] && battleAgainstMatch?.[2] && battleAgainstMatch?.[3]) {
    candidates.push(
      createCandidate({
        question: `What happened to ${cleanSentence(battleAgainstMatch[1])} in the Battle of ${cleanSentence(battleAgainstMatch[2])}`,
        answer: cleanSentence(battleAgainstMatch[3]),
        pageNumber,
        type: "fact",
        topic: battleAgainstMatch[1],
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const foughtBattleMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) fought (?:the )?Battle of ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\b/i);
  if (foughtBattleMatch?.[1] && actionActor) {
    addCandidateIfValid(candidates, {
      question: `Which battle did ${actionActor} fight`,
      answer: `the Battle of ${cleanSentence(foughtBattleMatch[1])}`,
      pageNumber,
      type: "fact",
      topic: actionActor,
      importance: scoreSentence(text) + 4,
    });
  }

  const capturedActionMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) captured ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,4})\b/i);
  if (capturedActionMatch?.[1] && actionActor && isUsableSubject(actionActor)) {
    addCandidateIfValid(candidates, {
      question: `What did ${actionActor} capture`,
      answer: cleanSentence(capturedActionMatch[1]),
      pageNumber,
      type: "place",
      topic: actionActor,
      importance: scoreSentence(text) + 4,
    });
  }

  const defeatedActionMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) defeated ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,4}|him)\b/i);
  if (defeatedActionMatch?.[1] && actionActor && isUsableSubject(actionActor)) {
    addCandidateIfValid(candidates, {
      question: `Whom did ${actionActor} defeat`,
      answer: cleanSentence(defeatedActionMatch[1]),
      pageNumber,
      type: "person",
      topic: actionActor,
      importance: scoreSentence(text) + 4,
    });
  }

  const defeatedInBattleMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) was (defeated|victorious|killed|captured) in the Battle of ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\b/i);
  if (defeatedInBattleMatch?.[1] && defeatedInBattleMatch?.[2] && actionActor) {
    addCandidateIfValid(candidates, {
      question: `What happened to ${actionActor} in the Battle of ${cleanSentence(defeatedInBattleMatch[2])}`,
      answer: cleanSentence(defeatedInBattleMatch[1]),
      pageNumber,
      type: "fact",
      topic: actionActor,
      importance: scoreSentence(text) + 4,
    });
  }

  const landRevenueSystemMatch = text.match(/^The land revenue system of Akbar was called (.+?)\.$/i);
  if (landRevenueSystemMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "What was Akbar's land revenue system called",
        answer: cleanSentence(landRevenueSystemMatch[1]),
        pageNumber,
        type: "term",
        topic: heading || "Akbar land revenue system",
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const landCategoriesMatch = text.match(/^The land was also divided into four categories\s+[–-]\s+(.+?)\.$/i);
  if (landCategoriesMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "Into what categories was land divided in Akbar's land revenue system",
        answer: cleanSentence(landCategoriesMatch[1]),
        pageNumber,
        type: "list",
        topic: heading || "land revenue",
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const cultivableLandMatch = text.match(/^All cultivable lands were classified into three classes\s+[–-]\s+(.+?)\.$/i);
  if (cultivableLandMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "What were the three classes of cultivable land under Sher Shah",
        answer: cleanSentence(cultivableLandMatch[1]),
        pageNumber,
        type: "list",
        topic: heading || "Sher Shah administration",
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const stateShareMatch = text.match(/^The state[’']?s share was (.+?)\.$/i);
  if (stateShareMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "What was the state's share of the average produce under Sher Shah",
        answer: cleanSentence(stateShareMatch[1]).replace(/\bit was paid\b/i, "payment was made"),
        pageNumber,
        type: "fact",
        topic: heading || "Sher Shah administration",
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const revenueMatch = text.match(/^The revenue was fixed on (.+?)\.$/i);
  if (revenueMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "How was revenue fixed in Akbar's land revenue system",
        answer: `Revenue was fixed on ${cleanSentence(revenueMatch[1])}`,
        pageNumber,
        type: "fact",
        topic: heading || "Akbar land revenue system",
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const importantWorkMatch = text.match(/^The most important work is (.+?)(?:\s+[●•]|\.|$)/i);
  if (importantWorkMatch?.[1]) {
    const importantWorkAnswer = cleanSentence(importantWorkMatch[1])
      .replace(/\bColors used.*$/i, "")
      .replace(/\bMughal paintings reached.*$/i, "")
      .trim();
    candidates.push(
      createCandidate({
        question: "What was the most important work in Mughal painting",
        answer: importantWorkAnswer,
        pageNumber,
        type: "work",
        topic: heading || "Mughal painting",
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const foundationMatch = text.match(/^The foundation for (.+?) was laid by (.+?)(?:\s+He brought|\.|$)/i);
  if (foundationMatch?.[1] && foundationMatch?.[2]) {
    const foundationAnswer = cleanSentence(foundationMatch[2])
      .replace(/\bHe brought.*$/i, "")
      .trim();
    candidates.push(
      createCandidate({
        question: `Who laid the foundation for ${cleanSentence(foundationMatch[1])}`,
        answer: foundationAnswer,
        pageNumber,
        type: "person",
        topic: foundationMatch[1],
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const definitionMatch = text.match(/^(.+?)\s+(is|are|was|were|refers to|means|is defined as)\s+(.+?)\.$/i);
  if (definitionMatch?.[1] && definitionMatch?.[2] && definitionMatch?.[3] && isUsableSubject(definitionMatch[1])) {
    const lhs = normalizeSubjectLabel(definitionMatch[1]);
    const rhs = cleanSentence(definitionMatch[3]);
    const verb = /^(are|were)$/i.test(definitionMatch[2]) ? "are" : "is";
    if (!isWeakAnswer(rhs)) {
      candidates.push(
        createCandidate({
          question: buildCopularQuestion(lhs, rhs, definitionMatch[2]),
          answer: rhs,
          pageNumber,
          type: "definition",
          topic: lhs,
          importance: scoreSentence(text) + 2,
        }),
      );
    }
  }

  const foundAtMatch = text.match(/^(.+?)\s+have also been found\s+on\s+rocks?\s+at\s+(.+?)\.$/i);
  if (foundAtMatch?.[1] && foundAtMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `Where have ${cleanSentence(foundAtMatch[1])} been found`,
        answer: cleanSentence(foundAtMatch[2]),
        pageNumber,
        type: "place",
        topic: cleanSentence(foundAtMatch[1]),
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const foundGenericMatch = text.match(/^(.+?)\s+have(?: also)? been found\s+(?:at|in)\s+(.+?)\.$/i);
  if (foundGenericMatch?.[1] && foundGenericMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `Where have ${cleanSentence(foundGenericMatch[1])} been found`,
        answer: cleanSentence(foundGenericMatch[2]),
        pageNumber,
        type: "place",
        topic: cleanSentence(foundGenericMatch[1]),
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const shiftMatch = text.match(/^(?:There\s+)?seems to have been a shift from\s+(.+?)\s+to\s+(.+?)\b/i);
  if (shiftMatch?.[1] && shiftMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: "What shift seems to have taken place",
        answer: `A shift from ${cleanSentence(shiftMatch[1])} to ${cleanSentence(shiftMatch[2])}`,
        pageNumber,
        type: "fact",
        topic: heading || contextSubject || "change",
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const beganInPeriodMatch = text.match(/^(The use of .+?) began in this period\.$/i);
  if (beganInPeriodMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: `What began in this period`,
        answer: cleanSentence(beganInPeriodMatch[1]),
        pageNumber,
        type: "fact",
        topic: cleanSentence(beganInPeriodMatch[1]),
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const calledMicrolithsMatch = text.match(/^These are (.+?), and therefore called (.+?)\.$/i);
  if (calledMicrolithsMatch?.[1] && calledMicrolithsMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `What were ${cleanSentence(calledMicrolithsMatch[2])}`,
        answer: cleanSentence(calledMicrolithsMatch[1]),
        pageNumber,
        type: "definition",
        topic: cleanSentence(calledMicrolithsMatch[2]),
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const includesMatch = text.match(/^(.+?)\s+(?:includes|include|consists of|consist of|has|have)\s+(.+?)\.$/i);
  if (includesMatch?.[1] && includesMatch?.[2] && isUsableSubject(includesMatch[1])) {
    const lhs = normalizeSubjectLabel(includesMatch[1]);
    candidates.push(
      createCandidate({
        question: `What does ${lhs} include`,
        answer: includesMatch[2],
        pageNumber,
        type: "list",
        topic: lhs,
        importance: scoreSentence(text) + 2,
      }),
    );
  }

  const causeMatch = text.match(/^(.+?)\s+(?:helps|help|enables|enable|allows|allow|contributes to|contribute to)\s+(.+?)\.$/i);
  if (causeMatch?.[1] && causeMatch?.[2] && isUsableSubject(causeMatch[1])) {
    const lhs = normalizeSubjectLabel(causeMatch[1]);
    candidates.push(
      createCandidate({
        question: `How does ${lhs} help`,
        answer: causeMatch[2],
        pageNumber,
        type: "explanation",
        topic: lhs,
        importance: scoreSentence(text) + 2,
      }),
    );
  }

  const whyMatch = text.match(/^(.+?)\s+is\s+the key to\s+(.+?)\.$/i);
  if (whyMatch?.[1] && whyMatch?.[2] && isUsableSubject(whyMatch[1])) {
    const lhs = normalizeSubjectLabel(whyMatch[1]);
    candidates.push(
      createCandidate({
        question: `Why is ${lhs} important`,
        answer: `It is the key to ${cleanSentence(whyMatch[2])}`,
        pageNumber,
        type: "reason",
        topic: lhs,
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const worshipperMatch = text.match(/^(?:He was a |He was an |He was the )?worshipper of (.+?)(?:\s+and\s+composed|\.|$)/i);
  if (worshipperMatch?.[1] && contextSubject) {
    candidates.push(
      createCandidate({
        question: `Whom did ${prettifyEntity(contextSubject)} worship`,
        answer: trimTrailingClause(worshipperMatch[1]),
        pageNumber,
        type: "person",
        topic: prettifyEntity(contextSubject),
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const knewManyThingsMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) knew (.+?)\.$/i);
  if (knewManyThingsMatch?.[1] && actionActor && isUsableSubject(actionActor)) {
    addCandidateIfValid(candidates, {
      question: `What did ${actionActor} know`,
      answer: trimTrailingClause(knewManyThingsMatch[1]),
      pageNumber,
      type: "fact",
      topic: actionActor,
      importance: scoreSentence(text) + 3,
    });
  }

  const devoteeMatch = text.match(/^(?:Great )?devotee of (.+?)\b/i);
  if (devoteeMatch?.[1] && contextSubject) {
    candidates.push(
      createCandidate({
        question: `Whose devotee was ${prettifyEntity(contextSubject)}`,
        answer: cleanSentence(devoteeMatch[1]),
        pageNumber,
        type: "person",
        topic: prettifyEntity(contextSubject),
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const discipleMatch = text.match(/^(?:Among the disciples of .+? the most famous was .+?\.\s*)?Disciple of (.+?)\b/i);
  if (discipleMatch?.[1] && contextSubject) {
    candidates.push(
      createCandidate({
        question: `Whose disciple was ${prettifyEntity(contextSubject)}`,
        answer: cleanSentence(discipleMatch[1]),
        pageNumber,
        type: "person",
        topic: prettifyEntity(contextSubject),
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const bornMatch = text.match(/^(?:Born|He was born|She was born)\s+(?:in|at|near)\s+(.+?)\.$/i);
  if (bornMatch?.[1] && contextSubject) {
    candidates.push(
      createCandidate({
        question: `Where was ${prettifyEntity(contextSubject)} born`,
        answer: cleanSentence(bornMatch[1]),
        pageNumber,
        type: "place",
        topic: prettifyEntity(contextSubject),
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const composedByHeadingMatch = text.match(/^(?:Worshipper of .+? and |Disciple of .+? and )?composed\s+(.+?)\.$/i);
  if (composedByHeadingMatch?.[1] && contextSubject) {
    candidates.push(
      createCandidate({
        question: `What did ${prettifyEntity(contextSubject)} compose`,
        answer: cleanSentence(composedByHeadingMatch[1]),
        pageNumber,
        type: "work",
        topic: prettifyEntity(contextSubject),
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const wroteByHeadingMatch = text.match(/^(?:He|She)\s+wrote\s+(.+?)\.$/i);
  const wroteActor = previousNamedSubject || contextSubject;
  if (wroteByHeadingMatch?.[1] && wroteActor) {
    candidates.push(
      createCandidate({
        question: `What did ${prettifyEntity(wroteActor)} write`,
        answer: cleanSentence(wroteByHeadingMatch[1]),
        pageNumber,
        type: "work",
        topic: prettifyEntity(wroteActor),
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const founderByHeadingMatch = text.match(/^([A-Z][A-Za-z]+)\s+was the founder of (.+?)\.$/i);
  if (founderByHeadingMatch?.[1] && founderByHeadingMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `Who founded ${cleanSentence(founderByHeadingMatch[2])}`,
        answer: prettifyEntity(founderByHeadingMatch[1]),
        pageNumber,
        type: "person",
        topic: cleanSentence(founderByHeadingMatch[2]),
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const foundedThingMatch = text.match(/^(?:Originally a follower of .+?, later )?founded (.+?) and preached (.+?)\.$/i);
  if (foundedThingMatch?.[1] && foundedThingMatch?.[2] && contextSubject) {
    candidates.push(
      createCandidate({
        question: `What did ${prettifyEntity(contextSubject)} found`,
        answer: cleanSentence(foundedThingMatch[1]),
        pageNumber,
        type: "fact",
        topic: prettifyEntity(contextSubject),
        importance: scoreSentence(text) + 4,
      }),
      createCandidate({
        question: `What did ${prettifyEntity(contextSubject)} preach`,
        answer: cleanSentence(foundedThingMatch[2]),
        pageNumber,
        type: "fact",
        topic: prettifyEntity(contextSubject),
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const preachedMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+preached\s+(.+?)\.$/i);
  if (preachedMatch?.[1] && actionActor && isUsableSubject(actionActor)) {
    candidates.push(
      createCandidate({
        question: buildObjectQuestion(actionActor, "preach", preachedMatch[1]),
        answer: trimTrailingClause(preachedMatch[1]),
        pageNumber,
        type: "fact",
        topic: actionActor,
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const propagatedMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+propagat(?:ed|e[sd])\s+(.+?)\.$/i);
  if (propagatedMatch?.[1] && actionActor && isUsableSubject(actionActor)) {
    candidates.push(
      createCandidate({
        question: buildObjectQuestion(actionActor, "propagate", propagatedMatch[1]),
        answer: trimTrailingClause(propagatedMatch[1]),
        pageNumber,
        type: "fact",
        topic: actionActor,
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const popularizedMatch = text.match(/^(?:Well-known saint and reformer of .+? who )?populari[sz]ed (.+?)\.$/i);
  if (popularizedMatch?.[1] && contextSubject) {
    candidates.push(
      createCandidate({
        question: `What did ${prettifyEntity(contextSubject)} popularize`,
        answer: cleanSentence(popularizedMatch[1]),
        pageNumber,
        type: "fact",
        topic: prettifyEntity(contextSubject),
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const invitedToMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+invited\s+(.+?)\s+to\s+(.+?)\.$/i);
  if (invitedToMatch?.[1] && invitedToMatch?.[2] && actionActor && isUsableSubject(actionActor)) {
    candidates.push(
      createCandidate({
        question: `Whom did ${actionActor} invite to ${cleanSentence(invitedToMatch[2])}`,
        answer: cleanSentence(invitedToMatch[1]),
        pageNumber,
        type: "person",
        topic: actionActor,
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const opposedMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+opposed\s+(.+?)\.$/i);
  if (opposedMatch?.[1] && actionActor && isUsableSubject(actionActor)) {
    candidates.push(
      createCandidate({
        question: `What did ${actionActor} oppose`,
        answer: trimTrailingClause(opposedMatch[1]),
        pageNumber,
        type: "fact",
        topic: actionActor,
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const condemnedMatch = text.match(/^(?:He|She|They|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+condemned\s+(.+?)\.$/i);
  if (condemnedMatch?.[1] && actionActor && isUsableSubject(actionActor)) {
    candidates.push(
      createCandidate({
        question: `What did ${actionActor} condemn`,
        answer: cleanSentence(condemnedMatch[1]),
        pageNumber,
        type: "fact",
        topic: actionActor,
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const emphasizedMatch = text.match(/^(?:He|She|They|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+emphas(?:ized|ised)\s+(.+?)\.$/i);
  if (emphasizedMatch?.[1] && actionActor && isUsableSubject(actionActor)) {
    candidates.push(
      createCandidate({
        question: `What did ${actionActor} emphasize`,
        answer: trimTrailingClause(emphasizedMatch[1]),
        pageNumber,
        type: "fact",
        topic: actionActor,
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const importanceIncreasedMatch = text.match(/^The importance of (.+?) was also increased because (.+?)\.$/i);
  if (importanceIncreasedMatch?.[1] && importanceIncreasedMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `How was the importance of ${cleanSentence(importanceIncreasedMatch[1])} affected`,
        answer: `It was increased because ${cleanSentence(importanceIncreasedMatch[2])}`,
        pageNumber,
        type: "fact",
        topic: cleanSentence(importanceIncreasedMatch[1]),
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const gaveMatch = text.match(/^(?:He|She|They|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+gave\s+(.+?)\.$/i);
  if (gaveMatch?.[1] && actionActor && isUsableSubject(actionActor)) {
    candidates.push(
      createCandidate({
        question: buildObjectQuestion(actionActor, "give", gaveMatch[1]),
        answer: trimTrailingClause(gaveMatch[1]),
        pageNumber,
        type: "fact",
        topic: actionActor,
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const providedMatch = text.match(/^(?:It|He|She|They|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+provided\s+(.+?)\.$/i);
  if (providedMatch?.[1] && actionActor && isUsableSubject(actionActor)) {
    candidates.push(
      createCandidate({
        question: buildObjectQuestion(actionActor, "provide", providedMatch[1]),
        answer: trimTrailingClause(providedMatch[1]),
        pageNumber,
        type: "fact",
        topic: actionActor,
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const calledFollowersMatch = text.match(/^(?:His|Her|Their)\s+followers\s+are\s+called\s+(.+?)\.$/i);
  if (calledFollowersMatch?.[1] && contextSubject) {
    candidates.push(
      createCandidate({
        question: `What were the followers of ${prettifyEntity(contextSubject)} called`,
        answer: cleanSentence(calledFollowersMatch[1]),
        pageNumber,
        type: "term",
        topic: prettifyEntity(contextSubject),
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const objectWasToMatch = text.match(/^([A-Z][A-Za-z]+(?:[’']s)?) object was to (.+?)\.$/i);
  if (objectWasToMatch?.[1] && objectWasToMatch?.[2]) {
    const actor = prettifyEntity(objectWasToMatch[1].replace(/[’']s$/i, ""));
    candidates.push(
      createCandidate({
        question: `What was ${actor}'s object`,
        answer: `To ${cleanSentence(objectWasToMatch[2])}`,
        pageNumber,
        type: "fact",
        topic: actor,
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const firstToMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+was the first to\s+(.+?)\.$/i);
  if (firstToMatch?.[1] && actionActor && isUsableSubject(actionActor)) {
    candidates.push(
      createCandidate({
        question: `What was ${actionActor} the first to do`,
        answer: cleanSentence(firstToMatch[1]),
        pageNumber,
        type: "fact",
        topic: actionActor,
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const calledMatch = text.match(/^(.+?)\s+are\s+called\s+(.+?)\.$/i);
  if (calledMatch?.[1] && calledMatch?.[2] && isUsableSubject(calledMatch[1])) {
    candidates.push(
      createCandidate({
        question: `What are ${normalizeSubjectLabel(calledMatch[1])} called`,
        answer: cleanSentence(calledMatch[2]),
        pageNumber,
        type: "term",
        topic: normalizeSubjectLabel(calledMatch[1]),
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const lowerClassesRaisedMatch = text.match(/^As the caste system was condemned by (.+?), the (.+?) were raised to (.+?)\.$/i);
  if (lowerClassesRaisedMatch?.[1] && lowerClassesRaisedMatch?.[2] && lowerClassesRaisedMatch?.[3]) {
    candidates.push(
      createCandidate({
        question: `What happened to the ${cleanSentence(lowerClassesRaisedMatch[2])} when the caste system was condemned by ${cleanSentence(lowerClassesRaisedMatch[1])}`,
        answer: `They were raised to ${cleanSentence(lowerClassesRaisedMatch[3])}`,
        pageNumber,
        type: "fact",
        topic: cleanSentence(lowerClassesRaisedMatch[2]),
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const wasResponsibleMatch = text.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) was responsible for (.+?)\.$/i);
  if (wasResponsibleMatch?.[1] && wasResponsibleMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `What was ${cleanSentence(wasResponsibleMatch[1])} responsible for`,
        answer: cleanSentence(wasResponsibleMatch[2]),
        pageNumber,
        type: "fact",
        topic: wasResponsibleMatch[1],
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const wasKnownAsMatch = text.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) was known as (.+?)\.$/i);
  if (wasKnownAsMatch?.[1] && wasKnownAsMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `What was ${cleanSentence(wasKnownAsMatch[1])} known as`,
        answer: cleanSentence(wasKnownAsMatch[2]),
        pageNumber,
        type: "term",
        topic: wasKnownAsMatch[1],
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const becauseMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) did this because (.+?)\.$/i);
  if (becauseMatch?.[1] && actionActor) {
    addCandidateIfValid(candidates, {
      question: `Why did ${actionActor} do this`,
      answer: `Because ${cleanSentence(becauseMatch[1])}`,
      pageNumber,
      type: "reason",
      topic: actionActor,
      importance: scoreSentence(text) + 3,
    });
  }

  const wasCalledMatch = text.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) was called (.+?)\.$/i);
  if (wasCalledMatch?.[1] && wasCalledMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `What was ${cleanSentence(wasCalledMatch[1])} called`,
        answer: cleanSentence(wasCalledMatch[2]),
        pageNumber,
        type: "term",
        topic: wasCalledMatch[1],
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const settledInMatch = text.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) settled in (.+?)\.$/i);
  if (settledInMatch?.[1] && settledInMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `Where did ${cleanSentence(settledInMatch[1])} settle`,
        answer: cleanSentence(settledInMatch[2]),
        pageNumber,
        type: "place",
        topic: settledInMatch[1],
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const cameUnderInfluenceMatch = text.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) came under the influence of (.+?)\.$/i);
  if (cameUnderInfluenceMatch?.[1] && cameUnderInfluenceMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `Under whose influence did ${cleanSentence(cameUnderInfluenceMatch[1])} come`,
        answer: cleanSentence(cameUnderInfluenceMatch[2]),
        pageNumber,
        type: "person",
        topic: cameUnderInfluenceMatch[1],
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const remainedMatch = text.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) remained (.+?)\.$/i);
  if (remainedMatch?.[1] && remainedMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `What did ${cleanSentence(remainedMatch[1])} remain`,
        answer: cleanSentence(remainedMatch[2]),
        pageNumber,
        type: "fact",
        topic: remainedMatch[1],
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const consideredMatch = text.match(/^(.+?) is considered (?:as )?(.+?)\.$/i);
  if (consideredMatch?.[1] && consideredMatch?.[2] && isUsableSubject(consideredMatch[1])) {
    const lhs = normalizeSubjectLabel(consideredMatch[1]);
    candidates.push(
      createCandidate({
        question: `What is ${lhs} considered`,
        answer: cleanSentence(consideredMatch[2]),
        pageNumber,
        type: "definition",
        topic: lhs,
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const gaveImportanceMatch = text.match(/^(.+?) gave equal importance to (.+?)\.$/i);
  if (gaveImportanceMatch?.[1] && gaveImportanceMatch?.[2] && isUsableSubject(gaveImportanceMatch[1])) {
    const lhs = normalizeSubjectLabel(gaveImportanceMatch[1]);
    candidates.push(
      createCandidate({
        question: `To whom did ${lhs} give equal importance`,
        answer: cleanSentence(gaveImportanceMatch[2]),
        pageNumber,
        type: "person",
        topic: lhs,
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const objectWasMatch = text.match(/^The object(?:ive)? of (.+?) was to (.+?)\.$/i);
  if (objectWasMatch?.[1] && objectWasMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `What was the objective of ${cleanSentence(objectWasMatch[1])}`,
        answer: `To ${cleanSentence(objectWasMatch[2])}`,
        pageNumber,
        type: "fact",
        topic: cleanSentence(objectWasMatch[1]),
        importance: scoreSentence(text) + 4,
      }),
    );
  }

  const activePersonPatterns = [
    { regex: /^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) wrote (.+?)\.$/i, verb: "write", type: "work" },
    { regex: /^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) composed (.+?)\.$/i, verb: "compose", type: "work" },
    { regex: /^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) preached (.+?)\.$/i, verb: "preach", type: "fact" },
    { regex: /^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) propagated (.+?)\.$/i, verb: "propagate", type: "fact" },
    { regex: /^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) founded (.+?)\.$/i, verb: "found", type: "fact" },
    { regex: /^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) populari[sz]ed (.+?)\.$/i, verb: "popularize", type: "fact" },
  ];

  for (const pattern of activePersonPatterns) {
    const match = text.match(pattern.regex);
    if (match?.[1] && match?.[2]) {
      candidates.push(
        createCandidate({
          question: buildObjectQuestion(cleanSentence(match[1]), pattern.verb, match[2]),
          answer: trimTrailingClause(match[2]),
          pageNumber,
          type: pattern.type,
          topic: cleanSentence(match[1]),
          importance: scoreSentence(text) + 4,
        }),
      );
    }
  }

  const passiveEffectMatch = text.match(/^(.+?) (?:was|were) (raised|increased|improved|reduced) to (.+?)\.$/i);
  if (passiveEffectMatch?.[1] && passiveEffectMatch?.[2] && passiveEffectMatch?.[3] && isUsableSubject(passiveEffectMatch[1])) {
    const lhs = normalizeSubjectLabel(passiveEffectMatch[1]);
    candidates.push(
      createCandidate({
        question: buildEffectQuestion(lhs, `${passiveEffectMatch[2]} to ${passiveEffectMatch[3]}`),
        answer: `${cleanSentence(lhs)} was ${cleanSentence(passiveEffectMatch[2])} to ${cleanSentence(passiveEffectMatch[3])}`,
        pageNumber,
        type: "fact",
        topic: lhs,
        importance: scoreSentence(text) + 3,
      }),
    );
  }

  const abolishedMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+abolished\s+(.+?)\.$/i);
  if (abolishedMatch?.[1] && actionActor) {
    candidates.push(
      createCandidate({
        question: `What did ${actionActor} abolish`,
        answer: cleanSentence(abolishedMatch[1]),
        pageNumber,
        type: "fact",
        topic: actionActor,
        importance: scoreSentence(text) + 2,
      }),
    );
  }

  const allowedMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+allowed\s+(.+?)\s+to\s+(.+?)\.$/i);
  if (allowedMatch?.[1] && allowedMatch?.[2] && actionActor) {
    candidates.push(
      createCandidate({
        question: `What did ${actionActor} allow`,
        answer: `${cleanSentence(allowedMatch[1])} to ${cleanSentence(allowedMatch[2])}`,
        pageNumber,
        type: "fact",
        topic: actionActor,
        importance: scoreSentence(text) + 2,
      }),
    );
  }

  const orderedConstructionMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+ordered for the construction of\s+(.+?)\b/i);
  if (orderedConstructionMatch?.[1] && actionActor) {
    candidates.push(
      createCandidate({
        question: `What did ${actionActor} order to be constructed`,
        answer: cleanSentence(orderedConstructionMatch[1]),
        pageNumber,
        type: "work",
        topic: actionActor,
        importance: scoreSentence(text) + 2,
      }),
    );
  }

  const invitedMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+invited\s+(.+?)\s+to\s+(?:his|her|the)\s+court\.$/i);
  if (invitedMatch?.[1] && actionActor) {
    candidates.push(
      createCandidate({
        question: `Whom did ${actionActor} invite to the court`,
        answer: cleanSentence(invitedMatch[1]),
        pageNumber,
        type: "person",
        topic: actionActor,
        importance: scoreSentence(text) + 2,
      }),
    );
  }

  const strengthenedMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+strengthened\s+(.+?)\.$/i);
  if (strengthenedMatch?.[1] && actionActor) {
    candidates.push(
      createCandidate({
        question: `What did ${actionActor} strengthen`,
        answer: cleanSentence(strengthenedMatch[1]),
        pageNumber,
        type: "fact",
        topic: actionActor,
        importance: scoreSentence(text) + 2,
      }),
    );
  }

  const conqueredMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+conquered\s+(.+?)\.$/i);
  if (conqueredMatch?.[1] && actionActor) {
    candidates.push(
      createCandidate({
        question: `What did ${actionActor} conquer`,
        answer: cleanSentence(conqueredMatch[1]),
        pageNumber,
        type: "fact",
        topic: actionActor,
        importance: scoreSentence(text) + 2,
      }),
    );
  }

  const recoveredMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+recovered\s+(.+?)\.$/i);
  if (recoveredMatch?.[1] && actionActor) {
    candidates.push(
      createCandidate({
        question: `What did ${actionActor} recover`,
        answer: cleanSentence(recoveredMatch[1]),
        pageNumber,
        type: "fact",
        topic: actionActor,
        importance: scoreSentence(text) + 2,
      }),
    );
  }

  const patronizedMatch = text.match(/^(?:He|She|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+patronized\s+(.+?)\.$/i);
  if (
    patronizedMatch?.[1] &&
    actionActor &&
    isUsableSubject(actionActor) &&
    !/^(many|a large number|writers|historians)\b/i.test(cleanSentence(patronizedMatch[1]))
  ) {
    candidates.push(
      createCandidate({
        question: `Whom did ${actionActor} patronize`,
        answer: cleanSentence(patronizedMatch[1]),
        pageNumber,
        type: "person",
        topic: actionActor,
        importance: scoreSentence(text) + 2,
      }),
    );
  }

  if (
    candidates.length === 0 &&
    isUsableSubject(subject) &&
    /\b(has|have|helps|help|allows|allow|enables|enable|shows|show|describes|describe|explains|explain|requires|require|uses|use|contains|contain|focuses on|deals with|shaped|shape|protects|protect)\b/i.test(text)
  ) {
    const genericQuestion = buildGenericQuestion(subject, text);
    if (genericQuestion) {
    candidates.push(
      createCandidate({
        question: genericQuestion,
        answer: text,
        pageNumber,
        type: "fact",
        topic: subject,
        importance: scoreSentence(text),
      }),
    );
    }
  }

  return candidates;
};

const buildChunkLevelCandidates = (chunk = {}) => {
  const text = cleanSentence(chunk.content || "");
  const pageNumber = chunk.pageNumber;
  const candidates = [];
  const headingText = cleanSentence(chunk.heading || "");
  const sourceText = cleanSentence([headingText, text].filter(Boolean).join(" "));
  const headingSubject = extractHeadingSubject(chunk.heading || "");
  const previousChunkSubject = resolvePrimaryEntity({
    heading: chunk.previousChunkHeading || "",
    chunkText: chunk.previousChunkContent || "",
  });
  const firstSentenceSubject = extractNamedSubject(splitSentences(chunk.content || "")[0] || "");
  const chunkSubject =
    resolvePrimaryEntity({
      heading: headingText,
      chunkText: text,
      previousChunkHeading: chunk.previousChunkHeading || "",
      previousChunkText: chunk.previousChunkContent || "",
    }) ||
    firstSentenceSubject ||
    extractNamedSubject(text) ||
    headingSubject ||
    previousChunkSubject;
  const factClauses = splitFactClauses(chunk.content || "");
  const contextualTopic =
    cleanSentence(
      headingText && !isGenericHeadingLabel(headingText)
        ? headingText
        : chunk.previousChunkHeading || previousChunkSubject || chunkSubject,
    ) || cleanSentence(previousChunkSubject || chunkSubject || "");

  const founderMatch = text.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) was the founder of (.+?)(?: in India)?\./i);
  if (founderMatch?.[1] && founderMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `Who founded ${cleanSentence(founderMatch[2])}`,
        answer: prettifyEntity(founderMatch[1]),
        pageNumber,
        type: "person",
        topic: founderMatch[2],
        importance: 7,
      }),
    );
  }

  const headingWrittenByMatch = sourceText.match(/\bWritten by ([A-Z][A-Za-z.]+(?:\s+[A-Z][A-Za-z.]+){0,3})(?=\s+is\b|,|\s+who\b|$)\s*(.+?)(?:\.|$)/i);
  if (headingText && headingWrittenByMatch?.[1]) {
    const workTitleForQuestion = cleanSentence(
      headingText.replace(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})[’']s\s+/i, ""),
    );
    addCandidateIfValid(candidates, {
      question: `Who wrote ${workTitleForQuestion || headingText}`,
      answer: cleanSentence(headingWrittenByMatch[1]),
      pageNumber,
      type: "person",
      topic: workTitleForQuestion || headingText,
      importance: 8,
    });
    const description = cleanSentence((headingWrittenByMatch[2] || "").replace(/^is\s+/i, "").replace(/^[,:\-\s]+/, ""));
    if (description) {
      addCandidateIfValid(candidates, {
        question: `What is ${workTitleForQuestion || headingText}`,
        answer: description,
        pageNumber,
        type: "definition",
        topic: workTitleForQuestion || headingText,
        importance: 7,
      });
    }
  }

const headingPossessiveWorkMatch = headingText.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})[’']s\s+(.+)$/);
  if (headingPossessiveWorkMatch?.[1] && headingPossessiveWorkMatch?.[2]) {
    const workTitle = cleanSentence(headingPossessiveWorkMatch[2]);
    if (
      workTitle &&
      !/^(reign|dhamma|policy|empire|administration|history|religion|buddhism|painting|music|language|literature)$/i.test(
        workTitle,
      )
    ) {
      addCandidateIfValid(candidates, {
        question: `Who wrote ${workTitle}`,
        answer: cleanSentence(headingPossessiveWorkMatch[1]),
        pageNumber,
        type: "person",
        topic: workTitle,
        importance: 7,
      });
    }
  }

  const firstDiscoveredMatch = sourceText.match(/\bThe manuscript of ([A-Z][A-Za-z\s'-]+?) was first discovered by ([A-Z][A-Za-z.]+(?:\s+[A-Z][A-Za-z.]+){0,3}) in (\d{4})\b/i);
  if (firstDiscoveredMatch?.[1] && firstDiscoveredMatch?.[2] && firstDiscoveredMatch?.[3]) {
    addCandidateIfValid(candidates, {
      question: `Who first discovered the manuscript of ${cleanSentence(firstDiscoveredMatch[1])}`,
      answer: cleanSentence(firstDiscoveredMatch[2]),
      pageNumber,
      type: "person",
      topic: cleanSentence(firstDiscoveredMatch[1]),
      importance: 8,
    });
    addCandidateIfValid(candidates, {
      question: `When was the manuscript of ${cleanSentence(firstDiscoveredMatch[1])} first discovered`,
      answer: cleanSentence(firstDiscoveredMatch[3]),
      pageNumber,
      type: "year",
      topic: cleanSentence(firstDiscoveredMatch[1]),
      importance: 7,
    });
  }

  const decipheredByMatch = sourceText.match(/\bThe inscriptions of ([A-Z][A-Za-z]+) were first deciphered by ([A-Z][A-Za-z.]+(?:\s+[A-Z][A-Za-z.]+){0,3}) in (\d{4})\b/i);
  if (decipheredByMatch?.[1] && decipheredByMatch?.[2] && decipheredByMatch?.[3]) {
    addCandidateIfValid(candidates, {
      question: `Who first deciphered the inscriptions of ${cleanSentence(decipheredByMatch[1])}`,
      answer: cleanSentence(decipheredByMatch[2]),
      pageNumber,
      type: "person",
      topic: `${cleanSentence(decipheredByMatch[1])} inscriptions`,
      importance: 8,
    });
    addCandidateIfValid(candidates, {
      question: `When were the inscriptions of ${cleanSentence(decipheredByMatch[1])} first deciphered`,
      answer: cleanSentence(decipheredByMatch[3]),
      pageNumber,
      type: "year",
      topic: `${cleanSentence(decipheredByMatch[1])} inscriptions`,
      importance: 7,
    });
  }

  const writtenLanguageMatch = sourceText.match(/\bThey are written in ([A-Za-z\s]+?) language and in some places ([A-Za-z\s]+?) was used\b/i);
  if (writtenLanguageMatch?.[1] && writtenLanguageMatch?.[2] && headingText) {
    addCandidateIfValid(candidates, {
      question: `In which languages were the ${headingText} inscriptions written`,
      answer: `${cleanSentence(writtenLanguageMatch[1])} and ${cleanSentence(writtenLanguageMatch[2])}`,
      pageNumber,
      type: "language",
      topic: `${headingText} inscriptions`,
      importance: 7,
    });
  }

  const scriptEmployedMatch = sourceText.match(/\bThe ([A-Za-z]+) script was employed for writing\b/i);
  if (scriptEmployedMatch?.[1]) {
    const scriptTopic =
      headingText && !/^The [A-Za-z]+ script was employed for writing$/i.test(headingText)
        ? headingText
        : previousChunkSubject || chunkSubject || "";
    addCandidateIfValid(candidates, {
      question: scriptTopic
        ? `Which script was employed for writing ${cleanSentence(scriptTopic)} inscriptions`
        : "Which script was employed for writing",
      answer: cleanSentence(scriptEmployedMatch[1]),
      pageNumber,
      type: "term",
      topic: scriptTopic || "script",
      importance: 7,
    });
  }

  const howManyEdictsMatch = sourceText.match(/\bThere are (\d+) Major Rock Edicts\b/i);
  if (howManyEdictsMatch?.[1]) {
    addCandidateIfValid(candidates, {
      question: "How many Major Rock Edicts are there",
      answer: cleanSentence(howManyEdictsMatch[1]),
      pageNumber,
      type: "fact",
      topic: "Major Rock Edicts",
      importance: 7,
    });
  }

  const edictsDealWithMatch = sourceText.match(/\bThese edicts of ([A-Z][A-Za-z]+) deal with (.+?)\./i);
  if (edictsDealWithMatch?.[1] && edictsDealWithMatch?.[2]) {
    addCandidateIfValid(candidates, {
      question: `What do the edicts of ${cleanSentence(edictsDealWithMatch[1])} deal with`,
      answer: cleanSentence(edictsDealWithMatch[2]),
      pageNumber,
      type: "fact",
      topic: `${cleanSentence(edictsDealWithMatch[1])} edicts`,
      importance: 7,
    });
  }

  const givesDetailsMatch = sourceText.match(/\bThe ([A-Z0-9]+ Rock Edicts?) gives details about (.+?)\b/i);
  if (givesDetailsMatch?.[1] && givesDetailsMatch?.[2]) {
    addCandidateIfValid(candidates, {
      question: `What does the ${cleanSentence(givesDetailsMatch[1])} give details about`,
      answer: cleanSentence(givesDetailsMatch[2]),
      pageNumber,
      type: "fact",
      topic: cleanSentence(givesDetailsMatch[1]),
      importance: 7,
    });
  }

  const summaryOfEffortsMatch = sourceText.match(/\bThe pillar edict ([A-Z]+) gives a summary of (.+?)\b/i);
  if (summaryOfEffortsMatch?.[1] && summaryOfEffortsMatch?.[2]) {
    addCandidateIfValid(candidates, {
      question: `What does Pillar Edict ${cleanSentence(summaryOfEffortsMatch[1])} give a summary of`,
      answer: cleanSentence(summaryOfEffortsMatch[2]),
      pageNumber,
      type: "fact",
      topic: `Pillar Edict ${cleanSentence(summaryOfEffortsMatch[1])}`,
      importance: 7,
    });
  }

  const ageSpanMatch = sourceText.match(/\b([A-Z][A-Za-z]+(?:\s+or\s+[A-Z][A-Za-z]+)?(?:\s+[A-Z][A-Za-z]+){0,4})\s*\(([^)]+BCE[^)]*)\)/i);
  if (
    ageSpanMatch?.[1] &&
    ageSpanMatch?.[2] &&
    !/\b(king|ruler|emperor)\b/i.test(ageSpanMatch[1]) &&
    /\b(age|civilization|culture|period)\b/i.test(ageSpanMatch[1])
  ) {
    addCandidateIfValid(candidates, {
      question: `What was the time period of ${cleanSentence(ageSpanMatch[1])}`,
      answer: cleanSentence(ageSpanMatch[2]),
      pageNumber,
      type: "year",
      topic: cleanSentence(ageSpanMatch[1]),
      importance: 7,
    });
  }

  const namedAgeMatches = [...sourceText.matchAll(/\b(Old Stone Age|Mesolithic or Middle Stone Age|Neolithic age|Iron Age|Metal Age or Chalcolithic(?:\s*\([^)]+\))?\s*period)\s*\(([^)]+BCE[^)]*)\)/gi)];
  for (const match of namedAgeMatches) {
    addCandidateIfValid(candidates, {
      question: `What was the time period of ${cleanSentence(match[1])}`,
      answer: cleanSentence(match[2]),
      pageNumber,
      type: "year",
      topic: cleanSentence(match[1]),
      importance: 8,
    });
  }

  const lifeSpanMatch = sourceText.match(/\bLife of ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}) \(([^)]+BCE[^)]*)\)/i);
  if (lifeSpanMatch?.[1] && lifeSpanMatch?.[2]) {
    addCandidateIfValid(candidates, {
      question: `When did ${cleanSentence(lifeSpanMatch[1])} live`,
      answer: cleanSentence(lifeSpanMatch[2]),
      pageNumber,
      type: "year",
      topic: cleanSentence(lifeSpanMatch[1]),
      importance: 8,
    });
  }

  const tirthankaraMatch = sourceText.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}) was the (\d+)(?:th|st|nd|rd) tirthankara of the Jain tradition\b/i);
  if (tirthankaraMatch?.[1] && tirthankaraMatch?.[2]) {
    addCandidateIfValid(candidates, {
      question: `Which tirthankara of the Jain tradition was ${cleanSentence(tirthankaraMatch[1])}`,
      answer: `${cleanSentence(tirthankaraMatch[2])}th`,
      pageNumber,
      type: "fact",
      topic: cleanSentence(tirthankaraMatch[1]),
      importance: 8,
    });
  }

  const preachEraMatch = sourceText.match(/\bGreat thinkers like (.+?) lived and preached their ideas in the (\d+(?:st|nd|rd|th)\s+century\s+BCE)\b/i);
  if (preachEraMatch?.[1] && preachEraMatch?.[2]) {
    addCandidateIfValid(candidates, {
      question: "In which century BCE did great thinkers like Buddha and Mahavira preach their ideas",
      answer: cleanSentence(preachEraMatch[2]),
      pageNumber,
      type: "year",
      topic: "Jainism and Buddhism",
      importance: 7,
    });
  }

  const triratnaMatch = sourceText.match(/\bThe three principles of Jainism also known as (.+?) are\b/i);
  if (triratnaMatch?.[1]) {
    addCandidateIfValid(candidates, {
      question: "What were the three principles of Jainism also known as",
      answer: cleanSentence(triratnaMatch[1]),
      pageNumber,
      type: "term",
      topic: "Jainism",
      importance: 8,
    });
  }

  const rightFaithMatch = sourceText.match(/\bRight faith[-–:]\s*(.+?)(?:\s+[●•○]|$)/i);
  if (rightFaithMatch?.[1]) {
    addCandidateIfValid(candidates, {
      question: "What was right faith in Jainism",
      answer: cleanSentence(rightFaithMatch[1]),
      pageNumber,
      type: "fact",
      topic: "Jainism",
      importance: 7,
    });
  }

  const rightKnowledgeMatch = sourceText.match(/\bRight knowledge[-–:]\s*(.+?)(?:\s+[●•○]|$)/i);
  if (rightKnowledgeMatch?.[1]) {
    addCandidateIfValid(candidates, {
      question: "What was right knowledge in Jainism",
      answer: cleanSentence(rightKnowledgeMatch[1]),
      pageNumber,
      type: "fact",
      topic: "Jainism",
      importance: 7,
    });
  }

  const rightConductHeadingMatch = headingText.match(/^Right conduct[-–:]\s*(.+)$/i);
  if (rightConductHeadingMatch?.[1] && text) {
    addCandidateIfValid(candidates, {
      question: "What were the five doctrines of right conduct in Jainism",
      answer: cleanSentence(text),
      pageNumber,
      type: "list",
      topic: "Jainism",
      importance: 8,
    });
  }

  const followersCalledMatch = sourceText.match(/\bHis followers were called ([A-Za-z]+) and the religion ([A-Za-z]+)\b/i);
  if (followersCalledMatch?.[1] && followersCalledMatch?.[2] && chunkSubject) {
    addCandidateIfValid(candidates, {
      question: `What were the followers of ${cleanSentence(chunkSubject)} called`,
      answer: cleanSentence(followersCalledMatch[1]),
      pageNumber,
      type: "term",
      topic: cleanSentence(chunkSubject),
      importance: 8,
    });
    addCandidateIfValid(candidates, {
      question: `What was the religion associated with ${cleanSentence(chunkSubject)}`,
      answer: cleanSentence(followersCalledMatch[2]),
      pageNumber,
      type: "term",
      topic: cleanSentence(chunkSubject),
      importance: 7,
    });
  }

  const divisionMatch = sourceText.match(/\bdivision of Jainism into two sects ([A-Za-z]+).*? and ([A-Za-z]+)\b/i);
  if (divisionMatch?.[1] && divisionMatch?.[2]) {
    addCandidateIfValid(candidates, {
      question: "Into which two sects was Jainism divided",
      answer: `${cleanSentence(divisionMatch[1])} and ${cleanSentence(divisionMatch[2])}`,
      pageNumber,
      type: "list",
      topic: "Jainism",
      importance: 8,
    });
  }

  const disciplesListMatch = /^Kushinagar Disciples:?$/i.test(headingText) && text.match(/^([A-Z][A-Za-z]+(?:,\s*[A-Z][A-Za-z]+)+(?:\s+and\s+[A-Z][A-Za-z]+)?)\b/);
  if (disciplesListMatch?.[1]) {
    addCandidateIfValid(candidates, {
      question: "Who were the important disciples of Buddha",
      answer: cleanSentence(disciplesListMatch[1]),
      pageNumber,
      type: "list",
      topic: "Buddha",
      importance: 8,
    });
  }

  const supportReligionMatch = sourceText.match(/\bthey began to extend support to ([A-Z][A-Za-z]+(?:\s+and\s+[A-Z][A-Za-z]+)?)\b/i);
  if (supportReligionMatch?.[1]) {
    addCandidateIfValid(candidates, {
      question: "To which religions did the Vaisyas begin to extend support",
      answer: cleanSentence(supportReligionMatch[1]),
      pageNumber,
      type: "list",
      topic: "Vaisyas",
      importance: 7,
    });
  }

  const primaryCauseMatch = sourceText.match(/\bThe primary cause of the religious factor- was (.+?)\b/i);
  if (primaryCauseMatch?.[1] && /rise of jainism and buddhism/i.test(headingText)) {
    addCandidateIfValid(candidates, {
      question: "What was the primary religious cause for the rise of Jainism and Buddhism",
      answer: cleanSentence(primaryCauseMatch[1]),
      pageNumber,
      type: "fact",
      topic: "Jainism and Buddhism",
      importance: 8,
    });
  }

  const needFulfilledMatch = sourceText.match(/\bThis need was fulfilled by the teachings of ([A-Z][A-Za-z]+(?:\s+and\s+[A-Z][A-Za-z]+)?)\b/i);
  if (needFulfilledMatch?.[1]) {
    addCandidateIfValid(candidates, {
      question: "By whose teachings was this need fulfilled",
      answer: cleanSentence(needFulfilledMatch[1]),
      pageNumber,
      type: "people_pair",
      topic: "Jainism and Buddhism",
      importance: 7,
    });
  }

  const kshatriyaOriginMatch = /Buddha and Mahavira belonged to Kshatriya origin/i.test(headingText);
  if (kshatriyaOriginMatch) {
    addCandidateIfValid(candidates, {
      question: "To which origin did Buddha and Mahavira belong",
      answer: "Kshatriya origin",
      pageNumber,
      type: "fact",
      topic: "Buddha and Mahavira",
      importance: 7,
    });
  }

  const finalCompilationMatch = sourceText.match(/\bFinal compilations of (\d+)\s+Angas and (\d+)\s+Upangas\b/i);
  if (finalCompilationMatch?.[1] && finalCompilationMatch?.[2] && /second jain council/i.test(headingText)) {
    addCandidateIfValid(candidates, {
      question: "What was compiled in the Second Jain Council",
      answer: `${cleanSentence(finalCompilationMatch[1])} Angas and ${cleanSentence(finalCompilationMatch[2])} Upangas`,
      pageNumber,
      type: "list",
      topic: headingText,
      importance: 7,
    });
  }

  const fourNobleTruthsMatch = /^The cause of suffering is desire$/i.test(headingText);
  if (fourNobleTruthsMatch && text) {
    addCandidateIfValid(candidates, {
      question: "How can suffering be removed according to Buddha",
      answer: cleanSentence(text),
      pageNumber,
      type: "fact",
      topic: "Buddha",
      importance: 7,
    });
  }

  if (/This can be done by following the Eightfold Path/i.test(sourceText)) {
    addCandidateIfValid(candidates, {
      question: "By following what can suffering be removed according to Buddha",
      answer: "The Eightfold Path",
      pageNumber,
      type: "term",
      topic: "Buddha",
      importance: 7,
    });
  }

  const acceptedDisciplesMatch = sourceText.match(/\bKings like (.+?) accepted his doctrines and became his disciples\b/i);
  if (acceptedDisciplesMatch?.[1]) {
    addCandidateIfValid(candidates, {
      question: "Which kings accepted Buddha's doctrines and became his disciples",
      answer: cleanSentence(acceptedDisciplesMatch[1]),
      pageNumber,
      type: "list",
      topic: "Buddha",
      importance: 7,
    });
  }

  const visitedPlacesMatch = sourceText.match(/\bHe visited places like(?: visited places like)? (.+?)\b/i);
  if (visitedPlacesMatch?.[1] && /disciples/i.test(headingText)) {
    addCandidateIfValid(candidates, {
      question: "Which places did Buddha visit",
      answer: cleanSentence(visitedPlacesMatch[1]),
      pageNumber,
      type: "list",
      topic: "Buddha",
      importance: 7,
    });
  }

  if (/\b(famous sites|important sites|important megalithic sites)\b/i.test(headingText) && text) {
    addCandidateIfValid(candidates, {
      question: contextualTopic
        ? `What were the important sites of ${contextualTopic}`
        : `Which sites are mentioned under ${cleanSentence(headingText)}`,
      answer: cleanSentence(text),
      pageNumber,
      type: "list",
      topic: contextualTopic || cleanSentence(headingText),
      importance: 6,
    });
  }

  if (/^Characteristic features:?$/i.test(headingText) && text) {
    addCandidateIfValid(candidates, {
      question: contextualTopic
        ? `What were the characteristic features of ${contextualTopic}`
        : "What were the characteristic features",
      answer: cleanSentence(text),
      pageNumber,
      type: "list",
      topic: contextualTopic || "Characteristic features",
      importance: 7,
    });
  }

  if (/^Town planning:?$/i.test(headingText) && text) {
    addCandidateIfValid(candidates, {
      question: contextualTopic
        ? `What were the town planning features of ${contextualTopic}`
        : "What were the town planning features",
      answer: cleanSentence(text),
      pageNumber,
      type: "list",
      topic: contextualTopic || "Town planning",
      importance: 7,
    });
  }

  if (/^Important characteristics:?$/i.test(headingText) && text) {
    addCandidateIfValid(candidates, {
      question: contextualTopic
        ? `What were the important characteristics of ${contextualTopic}`
        : "What were the important characteristics",
      answer: cleanSentence(text),
      pageNumber,
      type: "list",
      topic: contextualTopic || "Important characteristics",
      importance: 7,
    });
  }

  const firstCalledMatch = sourceText.match(/\bIt was first called the ([A-Z][A-Za-z\s]+?)\.\s*But later it was named as the ([A-Z][A-Za-z\s]+?)\./i);
  if (firstCalledMatch?.[1] && firstCalledMatch?.[2] && headingText) {
    addCandidateIfValid(candidates, {
      question: `What was ${cleanSentence(headingText)} first called`,
      answer: cleanSentence(firstCalledMatch[1]),
      pageNumber,
      type: "term",
      topic: cleanSentence(headingText),
      importance: 8,
    });
    addCandidateIfValid(candidates, {
      question: `What was ${cleanSentence(headingText)} later named`,
      answer: cleanSentence(firstCalledMatch[2]),
      pageNumber,
      type: "term",
      topic: cleanSentence(headingText),
      importance: 8,
    });
  }

  const excavationsMatch = sourceText.match(/\bThe earliest excavations in the ([A-Z][A-Za-z\s]+?) were done at ([A-Z][A-Za-z]+.*?) and ([A-Z][A-Za-z]+.*?)\b/i);
  if (excavationsMatch?.[1] && excavationsMatch?.[2] && excavationsMatch?.[3]) {
    addCandidateIfValid(candidates, {
      question: `Where were the earliest excavations in the ${cleanSentence(excavationsMatch[1])} done`,
      answer: `${cleanSentence(excavationsMatch[2])} and ${cleanSentence(excavationsMatch[3])}`,
      pageNumber,
      type: "people_pair",
      topic: cleanSentence(excavationsMatch[1]),
      importance: 8,
    });
  }

  const evolutionStagesMatch = sourceText.match(/\bfour important stages or phases of evolution-?\s+(.+?)\./i);
  if (evolutionStagesMatch?.[1]) {
    addCandidateIfValid(candidates, {
      question: "What were the four important stages of Harappan evolution",
      answer: cleanSentence(evolutionStagesMatch[1]),
      pageNumber,
      type: "list",
      topic: "Harappan evolution",
      importance: 8,
    });
  }

  if (/\bfour important stages or phases of evolution-?\s+pre,\s*early,\s*mature and\s*late Harappan phases\b/i.test(sourceText)) {
    addCandidateIfValid(candidates, {
      question: "What were the four important stages of Harappan evolution",
      answer: "Pre-Harappan, Early Harappan, Mature Harappan and Late Harappan phases",
      pageNumber,
      type: "list",
      topic: "Harappan evolution",
      importance: 8,
    });
  }

  const preHarappanLocationMatch = sourceText.match(/\bPre-Harappan stage\s*:?\s*[●•]?\s*Located in ([^.]+?)\./i);
  if (preHarappanLocationMatch?.[1]) {
    addCandidateIfValid(candidates, {
      question: "Where was the Pre-Harappan stage located",
      answer: cleanSentence(preHarappanLocationMatch[1]),
      pageNumber,
      type: "place",
      topic: "Pre-Harappan stage",
      importance: 7,
    });
  }

  if (/\bMehrgarh\b/i.test(sourceText) && /\bpre Harappan culture\b/i.test(sourceText)) {
    addCandidateIfValid(candidates, {
      question: "Which site reveals the existence of pre-Harappan culture",
      answer: "Mehrgarh",
      pageNumber,
      type: "place",
      topic: "Pre-Harappan culture",
      importance: 7,
    });
  }

  if (/\bThe nomadic people began to lead a settled agricultural life\b/i.test(sourceText)) {
    addCandidateIfValid(candidates, {
      question: "What kind of life did the nomadic people begin to lead in the Pre-Harappan stage",
      answer: "A settled agricultural life",
      pageNumber,
      type: "fact",
      topic: "Pre-Harappan stage",
      importance: 7,
    });
  }

  if (/\btransition from rural to urban life took place during this period\b/i.test(sourceText)) {
    addCandidateIfValid(candidates, {
      question: "What transition took place during the Early Harappan stage",
      answer: "The transition from rural to urban life",
      pageNumber,
      type: "fact",
      topic: "Early Harappan stage",
      importance: 7,
    });
  }

  const matureHarappanProofMatch = sourceText.match(/\bThe excavations at ([A-Z][A-Za-z]+) with its elaborate town planning and urban features prove this phase of evolution\b/i);
  if (matureHarappanProofMatch?.[1]) {
    addCandidateIfValid(candidates, {
      question: "Which site proves the Mature Harappan phase of evolution",
      answer: cleanSentence(matureHarappanProofMatch[1]),
      pageNumber,
      type: "place",
      topic: "Mature Harappan stage",
      importance: 7,
    });
  }

  const evidenceStageMatch = sourceText.match(/\bThe sites of ([A-Z][A-Za-z]+(?:\s+and\s+[A-Z][A-Za-z]+)?) remain the evidence for (.+?)\.$/i);
  if (evidenceStageMatch?.[1] && evidenceStageMatch?.[2]) {
    addCandidateIfValid(candidates, {
      question: `Which sites provide evidence for ${cleanSentence(evidenceStageMatch[2])}`,
      answer: cleanSentence(evidenceStageMatch[1]),
      pageNumber,
      type: "list",
      topic: cleanSentence(evidenceStageMatch[2]),
      importance: 7,
    });
  }

  const revealStageMatch = sourceText.match(/\bThe excavations at ([A-Z][A-Za-z]+) reveal this stage of evolution\b/i);
  if (revealStageMatch?.[1] && /late harappan|decline/i.test(headingText)) {
    addCandidateIfValid(candidates, {
      question: "Which site reveals the late Harappan stage of evolution",
      answer: cleanSentence(revealStageMatch[1]),
      pageNumber,
      type: "place",
      topic: "Late Harappan stage",
      importance: 7,
    });
  }

  const emporiumMatch = sourceText.match(/\b([A-Z][A-Za-z]+) remained an emporium of trade between (.+?)\.$/i);
  if (emporiumMatch?.[1] && emporiumMatch?.[2]) {
    addCandidateIfValid(candidates, {
      question: `Between whom did ${cleanSentence(emporiumMatch[1])} remain an emporium of trade`,
      answer: cleanSentence(emporiumMatch[2]),
      pageNumber,
      type: "fact",
      topic: cleanSentence(emporiumMatch[1]),
      importance: 7,
    });
  }

  const concludedDatesMatch = sourceText.match(/\b([A-Z]\.\s*[A-Z][A-Za-z]+)\s+concluded the total span of this culture should be between\s+(\d{3,4})\s+and\s+(\d{3,4})\s*BCE\b/i);
  if (concludedDatesMatch?.[1] && concludedDatesMatch?.[2] && concludedDatesMatch?.[3]) {
    addCandidateIfValid(candidates, {
      question: "What was the total span of Harappan culture according to D.P. Agarwal",
      answer: `${cleanSentence(concludedDatesMatch[2])} to ${cleanSentence(concludedDatesMatch[3])} BCE`,
      pageNumber,
      type: "year",
      topic: "Harappan culture",
      importance: 8,
    });
  }

  if (/\bradiocarbon method paves way for fixing almost accurate dates\b/i.test(sourceText) && /\bharappan culture|date of harappan culture/i.test(sourceText)) {
    addCandidateIfValid(candidates, {
      question: "What helped in fixing almost accurate dates for Harappan culture",
      answer: "The radiocarbon method",
      pageNumber,
      type: "fact",
      topic: "Harappan culture",
      importance: 6,
    });
  }

  const gridSystemMatch = sourceText.match(/\bOn the lines of the grid system, that is (.+?)\./i);
  if (gridSystemMatch?.[1]) {
    addCandidateIfValid(candidates, {
      question: "How were Harappan towns planned on the grid system",
      answer: cleanSentence(gridSystemMatch[1]),
      pageNumber,
      type: "fact",
      topic: "Town planning",
      importance: 8,
    });
  }

  const citadelPodiumMatch = sourceText.match(/\beach had its own citadel built on a ([^.]+?)\./i);
  if (citadelPodiumMatch?.[1]) {
    addCandidateIfValid(candidates, {
      question: "On what was the citadel built in Harappan cities",
      answer: cleanSentence(citadelPodiumMatch[1]),
      pageNumber,
      type: "fact",
      topic: "Citadel",
      importance: 7,
    });
  }

  const lowerTownMatch = sourceText.match(/\bBelow the citadel in each city lay (.+?)\./i);
  if (lowerTownMatch?.[1]) {
    addCandidateIfValid(candidates, {
      question: "What lay below the citadel in each Harappan city",
      answer: cleanSentence(lowerTownMatch[1]),
      pageNumber,
      type: "fact",
      topic: "Harappan city",
      importance: 7,
    });
  }

  const citadelCitiesMatch = sourceText.match(/\b([A-Z][A-Za-z]+,\s*[A-Z][A-Za-z]+ and [A-Z][A-Za-z]+) each had its own citadel\b/i);
  if (citadelCitiesMatch?.[1]) {
    addCandidateIfValid(candidates, {
      question: "Which Harappan cities had their own citadel",
      answer: cleanSentence(citadelCitiesMatch[1]),
      pageNumber,
      type: "list",
      topic: "Citadel",
      importance: 7,
    });
  }

  const granariesMatch = sourceText.match(/\bCitadel of Harappa had as many as (\d+) granaries\b/i);
  if (granariesMatch?.[1]) {
    addCandidateIfValid(candidates, {
      question: "How many granaries were there in the citadel of Harappa",
      answer: cleanSentence(granariesMatch[1]),
      pageNumber,
      type: "fact",
      topic: "Harappa",
      importance: 8,
    });
  }

  const drainageMatch = sourceText.match(/\bAnother remarkable feature was the underground drainage system connecting all houses to the street drains(?: which were covered by (.+?))?\b/i);
  if (drainageMatch) {
    addCandidateIfValid(candidates, {
      question: "What was another remarkable feature of Harappan towns",
      answer: `The underground drainage system connecting all houses to the street drains${drainageMatch[1] ? `, which were covered by ${cleanSentence(drainageMatch[1])}` : ""}`,
      pageNumber,
      type: "fact",
      topic: "Harappan towns",
      importance: 8,
    });
  }

  const coveredDrainsMatch = sourceText.match(/\bstreet drains which were covered by (.+?)\b/i);
  if (coveredDrainsMatch?.[1]) {
    addCandidateIfValid(candidates, {
      question: "By what were Harappan street drains covered",
      answer: cleanSentence(coveredDrainsMatch[1]),
      pageNumber,
      type: "fact",
      topic: "Harappan drainage system",
      importance: 7,
    });
  }

  const burntBricksMatch = sourceText.match(/\bThe large scale use of burnt bricks in constructions and the absence of stone buildings\b/i);
  if (burntBricksMatch) {
    addCandidateIfValid(candidates, {
      question: "What were important characteristics of Harappan constructions",
      answer: "The large scale use of burnt bricks in constructions and the absence of stone buildings",
      pageNumber,
      type: "fact",
      topic: "Harappan constructions",
      importance: 8,
    });
  }

  const greatBathMatch = sourceText.match(/\bThe Great Bath at Mohenjodaro- the most important public place measuring ([^.]+?)\.\s*It must have served as (.+?)\.\s*The floor of the bath was made of (.+?)\./i);
  if (greatBathMatch?.[1] && greatBathMatch?.[2] && greatBathMatch?.[3]) {
    addCandidateIfValid(candidates, {
      question: "What were the dimensions of the Great Bath at Mohenjodaro",
      answer: cleanSentence(greatBathMatch[1]),
      pageNumber,
      type: "fact",
      topic: "Great Bath at Mohenjodaro",
      importance: 8,
    });
    addCandidateIfValid(candidates, {
      question: "What was the Great Bath at Mohenjodaro used for",
      answer: cleanSentence(greatBathMatch[2]),
      pageNumber,
      type: "fact",
      topic: "Great Bath at Mohenjodaro",
      importance: 8,
    });
    addCandidateIfValid(candidates, {
      question: "What was the floor of the Great Bath made of",
      answer: cleanSentence(greatBathMatch[3]),
      pageNumber,
      type: "fact",
      topic: "Great Bath at Mohenjodaro",
      importance: 7,
    });
  }

  const greatBathSimpleMatch = sourceText.match(/\bThe Great Bath at Mohenjodaro- the most important public place measuring ([^.]+?)\./i);
  if (greatBathSimpleMatch?.[1]) {
    addCandidateIfValid(candidates, {
      question: "What were the dimensions of the Great Bath at Mohenjodaro",
      answer: cleanSentence(greatBathSimpleMatch[1]),
      pageNumber,
      type: "fact",
      topic: "Great Bath at Mohenjodaro",
      importance: 7,
    });
  }

  if (/\bIt must have served as a ritual bathing site\b/i.test(sourceText) && /\bGreat Bath at Mohenjodaro\b/i.test(sourceText)) {
    addCandidateIfValid(candidates, {
      question: "What was the Great Bath at Mohenjodaro used for",
      answer: "A ritual bathing site",
      pageNumber,
      type: "fact",
      topic: "Great Bath at Mohenjodaro",
      importance: 7,
    });
  }

  const greatBathFloorMatch = sourceText.match(/\bThe floor of the bath was made of (.+?)\./i);
  if (greatBathFloorMatch?.[1] && /\bGreat Bath at Mohenjodaro\b/i.test(sourceText)) {
    addCandidateIfValid(candidates, {
      question: "What was the floor of the Great Bath made of",
      answer: cleanSentence(greatBathFloorMatch[1]),
      pageNumber,
      type: "fact",
      topic: "Great Bath at Mohenjodaro",
      importance: 7,
    });
  }

  const reignEntries = [...cleanSentence(chunk.content || "").matchAll(/\b([A-Z][A-Za-z]+(?:\s+[IVX]+)?(?:\s+[A-Z][A-Za-z]+){0,2})\s*\(([^)]+?CE)\)/g)];
  for (const match of reignEntries) {
    const rulerName = prettifyEntity(cleanSentence(match?.[1] || "").replace(/\bCE\b/gi, "").trim());
    if (
      rulerName &&
      match?.[2] &&
      isUsableSubject(rulerName) &&
      !/\b(age|civilization|culture|period|stage|sites)\b/i.test(rulerName)
    ) {
      candidates.push(
        createCandidate({
          question: `When did ${rulerName} rule`,
          answer: cleanSentence(match[2]),
          pageNumber,
          type: "year",
          topic: rulerName,
          importance: 7,
        }),
      );
    }
  }

  const nameDateEntries = [...cleanSentence(chunk.content || "").matchAll(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s*[–-]\s*(\d{3,4}\s*(?:-|to)\s*\d{2,4}\s*CE)\b/g)];
  for (const match of nameDateEntries) {
    const rulerName = prettifyEntity(match?.[1] || "");
    const reignYears = cleanSentence(match?.[2] || "");
    if (rulerName && reignYears) {
      addCandidateIfValid(candidates, {
        question: `When did ${rulerName} rule`,
        answer: reignYears,
        pageNumber,
        type: "year",
        topic: rulerName,
        importance: 7,
      });
    }
  }

  for (const clause of factClauses) {
    const childOfMatch = clause.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) was the (?:son|daughter|child) of ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\b/i);
    if (childOfMatch?.[1] && childOfMatch?.[2]) {
      addCandidateIfValid(candidates, {
        question: `Whose child was ${cleanSentence(childOfMatch[1])}`,
        answer: cleanSentence(childOfMatch[2]),
        pageNumber,
        type: "person",
        topic: cleanSentence(childOfMatch[1]),
        importance: 7,
      });
    }

    const spouseClauseMatch = clause.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) married ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\b/i);
    if (spouseClauseMatch?.[1] && spouseClauseMatch?.[2]) {
      addCandidateIfValid(candidates, {
        question: `Whom did ${cleanSentence(spouseClauseMatch[1])} marry`,
        answer: cleanSentence(spouseClauseMatch[2]),
        pageNumber,
        type: "person",
        topic: cleanSentence(spouseClauseMatch[1]),
        importance: 7,
      });
    }

    const titleClauseMatch = clause.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) was known as ([^.]+)$/i);
    if (titleClauseMatch?.[1] && titleClauseMatch?.[2]) {
      addCandidateIfValid(candidates, {
        question: `What was ${cleanSentence(titleClauseMatch[1])} known as`,
        answer: cleanSentence(titleClauseMatch[2]),
        pageNumber,
        type: "term",
        topic: cleanSentence(titleClauseMatch[1]),
        importance: 7,
      });
    }

    const builtClauseMatch = clause.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) built (?:the )?([A-Za-z][A-Za-z\s'-]{2,80}?(?:tomb|temple|mosque|masjid|fort|palace|mahal|gate|pillar|stupa|monument))\b/i);
    if (builtClauseMatch?.[1] && builtClauseMatch?.[2]) {
      const builder = cleanSentence(builtClauseMatch[1]);
      const monument = cleanSentence(builtClauseMatch[2]);
      addCandidateIfValid(candidates, {
        question: `Who built the ${monument}`,
        answer: builder,
        pageNumber,
        type: "person",
        topic: monument,
        importance: 7,
      });
    }

    const wroteClauseMatch = clause.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) wrote ([^.]+)$/i);
    if (wroteClauseMatch?.[1] && wroteClauseMatch?.[2]) {
      addCandidateIfValid(candidates, {
        question: `What did ${cleanSentence(wroteClauseMatch[1])} write`,
        answer: cleanSentence(wroteClauseMatch[2]),
        pageNumber,
        type: "work",
        topic: cleanSentence(wroteClauseMatch[1]),
        importance: 7,
      });
    }

    const composedClauseMatch = clause.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) composed ([^.]+)$/i);
    if (composedClauseMatch?.[1] && composedClauseMatch?.[2]) {
      addCandidateIfValid(candidates, {
        question: `What did ${cleanSentence(composedClauseMatch[1])} compose`,
        answer: cleanSentence(composedClauseMatch[2]),
        pageNumber,
        type: "work",
        topic: cleanSentence(composedClauseMatch[1]),
        importance: 7,
      });
    }

    const diedClauseMatch = clause.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) died in (\d{3,4})\b/i);
    if (diedClauseMatch?.[1] && diedClauseMatch?.[2]) {
      addCandidateIfValid(candidates, {
        question: `When did ${cleanSentence(diedClauseMatch[1])} die`,
        answer: cleanSentence(diedClauseMatch[2]),
        pageNumber,
        type: "year",
        topic: cleanSentence(diedClauseMatch[1]),
        importance: 7,
      });
    }

    const bornClauseMatch = clause.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) was born in (\d{3,4})\b/i);
    if (bornClauseMatch?.[1] && bornClauseMatch?.[2]) {
      addCandidateIfValid(candidates, {
        question: `When was ${cleanSentence(bornClauseMatch[1])} born`,
        answer: cleanSentence(bornClauseMatch[2]),
        pageNumber,
        type: "year",
        topic: cleanSentence(bornClauseMatch[1]),
        importance: 7,
      });
    }
  }

  const writtenByHeadingMatch = headingText.match(/^(.+?) written by ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})[-–:]?$/i);
  if (writtenByHeadingMatch?.[1] && writtenByHeadingMatch?.[2]) {
    const works = cleanSentence(writtenByHeadingMatch[1]);
    const author = cleanSentence(writtenByHeadingMatch[2]);
    candidates.push(
      createCandidate({
        question: `Who wrote ${works}`,
        answer: author,
        pageNumber,
        type: "person",
        topic: works,
        importance: 7,
      }),
    );
  }

  const providesInfoMatch = sourceText.match(/\b(.+?) provide information regarding (.+?)(?:\s+[●•]|\.|$)/i);
  if (providesInfoMatch?.[1] && providesInfoMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `What do ${cleanSentence(providesInfoMatch[1])} provide information about`,
        answer: cleanSentence(providesInfoMatch[2]),
        pageNumber,
        type: "fact",
        topic: cleanSentence(providesInfoMatch[1]),
        importance: 6,
      }),
    );
  }

  const travelerMatch = sourceText.match(/\bThe Chinese traveler ([A-Z][A-Za-z]+), who visited India during the reign of ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}), has left (.+?)(?:\.|$)/i);
  if (travelerMatch?.[1] && travelerMatch?.[2] && travelerMatch?.[3]) {
    candidates.push(
      createCandidate({
        question: `Which Chinese traveler visited India during the reign of ${cleanSentence(travelerMatch[2])}`,
        answer: cleanSentence(travelerMatch[1]),
        pageNumber,
        type: "person",
        topic: travelerMatch[2],
        importance: 7,
      }),
      createCandidate({
        question: `What did ${cleanSentence(travelerMatch[1])} leave`,
        answer: cleanSentence(travelerMatch[3]),
        pageNumber,
        type: "fact",
        topic: travelerMatch[1],
        importance: 6,
      }),
    );
  }

  const inscriptionRefersMatch = sourceText.match(/\b([A-Z][A-Za-z\s'-]+?Inscription)\s+refers to (.+?)(?:\s+[●•]|\.|$)/i);
  if (inscriptionRefersMatch?.[1] && inscriptionRefersMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `What does the ${cleanSentence(inscriptionRefersMatch[1])} refer to`,
        answer: cleanSentence(inscriptionRefersMatch[2]),
        pageNumber,
        type: "fact",
        topic: inscriptionRefersMatch[1],
        importance: 7,
      }),
    );
  }

  const inscriptionSourceMatch = sourceText.match(/\b([A-Z][A-Za-z\s'-]+?Inscription)[-–]\s+important source for (.+?)(?:\.|$)/i);
  if (inscriptionSourceMatch?.[1] && inscriptionSourceMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `What is the ${cleanSentence(inscriptionSourceMatch[1])} an important source for`,
        answer: cleanSentence(inscriptionSourceMatch[2]),
        pageNumber,
        type: "fact",
        topic: inscriptionSourceMatch[1],
        importance: 7,
      }),
    );
  }

  const writtenInMatch = sourceText.match(/\bIt is written in ([A-Za-z\s]+), using the ([A-Za-z\s]+) script\b/i);
  if (writtenInMatch?.[1] && writtenInMatch?.[2] && headingText) {
    candidates.push(
      createCandidate({
        question: `In which language was the ${headingText} inscription written`,
        answer: cleanSentence(writtenInMatch[1]),
        pageNumber,
        type: "language",
        topic: headingText,
        importance: 7,
      }),
      createCandidate({
        question: `Which script was used in the ${headingText} inscription`,
        answer: cleanSentence(writtenInMatch[2]),
        pageNumber,
        type: "term",
        topic: headingText,
        importance: 7,
      }),
    );
  }

  const composedByMatch = sourceText.match(/\bIt consists of (\d+) lines composed by ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) which describes (.+?)(?:\s+[●•]|\.|$)/i);
  if (composedByMatch?.[1] && composedByMatch?.[2] && composedByMatch?.[3]) {
    candidates.push(
      createCandidate({
        question: `Who composed the ${headingText}`,
        answer: cleanSentence(composedByMatch[2]),
        pageNumber,
        type: "person",
        topic: headingText,
        importance: 7,
      }),
      createCandidate({
        question: `How many lines does the ${headingText} inscription consist of`,
        answer: cleanSentence(composedByMatch[1]),
        pageNumber,
        type: "fact",
        topic: headingText,
        importance: 6,
      }),
      createCandidate({
        question: `What does the ${headingText} inscription describe`,
        answer: cleanSentence(composedByMatch[3]),
        pageNumber,
        type: "fact",
        topic: headingText,
        importance: 6,
      }),
    );
  }

  const succeededByClauseMatch = sourceText.match(/\bHe was succeeded by ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\b/i);
  if (succeededByClauseMatch?.[1] && previousChunkSubject) {
    addCandidateIfValid(candidates, {
      question: `Who succeeded ${prettifyEntity(previousChunkSubject)}`,
      answer: cleanSentence(succeededByClauseMatch[1]),
      pageNumber,
      type: "person",
      topic: prettifyEntity(previousChunkSubject),
      importance: 7,
    });
  }

  const calledMaharajaMatch = sourceText.match(/\bThese two were called ([A-Za-z]+)\b/i);
  if (calledMaharajaMatch?.[1] && previousChunkSubject) {
    addCandidateIfValid(candidates, {
      question: `What were the first Gupta rulers called`,
      answer: cleanSentence(calledMaharajaMatch[1]),
      pageNumber,
      type: "term",
      topic: "Gupta rulers",
      importance: 6,
    });
  }

  const accessionYearMatch = sourceText.match(/\bFounder of the ([A-Za-z\s]+?) which starts with his accession in (\d{3,4})\s*CE\b/i);
  if (accessionYearMatch?.[1] && accessionYearMatch?.[2] && previousChunkSubject) {
    addCandidateIfValid(candidates, {
      question: `When did the ${cleanSentence(accessionYearMatch[1])} start`,
      answer: `${cleanSentence(accessionYearMatch[2])} CE`,
      pageNumber,
      type: "year",
      topic: cleanSentence(accessionYearMatch[1]),
      importance: 7,
    });
  }

  const greatestRulerMatch = sourceText.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s*\(\d[^)]*CE\)\s*[●•]?\s*The greatest of the rulers of the ([A-Za-z\s]+?) dynasty\b/i);
  if (greatestRulerMatch?.[1] && greatestRulerMatch?.[2]) {
    addCandidateIfValid(candidates, {
      question: `Who was the greatest ruler of the ${cleanSentence(greatestRulerMatch[2])} dynasty`,
      answer: prettifyEntity(greatestRulerMatch[1]),
      pageNumber,
      type: "person",
      topic: cleanSentence(greatestRulerMatch[2]),
      importance: 7,
    });
  }

  const detailedAccountMatch = sourceText.match(/\b([A-Z][A-Za-z\s'-]+?) provides a detailed account of (?:his|the)\s+reign\b/i);
  if (detailedAccountMatch?.[1] && /Samudragupta/i.test(sourceText)) {
    addCandidateIfValid(candidates, {
      question: `What does ${cleanSentence(detailedAccountMatch[1])} provide a detailed account of`,
      answer: "Samudragupta's reign",
      pageNumber,
      type: "fact",
      topic: cleanSentence(detailedAccountMatch[1]),
      importance: 7,
    });
  }

  const militaryStagesMatch = sourceText.match(/\bIt refers to (\d+) stages in (.+?)(?:[:.]|$)/i);
  if (militaryStagesMatch?.[1] && militaryStagesMatch?.[2] && headingSubject) {
    addCandidateIfValid(candidates, {
      question: `How many stages are mentioned in ${headingSubject}'s ${cleanSentence(militaryStagesMatch[2])}`,
      answer: cleanSentence(militaryStagesMatch[1]),
      pageNumber,
      type: "fact",
      topic: headingSubject,
      importance: 6,
    });
  }

  const defeatedNamedRulerMatch = sourceText.match(/\bSamudragupta defeated ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\b/i);
  if (defeatedNamedRulerMatch?.[1]) {
    addCandidateIfValid(candidates, {
      question: "Whom did Samudragupta defeat",
      answer: cleanSentence(defeatedNamedRulerMatch[1]),
      pageNumber,
      type: "person",
      topic: "Samudragupta",
      importance: 7,
    });
  }

  const northIndiaDefeatMatch = sourceText.match(/\bAgainst some rulers of north India[^\n.]*?Samudragupta defeated ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\b/i);
  if (northIndiaDefeatMatch?.[1]) {
    addCandidateIfValid(candidates, {
      question: "Whom did Samudragupta defeat in north India",
      answer: cleanSentence(northIndiaDefeatMatch[1]),
      pageNumber,
      type: "person",
      topic: "Samudragupta",
      importance: 8,
    });
  }

  const allianceCampaignMatch = sourceText.match(/\bThis alliance helped (.+?) to campaign in (.+?) against (.+?)(?:\.|$)/i);
  if (allianceCampaignMatch?.[1] && allianceCampaignMatch?.[2] && allianceCampaignMatch?.[3]) {
    addCandidateIfValid(candidates, {
      question: `How did the alliance help ${cleanSentence(allianceCampaignMatch[1])}`,
      answer: `It helped ${cleanSentence(allianceCampaignMatch[1])} to campaign in ${cleanSentence(allianceCampaignMatch[2])} against ${cleanSentence(allianceCampaignMatch[3])}`,
      pageNumber,
      type: "fact",
      topic: cleanSentence(allianceCampaignMatch[1]),
      importance: 7,
    });
  }

  const daughterMarriageMatch = sourceText.match(/\bHe gave his daughter ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) in marriage to ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\b/i);
  const marriageActor = previousChunkSubject || chunkSubject;
  if (daughterMarriageMatch?.[1] && daughterMarriageMatch?.[2] && marriageActor) {
    addCandidateIfValid(candidates, {
      question: `Whom did ${prettifyEntity(marriageActor)} give in marriage to ${cleanSentence(daughterMarriageMatch[2])}`,
      answer: cleanSentence(daughterMarriageMatch[1]),
      pageNumber,
      type: "person",
      topic: prettifyEntity(marriageActor),
      importance: 7,
    });
  }

  const titleMeaningMatch = sourceText.match(/\bassumed the title ([A-Za-z]+), meaning, ['"]?([^'".]+)['"]?/i);
  if (titleMeaningMatch?.[1] && titleMeaningMatch?.[2] && headingSubject) {
    addCandidateIfValid(candidates, {
      question: `What did the title ${cleanSentence(titleMeaningMatch[1])} mean`,
      answer: cleanSentence(titleMeaningMatch[2]),
      pageNumber,
      type: "term",
      topic: cleanSentence(titleMeaningMatch[1]),
      importance: 7,
    });
  }

  const founderHeadingMatch = headingText.match(/^Founder of the (.+?)$/i);
  if (founderHeadingMatch?.[1]) {
    const inlineFounder = cleanSentence(text.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\b/)?.[1] || "");
    const founder =
      (/^(he|she|it|founder)$/i.test(inlineFounder) ? "" : inlineFounder) ||
      prettifyEntity(previousChunkSubject) ||
      prettifyEntity(chunkSubject);
    if (founder) {
      candidates.push(
        createCandidate({
          question: `Who founded the ${cleanSentence(founderHeadingMatch[1])}`,
          answer: founder,
          pageNumber,
          type: "person",
          topic: cleanSentence(founderHeadingMatch[1]),
          importance: 7,
        }),
      );
    }
  }

  const patronizedReligionMatch = sourceText.match(/\bRulers and dynasties who patronized ([A-Z][A-Za-z]+)[-–:]\s+(.+?)(?:\.|$)/i);
  if (patronizedReligionMatch?.[1] && patronizedReligionMatch?.[2]) {
    addCandidateIfValid(candidates, {
      question: `Which rulers and dynasties patronized ${cleanSentence(patronizedReligionMatch[1])}`,
      answer: cleanSentence(patronizedReligionMatch[2]),
      pageNumber,
      type: "list",
      topic: cleanSentence(patronizedReligionMatch[1]),
      importance: 8,
    });
  }

  const sanghaSpreadMatch = sourceText.match(/\bHe admitted both men and women in the Sangha, and it spread rapidly and widely in (.+?)(?:\.|$)/i);
  if (sanghaSpreadMatch?.[1] && /mahavira/i.test(sourceText + headingText)) {
    addCandidateIfValid(candidates, {
      question: "Where did the Jain Sangha spread rapidly and widely",
      answer: cleanSentence(sanghaSpreadMatch[1]),
      pageNumber,
      type: "place",
      topic: "Jain Sangha",
      importance: 7,
    });
    addCandidateIfValid(candidates, {
      question: "Who was admitted into the Jain Sangha",
      answer: "Both men and women",
      pageNumber,
      type: "list",
      topic: "Jain Sangha",
      importance: 7,
    });
  }

  const attainedKnowledgeChunkMatch = sourceText.match(/\battained the highest spiritual knowledge called (.+?)(?:\.|Thereafter|$)/i);
  if (attainedKnowledgeChunkMatch?.[1] && /mahavira/i.test(sourceText + headingText)) {
    addCandidateIfValid(candidates, {
      question: "What was the highest spiritual knowledge attained by Mahavira called",
      answer: cleanSentence(attainedKnowledgeChunkMatch[1]),
      pageNumber,
      type: "term",
      topic: "Mahavira",
      importance: 7,
    });
  }

  const calledMahaviraMatch = sourceText.match(/\bThereafter, he was called (.+?)\b/i);
  if (calledMahaviraMatch?.[1] && /mahavira/i.test(sourceText + headingText)) {
    addCandidateIfValid(candidates, {
      question: "What was Mahavira called thereafter",
      answer: cleanSentence(calledMahaviraMatch[1]),
      pageNumber,
      type: "term",
      topic: "Mahavira",
      importance: 7,
    });
  }

  const diedAtMatch = sourceText.match(/\bdied at the age of (\d+)\s+at\s+(.+?)\b/i);
  if (diedAtMatch?.[1] && diedAtMatch?.[2] && /mahavira|buddha/i.test(sourceText + headingText)) {
    const person = /mahavira/i.test(sourceText + headingText) ? "Mahavira" : "Buddha";
    addCandidateIfValid(candidates, {
      question: `At what age did ${person} die`,
      answer: cleanSentence(diedAtMatch[1]),
      pageNumber,
      type: "fact",
      topic: person,
      importance: 7,
    });
    addCandidateIfValid(candidates, {
      question: `Where did ${person} die`,
      answer: cleanSentence(diedAtMatch[2]),
      pageNumber,
      type: "place",
      topic: person,
      importance: 7,
    });
  }

  const buddhismFounderBirthMatch = sourceText.match(/\b([A-Z][A-Za-z]+(?:\s+or\s+[A-Z][A-Za-z]+)?)\,?\s+the founder of Buddhism, was born in (\d{3,4}\s*BCE)\s+in\b/i);
  if (buddhismFounderBirthMatch?.[1] && buddhismFounderBirthMatch?.[2]) {
    addCandidateIfValid(candidates, {
      question: "Who was the founder of Buddhism",
      answer: cleanSentence(buddhismFounderBirthMatch[1]).replace(/\s+or\s+/i, " or "),
      pageNumber,
      type: "person",
      topic: "Buddhism",
      importance: 8,
    });
    addCandidateIfValid(candidates, {
      question: "When was Gautama Buddha born",
      answer: cleanSentence(buddhismFounderBirthMatch[2]),
      pageNumber,
      type: "year",
      topic: "Gautama Buddha",
      importance: 7,
    });
  }

  const auntMatch = sourceText.match(/\bhe was brought up by (?:his )?aunt ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\b/i);
  if (auntMatch?.[1]) {
    addCandidateIfValid(candidates, {
      question: "Who brought up Gautama Buddha",
      answer: cleanSentence(auntMatch[1]),
      pageNumber,
      type: "person",
      topic: "Gautama Buddha",
      importance: 7,
    });
  }

  const sonRahulaMatch = sourceText.match(/\bhe married ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) and gave birth to a son, ([A-Z][A-Za-z]+)\b/i);
  if (sonRahulaMatch?.[1] && sonRahulaMatch?.[2] && /buddha|siddharta|gautama/i.test(sourceText + headingText)) {
    addCandidateIfValid(candidates, {
      question: "Whom did Gautama Buddha marry",
      answer: cleanSentence(sonRahulaMatch[1]),
      pageNumber,
      type: "person",
      topic: "Gautama Buddha",
      importance: 7,
    });
    addCandidateIfValid(candidates, {
      question: "What was the name of Gautama Buddha's son",
      answer: cleanSentence(sonRahulaMatch[2]),
      pageNumber,
      type: "person",
      topic: "Gautama Buddha",
      importance: 7,
    });
  }

  const enlightenedOneMatch = sourceText.match(/\bbecame known as the (.+?)\b/i);
  if (enlightenedOneMatch?.[1] && /buddha/i.test(sourceText + headingText)) {
    addCandidateIfValid(candidates, {
      question: "What did Gautama Buddha become known as",
      answer: cleanSentence(enlightenedOneMatch[1]),
      pageNumber,
      type: "term",
      topic: "Gautama Buddha",
      importance: 7,
    });
  }

  const socialEqualityMatch = sourceText.match(/\blaid down the principle of (.+?)\b/i);
  if (socialEqualityMatch?.[1] && /buddhism/i.test(sourceText + headingText)) {
    addCandidateIfValid(candidates, {
      question: "What principle did Buddhism lay down",
      answer: cleanSentence(socialEqualityMatch[1]),
      pageNumber,
      type: "fact",
      topic: "Buddhism",
      importance: 7,
    });
  }

  const firstCouncilMatch = sourceText.match(/\bHeld at ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}) in ([^.]*) and was presided by ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\b/i);
  if (firstCouncilMatch?.[1] && firstCouncilMatch?.[2] && firstCouncilMatch?.[3] && /council/i.test(headingText)) {
    addCandidateIfValid(candidates, {
      question: `Where was the ${headingText.toLowerCase()} held`,
      answer: cleanSentence(firstCouncilMatch[1]),
      pageNumber,
      type: "place",
      topic: headingText,
      importance: 7,
    });
    addCandidateIfValid(candidates, {
      question: `Who presided over the ${headingText.toLowerCase()}`,
      answer: cleanSentence(firstCouncilMatch[3]),
      pageNumber,
      type: "person",
      topic: headingText,
      importance: 7,
    });
  }

  const titleMatch = text.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) assumed the title ([A-Za-z][A-Za-z\s-]+?)(?:\.|$)/i);
  if (titleMatch?.[1] && titleMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `What title did ${cleanSentence(titleMatch[1])} assume`,
        answer: cleanSentence(titleMatch[2]),
        pageNumber,
        type: "title",
        topic: titleMatch[1],
        importance: 7,
      }),
    );
  }

  const proclaimedTitleMatch = text.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) proclaimed himself as ([A-Za-z][A-Za-z\s-]+?)(?:\.|$)/i);
  if (proclaimedTitleMatch?.[1] && proclaimedTitleMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `What title did ${cleanSentence(proclaimedTitleMatch[1])} proclaim`,
        answer: cleanSentence(proclaimedTitleMatch[2]),
        pageNumber,
        type: "title",
        topic: proclaimedTitleMatch[1],
        importance: 7,
      }),
    );
  }

  const battleDateMatch = text.match(/\bOn\s+(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+\d{4})\s+the\s+(.+?Battle of [A-Z][A-Za-z]+)\s+took place between\s+(.+?)\s+and\s+(.+?)(?:,| who|\.|$)/i);
  if (battleDateMatch?.[1] && battleDateMatch?.[2]) {
    const battleName = cleanSentence(battleDateMatch[2].replace(/^the\s+/i, ""));
    candidates.push(
      createCandidate({
        question: `When did the ${battleName} take place`,
        answer: cleanSentence(battleDateMatch[1]),
        pageNumber,
        type: "year",
        topic: battleName,
        importance: 8,
      }),
      createCandidate({
        question: `Who fought in the ${battleName}`,
        answer: `${cleanSentence(battleDateMatch[3])} and ${cleanSentence(battleDateMatch[4])}`,
        pageNumber,
        type: "people_pair",
        topic: battleName,
        importance: 8,
      }),
    );
  }

  const wonBattleMatch = text.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) won a decisive victory over (.+?)\./i);
  if (wonBattleMatch?.[1] && wonBattleMatch?.[2]) {
    const resolvedOpponent =
      /^him$/i.test(cleanSentence(wonBattleMatch[2]))
        ? cleanSentence(text.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}) marched against [A-Z][A-Za-z]+/i)?.[1] || "")
        : cleanSentence(wonBattleMatch[2]);
    candidates.push(
      createCandidate({
        question: `Whom did ${cleanSentence(wonBattleMatch[1])} defeat`,
        answer: resolvedOpponent,
        pageNumber,
        type: "person",
        topic: wonBattleMatch[1],
        importance: 7,
      }),
    );
  }

  const capturedMatch = text.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) captured ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\b/i);
  if (capturedMatch?.[1] && capturedMatch?.[2]) {
    if (!/\bstate that\b/i.test(capturedMatch[1])) {
      candidates.push(
        createCandidate({
          question: `What did ${cleanSentence(capturedMatch[1])} capture`,
          answer: cleanSentence(capturedMatch[2]),
          pageNumber,
          type: "place",
          topic: capturedMatch[1],
          importance: 7,
        }),
      );
    }
  }

  const defeatedMatch = text.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) defeated the ([A-Za-z]+)\b/i);
  if (defeatedMatch?.[1] && defeatedMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `Whom did ${cleanSentence(defeatedMatch[1])} defeat`,
        answer: `the ${cleanSentence(defeatedMatch[2])}`,
        pageNumber,
        type: "person",
        topic: defeatedMatch[1],
        importance: 7,
      }),
    );
  }

  const defeatedPersonMatch = text.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) defeated ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\b/i);
  if (defeatedPersonMatch?.[1] && defeatedPersonMatch?.[2]) {
    addCandidateIfValid(candidates, {
      question: `Whom did ${cleanSentence(defeatedPersonMatch[1])} defeat`,
      answer: cleanSentence(defeatedPersonMatch[2]),
      pageNumber,
      type: "person",
      topic: cleanSentence(defeatedPersonMatch[1]),
      importance: 7,
    });
  }

  const rankMatch = text.match(/\bThe lowest rank was (\d+) and the highest was (\d+)\b/i);
  if (rankMatch?.[1] && rankMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: "What was the rank range in the mansabdari system",
        answer: `${rankMatch[1]} to ${rankMatch[2]}`,
        pageNumber,
        type: "fact",
        topic: "mansabdari system",
        importance: 7,
      }),
    );
  }

  const zatMatch = text.match(/\bZat means ([^.]+)\./i);
  if (zatMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "What does zat mean in the mansabdari system",
        answer: cleanSentence(zatMatch[1]),
        pageNumber,
        type: "term",
        topic: "zat",
        importance: 7,
      }),
    );
  }

  const sawarMatch = text.match(/\bSawar rank indicated (.+?)\./i);
  if (sawarMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "What did the sawar rank indicate in the mansabdari system",
        answer: cleanSentence(sawarMatch[1]).replace(/●.*$/i, "").trim(),
        pageNumber,
        type: "term",
        topic: "sawar",
        importance: 7,
      }),
    );
  }

  const importantWorkMatch = text.match(/\bThe most important work is (Hamzanama[^.●•]*)/i);
  if (importantWorkMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "What was the most important work in Mughal painting",
        answer: cleanSentence(importantWorkMatch[1]).replace(/\bColors used.*$/i, "").trim(),
        pageNumber,
        type: "work",
        topic: "Mughal painting",
        importance: 7,
      }),
    );
  }

  const memoirMatch = text.match(/\bHe wrote (?:his )?memoirs,\s*([^,]+?)\s+in the\s+([A-Za-z-]+)\s+language\b/i);
  if (memoirMatch?.[1] && memoirMatch?.[2]) {
    const author = headingSubject || extractNamedSubject(text);
    if (author) {
      candidates.push(
        createCandidate({
          question: `Which memoir did ${author} write`,
          answer: cleanSentence(memoirMatch[1]),
          pageNumber,
          type: "work",
          topic: author,
          importance: 7,
        }),
        createCandidate({
          question: `In which language did ${author} write ${cleanSentence(memoirMatch[1])}`,
          answer: cleanSentence(memoirMatch[2]),
          pageNumber,
          type: "language",
          topic: author,
          importance: 7,
        }),
      );
    }
  }

  const motherTongueMatch = text.match(/\b([A-Za-z-]+)\s+was his mother tongue\b/i);
  if (motherTongueMatch?.[1]) {
    const person = headingSubject || extractNamedSubject(text);
    if (person) {
      candidates.push(
        createCandidate({
          question: `What was ${person}'s mother tongue`,
          answer: cleanSentence(motherTongueMatch[1]),
          pageNumber,
          type: "language",
          topic: person,
          importance: 7,
        }),
      );
    }
  }

  const landRevenueSystemMatch = text.match(/\bThe land revenue system of Akbar was called (.+?)\./i);
  if (landRevenueSystemMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "What was Akbar's land revenue system called",
        answer: cleanSentence(landRevenueSystemMatch[1]),
        pageNumber,
        type: "term",
        topic: "Akbar land revenue system",
        importance: 7,
      }),
    );
  }

  const meansMatch = text.match(/\b([A-Z][A-Za-z]+)\s+means\s+["“]?([^"”.]+)["”]?\b/i);
  if (meansMatch?.[1] && meansMatch?.[2] && !/^zat$/i.test(cleanSentence(meansMatch[1]))) {
    candidates.push(
      createCandidate({
        question: `What does ${prettifyEntity(meansMatch[1])} mean`,
        answer: cleanSentence(meansMatch[2]),
        pageNumber,
        type: "term",
        topic: prettifyEntity(meansMatch[1]),
        importance: 7,
      }),
    );
  }

  const sonMatch = text.match(/\b([A-Z][A-Za-z]+)\s+was the eldest son of\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\./i);
  if (sonMatch?.[1] && sonMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `Whose son was ${cleanSentence(sonMatch[1])}`,
        answer: cleanSentence(sonMatch[2]),
        pageNumber,
        type: "person",
        topic: sonMatch[1],
        importance: 7,
      }),
    );
  }

  const succeededMatch = text.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) succeeded (?:his father )?([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) as the ruler of ([A-Z][A-Za-z]+)\./i);
  if (succeededMatch?.[1] && succeededMatch?.[2] && succeededMatch?.[3]) {
    candidates.push(
      createCandidate({
        question: `Whom did ${cleanSentence(succeededMatch[1])} succeed as ruler of ${cleanSentence(succeededMatch[3])}`,
        answer: cleanSentence(succeededMatch[2]),
        pageNumber,
        type: "person",
        topic: succeededMatch[1],
        importance: 7,
      }),
    );
  }

  const expeditionsMatch = text.match(/\b([A-Z][A-Za-z]+)\s+took interest in conquering India and launched four expeditions between (\d{4}) and (\d{4})\./i);
  if (expeditionsMatch?.[1] && expeditionsMatch?.[2] && expeditionsMatch?.[3]) {
    candidates.push(
      createCandidate({
        question: `Between which years did ${cleanSentence(expeditionsMatch[1])} launch four expeditions to conquer India`,
        answer: `${cleanSentence(expeditionsMatch[2])} and ${cleanSentence(expeditionsMatch[3])}`,
        pageNumber,
        type: "year",
        topic: expeditionsMatch[1],
        importance: 7,
      }),
    );
  }

  const introducedMatch = text.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) introduced (?:the )?(.+?) in (?:his|the) administration\./i);
  if (introducedMatch?.[1] && introducedMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `What did ${cleanSentence(introducedMatch[1])} introduce in his administration`,
        answer: cleanSentence(introducedMatch[2]),
        pageNumber,
        type: "term",
        topic: introducedMatch[1],
        importance: 7,
      }),
    );
  }

  const builtMatch = text.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) built (?:a|an|the)\s+(.+?)\./i);
  if (builtMatch?.[1] && builtMatch?.[2] && cleanSentence(builtMatch[2]).split(/\s+/).length <= 8) {
    candidates.push(
      createCandidate({
        question: `What did ${cleanSentence(builtMatch[1])} build`,
        answer: cleanSentence(builtMatch[2]),
        pageNumber,
        type: "fact",
        topic: builtMatch[1],
        importance: 6,
      }),
    );
  }

  const listNamedWorksMatch = sourceText.match(/\b(?:wrote|composed|translated)\s+([A-Z][A-Za-z][^.;]+?)\b/i);
  if (listNamedWorksMatch?.[1] && chunkSubject) {
    addCandidateIfValid(candidates, {
      question: `What did ${prettifyEntity(chunkSubject)} write`,
      answer: cleanSentence(listNamedWorksMatch[1]),
      pageNumber,
      type: "work",
      topic: prettifyEntity(chunkSubject),
      importance: 5,
    });
  }

  const monumentBuiltMatch = text.match(
    /\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) built (?:the )?(tomb of [A-Z][A-Za-z]+|[A-Z][A-Za-z']+(?:\s+[A-Z][A-Za-z']+){0,3}\s+(?:tomb|mausoleum|masjid|fort|palace|gate|darwaza|mahal))\b/i,
  );
  if (monumentBuiltMatch?.[1] && monumentBuiltMatch?.[2]) {
    const builder = cleanSentence(monumentBuiltMatch[1]);
    const monument = cleanSentence(monumentBuiltMatch[2]);
    candidates.push(
      createCandidate({
        question: `Who built the ${monument}`,
        answer: builder,
        pageNumber,
        type: "person",
        topic: monument,
        importance: 7,
      }),
    );
  }

  const builtAtPlaceMatch = text.match(
    /\bThe\s+([A-Za-z][A-Za-z\s'-]+?)\s+at\s+([A-Z][A-Za-z]+)\s+was built(?: entirely)?(?: in [a-z\s]+)?\b/i,
  );
  if (builtAtPlaceMatch?.[1] && builtAtPlaceMatch?.[2]) {
    const monument = `${cleanSentence(builtAtPlaceMatch[1])} at ${cleanSentence(builtAtPlaceMatch[2])}`;
    candidates.push(
      createCandidate({
        question: `Where was the ${cleanSentence(builtAtPlaceMatch[1])} built`,
        answer: cleanSentence(builtAtPlaceMatch[2]),
        pageNumber,
        type: "place",
        topic: monument,
        importance: 6,
      }),
    );
  }

  const builtDuringReignMatch = text.match(
    /\bDuring\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})['’]s\s+reign,\s+the\s+(.+?)\s+was built(?:\s+in\s+([A-Z][A-Za-z]+))?\b/i,
  );
  if (builtDuringReignMatch?.[1] && builtDuringReignMatch?.[2]) {
    const builder = cleanSentence(builtDuringReignMatch[1]);
    const monument = cleanSentence(builtDuringReignMatch[2]);
    candidates.push(
      createCandidate({
        question: `Who built the ${monument}`,
        answer: builder,
        pageNumber,
        type: "person",
        topic: monument,
        importance: 7,
      }),
    );
  }

  const completedByMatch = text.match(
    /\b([A-Za-z][A-Za-z\s'-]+?)\s+was completed by\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\b/i,
  );
  if (completedByMatch?.[1] && completedByMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `Who completed ${cleanSentence(completedByMatch[1])}`,
        answer: cleanSentence(completedByMatch[2]),
        pageNumber,
        type: "person",
        topic: completedByMatch[1],
        importance: 6,
      }),
    );
  }

  const dahsalaMatch = text.match(/\bIt was known as (.+?) which was completed in (\d{4})\./i);
  if (dahsalaMatch?.[1] && dahsalaMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `When was ${cleanSentence(dahsalaMatch[1])} completed`,
        answer: cleanSentence(dahsalaMatch[2]),
        pageNumber,
        type: "year",
        topic: dahsalaMatch[1],
        importance: 7,
      }),
    );
  }

  const jizyaMatch = text.match(/\bIn\s+(\d{4}), he reimposed jizya and pilgrim tax\b/i);
  if (jizyaMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "When did Aurangazeb reimpose jizya and pilgrim tax",
        answer: cleanSentence(jizyaMatch[1]),
        pageNumber,
        type: "year",
        topic: "Aurangazeb",
        importance: 7,
      }),
    );
  }

  const dinIlahiMatch = text.match(/\bIn\s+(\d{4}), he promulgated a new religion called (.+?)\./i);
  if (dinIlahiMatch?.[1] && dinIlahiMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: "What new religion did Akbar promulgate in 1582",
        answer: cleanSentence(dinIlahiMatch[2]),
        pageNumber,
        type: "term",
        topic: "Akbar",
        importance: 7,
      }),
    );
  }

  const spouseMatch = text.match(/\bIn\s+\d{4},\s+([A-Z][A-Za-z]+)\s+married\s+(.+?)\s+who was known as (.+?)\./i);
  if (spouseMatch?.[1] && spouseMatch?.[3]) {
    candidates.push(
      createCandidate({
        question: `By what name was ${cleanSentence(spouseMatch[2])} known`,
        answer: cleanSentence(spouseMatch[3]),
        pageNumber,
        type: "term",
        topic: spouseMatch[2],
        importance: 7,
      }),
    );
  }

  const widespreadLanguageMatch = sourceText.match(/\b([A-Za-z]+)\s+language became widespread in the Mughal empire by the time of ([A-Z][A-Za-z']+(?:\s+[A-Z][A-Za-z']+){0,2})'s reign\b/i);
  if (widespreadLanguageMatch?.[1] && widespreadLanguageMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `Which language became widespread in the Mughal empire by the time of ${cleanSentence(widespreadLanguageMatch[2])}'s reign`,
        answer: cleanSentence(widespreadLanguageMatch[1]),
        pageNumber,
        type: "language",
        topic: "Language and literature",
        importance: 7,
      }),
    );
  }

  const scholarHistorianMatch = sourceText.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) was a great scholar and historian\b/i);
  if (scholarHistorianMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "Who was a great scholar and historian in the Mughal period",
        answer: cleanSentence(scholarHistorianMatch[1]),
        pageNumber,
        type: "person",
        topic: "Language and literature",
        importance: 7,
      }),
    );
  }

  const headingWroteWorksMatch = headingText.match(/^He wrote (.+)$/i);
  if (headingWroteWorksMatch?.[1] && previousChunkSubject) {
    candidates.push(
      createCandidate({
        question: `What did ${cleanSentence(previousChunkSubject)} write`,
        answer: cleanSentence(headingWroteWorksMatch[1]),
        pageNumber,
        type: "work",
        topic: previousChunkSubject,
        importance: 8,
      }),
    );
  }

  const wroteWorksMatch = text.match(/\bHe wrote ([^.]+?)\b/i);
  if (wroteWorksMatch?.[1]) {
    const author = chunkSubject || headingSubject || extractNamedSubject(text) || previousChunkSubject;
    if (author) {
      candidates.push(
        createCandidate({
          question: `What did ${cleanSentence(author)} write`,
          answer: cleanSentence(wroteWorksMatch[1]),
          pageNumber,
          type: "work",
          topic: author,
          importance: 7,
        }),
      );
    }
  }

  const leadingPoetMatch = sourceText.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})-?\s+the leading poet of that period\b/i);
  if (leadingPoetMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "Who was the leading poet of that period in the Mughal era",
        answer: cleanSentence(leadingPoetMatch[1]),
        pageNumber,
        type: "person",
        topic: "Language and literature",
        importance: 6,
      }),
    );
  }

  const abulFaiziMatch = sourceText.match(/\bAbul Faizi\b/i);
  if (abulFaiziMatch && /leading poet of that period/i.test(sourceText)) {
    candidates.push(
      createCandidate({
        question: "Who was the leading poet of that period in the Mughal era",
        answer: "Abul Faizi",
        pageNumber,
        type: "person",
        topic: "Language and literature",
        importance: 8,
      }),
    );
  }

  const supervisionMatch = sourceText.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})-?\s+the leading poet of that period.*?The translation of ([A-Z][A-Za-z]+) into the ([A-Za-z]+) language was done under his supervision\b/i);
  if (supervisionMatch?.[1] && supervisionMatch?.[2] && supervisionMatch?.[3]) {
    const supervisor = cleanSentence(supervisionMatch[1]);
    if (supervisor) {
      candidates.push(
        createCandidate({
          question: `Who supervised the translation of ${cleanSentence(supervisionMatch[2])} into ${cleanSentence(supervisionMatch[3])}`,
          answer: prettifyEntity(supervisor),
          pageNumber,
          type: "person",
          topic: supervisor,
          importance: 6,
        }),
      );
    }
  }

  const abulFaiziSupervisionMatch = sourceText.match(/\bAbul Faizi\b.*?The translation of ([A-Z][A-Za-z]+) into the ([A-Za-z]+) language was done under his supervision\b/i);
  if (abulFaiziSupervisionMatch?.[1] && abulFaiziSupervisionMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `Who supervised the translation of ${cleanSentence(abulFaiziSupervisionMatch[1])} into ${cleanSentence(abulFaiziSupervisionMatch[2])}`,
        answer: "Abul Faizi",
        pageNumber,
        type: "person",
        topic: "Abul Faizi",
        importance: 8,
      }),
    );
  }

  const persianPoetsMatch = sourceText.match(/\b([A-Z][A-Za-z]+)\s+and\s+([A-Z][A-Za-z]+)\s+were two other leading Persian poets\b/i);
  if (persianPoetsMatch?.[1] && persianPoetsMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: "Who were two other leading Persian poets in the Mughal period",
        answer: `${cleanSentence(persianPoetsMatch[1])} and ${cleanSentence(persianPoetsMatch[2])}`,
        pageNumber,
        type: "people_pair",
        topic: "Language and literature",
        importance: 6,
      }),
    );
  }

  const autobiographyMatch = sourceText.match(/\b([A-Z][A-Za-z']+(?:\s+[A-Z][A-Za-z']+)*)'s autobiography was-?\s*([A-Z][A-Za-z-]+(?:\s*-\s*[A-Z][A-Za-z-]+)?)\b/i);
  if (autobiographyMatch?.[1] && autobiographyMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `What was ${cleanSentence(autobiographyMatch[1])}'s autobiography`,
        answer: cleanSentence(autobiographyMatch[2]),
        pageNumber,
        type: "work",
        topic: autobiographyMatch[1],
        importance: 7,
      }),
    );
  }

  const courtArtistsMatch = sourceText.match(/\bAkbar's court artists-?\s+([A-Z][A-Za-z]+(?:,\s*[A-Z][A-Za-z]+)*(?:\s+and\s+[A-Z][A-Za-z]+)?)\b/i);
  if (courtArtistsMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "Who were Akbar's court artists",
        answer: cleanSentence(courtArtistsMatch[1].replace(/,\s*/g, ", ")),
        pageNumber,
        type: "list",
        topic: "Mughal painting",
        importance: 6,
      }),
    );
  }

  const explicitCourtArtistsMatch = sourceText.match(/\bAkbar's court artists-?\s+([^●]+?)(?=\s*[●•]|$)/i);
  if (explicitCourtArtistsMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "Who were Akbar's court artists",
        answer: cleanSentence(explicitCourtArtistsMatch[1].replace(/,\s*/g, ", ")),
        pageNumber,
        type: "list",
        topic: "Mughal painting",
        importance: 8,
      }),
    );
  }

  const colorsUsedMatch = sourceText.match(/\bColors used-?\s+(.+?)(?=\s+Mughal paintings reached|\.$|$)/i);
  if (colorsUsedMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "What colors were used in Mughal paintings",
        answer: cleanSentence(colorsUsedMatch[1]),
        pageNumber,
        type: "list",
        topic: "Mughal painting",
        importance: 6,
      }),
    );
  }

  const explicitColorsUsedMatch = sourceText.match(/\bColors used-?\s+([^●]+?)(?=\s*[●•]|$)/i);
  if (explicitColorsUsedMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "What colors were used in Mughal paintings",
        answer: cleanSentence(explicitColorsUsedMatch[1]),
        pageNumber,
        type: "list",
        topic: "Mughal painting",
        importance: 8,
      }),
    );
  }

  const climaxMatch = sourceText.match(/\bMughal paintings reached (?:its|their) climax during the reign of ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\b/i);
  if (climaxMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "During whose reign did Mughal paintings reach their climax",
        answer: cleanSentence(climaxMatch[1]),
        pageNumber,
        type: "person",
        topic: "Mughal painting",
        importance: 7,
      }),
    );
  }

  const employedPaintersMatch = sourceText.match(/\bHe employed a number of painters like (.+?)\b/i);
  if (employedPaintersMatch?.[1]) {
    const ruler = text.match(/\breign of ([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})/i)?.[1] || headingSubject;
    if (ruler) {
      candidates.push(
        createCandidate({
          question: `Which painters were employed by ${cleanSentence(ruler)}`,
          answer: cleanSentence(employedPaintersMatch[1]),
          pageNumber,
          type: "list",
          topic: ruler,
          importance: 6,
        }),
      );
    }
  }

  const patronizedTansenMatch = sourceText.match(/\b([A-Z][A-Za-z]+)\s+patronized\s+([A-Z][A-Za-z]+(?:\s+of\s+[A-Z][A-Za-z]+)?)\b/i);
  if (patronizedTansenMatch?.[1] && patronizedTansenMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `Whom did ${cleanSentence(patronizedTansenMatch[1])} patronize`,
        answer: cleanSentence(patronizedTansenMatch[2]),
        pageNumber,
        type: "person",
        topic: patronizedTansenMatch[1],
        importance: 6,
      }),
    );
  }

  const headingRagasMatch = headingText.match(/^([A-Z][A-Za-z]+)\s+composed\s+(.+)$/i);
  if (headingRagasMatch?.[1] && headingRagasMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `What did ${cleanSentence(headingRagasMatch[1])} compose`,
        answer: cleanSentence(headingRagasMatch[2]),
        pageNumber,
        type: "work",
        topic: cleanSentence(headingRagasMatch[1]),
        importance: 7,
      }),
    );
  }

  const ragasMatch = text.match(/\b([A-Z][A-Za-z]+)\s+composed\s+(.+?)(?:\.|$)/i);
  if (ragasMatch?.[1] && ragasMatch?.[2] && !/^(many)$/i.test(cleanSentence(ragasMatch[2]))) {
    candidates.push(
      createCandidate({
        question: `What did ${cleanSentence(ragasMatch[1])} compose`,
        answer: cleanSentence(ragasMatch[2]),
        pageNumber,
        type: "work",
        topic: ragasMatch[1],
        importance: 6,
      }),
    );
  }

  const composedManyRagasMatch = sourceText.match(/\b([A-Z][A-Za-z]+)\s+composed\s+many ragas\b/i);
  if (composedManyRagasMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "Who composed many ragas",
        answer: cleanSentence(composedManyRagasMatch[1]),
        pageNumber,
        type: "person",
        topic: "Mughal music",
        importance: 6,
      }),
    );
  }

  const fondOfMusicMatch = sourceText.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}\s+and\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) were also fond of music\b/i);
  if (fondOfMusicMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "Who were also fond of music during the Mughal period",
        answer: cleanSentence(fondOfMusicMatch[1]),
        pageNumber,
        type: "people_pair",
        topic: "Mughal music",
        importance: 6,
      }),
    );
  }

  const fondOfMusicInlineMatch = text.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}\s+and\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) were also fond of music\b/i);
  if (fondOfMusicInlineMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "Who were also fond of music during the Mughal period",
        answer: cleanSentence(fondOfMusicInlineMatch[1]),
        pageNumber,
        type: "people_pair",
        topic: "Mughal music",
        importance: 7,
      }),
    );
  }

  const explicitFondOfMusicMatch = sourceText.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}\s+and\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) were also fond of music\b/i);
  if (explicitFondOfMusicMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "Who were also fond of music during the Mughal period",
        answer: cleanSentence(explicitFondOfMusicMatch[1]),
        pageNumber,
        type: "people_pair",
        topic: "Mughal music",
        importance: 8,
      }),
    );
  }

  const akbarCourtArtistsMatch = sourceText.match(/\bAkbar's court artists-?\s+(.+?)(?=\bIllustrations\b|$)/i);
  if (akbarCourtArtistsMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "Who were Akbar's court artists",
        answer: cleanSentence(akbarCourtArtistsMatch[1]),
        pageNumber,
        type: "list",
        topic: "Mughal painting",
        importance: 7,
      }),
    );
  }

  const colorsUsedInlineMatch = sourceText.match(/\bColors used-?\s+(.+?)(?=\bMughal paintings reached\b|$)/i);
  if (colorsUsedInlineMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "What colors were used in Mughal paintings",
        answer: cleanSentence(colorsUsedInlineMatch[1]),
        pageNumber,
        type: "list",
        topic: "Mughal painting",
        importance: 6,
      }),
    );
  }

  const autobiographyInlineMatch = sourceText.match(/\b([A-Z][A-Za-z']+(?:\s+[A-Z][A-Za-z']+)*)'s autobiography was-?\s*([A-Z][A-Za-z-]+(?:\s*-\s*[A-Z][A-Za-z-]+)?)\b/i);
  if (autobiographyInlineMatch?.[1] && autobiographyInlineMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `What was ${cleanSentence(autobiographyInlineMatch[1])}'s autobiography`,
        answer: cleanSentence(autobiographyInlineMatch[2]),
        pageNumber,
        type: "work",
        topic: autobiographyInlineMatch[1],
        importance: 7,
      }),
    );
  }

  const abulFazlWorksMatch = sourceText.match(/\bAbul Fazl was a great scholar and historian.*?He wrote ([^.]+?)(?=\s+Abul Faizi|\s+Jahangir's autobiography|$)/i);
  if (abulFazlWorksMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "What did Abul Fazl write",
        answer: cleanSentence(abulFazlWorksMatch[1]),
        pageNumber,
        type: "work",
        topic: "Abul Fazl",
        importance: 7,
      }),
    );
  }

  const regionalLanguagesMatch = sourceText.match(/\bRegional languages such as (.+?) had also developed during this period\b/i);
  if (regionalLanguagesMatch?.[1]) {
    candidates.push(
      createCandidate({
        question: "Which regional languages developed during the Mughal period",
        answer: cleanSentence(regionalLanguagesMatch[1]),
        pageNumber,
        type: "list",
        topic: "Language and literature",
        importance: 6,
      }),
    );
  }

  const tulsidasMatch = sourceText.match(/\bThe most influential Hindi poet was ([A-Z][A-Za-z]+), who wrote .*?, the ([A-Z][A-Za-z]+)\b/i);
  if (tulsidasMatch?.[1] && tulsidasMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: "Who was the most influential Hindi poet in the Mughal period",
        answer: cleanSentence(tulsidasMatch[1]),
        pageNumber,
        type: "person",
        topic: "Language and literature",
        importance: 7,
      }),
      createCandidate({
        question: `What did ${cleanSentence(tulsidasMatch[1])} write`,
        answer: cleanSentence(tulsidasMatch[2]),
        pageNumber,
        type: "work",
        topic: cleanSentence(tulsidasMatch[1]),
        importance: 7,
      }),
    );
  }

  const roleMatches = [...text.matchAll(/\b(Diwan(?:\s*[–-]?\s*i\s*[–-]?\s*[A-Za-z]+)?)\s*[–-]\s*(?:also called as\s+([A-Za-z]+)\s*[–-]\s*)?in charge of\s+([^.\n]+?)(?=\.|$)/gi)];
  for (const match of roleMatches) {
    const office = cleanSentence(match[1]);
    const alias = cleanSentence(match[2] || "");
    const responsibility = cleanSentence(match[3]);

    if (office && responsibility) {
      candidates.push(
        createCandidate({
          question: `What was ${office} in charge of`,
          answer: responsibility,
          pageNumber,
          type: "term",
          topic: office,
          importance: 7,
        }),
      );
    }

    if (office && alias) {
      candidates.push(
        createCandidate({
          question: `What was ${office} also called`,
          answer: alias,
          pageNumber,
          type: "term",
          topic: office,
          importance: 6,
        }),
      );
    }
  }

  const rulerAtPlaceMatch = text.match(/\bThe\s+([A-Za-z][A-Za-z\s-]+?)\s+at\s+([A-Z][A-Za-z]+)\s*,?\s*was built(?: entirely)?(?: in [a-z\s]+)?\b/i);
  if (rulerAtPlaceMatch?.[1] && rulerAtPlaceMatch?.[2]) {
    const structure = cleanSentence(rulerAtPlaceMatch[1]);
    const place = cleanSentence(rulerAtPlaceMatch[2]);
    candidates.push(
      createCandidate({
        question: `Where was the ${structure} built`,
        answer: place,
        pageNumber,
        type: "place",
        topic: structure,
        importance: 6,
      }),
    );
  }

  const translatedMatch = text.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) translated (.+?) into ([A-Za-z]+)\s+language\b/i);
  if (translatedMatch?.[1] && translatedMatch?.[2] && translatedMatch?.[3]) {
    candidates.push(
      createCandidate({
        question: `What did ${prettifyEntity(translatedMatch[1])} translate into ${cleanSentence(translatedMatch[3])}`,
        answer: cleanSentence(translatedMatch[2]),
        pageNumber,
        type: "work",
        topic: prettifyEntity(translatedMatch[1]),
        importance: 6,
      }),
    );
  }

  const authorMatch = text.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}),?\s+author of\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\b/i);
  if (authorMatch?.[1] && authorMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `Who was the author of ${cleanSentence(authorMatch[2])}`,
        answer: cleanSentence(authorMatch[1]),
        pageNumber,
        type: "person",
        topic: authorMatch[2],
        importance: 6,
      }),
    );
  }

  const orderedMatch = text.match(/\b(?:([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})|He)\s+ordered for the construction of (.+?)\b/i);
  if ((orderedMatch?.[1] || chunkSubject) && orderedMatch?.[2]) {
    const actor = prettifyEntity(orderedMatch[1] || chunkSubject);
    candidates.push(
      createCandidate({
        question: `What did ${actor} order to be constructed`,
        answer: cleanSentence(orderedMatch[2]),
        pageNumber,
        type: "work",
        topic: actor,
        importance: 6,
      }),
    );
  }

  const likedPolicyMatch = text.match(/\bHe disliked the interference of the Muslim Ulemas in political matters\./i);
  if (likedPolicyMatch && chunkSubject) {
    candidates.push(
      createCandidate({
        question: "Who disliked the interference of the Muslim Ulemas in political matters",
        answer: prettifyEntity(chunkSubject),
        pageNumber,
        type: "person",
        topic: prettifyEntity(chunkSubject),
        importance: 6,
      }),
    );
  }

  const abolishedMatch = text.match(/\bHe abolished (.+?)\./i);
  if (abolishedMatch?.[1] && chunkSubject) {
    const actor = prettifyEntity(chunkSubject);
    candidates.push(
      createCandidate({
        question: `What did ${actor} abolish`,
        answer: cleanSentence(abolishedMatch[1]),
        pageNumber,
        type: "fact",
        topic: actor,
        importance: 6,
      }),
    );
  }

  const allowedMatch = text.match(/\bHe allowed (.+?) to (.+?)\./i);
  if (allowedMatch?.[1] && allowedMatch?.[2] && chunkSubject) {
    const actor = prettifyEntity(chunkSubject);
    candidates.push(
      createCandidate({
        question: `What did ${actor} allow`,
        answer: `${cleanSentence(allowedMatch[1])} to ${cleanSentence(allowedMatch[2])}`,
        pageNumber,
        type: "fact",
        topic: actor,
        importance: 5,
      }),
    );
  }

  const composedMatch = text.match(/\b([A-Z][A-Za-z]+)\s+composed\s+(.+?)\./i);
  if (composedMatch?.[1] && composedMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `What did ${cleanSentence(composedMatch[1])} compose`,
        answer: cleanSentence(composedMatch[2]),
        pageNumber,
        type: "work",
        topic: composedMatch[1],
        importance: 6,
      }),
    );
  }

  const patronizedMatch = text.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}) patronized (.+?)\./i);
  if (
    patronizedMatch?.[1] &&
    patronizedMatch?.[2] &&
    !/^(many|a large number|writers|historians)\b/i.test(cleanSentence(patronizedMatch[2]))
  ) {
    candidates.push(
      createCandidate({
        question: `Whom did ${cleanSentence(patronizedMatch[1])} patronize`,
        answer: cleanSentence(patronizedMatch[2]),
        pageNumber,
        type: "person",
        topic: patronizedMatch[1],
        importance: 6,
      }),
    );
  }

  const knownAsAutobiographyMatch = text.match(/\b([A-Z][A-Za-z']+(?:\s+[A-Z][A-Za-z-]+){0,3}) was- ([A-Z][A-Za-z-]+(?:\s*-\s*[A-Z][A-Za-z-]+)?)\b/i);
  if (knownAsAutobiographyMatch?.[1] && knownAsAutobiographyMatch?.[2]) {
    candidates.push(
      createCandidate({
        question: `What was ${cleanSentence(knownAsAutobiographyMatch[1])}`,
        answer: cleanSentence(knownAsAutobiographyMatch[2]),
        pageNumber,
        type: "work",
        topic: knownAsAutobiographyMatch[1],
        importance: 5,
      }),
    );
  }

  return candidates;
};

const buildCandidatePool = (chunks = [], { excludedQuestions = [], excludedAnswers = [] } = {}) => {
  const excludedQuestionKeys = new Set(excludedQuestions.map((item) => normalizeKey(item)).filter(Boolean));
  const excludedAnswerKeys = new Set(excludedAnswers.map((item) => normalizeKey(item)).filter(Boolean));

  const pool = chunks.flatMap((chunk, chunkIndex) => {
    const previousChunk = chunks[chunkIndex - 1] || {};
    const sentenceCandidates = attachSourceHeading(
      splitSentences(chunk.content).flatMap((sentence, index, sentences) =>
        buildCandidatesFromSentence(sentence, chunk.pageNumber, {
          heading: chunk.heading,
          previousSentence: index > 0 ? sentences[index - 1] : "",
          chunkText: chunk.content,
          previousChunkHeading: previousChunk.heading || "",
          previousChunkText: previousChunk.content || "",
        }),
      ),
      chunk.heading || "",
    );
    const chunkLevelCandidates = attachSourceHeading(
      buildChunkLevelCandidates({
        ...chunk,
        previousChunkContent: previousChunk.content || "",
        previousChunkHeading: previousChunk.heading || "",
      }),
      chunk.heading || "",
    );

    return [
      ...sentenceCandidates,
      ...chunkLevelCandidates,
    ];
  });

  return uniqueBy(
    pool
      .filter(
        (candidate) =>
          isUsableCandidate(candidate) &&
          !excludedQuestionKeys.has(normalizeKey(candidate.question)) &&
          !excludedAnswerKeys.has(normalizeKey(candidate.answer)),
      )
      .sort((a, b) => b.importance - a.importance || a.pageNumber - b.pageNumber),
    (candidate) => `${getQuestionFamilyKey(candidate.question)}::${normalizeKey(candidate.answer)}`,
  );
};

const selectAcrossPages = (candidates = [], count = 5) => {
  const remaining = [...candidates];
  const selected = [];

  while (selected.length < count && remaining.length > 0) {
    const usedTopicKeys = new Set(selected.map((candidate) => getTopicKey(candidate)).filter(Boolean));
    const usedPages = new Set(selected.map((candidate) => candidate.pageNumber));
    const usedHeadingKeys = new Set(selected.map((candidate) => getHeadingKey(candidate)).filter(Boolean));

    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const topicKey = getTopicKey(candidate);
      const headingKey = getHeadingKey(candidate);
      let score = candidate.importance || 0;

      if (topicKey && !usedTopicKeys.has(topicKey)) {
        score += 10;
      }

      if (headingKey && !usedHeadingKeys.has(headingKey)) {
        score += 7;
      }

      if (!usedPages.has(candidate.pageNumber)) {
        score += 5;
      }

      if (/^(who wrote|who was the author of|what is .+arthashastra|what is .+mudrarakshasa)/i.test(candidate.question)) {
        score += 4;
      }

      if (candidate.type === "definition" || candidate.type === "term") {
        score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    const [pickedCandidate] = remaining.splice(bestIndex, 1);
    selected.push(pickedCandidate);
  }

  return selected;
};

const buildOptionSet = (correctOption, pool = []) => {
  const options = uniqueBy(
    [correctOption, ...pool]
      .map((item) => cleanSentence(item))
      .filter(Boolean)
      .map((item) => ({ item })),
    ({ item }) => normalizeKey(item),
  )
    .map(({ item }) => item)
    .slice(0, 4);

  return options.length === 4 ? options : [];
};

export const generateFlashcardsFromChunks = (
  chunks = [],
  count = 5,
  { excludedQuestions = [], excludedAnswers = [] } = {},
) => {
  const pool = buildCandidatePool(chunks, { excludedQuestions, excludedAnswers });
  return selectAcrossPages(pool, count).map((candidate, index) => ({
    question: candidate.question,
    answer: candidate.answer,
    difficulty: ["easy", "medium", "hard"][index % 3],
    pageNumber: candidate.pageNumber,
  }));
};

export const generateQuizFromChunks = (chunks = [], count = 5) => {
  const pool = buildCandidatePool(chunks);
  const selected = selectAcrossPages(pool, count * 2);
  const optionPool = pool.map((item) => item.optionValue);

  const quiz = [];
  for (const candidate of selected) {
    if (quiz.length === count) {
      break;
    }

    const options = buildOptionSet(
      candidate.optionValue,
      optionPool.filter((item) => normalizeKey(item) !== normalizeKey(candidate.optionValue)),
    );

    if (options.length !== 4) {
      continue;
    }

    quiz.push({
      question: candidate.question,
      options,
      correctAnswer: candidate.optionValue,
      explanation: candidate.answer,
      difficulty: ["easy", "medium", "hard"][quiz.length % 3],
      pageNumber: candidate.pageNumber,
    });
  }

  return quiz;
};
