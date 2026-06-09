# Cloudflare Pages 部署说明

这个项目适合部署为公开静态站点，推荐使用 Cloudflare Pages。

## Cloudflare Pages 设置

连接 GitHub 仓库后，项目设置建议如下：

```text
Framework preset: Vite
Root directory: ai-newspaper
Build command: npm run build
Build output directory: dist
Node.js version: 22
```

Cloudflare Pages 连接 GitHub 后，每次 `main` 分支有新提交都会自动构建并发布。

## 每日自动更新

仓库根目录的 workflow：

```text
.github/workflows/daily-issue.yml
```

会在每天北京时间 07:30 自动运行：

```text
cron: 30 23 * * *
```

流程：

1. 安装依赖。
2. 运行 `npm run generate:issue`。
3. 生成或更新 `public/data/issues/YYYY-MM-DD.json`。
4. 更新 `public/data/issues/index.json`。
5. 提交 JSON 变更到 GitHub。
6. Cloudflare Pages 检测到新提交后自动重新发布。

## 接入真实采集 skill

当前脚本在没有真实输入时会生成占位日报，方便验证部署链路。

后续有两种接入方式：

1. 让 skill 先输出一个 JSON 文件，然后在 GitHub Actions 里设置：

```bash
AI_DAILY_SOURCE_FILE=path/to/source.json npm run generate:issue
```

2. 直接在 `scripts/generate-issue.mjs` 的 `loadSkillOutput()` 函数里调用你的 skill，并返回结构化结果。

最终网页访问者只会读取发布后的静态 JSON，不需要安装或运行 skill。
