# 链上行为分析索引器

NADBID 协议的链上事件索引与分析 API。零依赖、零成本，本地与 Vercel serverless 共用同一套代码。

## 架构

```
链上合约 (Monad Testnet)
    │
    ▼  scanAuctions() — 状态全量扫描 (auctionCount + auctions(i))
    │  watchEvents()  — 事件实时监听 (9 种事件，常驻进程用)
    ▼
IndexStore — JSON 原子写入 (本地) / /tmp (Vercel)
    │
    ├─▶ 内存缓存 (TTL 5 分钟, single-flight 防并发重复同步)
    │
    └─▶ Vercel KV (可选，持久化层 — 实例回收后数据不丢)
              │
              ▼
Express API — /api/analytics/*
```

**生产持久化策略**：Vercel serverless 无持久盘，采用**内存缓存 + KV 持久化 + Cron 定期同步**：
- 冷启动时先从 KV 恢复（如果绑定了 KV），无需重新扫链
- 没有 KV 时自动降级为内存缓存（首次请求扫链，约 1-2 秒）
- 每次同步后异步写入 KV（不阻塞主流程）
- Vercel Cron 每 5 分钟调用 `/api/analytics/sync` 保持实例热 + 数据新鲜
- 出价明细通过本地常驻索引器（`--watch`）实时监听并写入 KV

## 本地开发

```bash
# 启动 API 服务 (port 3001)
npx tsx server/index.ts

# 手动全量同步（状态扫描）
npx tsx server/indexer-cli.ts

# 常驻模式（事件监听 + 每 60 秒增量扫描）
npx tsx server/indexer-cli.ts --watch 60

# 尝试拉取历史事件日志（Monad 公共 RPC 受限时可能失败，自动降级）
npx tsx server/indexer-cli.ts --logs
```

Vite dev server 已配置 `/api/analytics` 代理到 `localhost:3001`，前端无需额外配置。

## Vercel 部署

### 1. Cron 配置（已在 vercel.json）

```json
"crons": [{ "path": "/api/analytics/sync", "schedule": "*/5 * * * *" }]
```

### 2. 设置 CRON_SECRET（安全，必须）

Vercel Cron 调用时会自动带 `authorization: Bearer <CRON_SECRET>` 头。

1. 进入 Vercel 项目 → **Settings** → **Cron Jobs**
2. 点击 **Generate** 生成 CRON_SECRET（或手动设置一个长随机字符串）
3. 或在 **Settings → Environment Variables** 添加 `CRON_SECRET`

未设置 CRON_SECRET 时，生产环境的 `/api/analytics/sync` 端点会拒绝未授权调用（但 overview/auctions 端点的自动同步仍正常工作——Cron 只是预热，不设置也能用，只是冷启动稍慢）。

### 3. 绑定 Upstash Redis（强烈推荐，持久化）

> **注意**：Vercel KV 已于 2024 年 12 月停用，新项目需通过 Vercel Marketplace 安装 **Upstash Redis**（Vercel KV 底层就是 Upstash，效果完全一样）。

不绑定 KV 也能用（内存缓存 + 自动重建），但**实例回收后数据丢失、出价明细无法积累**。绑定 Upstash 后：
- 拍卖级数据永久保存（7 天 TTL，每次同步刷新）
- 实例回收后从 KV 秒级恢复，无需重新扫链
- 本地常驻索引器写入的出价明细，线上也能读到

**绑定步骤**：
1. Vercel 项目 → 顶部 **Marketplace**（不是 Storage）
2. 搜索 **Upstash** → 点击 **Upstash Redis** → **Add Integration**
3. 授权后选择 **Create Database**（或选已有）
   - 命名：`nadbid-index`
   - 类型：Regional（选离你 Vercel 函数最近的区域，如 `us-east-1`）
   - 免费档：10,000 commands/天，256MB 存储（够用）
4. 连接到当前项目 → 自动注入环境变量：
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `UPSTASH_REDIS_REST_READ_ONLY_TOKEN`
5. 重新部署

代码会自动检测 `UPSTASH_REDIS_REST_URL`（或旧的 `KV_REST_API_URL`）环境变量，有则启用 KV，无则静默降级为内存缓存。

### 4. 出价明细持久化（本地常驻索引器）

Monad 公共 RPC 历史日志不可用，serverless 无法拉取历史 BidPlaced 事件。**出价明细需要本地或 VPS 常驻进程实时监听**：

```bash
# 本地常驻（需要设置 Upstash 环境变量，写入线上 KV）
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io \
UPSTASH_REDIS_REST_TOKEN=xxx \
npx tsx server/indexer-cli.ts --watch 60
```

- 实时监听 9 种链上事件（BidPlaced / BatchResolved / RefundClaimed 等）
- 每 60 秒增量状态扫描兜底
- 每次更新后异步写入 KV（线上 API 可读）
- 适合跑在本地电脑、便宜 VPS、或 GitHub Actions 定时任务

> 测试网阶段可以先不跑常驻——拍卖级数据（状态扫描）已足够展示分析条。出价明细（鲸鱼榜/个人中心）等主网上线前再部署常驻进程。

### 5. 验证

部署后访问：
- `https://nadbid.fun/api/analytics/overview` — 应返回 `synced: true` + 协议数据
- `https://nadbid.fun/api/analytics/sync-status` — 查看缓存状态（`kvEnabled: true` 表示 KV 已连接）

## API 端点

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| GET | `/api/analytics/overview` | 协议级概览（总数/池/协议费/均价/出价者） | 无 |
| GET | `/api/analytics/auctions` | 最新 50 场拍卖摘要 | 无 |
| GET | `/api/analytics/sync-status` | 缓存状态（调试用） | 无 |
| POST | `/api/analytics/sync` | 强制同步（Cron 调用） | CRON_SECRET |
| GET | `/health` | 健康检查 | 无 |

## 索引的数据

**拍卖级**（状态扫描，100% 可靠）：
- auctionId / status / seller / assetType / assetAddr / tokenId / amount
- startPrice / incrementBps / reservePrice / finalPrice / winner / totalPool

**出价明细**（事件监听/日志拉取，依赖实时积累）：
- BidPlaced / BatchResolved / DuplicateBidRefunded
- RefundClaimed / RewardClaimed / SellerClaimed

> **已知限制**：Monad 公共 RPC `eth_getLogs` 仅支持约 100 区块范围且历史日志不可用。因此出价明细依赖实时事件监听积累；状态扫描模式下分析条的"Bidders"显示为"—"（占位），而非误导的 0。

## 扩展：KV 持久层（可选，未来）

当前内存缓存方案对分析数据（非交易数据）完全足够。若未来需要跨实例一致的持久化，可：

1. 在 Vercel 项目绑定 **KV 数据库**（Storage → KV）
2. `IndexStore` 增加 KV 后端实现（`get`/`set` 接口已抽象）
3. 设置 `INDEX_STORE=kv` 环境变量切换

无需现在做——内存 + Cron 方案零成本且满足当前需求。
