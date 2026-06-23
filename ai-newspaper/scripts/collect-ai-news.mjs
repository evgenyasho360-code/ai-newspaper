import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outputFile = process.env.AI_DAILY_SOURCE_FILE ?? ".cache/ai-daily-source.json";
const maxArticles = Number(process.env.AI_DAILY_MAX_ARTICLES ?? 8);
const lookbackDays = Number(process.env.AI_DAILY_LOOKBACK_DAYS ?? 14);
const targetDate = process.env.AI_DAILY_DATE ?? getShanghaiDate();

const feeds = [
  {
    name: "OpenAI News",
    url: "https://openai.com/news/rss.xml",
    category: "模型",
  },
  {
    name: "Google DeepMind Blog",
    url: "https://deepmind.google/blog/rss.xml",
    category: "研究",
  },
  {
    name: "Hugging Face Blog",
    url: "https://huggingface.co/blog/feed.xml",
    category: "产品",
  },
  {
    name: "arXiv cs.AI",
    url: "http://export.arxiv.org/rss/cs.AI",
    category: "研究",
  },
  {
    name: "arXiv cs.LG",
    url: "http://export.arxiv.org/rss/cs.LG",
    category: "研究",
  },
];

const arxivSearchCategories = ["cs.AI", "cs.LG", "cs.CL", "cs.CV", "cs.RO"];

function getShanghaiDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getChineseWeekday(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    weekday: "long",
  }).format(new Date(`${date}T00:00:00+08:00`));
}

function getTargetWindow(date) {
  const end = new Date(`${date}T23:59:59+08:00`).getTime();
  const start = end - lookbackDays * 24 * 60 * 60 * 1000;
  return { start, end };
}

function formatArxivDate(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replaceAll("-", "");
}

function decodeEntities(text) {
  return text
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripHtml(text = "") {
  return decodeEntities(
    text
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function getTag(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? stripHtml(match[1]) : "";
}

function getAtomLink(block) {
  const hrefMatch = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  if (hrefMatch) return decodeEntities(hrefMatch[1]);
  return getTag(block, "link");
}

function parseFeed(xml, feed) {
  const itemBlocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  const entryBlocks = [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0]);
  const blocks = itemBlocks.length > 0 ? itemBlocks : entryBlocks;

  return blocks.map((block) => {
    const title = getTag(block, "title");
    const rawDate = getTag(block, "pubDate") || getTag(block, "published") || getTag(block, "updated");
    const date = rawDate ? new Date(rawDate) : new Date();
    return {
      title,
      source: feed.name,
      url: getAtomLink(block) || feed.url,
      summary: getTag(block, "description") || getTag(block, "summary") || getTag(block, "content"),
      publishedAt: Number.isNaN(date.valueOf()) ? new Date().toISOString() : date.toISOString(),
      category: feed.category,
    };
  });
}

function parseArxivSearch(xml) {
  const entries = [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0]);
  return entries.map((block) => {
    const title = getTag(block, "title");
    const summary = getTag(block, "summary");
    const publishedAt = getTag(block, "published") || getTag(block, "updated");
    const categoryMatch = block.match(/<category[^>]+term=["']([^"']+)["'][^>]*>/i);
    return {
      title,
      source: "arXiv",
      url: getAtomLink(block),
      summary,
      publishedAt,
      category: categoryMatch?.[1] === "cs.CV" ? "模型" : "研究",
    };
  });
}

function categorize(item) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  if (/\b(policy|regulation|safety|governance|law|act)\b/.test(text)) return "政策";
  if (/\b(funding|raises|valuation|invest|investment|acquisition|ipo)\b/.test(text)) return "资本";
  if (/\b(benchmark|paper|research|arxiv|dataset|evaluation|evaluations)\b/.test(text)) return "研究";
  if (/\b(model|models|agent|agents|reasoning|multimodal|llm|language model|gemini|gpt|claude)\b/.test(text)) return "模型";
  if (/\b(product|launch|release|api|app|tool|tools|platform)\b/.test(text)) return "产品";
  return item.category;
}

