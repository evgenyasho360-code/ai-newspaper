# AI 前沿日报数据格式

网页会优先读取 `public/data/issues/index.json` 中列出的日报文件。后续接入采集 skill 时，推荐每天生成一个 JSON 文件，例如：

```text
public/data/issues/2026-06-09.json
```

## Issue

```json
{
  "id": "2026-06-09",
  "date": "2026-06-09",
  "weekday": "星期二",
  "lunar": "四月廿四",
  "issueNo": "2026-161",
  "updatedAt": "07:30",
  "pulse": [
    { "label": "模型活跃度", "value": 91, "delta": "+7" }
  ],
  "briefing": [
    {
      "time": "07:15",
      "category": "模型",
      "title": "OpenAI 推出新一代多模态代理接口",
      "source": "OpenAI Blog",
      "url": "https://openai.com/blog/"
    }
  ],
  "articles": [
    {
      "id": "lead-openai-agents",
      "category": "模型",
      "priority": "lead",
      "title": "多模态代理进入工程化阶段",
      "summary": "一句话摘要，适合头版扫描。",
      "body": "展开正文，说明为什么重要。",
      "source": "OpenAI Blog",
      "url": "https://openai.com/blog/",
      "readTime": "8 分钟",
      "impact": "高",
      "tags": ["Agent", "多模态", "工具调用"]
    }
  ]
}
```

## 字段约定

- `id`: 建议使用日期，便于历史期数索引。
- `priority`: `lead` 会成为头版主新闻，`feature` 会优先进入重点区，其余可用 `normal`。
- `category`: 当前页面支持 `模型`、`研究`、`产品`、`行业`、`资本`、`政策`、`观点`。
- `url`: 原始信息链接。页面会用它打开原文；真实 skill 接入时强烈建议每条快讯和文章都提供。
- `briefing`: 用于右侧快讯栏，适合短消息。
- `articles`: 用于头版和分类版面，至少需要 `title`、`summary`、`body`、`source`，最好包含 `url`。

后续可以增加一个生成脚本，把你的 AI 信息采集 skill 输出转换成这个结构。
