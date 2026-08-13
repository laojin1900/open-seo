# Fork 策略：自研迭代 × 上游同步

> 本仓库是 `every-app/open-seo` 的 fork（`laojin1900/open-seo`），已做本地定制并计划持续自研迭代。
> 本文档定义「上游代码变化时如何同步跟上」的纪律与流程。**每次改动前先读本节。**

## 1. 仓库关系

```
every-app/open-seo（上游，官方）
        │  fork
        ▼
laojin1900/open-seo（我们的 fork）
        │  clone
        ▼
~/open-seo（本地开发）── wrangler deploy ──→ Cloudflare Workers（seo.365loopa.com）
```

- remote 约定：`origin` = 我们的 fork，`upstream` = 官方仓库（已配好）。
- 部署只认本地 `main` 分支；实验改动走 `feature/xxx` 分支，验证后合回 main。

## 2. 定制纪律（三条铁律）

### 2.1 定制优先「新增」，不「修改」

- 新功能放独立目录：`src/server/features/laojin/*`、`src/client/features/laojin/*`、`src/routes/laojin/*`。
- 上游文件里只做「最小侵入」修改；改之前先问：能不能用新增文件 + 挂载点实现？
- 理由：上游永远不会碰我们新增的文件 → merge 零冲突。

### 2.2 D1 migration 编号隔离（最重要的坑）

- **上游占用**：`drizzle/0001_*.sql` ~ `0041_*.sql` 连续编号（会继续增长）。
- **我们的 migration 必须用独立段**：`drizzle/9xxx_laojin_<描述>.sql`（从 9001 开始）。
- 生成方式：不要用 drizzle-kit 默认 generate（它会占用下一个连续号），手写 SQL 文件 + 手动登记 `drizzle/meta/_journal.json`。
- 合并上游后若其 migration 编号超过我们的 9xxx 段，需要把我们的段整体后移（如 9xxx → 10xxx）并更新 journal——只在编号碰撞时才做。
- 理由：两边迁移按编号排队，撞号会导致迁移互相覆盖，是最难修复的 fork 事故。

### 2.3 高频冲突文件改动最小化

- `wrangler.jsonc`：只允许存在「资源 ID/自定义域」类必要定制（现状约 5 行），其余一律跟上游。
- 冲突解决模板：**以 upstream 版本为基础 + 叠加我们的资源 ID 段**。
- `README.md`：品牌块保持独立小节，冲突时保留双方。

## 3. 同步流程

### 3.1 常规小步（月度，v0.1.x 小版本）

```bash
cd ~/open-seo
git checkout main && git pull origin main
git fetch upstream main
git rev-list --count main..upstream/main   # 看落后数
# 落后 ≤ 30 直接合：
git merge upstream/main --no-edit
# 冲突按 §4 处理
pnpm install && pnpm run build             # 必须过
pnpm run db:migrate:prod                   # 新 migration 落库
pnpm exec wrangler deploy
git push origin main
```

### 3.2 大版本 / 架构重构（如 monorepo、org 模型变更）

- 走分支：`git checkout -b merge-upstream-<version>` → 合并 → **人工对照上游 CHANGELOG/commits 检查被影响的定制模块** → 在 preview 环境验证 → 合 main。
- 历史案例：2026-08-12 合并 58 commits（v0.1.4），因定制少自动合并通过；v0.1.4 引入了 shared-workspace org 模型与 `web/` 营销页 monorepo。

### 3.3 节奏与监控

- **不要攒超过 30 个 commit 再合**：攒越多冲突面越大。
- GHA 工作流 `upstream-check.yml` 每周一自动检查落后数，超过阈值 workflow 置 failed 触发 GitHub 邮件提醒。

## 4. 冲突处理手册

| 冲突文件 | 处理方式 |
|---|---|
| `wrangler.jsonc` | 以 upstream 为基础，叠加我们的 KV/D1/R2/OAuth KV 资源 ID；若上游新增 bindings，保留并沿用我们的 ID 命名 |
| `src/db/*.schema.ts` | 以 upstream 为基础，重新应用我们的表/字段，并配套 9xxx migration；**生产数据兼容性**是最高优先级（先看 migration 是否破坏现有数据） |
| `drizzle/meta/_journal.json` | 保留双方全部条目，按时间顺序排列；我们的 9xxx 段保持独立 |
| `package.json` / lockfile | 以 upstream 为准，我们的额外依赖单独加回，`pnpm install` 重新生成 lockfile |
| 前端组件 | 以 upstream 为基础，我们的 UI 定制若无法低成本重放，评估改为独立组件挂载 |

## 5. 已知坑（部署/开发相关）

1. **改 `wrangler.jsonc` 后必须重新 `pnpm run build`**，否则 deploy 用的是 `dist/server/wrangler.json` 旧缓存。
2. `wrangler.jsonc` 的 `routes` 段已删除：自定义域在 Cloudflare 面板绑定；新版 wrangler 禁止自定义域 route 带通配符/路径。
3. D1 远程查询必须加 `--remote`（默认查本地空库）。
4. 本机 TUN 代理（198.18.0.0/15）会影响需要 DNS 校验的工具，遇「resolves to a non-public address」用 HTML 快照/本地方式绕过。
5. Auth 模型：`AUTH_MODE=cloudflare_access`，全员共享 `shared-workspace` org；OAuth token 存 better-auth `account` 表，UI 读 `gsc_connections` 表。
6. GSC/GA4 连接依赖 Google Cloud 项目 `gws-cli`（986939542061）的 API 启用状态：新增 Google 集成先确认对应 API 已启用。

## 6. 许可边界（AGPL-3.0）

- 代码本体 AGPL-3.0（上游另有商业授权出售）。
- **自用（自己站点的后台）无义务**。
- **若未来把定制版作为 SaaS 对外提供服务，AGPL 要求公开衍生源码**——届时需评估：买上游商业授权，或剥离定制部分独立实现。定制越深、与上游耦合越紧，未来脱离成本越高，所以铁律 2.1（定制隔离）同时是许可策略。