function impactOf(item) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  if (/(openai|deepmind|gpt|gemini|claude|frontier|agent|reasoning|safety|multimodal)/.test(text)) {
    return "高";
  }
  if (/(paper|dataset|benchmark|release|api|model)/.test(text)) return "中";
  return "低";
}

function readTimeOf(summary) {
  const words = summary.split(/\s+/).filter(Boolean).length;
  const minutes = Math.min(8, Math.max(3, Math.round(words / 120) + 3));
  return `${minutes} 分钟`;
}

function makeArticle(item, index) {
  const category = categorize(item);
  const summary =
    item.summary ||
    `${item.source} 发布了新的 AI 相关信息，主题为「${item.title}」。点击原文可查看完整内容。`;
  return {
    id: `${new Date(item.publishedAt).toISOString().slice(0, 10)}-${index + 1}`,
    category,
    priority: index === 0 ? "lead" : index < 3 ? "feature" : "normal",
    title: item.title,
    summary: summary.slice(0, 150),
    body: summary.slice(0, 360),
    source: item.source,
    url: item.url,
    readTime: readTimeOf(summary),
    impact: impactOf(item),
    tags: [category, item.source.replace(/\s+(Blog|News)$/i, "")].filter(Boolean),
  };
}

async function fetchFeed(feed) {
  const response = await fetch(feed.url, {
    headers: {
      "user-agent": "AI Newspaper Daily Collector/1.0",
      accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
    },
  });
  if (!response.ok) throw new Error(`${feed.name} responded ${response.status}`);
  return parseFeed(await response.text(), feed);
}

async function fetchArxivSearch() {
  const { start, end } = getTargetWindow(targetDate);
  const startDate = formatArxivDate(new Date(start));
  const endDate = formatArxivDate(new Date(end));
  const categoryQuery = arxivSearchCategories.map((category) => `cat:${category}`).join("+OR+");
  const searchQuery = `(${categoryQuery})+AND+submittedDate:[${startDate}0000+TO+${endDate}2359]`;
  const url = `https://export.arxiv.org/api/query?search_query=${searchQuery}&start=0&max_results=40&sortBy=submittedDate&sortOrder=descending`;
  const response = await fetch(url, {
    headers: {
      "user-agent": "AI Newspaper Daily Collector/1.0",
      accept: "application/atom+xml, application/xml, text/xml",
    },
  });
  if (!response.ok) throw new Error(`arXiv search responded ${response.status}`);
  return parseArxivSearch(await response.text());
}

async function main() {
  const { start, end } = getTargetWindow(targetDate);
  const settled = await Promise.allSettled([...feeds.map(fetchFeed), fetchArxivSearch()]);
  for (const result of settled) {
    if (result.status === "rejected") {
      console.warn(result.reason?.message ?? result.reason);
    }
  }
  const items = settled
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((item) => {
      const publishedTime = new Date(item.publishedAt).getTime();
      return item.title && item.url && publishedTime >= start && publishedTime <= end;
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const uniqueItems = [];
  const seen = new Set();
  for (const item of items) {
    const key = item.url.split("?")[0] || item.title;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueItems.push(item);
    if (uniqueItems.length >= maxArticles) break;
  }

  const articles = uniqueItems.map(makeArticle);
  const issue = {
    id: targetDate,
    date: targetDate,
    weekday: getChineseWeekday(targetDate),
    issueNo: targetDate.replaceAll("-", ""),
    updatedAt: new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date()),
    briefing: articles.slice(0, 6).map((article, index) => ({
      time: `${String(7 + Math.floor(index / 2)).padStart(2, "0")}:${index % 2 === 0 ? "15" : "45"}`,
      category: article.category,
      title: article.title,
      source: article.source,
      url: article.url,
    })),
    articles,
  };

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(issue, null, 2)}\n`, "utf8");
  console.log(`Collected ${articles.length} AI news articles into ${outputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
