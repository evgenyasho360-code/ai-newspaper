import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const sourceNames = {
  "OpenAI News": "OpenAI 新闻",
  "Google DeepMind Blog": "Google DeepMind 博客",
  "Hugging Face Blog": "Hugging Face 博客",
  arXiv: "arXiv",
};

const titleTranslations = {
  "Introducing Mellum2: A 12B Mixture-of-Experts Model by JetBrains":
    "JetBrains 发布 Mellum2：120 亿参数混合专家模型",
  "Beyond LLMs: Why Scalable Enterprise AI Adoption Depends on Agent Logic":
    "超越大语言模型：企业规模化采用 AI 为什么依赖智能体逻辑",
  "Building the infrastructure for the Intelligence Age in Michigan":
    "在密歇根建设智能时代的基础设施",
  "OpenAI frontier models and Codex are now available on AWS":
    "OpenAI 前沿模型和 Codex 现已登陆 AWS",
  "Boston Children’s uses AI to unlock new diagnoses":
    "波士顿儿童医院用 AI 推动新的诊断发现",
  "How Braintrust turns customer requests into code with Codex":
    "Braintrust 如何用 Codex 把客户需求转化为代码",
  "Strengthening societal resilience with Rosalind Biodefense":
    "用 Rosalind Biodefense 增强社会韧性",
  "A shared playbook for trustworthy third party evaluations":
    "可信第三方评测的共享行动手册",
  "Holo3.1: Fast & Local Computer Use Agents": "Holo3.1：快速、本地化的电脑使用智能体",
  "Travelers deploys AI-powered claims countrywide with OpenAI":
    "Travelers 借助 OpenAI 在全美部署 AI 理赔能力",
  "Codex for every role, tool, and workflow": "面向每个角色、工具和工作流的 Codex",
  "Advancing youth safety and opportunity through global leadership":
    "通过全球领导力推进青少年安全与机会",
  "Codex is becoming a productivity tool for everyone": "Codex 正成为人人可用的生产力工具",
  "Our views on AI policy and political advocacy": "我们对 AI 政策与政治倡议的看法",
  "Introducing new capabilities to GPT-Rosalind": "GPT-Rosalind 新能力发布",
  "Direct Preference Optimization Beyond Chatbots": "超越聊天机器人的直接偏好优化",
  "How Wasmer used Codex to build a Node.js runtime for the edge":
    "Wasmer 如何用 Codex 构建边缘侧 Node.js 运行时",
  "OpenAI public policy agenda": "OpenAI 公共政策议程",
  "A blueprint for democratic governance of frontier AI": "前沿 AI 民主治理蓝图",
  "Adding MCP Tools to Reachy Mini": "为 Reachy Mini 添加 MCP 工具",
  "How Endava is redesigning software delivery around AI agents":
    "Endava 如何围绕 AI 智能体重塑软件交付",
  "Dreaming: Better memory for a more helpful ChatGPT": "Dreaming：让 ChatGPT 拥有更好的记忆",
  "Biodefense in the Intelligence Age": "智能时代的生物防御",
  "Designing the hf CLI as an agent-optimized way to work with the Hub":
    "把 hf CLI 设计成适合智能体操作 Hugging Face Hub 的方式",
  "Nemotron 3.5 Content Safety: Customizable Multimodal Safety for Global Enterprise AI":
    "Nemotron 3.5 内容安全：面向全球企业 AI 的可定制多模态安全能力",
  "Confidential submission of draft S-1 to the SEC": "向美国 SEC 保密提交 S-1 草案",
  "Built to benefit everyone: our plan": "为惠及所有人而构建：我们的计划",
  "Introducing the OpenAI Economic Research Exchange": "OpenAI 经济研究交流平台发布",
  "The Open Source Community is backing OpenEnv for Agentic RL":
    "开源社区支持面向智能体强化学习的 OpenEnv",
  "How engineers at Nextdoor use Codex to build without limits":
    "Nextdoor 工程师如何用 Codex 更自由地构建产品",
  "How an Agent Built a 3D Paris Gallery by Chaining Two Hugging Face Spaces":
    "一个智能体如何串联两个 Hugging Face Space 搭建 3D 巴黎画廊",
  "What Codex unlocks for Notion": "Codex 为 Notion 解锁了什么",
  "Industrial policy for the Intelligence Age": "智能时代的产业政策",
  "Migrating Your GitHub CI to Hugging Face Jobs": "将 GitHub CI 迁移到 Hugging Face Jobs",
  "PRC-linked influence operations are targeting AI debates in the US":
    "与中国相关的影响行动正在介入美国 AI 议题讨论",
  "From data to decisions: how LSEG is scaling trusted AI":
    "从数据到决策：LSEG 如何规模化可信 AI",
  "BBVA puts AI at the core of banking with OpenAI": "BBVA 与 OpenAI 合作，把 AI 放到银行业务核心",
  "How an astrophysicist uses Codex to help simulate black holes":
    "天体物理学家如何用 Codex 辅助黑洞模拟",
  "OpenAI to acquire Ona": "OpenAI 将收购 Ona",
  "Supporting Europe’s work in ensuring a trustworthy AI ecosystem":
    "支持欧洲建设可信 AI 生态",
  "Profiling in PyTorch (Part 2): From nn.Linear to a Fused MLP":
    "PyTorch 性能分析第二篇：从 nn.Linear 到融合 MLP",
  "Access OpenAI models and Codex through your Oracle cloud commitment":
    "通过 Oracle 云承诺使用 OpenAI 模型和 Codex",
  "New OpenAI Academy courses for the next era of work": "OpenAI Academy 推出面向下一代工作的课程",
  "How Preply combines AI and human tutors to personalize learning":
    "Preply 如何结合 AI 与真人教师实现个性化学习",
  "Introducing the OpenAI Partner Network": "OpenAI 合作伙伴网络发布",
  "Predicting model behavior before release by simulating deployment":
    "通过模拟部署，在发布前预测模型行为",
  "MolmoMotion: Language-guided 3D motion forecasting": "MolmoMotion：语言引导的 3D 运动预测",
  "From the Hugging Face Hub to robot hardware with Strands Agents and LeRobot":
    "从 Hugging Face Hub 到机器人硬件：Strands Agents 与 LeRobot 的连接",
  "A near-autonomous AI chemist improves a challenging reaction in medicinal chemistry":
    "近自主 AI 化学家优化药物化学中的高难度反应",
  "GLM-5.2: Built for Long-Horizon Tasks": "GLM-5.2：面向长周期任务构建",
  "Introducing LifeSciBench": "LifeSciBench 发布",
  "Agentic Resource Discovery: Let agents search": "智能体资源发现：让智能体自己搜索",
  "Improving health intelligence in ChatGPT": "提升 ChatGPT 的健康智能",
  "Using AI to help physicians diagnose rare genetic diseases affecting children":
    "用 AI 帮助医生诊断儿童罕见遗传病",
  "Beyond LoRA: Can you beat the most popular fine-tuning technique?":
    "超越 LoRA：能否击败最流行的微调技术",
  "Is it agentic enough? Benchmarking open models on your own tooling":
    "它足够智能体化吗？用自己的工具评测开源模型",
  "MosaicLeaks: Can your research agent keep a secret?": "MosaicLeaks：你的研究智能体能保守秘密吗",
  "JanusMesh: Fast and Zero-Shot 3D Visual Illusion Generation via Cross-Space Denoising":
    "JanusMesh：通过跨空间去噪快速零样本生成 3D 视觉错觉",
  "MemoryWAM: Efficient World Action Modeling with Persistent Memory":
    "MemoryWAM：具备持久记忆的高效世界动作建模",
  "TimeProVe: Propose, then Verify for Efficient Long Video Temporal Reasoning in Activities of Daily Living":
    "TimeProVe：先提出再验证，用于日常活动长视频的高效时间推理",
  "How Transparent is DiffusionGemma?": "DiffusionGemma 有多透明",
  "UNIEGO: Proxies as Mediators for Unified Egocentric Video Representation Learning":
    "UNIEGO：以代理作为中介，统一第一视角视频表征学习",
  "Optimal Deterministic Multicalibration and Omniprediction":
    "最优确定性多重校准与全预测",
  "Thinking in Boxes: 3D Editing in Real Images Made Easy": "盒中思考：让真实图像中的 3D 编辑更简单",
  "New usage analytics and updated spend controls for enterprises":
    "企业版新增使用分析和支出控制能力",
  "PP-OCRv6 on Hugging Face: 50-Language OCR from 1.5M to 34.5M Parameters":
    "PP-OCRv6 登陆 Hugging Face：覆盖 50 种语言的 OCR 模型",
  "Samsung Electronics brings ChatGPT and Codex to employees":
    "三星电子向员工开放 ChatGPT 和 Codex",
};

