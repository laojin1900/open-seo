# OpenSEO × GEO：综合 SEO+GEO 运营中台 · 产品化规划

> 状态：规划 v1（2026-08-13）· 待老金拍板决策点后进入实施
> 目标：把 2026-08-12 落地的 GEO 方法论体系（docs/geohub/ + geo-visibility 采样 + 周报集成）产品化进 OpenSEO 后台，做成「AI 时代的 SEO 运营中台」
> 约束：遵循 FORK-STRATEGY.md（新增文件优先 / migration 9xxx 段 / 最小侵入）；AGPL 自用无义务

## 1. 定位与价值主张

**OpenSEO 现有**：传统 SEO 数据（GSC 流量、DataForSEO 排名、外链、站点审计）——回答「在 Google 表现如何」。
**GEO 补充**：AI 引擎可见度（回答率/提及率/引用率）、AI 就绪度诊断、AI 友好内容规范——回答「在 ChatGPT/Perplexity 里表现如何」。

产品一句话：**一个后台同时看两套搜索引擎（Google + AI 引擎）的表现，并给出可执行的改进动作。**

差异化：目前生态里 SEO 工具（Ahrefs/Semrush）和 AEO 工具（Profound/Peec）是两套割裂产品；GEOHub 是 skill 不是产品。整合进自研后台 = 三站（awwwstore/laojinchuhai/awwwbuy）一个中台管完。

## 2. 现状盘点

### 已有资产（OpenSEO 侧，v0.1.4 已激活）
| 能力 | 状态 |
|---|---|
| 三站 GSC 连接 + 实时流量 | ✅ 已连（38/36/115 点击） |
| Rank Tracking（DataForSEO，5min cron） | ✅ awwwstore + laojinchuhai 各 6 词 |
| Site Audit（爬虫 + 技术审计） | ✅ awwwstore 50 页完成 |
| Backlinks / Domain Overview / Brand Lookup | ✅ 有数据 |
| 项目/组织/凭据体系 | ✅ shared-workspace |

### 已有资产（GEO 方法论侧，2026-08-12 落地在 laojinchuhai 仓库）
| 资产 | 位置 | 产品化价值 |
|---|---|---|
| 测量方法论（三率 + Wilson + 分层） | `docs/geohub/measure-method.md` | → AI Visibility 模块核心算法 |
| 采样问题集 15 条（措辞固定） | `docs/geo-visibility/query-set.md` | → 产品内问题集管理 |
| 记录模板（trial schema） | `docs/geo-visibility/template.json` | → 数据库 trial 表设计蓝本 |
| 内容证据矩阵规则 | `docs/geohub/content-evidence-rules.md` | → 内容模块校验器 |
| GEO 就绪度诊断维度 | `docs/geohub/readiness-audit-*.md` | → Site Audit AI 就绪度维度 |
| 周报集成（Wilson 计算） | `scripts/weekly-report.ts` | → 产品内报表逻辑 |

### 缺口（GEOHub 有、我们还没有的产品形态）
geo-discover（问题簇扩展）、geo-diagnose（页面诊断）、geo-content 7 模式、geo-measure 聚合——**全部以「方法论文档」形式存在，没有产品载体**。

## 3. 产品设计

### 3.1 新模块：AI Visibility（AI 搜索可见度）★ 核心

**位置**：左侧 MY SITE 区，`AI Visibility`（在 GSC Insights 之后）。

**数据模型**（migration 9001_laojin_ai_visibility）：
```
ai_visibility_query_sets        -- 问题集（品牌词/品类词分组，措辞锁定=回放边界）
  id, project_id, name, engine, language, locale, created_at
ai_visibility_queries            -- 问题（set 内，query_id 稳定）
  id, set_id, query_id, text, category(brand/category), notes
ai_visibility_trials             -- 单次采样记录（对齐 measure-method 观测单元）
  id, set_id, query_id, engine, interface, model, collected_at,
  eligible, answered, brand_mentioned, brand_cited,
  exclusion_reason, notes
```

**指标引擎**（确定性计算，无 LLM 依赖）：
- answer_rate / brand_mention_rate / brand_cite_rate / conditional_rate
- Wilson 95% 区间；周环比 delta；按 engine/query 分层
- 趋势：按周聚合曲线（snapshot 对比）

**UI（首版）**：
1. 总览卡：本周 N trials · 三率 + 区间 + 环比（对齐周报口径）
2. 趋势图：按周的三率曲线
3. 明细表：每条 trial 可查（engine/query/结果/备注）
4. 录入：手动录入表单（15 条问题集预置，一次录一条，30 秒/条）
5. 问题集管理：增删改（措辞锁定提示）

