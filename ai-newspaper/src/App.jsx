import { useEffect, useMemo, useState } from "react";

const categories = ["全部", "模型", "研究", "产品", "行业", "资本", "政策", "观点"];

const fallbackIssues = [
  {
    id: "fallback",
    date: "2026-06-09",
    weekday: "星期二",
    lunar: "四月廿四",
    issueNo: "2026-161",
    updatedAt: "07:30",
    pulse: [
      { label: "模型活跃度", value: 91, delta: "+7" },
      { label: "论文热度", value: 76, delta: "+3" },
      { label: "行业关注度", value: 84, delta: "+5" },
      { label: "融资热度", value: 68, delta: "-2" },
    ],
    briefing: [
      {
        time: "07:15",
        category: "模型",
        title: "日报数据加载中，若离线则显示这条兜底内容",
        source: "AI Daily",
        url: "https://github.com/evgenyasho360-code/ai-newspaper",
      },
    ],
    articles: [
      {
        id: "fallback-lead",
        category: "模型",
        priority: "lead",
        title: "AI 前沿日报已准备好读取每日 JSON 数据",
        summary: "网页会优先读取 public/data/issues/index.json，并加载其中列出的每一期日报。",
        body: "后续只要采集 skill 每天生成新的 YYYY-MM-DD.json，并更新 index.json，公开网页就会显示最新一期内容。",
        source: "AI Daily",
        url: "https://github.com/evgenyasho360-code/ai-newspaper",
        readTime: "3 分钟",
        impact: "中",
        tags: ["自动化", "日报"],
      },
    ],
  },
];