function hasChinese(text = "") {
  return /[\u4e00-\u9fa5]/.test(text);
}

function zhTitle(title = "") {
  return titleTranslations[title] ?? (hasChinese(title) ? title : `AI 动态：${title}`);
}

function zhSource(source = "") {
  return sourceNames[source] ?? source;
}

function zhTopic(article, title) {
  if (article.category === "研究") return `这项研究关注「${title}」，反映了 AI 论文、评测和方法探索的最新进展。`;
  if (article.category === "模型") return `这条模型动态围绕「${title}」展开，重点影响模型能力、智能体执行或多模态体验。`;
  if (article.category === "产品") return `这条产品动态聚焦「${title}」，体现 AI 工具、平台或工作流正在进入更具体的使用场景。`;
  if (article.category === "政策") return `这条政策动态围绕「${title}」展开，关系到 AI 治理、安全和产业落地边界。`;
  if (article.category === "资本") return `这条资本动态聚焦「${title}」，体现 AI 公司、基础设施和商业化方向的变化。`;
  return `这条 AI 动态关注「${title}」，值得继续跟踪其对行业和产品实践的影响。`;
}

function zhSummary(article, title) {
  const source = zhSource(article.source);
  const topic = zhTopic(article, title);
  return `${source}发布了「${title}」。${topic}`;
}

