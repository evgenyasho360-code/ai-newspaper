import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const issuesDir = path.resolve("public/data/issues");
const sourceFile = process.env.AI_DAILY_SOURCE_FILE;

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
    articles: normalizedArticles.length > 0 ? normalizedArticles : createPlaceholderArticles(date),
  };
}

function createPlaceholderArticles(date) {
  return [
    {
      id: `${date}-placeholder`,
      category: "观点",
      priority: "lead",
      title: "今日 AI 日报生成脚本已就绪，等待接入真实 skill 输出",
      summary: "这是一条占位内容，用来验证每日自动发布链路。接入采集 skill 后会被真实日报替换。",
      body: "当前脚本会写入当天 JSON 并更新期数索引。后续把 AI_DAILY_SOURCE_FILE 指向 skill 输出文件，或在 loadSkillOutput 中直接调用你的 skill 即可。",
      source: "AI Daily Pipeline",
      url: "https://github.com/evgenyasho360-code/ai-newspaper",
      readTime: "3 分钟",
      impact: "中",
      tags: ["自动化", "部署"],
    },
  ];
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