**采集层（采集器适配器，可插拔）**：
```
CollectorAdapter: manual | openai-search | perplexity | (future: playwright-gha)
```
- P1 手动录入（产品化昨天的流程，零新增外部依赖）
- P2 自动化：OpenAI Responses API（web_search tool）作为 ChatGPT AI Search 代理采集；Perplexity API 作为第二引擎；GHA cron 定时跑 + POST 结果回 OpenSEO
- 设计原则：trial schema 与采集方式解耦，换引擎不换数据层

### 3.2 Site Audit 扩展：AI 就绪度维度

现有 Site Audit 是传统技术 SEO。新增 **AI Readiness 检查集**（对齐 GEOHub geo-diagnose 维度 + 我们三层迭代经验）：
- llms.txt / llms-full.txt 存在性与可达性
- robots.txt 的 LLM 规则（GPTBot/PerplexityBot/ClaudeBot allow）
- FAQPage / Article schema 有效性与 datePublished
- 可见日期语义（`<time datetime>` + Updated 字样）
- 证据信号（可见文本含 source/according to 式表述）
- 品牌实体信号（Person/Organization schema、作者页）

输出：审计报告新增「AI Readiness 分数 + 缺失项清单」，复用现有 audit_pages/audit_issues 表（新 issue 类型 `ai-readiness`，不改表结构，只加枚举值？→ 若需改枚举用 9xxx migration 的 ALTER，或用 issue category 字段新增值）。

### 3.3 内容侧：证据矩阵校验 + 问题簇（P3）

- **Comparison/Ranking 内容校验器**：输入对比文 → 解析「实体×维度」矩阵完整性 → 缺格报告。作为 Keyword Research → 内容队列的质检步骤（对齐 content-evidence-rules.md）。
- **问题簇生成**（geo-discover）：种子词 → learn/compare/evaluate/act 四类问题扩展（确定性模板 + 可选 LLM 增强），输出可导入 AI Visibility 问题集。

### 3.4 报表：AI Visibility 周报（P2）

- 每站每周自动汇总（复用周报口径），后台内查看 + 飞书推送（复用 LEADS_FEISHU_WEBHOOK 模式）。
- 竞品对比：把竞品域名加进问题集（提及率按品牌拆解）——P3。

## 4. 分阶段路线图

| Phase | 内容 | 验收标准 | 规模 |
|---|---|---|---|
| **P0 骨架** | 9xxx migrations + AI Visibility 模块（问题集 CRUD + 手动录入 + 三率/Wilson/趋势） | 后台能录 trial、看三率与区间；laojinchuhai 首周基线数据迁入 | 1-2 次开发会话 |
| **P1 诊断整合** | Site Audit AI Readiness 检查集 | awwwstore 重跑审计出现 AI Readiness 分与缺失清单 | 1 次会话 |
| **P2 自动化采集** | OpenAI/Perplexity 采集器 + GHA 定时 + 周报推送 | 每周自动出 AI Visibility 数据，无需人工录入 | 2 次会话 |
| **P3 内容与竞品** | 证据矩阵校验器 + 问题簇生成 + 竞品可见度对比 | 对比文可过矩阵质检；竞品提及率可比 | 2 次会话 |

## 5. 技术决策（已定）

1. **fork 纪律**：新代码全部 `src/server/features/laojin/*` + `src/client/features/laojin/*` + `src/routes/laojin/*`；migration 从 **9001** 起。
2. **无 LLM 依赖的确定性计算**：指标引擎纯 TypeScript（Wilson 区间、分层聚合），不碰 SAM/OpenRouter（保持自托管零成本）。
3. **采集器适配器模式**：trial 表与采集实现解耦（见 3.1）。
4. **复用现有体系**：project/org 权限、DataForSEO 凭据、Workflow 定时、飞书推送。

## 6. 待拍板决策点

| # | 问题 | 选项 | 我的建议 |
|---|---|---|---|
| 1 | P2 自动化采集用哪个引擎优先？ | OpenAI Responses API / Perplexity API / Playwright 抓网页 | **OpenAI API**（官方合规、结果稳定、有 search 工具；Perplexity 次之） |
| 2 | AI Visibility 先覆盖哪个站？ | laojinchuhai 优先（已有基线）/ 三站同时 | **laojinchuhai 优先**（昨天问题集就是它的） |
| 3 | 问题集首版条数？ | 15 条（昨日 set）/ 扩充 | 15 条先用，P3 问题簇生成后再扩 |
| 4 | 手动录入谁来做？ | 老金每周 / 我代录 | 老金（保证真实性），P2 后自动化 |
| 5 | 竞品对比要不要加竞品域名？ | 是/否 | P3 再加 |

## 7. 风险

- **采集合规**：Playwright 抓 ChatGPT 网页有 ToS/反爬风险 → P2 首选官方 API；手动录入零风险。
- **上游同步**：所有改动遵循 fork 纪律，upstream-check 每周监测，冲突面可控。
- **采样成本**：OpenAI Responses API 每 query 约 $0.001-0.01，15 条/周/站 ≈ 每月 <$3。
