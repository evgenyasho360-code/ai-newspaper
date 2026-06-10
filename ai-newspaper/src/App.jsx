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
        title: "今日 AI 前沿日报正在更新",
        summary: "我们正在整理今天最值得关注的 AI 进展，请稍后刷新查看完整内容。",
        body: "本期内容会覆盖模型、研究、产品、行业、资本、政策与观点。页面暂时展示占位内容，更新完成后会自动呈现最新日报。",
        source: "AI Daily",
        url: "https://github.com/evgenyasho360-code/ai-newspaper",
        readTime: "3 分钟",
        impact: "中",
        tags: ["自动化", "日报"],
      },
    ],
  },
];

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
  return Boolean(issue?.id && validArticles.length >= 2);
}

function App() {
  const [issues, setIssues] = useState(fallbackIssues);
  const [issueId, setIssueId] = useState(fallbackIssues[0].id);
  const [category, setCategory] = useState("全部");
  const [query, setQuery] = useState("");
  const [favoriteIds, setFavoriteIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ai-daily-favorites") ?? "[]");
    } catch {
      return [];
    }
  });

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

        const validIssues = loadedIssues.filter(isPublishableIssue);
        if (!ignore && validIssues.length > 0) {
          setIssues(validIssues);
          setIssueId(validIssues[0].id);
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

  const favoriteArticles = useMemo(() => {
    return favoriteIds
      .map((key) => {
        const [storedIssueId, articleId] = key.split(":");
        const storedIssue = issues.find((item) => item.id === storedIssueId);
        const article = storedIssue?.articles.find((item) => item.id === articleId);
        return article ? { ...article, issueDate: storedIssue.date, favoriteKey: key } : null;
      })
      .filter(Boolean);
  }, [favoriteIds, issues]);

  function changeIssue(nextId) {
    setIssueId(nextId);
    setCategory("全部");
    setQuery("");
  }

  function getFavoriteKey(article) {
    return `${issue.id}:${article.id}`;
  }

  function toggleFavorite(article) {
    const key = getFavoriteKey(article);
    setFavoriteIds((current) => {
      const next = current.includes(key) ? current.filter((item) => item !== key) : [key, ...current];
      localStorage.setItem("ai-daily-favorites", JSON.stringify(next));
      return next;
    });
  }

  function SourceLink({ item }) {
    if (!item.url) {
      return <span>暂无原文</span>;
    }

    return (
      <a className="source-link" href={item.url} rel="noreferrer" target="_blank">
        阅读原文 ↗
      </a>
    );
  }

  function ImpactStars({ value }) {
    const score = value === "高" ? 3 : value === "低" ? 1 : 2;
    return (
      <span aria-label={`${score} 星`} className="impact-stars">
        {"★".repeat(score)}
        {"☆".repeat(3 - score)}
      </span>
    );
  }

  function ArticleActions({ article }) {
    const favoriteKey = getFavoriteKey(article);
    const isFavorite = favoriteIds.includes(favoriteKey);

    return (
      <div className="article-actions">
        <SourceLink item={article} />
        <button
          className={isFavorite ? "favorite-button active" : "favorite-button"}
          onClick={() => toggleFavorite(article)}
          type="button"
        >
          {isFavorite ? "已收藏" : "收藏"}
        </button>
      </div>
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
                  <ImpactStars value={leadArticle.impact} />
                  <span className="meta-pill">{leadArticle.source}</span>
                  <span className="meta-pill">阅读 {leadArticle.readTime}</span>
                </div>
                <h2>{leadArticle.title}</h2>
                <p>{leadArticle.summary}</p>
                <p className="article-body">{leadArticle.body}</p>
                <ArticleActions article={leadArticle} />
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
                  <ImpactStars value={article.impact} />
                  <span className="meta-pill">{article.source}</span>
                  <span className="meta-pill">{article.readTime}</span>
                </div>
                <h3>{article.title}</h3>
                <p>{article.summary}</p>
                <p className="article-body compact">{article.body}</p>
                <ArticleActions article={article} />
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

      <section className="favorites-board" aria-label="收藏夹">
        <div className="section-heading">
          <h2>收藏夹</h2>
          <span>{favoriteArticles.length} 条</span>
        </div>
        {favoriteArticles.length > 0 ? (
          <div className="favorite-list">
            {favoriteArticles.map((article) => (
              <article className="favorite-item" key={article.favoriteKey}>
                <div>
                  <strong>{article.title}</strong>
                  <span>
                    {article.issueDate} · {article.source} · {article.readTime}
                  </span>
                </div>
                <div className="favorite-actions">
                  <SourceLink item={article} />
                  <button
                    className="favorite-button active"
                    onClick={() => {
                      setFavoriteIds((current) => {
                        const next = current.filter((item) => item !== article.favoriteKey);
                        localStorage.setItem("ai-daily-favorites", JSON.stringify(next));
                        return next;
                      });
                    }}
                    type="button"
                  >
                    移除
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">还没有收藏。看到值得回看的新闻，可以点「收藏」放到这里。</div>
        )}
      </section>
    </main>
  );
}

export { App };
