import { GoogleGenAI } from "@google/genai";

const RSS_FEEDS = [
  "https://www.thehindu.com/news/national/feeder/default.rss",
  "https://indianexpress.com/section/india/feed/",
];

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const aiClient = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;
const newsCache = new Map();

const stripCdata = (value = "") =>
  value
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .trim();

const decodeEntities = (value = "") =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const stripHtml = (value = "") =>
  decodeEntities(stripCdata(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());

const normalizeDate = (value) => new Date(`${value}T00:00:00`);

const isWithinOneDay = (candidate, targetDate) => {
  if (!(candidate instanceof Date) || Number.isNaN(candidate.getTime())) {
    return false;
  }

  const oneDay = 24 * 60 * 60 * 1000;
  return Math.abs(candidate.getTime() - targetDate.getTime()) <= oneDay;
};

const parseRssItems = (xml = "") => {
  const items = [];
  const matches = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

  for (const item of matches) {
    const getTag = (tag) => item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] || "";
    const title = stripHtml(getTag("title"));
    const link = stripHtml(getTag("link"));
    const description = stripHtml(getTag("description"));
    const pubDateRaw = stripHtml(getTag("pubDate"));
    const pubDate = pubDateRaw ? new Date(pubDateRaw) : null;

    if (!title || !link) {
      continue;
    }

    items.push({
      title,
      link,
      description,
      pubDate,
    });
  }

  return items;
};

const fetchFeedItems = async (url) => {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "AI-Learning-Assistant/1.0",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
  });

  if (!response.ok) {
    throw new Error(`RSS fetch failed for ${url} with status ${response.status}`);
  }

  const xml = await response.text();
  return parseRssItems(xml);
};

const dedupeArticles = (articles = []) => {
  const seen = new Set();

  return articles.filter((article) => {
    const key = `${article.title.toLowerCase()}::${article.link.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const inferTags = (text = "") => {
  const lower = text.toLowerCase();
  const tags = [];

  if (/\bconstitution|parliament|supreme court|bill|policy|governor|president|election\b/.test(lower)) {
    tags.push("Polity");
  }
  if (/\beconomy|gdp|inflation|bank|fiscal|tax|rupee|trade|market\b/.test(lower)) {
    tags.push("Economy");
  }
  if (/\bchina|usa|united states|russia|un|bilateral|summit|diplomatic|foreign\b/.test(lower)) {
    tags.push("International Relations");
  }
  if (/\btechnology|ai|space|satellite|semiconductor|digital|cyber|research\b/.test(lower)) {
    tags.push("Science & Tech");
  }
  if (/\bclimate|forest|wildlife|pollution|environment|biodiversity|rainfall\b/.test(lower)) {
    tags.push("Environment");
  }

  return tags.length > 0 ? tags : ["Current Affairs"];
};

const buildFallbackDigest = (date, articles) => {
  if (articles.length === 0) {
    return {
      date,
      summary: "No articles found for this date.",
      qa: "",
      tags: [],
      syllabus_links: ["https://upsc.gov.in/examinations/syllabus"],
      importance: "No major current affairs items were found for the selected date.",
    };
  }

  const summary = [
    "Important points:",
    ...articles.slice(0, 5).map((article) => `- ${article.title}${article.description ? `: ${article.description}` : ""}`),
  ].join("\n");

  const qa = articles
    .slice(0, 4)
    .map(
      (article, index) =>
        `${index + 1}. Q: Which issue was highlighted in the news item "${article.title}"?\nA: ${article.description || article.title}`,
    )
    .join("\n\n");

  const combinedText = articles
    .slice(0, 6)
    .map((article) => `${article.title}. ${article.description}`)
    .join(" ");

  return {
    date,
    summary,
    qa,
    tags: inferTags(combinedText),
    syllabus_links: ["https://upsc.gov.in/examinations/syllabus"],
    importance:
      "These stories matter because they can support UPSC preparation through current examples, policy context, and issue-based revision.",
  };
};

const parseModelJson = (rawText = "") => {
  const fencedMatch = rawText.match(/```json\s*([\s\S]*?)```/i);
  const objectText = fencedMatch?.[1] || rawText.match(/\{[\s\S]*\}/)?.[0];

  if (!objectText) {
    throw new Error("No JSON found in model response");
  }

  return JSON.parse(objectText);
};

const generateDigestWithModel = async (date, articles) => {
  if (!aiClient) {
    return buildFallbackDigest(date, articles);
  }

  const articleContext = articles
    .slice(0, 8)
    .map(
      (article, index) =>
        `${index + 1}. Title: ${article.title}\nDescription: ${article.description || "Not available"}\nLink: ${article.link}`,
    )
    .join("\n\n");

  const prompt = `
You are a UPSC current-affairs assistant.

Using ONLY the provided news items for ${date}, return valid JSON with this exact shape:
{
  "summary": "plain text summary with short bullets or compact paragraphs",
  "importance": "3-4 lines explaining UPSC relevance",
  "qa": "5 concise revision Q&A items in plain text",
  "tags": ["tag1", "tag2", "tag3"]
}

Rules:
- Use only the given articles.
- No markdown fences.
- Keep tags short and exam-relevant.
- If the articles are sparse, still return a useful concise digest.

Articles:
${articleContext}
`.trim();

  const response = await aiClient.models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  const parsed = parseModelJson(response.text?.trim() || "");

  return {
    date,
    summary: String(parsed.summary || "").trim(),
    qa: String(parsed.qa || "").trim(),
    tags: Array.isArray(parsed.tags) ? parsed.tags.filter(Boolean).slice(0, 5) : [],
    syllabus_links: ["https://upsc.gov.in/examinations/syllabus"],
    importance: String(parsed.importance || "").trim(),
  };
};

export const getNewsDigestByDate = async (date) => {
  if (newsCache.has(date)) {
    return newsCache.get(date);
  }

  const targetDate = normalizeDate(date);
  const feedResults = await Promise.allSettled(RSS_FEEDS.map((url) => fetchFeedItems(url)));
  const articles = dedupeArticles(
    feedResults
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value)
      .filter((article) => isWithinOneDay(article.pubDate, targetDate)),
  ).slice(0, 10);

  const digest =
    articles.length === 0
      ? buildFallbackDigest(date, [])
      : await generateDigestWithModel(date, articles).catch((error) => {
          console.error("News digest generation failed, using fallback:", error.message);
          return buildFallbackDigest(date, articles);
        });

  newsCache.set(date, digest);
  return digest;
};
