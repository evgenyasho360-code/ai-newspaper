import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const issuesDir = path.resolve("public/data/issues");
const sourceFile = process.env.AI_DAILY_SOURCE_FILE;
const minArticles = Number(process.env.AI_DAILY_MIN_ARTICLES ?? 3);

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

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

async function loadSkillOutput() {
  if (!sourceFile) return null;
  const raw = await readFile(path.resolve(sourceFile), "utf8");
  return JSON.parse(raw);
}

function normalizeIssue(source, date) {
  if (source?.id && Array.isArray(source?.articles)) {
    return source;
  }

  const articles = Array.isArray(source?.articles) ? source.articles : [];
  const normalizedArticles = articles.map((article, index) => ({
    id: article.id ?? `${date}-${slugify(article.title ?? `article-${index + 1}`)}`,
    category: article.category ?? "行业",
    priority: article.priority ?? (index === 0 ? "lead" : "normal"),
    title: article.title ?? "待补充标题",
    summary: article.summary ?? article.description ?? "待补充摘要。",
    body: article.body ?? article.content ?? article.summary ?? "待补充正文。",
    source: article.source ?? "AI Daily Skill",
    url: article.url ?? article.link ?? "",
    readTime: article.readTime ?? "5 分钟",
    impact: article.impact ?? "中",
    tags: Array.isArray(article.tags) ? article.tags : ["AI"],
  }));

  return {
    id: date,
    date,
    weekday: getChineseWeekday(date),
    lunar: source?.lunar ?? "",
    issueNo: source?.issueNo ?? date.replaceAll("-", ""),
    updatedAt:
      source?.updatedAt ??
      new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date()),
    pulse: source?.pulse ?? [
      { label: "模型活跃度", value: 80, delta: "+0" },
      { label: "论文热度", value: 80, delta: "+0" },
      { label: "行业关注度", value: 80, delta: "+0" },
      { label: "融资热度", value: 60, delta: "+0" },
    ],
    briefing:
      source?.briefing ??
      normalizedArticles.slice(0, 6).map((article, index) => ({
        time: `0${Math.min(index + 6, 9)}:00`,
        category: article.category,
        title: article.title,
        source: article.source,
        url: article.url,
      })),
    articles: normalizedArticles,
  };
}

function isPublishableArticle(article) {
  return Boolean(
    article?.title &&
      article?.summary &&
      article?.body &&
      article?.source &&
      article.source !== "AI Daily Pipeline" &&
      !article.id?.includes("placeholder"),
  );
}

function isPublishableIssue(issue) {
  const validArticles = Array.isArray(issue?.articles) ? issue.articles.filter(isPublishableArticle) : [];
  return Boolean(issue?.id && issue?.date && validArticles.length >= minArticles);
}

async function updateIndex(newFile) {
  const files = await readdir(issuesDir);
  const issueFiles = files
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file))
    .concat(newFile)
    .filter((file, index, all) => all.indexOf(file) === index)
    .sort()
    .reverse();

  await writeFile(
    path.join(issuesDir, "index.json"),
    `${JSON.stringify({ issues: issueFiles }, null, 2)}\n`,
    "utf8",
  );
}

async function main() {
  const date = process.env.AI_DAILY_DATE ?? getShanghaiDate();
  const source = await loadSkillOutput();
  const issue = normalizeIssue(source, date);
  if (!isPublishableIssue(issue)) {
    console.log(`Skipped ${date}: publishable article count is below ${minArticles}.`);
    return;
  }

  const filename = `${issue.id}.json`;

  await mkdir(issuesDir, { recursive: true });
  await writeFile(path.join(issuesDir, filename), `${JSON.stringify(issue, null, 2)}\n`, "utf8");
  await updateIndex(filename);

  console.log(`Generated ${filename}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