function App() {
  const [issues, setIssues] = useState(fallbackIssues);
  const [issueId, setIssueId] = useState(fallbackIssues[0].id);
  const [category, setCategory] = useState("全部");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState(fallbackIssues[0].articles[0].id);

  useEffect(() => {
    let ignore = false;

    async function loadPublishedIssues() {
      try {
        const indexResponse = await fetch("/data/issues/index.json", { cache: "no-store" });
        if (!indexResponse.ok) return;

        const indexData = await indexResponse.json();
        const files = Array.isArray(indexData.issues) ? indexData.issues : [];
        const loadedIssues = await Promise.all(
          files.map(async (file) => {
            const issueResponse = await fetch(`/data/issues/${file}`, { cache: "no-store" });
            if (!issueResponse.ok) throw new Error(`Failed to load issue ${file}`);
            return issueResponse.json();
          }),
        );

        const validIssues = loadedIssues.filter((item) => item?.id && item?.articles?.length);
        if (!ignore && validIssues.length > 0) {
          setIssues(validIssues);
          setIssueId(validIssues[0].id);
          setExpandedId(validIssues[0].articles[0]?.id ?? "");
        }
      } catch (error) {
        console.warn("Using fallback newspaper data.", error);
      }
    }

    loadPublishedIssues();
    return () => {
      ignore = true;
    };
  }, []);

  const issue = issues.find((item) => item.id === issueId) ?? issues[0];

  const filteredArticles = useMemo(() => {
    return issue.articles.filter((article) => {
      const matchesCategory = category === "全部" || article.category === category;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        [article.title, article.summary, article.source, article.category, ...(article.tags ?? [])]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [category, issue, query]);

  const leadArticle = filteredArticles.find((article) => article.priority === "lead") ?? filteredArticles[0];
  const supportingArticles = filteredArticles.filter((article) => article.id !== leadArticle?.id);

  const grouped = categories
    .filter((item) => item !== "全部")
    .map((item) => ({
      category: item,
      articles: issue.articles.filter((article) => article.category === item),
    }))
    .filter((group) => group.articles.length > 0);

  function changeIssue(nextId) {
    const nextIssue = issues.find((item) => item.id === nextId) ?? issues[0];
    setIssueId(nextId);
    setCategory("全部");
    setQuery("");
    setExpandedId(nextIssue.articles[0]?.id ?? "");
  }

  function SourceLink({ item, prefix = "" }) {
    if (!item.url) {
      return <span>{prefix}{item.source}</span>;
    }

    return (
      <a className="source-link" href={item.url} rel="noreferrer" target="_blank">
        {prefix}{item.source} ↗
      </a>
    );
  }

  return (
    <main className="paper-shell">
      <header className="masthead">
        <div className="dateline">
          <p>聚焦全球 AI 前沿</p>
          <strong>{issue.date}</strong>
          <span>{issue.weekday} · 农历{issue.lunar}</span>
          <span>第 {issue.issueNo} 期</span>
        </div>

        <div className="brand-block">
          <h1>AI 前沿日报</h1>
          <p>每日精选全球 AI 领域最新进展</p>
        </div>

        <section className="pulse-panel" aria-label="AI 脉搏">
          <div className="pulse-title">
            <strong>AI 脉搏</strong>
            <span>{issue.updatedAt} 更新</span>
          </div>
          <div className="pulse-grid">
            {issue.pulse.map((item) => (
              <div className="pulse-item" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <em className={item.delta.startsWith("-") ? "down" : "up"}>{item.delta}</em>
              </div>
            ))}
          </div>
        </section>
      </header>

      <section className="control-bar" aria-label="日报筛选">
        <label className="issue-picker">
          <span>选择日期</span>
          <select value={issueId} onChange={(event) => changeIssue(event.target.value)}>
            {issues.map((item) => (
              <option value={item.id} key={item.id}>
                {item.date}
              </option>
            ))}
          </select>
        </label>

        <nav className="category-tabs" aria-label="分类">
          {categories.map((item) => (
            <button
              className={item === category ? "active" : ""}
              key={item}
              onClick={() => setCategory(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </nav>

        <label className="search-box">
          <span>搜索</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索文章、公司、模型或关键词..."
            value={query}
          />
        </label>
      </section>

      <section className="layout-grid">
        <aside className="archive-panel" aria-label="历史期数">
          <div className="section-heading">
            <h2>历史期数</h2>
          </div>
          <div className="issue-list">
            {issues.map((item) => (
              <button
                className={item.id === issueId ? "selected" : ""}
                key={item.id}
                onClick={() => changeIssue(item.id)}
                type="button"
              >
                <strong>{item.date.slice(5)}</strong>
                <span>{item.weekday}</span>
                <em>{item.articles.length} 篇</em>
              </button>
            ))}
          </div>

          <div className="source-note">
            <strong>数据接入方式</strong>
            <p>后续让采集 skill 每天生成一期 JSON，网页无需访问者安装 skill。</p>
          </div>
        </aside>

        <section className="front-page" aria-label="今日头版">
          {leadArticle ? (
            <article className="lead-story">
              <div className="story-media">
                <span>{leadArticle.category}</span>
                <strong>{leadArticle.tags?.[0] ?? "AI"}</strong>
              </div>
              <div className="story-copy">
                <div className="article-kicker">
                  <span>{leadArticle.category}</span>
                  <em>{leadArticle.impact}影响</em>
                </div>
                <h2>{leadArticle.title}</h2>
                <p>{leadArticle.summary}</p>
                <div className="article-meta">
                  <SourceLink item={leadArticle} prefix="来源：" />
                  <span>阅读 {leadArticle.readTime}</span>
                </div>
                <button
                  className="text-button"
                  onClick={() => setExpandedId(expandedId === leadArticle.id ? "" : leadArticle.id)}
                  type="button"
                >
                  {expandedId === leadArticle.id ? "收起正文" : "展开正文"}
                </button>
                {expandedId === leadArticle.id && <p className="article-body">{leadArticle.body}</p>}
              </div>
            </article>
          ) : (
            <div className="empty-state">没有找到匹配文章。换个分类或关键词试试。</div>
          )}

          <div className="feature-grid">
            {supportingArticles.slice(0, 4).map((article) => (
              <article className="feature-story" key={article.id}>
                <div className="article-kicker">
                  <span>{article.category}</span>
                  <em>{article.impact}影响</em>
                </div>
                <h3>{article.title}</h3>
                <p>{article.summary}</p>
                <div className="article-meta">
                  <SourceLink item={article} />
                  <span>{article.readTime}</span>
                </div>
                <button
                  className="text-button"
                  onClick={() => setExpandedId(expandedId === article.id ? "" : article.id)}
                  type="button"
                >
                  {expandedId === article.id ? "收起" : "阅读"}
                </button>
                {expandedId === article.id && <p className="article-body compact">{article.body}</p>}
              </article>
            ))}
          </div>
        </section>

        <aside className="briefing-panel" aria-label="快讯">
          <div className="section-heading">
            <h2>快讯</h2>
            <button type="button">更多</button>
          </div>
          <div className="briefing-list">
            {issue.briefing.map((item) => (
              <a
                href={item.url ?? "#"}
                key={`${item.time}-${item.title}`}
                onClick={(event) => {
                  if (!item.url) event.preventDefault();
                }}
                rel="noreferrer"
                target={item.url ? "_blank" : undefined}
              >
                <time>{item.time}</time>
                <span>{item.category}</span>
                <strong>{item.title}</strong>
                <em>{item.source}</em>
              </a>
            ))}
          </div>
        </aside>
      </section>

      <section className="category-board" aria-label="分类版面">
        {grouped.map((group) => (
          <article className="category-column" key={group.category}>
            <div className="section-heading">
              <h2>{group.category}</h2>
              <button onClick={() => setCategory(group.category)} type="button">
                筛选
              </button>
            </div>
            <ul>
              {group.articles.slice(0, 3).map((article) => (
                <li key={article.id}>
                  <button onClick={() => setExpandedId(article.id)} type="button">
                    <strong>{article.title}</strong>
                    <span>
                      {article.source} · {article.readTime}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}

export { App };