export function localizeArticle(article) {
  const title = zhTitle(article.title);
  const summary = zhSummary(article, title);
  return {
    ...article,
    title,
    summary,
    body: summary,
    source: zhSource(article.source),
    tags: Array.isArray(article.tags)
      ? article.tags.map((tag) => titleTranslations[tag] ?? sourceNames[tag] ?? tag)
      : article.tags,
  };
}

export function localizeIssue(issue) {
  const localizedArticles = (issue.articles ?? []).map(localizeArticle);
  const titleByUrl = new Map(localizedArticles.map((article) => [article.url, article.title]));
  const sourceByUrl = new Map(localizedArticles.map((article) => [article.url, article.source]));
  return {
    ...issue,
    briefing: (issue.briefing ?? []).map((item) => ({
      ...item,
      title: titleByUrl.get(item.url) ?? zhTitle(item.title),
      source: sourceByUrl.get(item.url) ?? zhSource(item.source),
    })),
    articles: localizedArticles,
  };
}

async function localizeExistingIssues() {
  const issuesDir = path.resolve("public/data/issues");
  const files = (await readdir(issuesDir)).filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file));
  for (const file of files) {
    const filePath = path.join(issuesDir, file);
    const issue = JSON.parse(await readFile(filePath, "utf8"));
    await writeFile(filePath, `${JSON.stringify(localizeIssue(issue), null, 2)}\n`, "utf8");
    console.log(`Localized ${file}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  localizeExistingIssues().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
