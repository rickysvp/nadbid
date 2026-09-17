// server/app.ts
// Express app 构造（本地与 Vercel serverless 共用）
import 'dotenv/config';
import express from 'express';
import { IndexStore } from './store.js';
import { overviewForApi } from './analytics.js';
import { getSyncedStore, forceSync, getCacheStatus, DEFAULT_TTL_MS } from './syncCache.js';
import { kvEnabled } from './kvStore.js';


// 允许跨域的来源白名单（生产用 X_FRONTEND_URL，本地开发允许 localhost）
const ALLOWED_ORIGINS = [
  process.env.X_FRONTEND_URL, // 生产：https://nadbid.fun
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean) as string[];

export function createApp() {
  const app = express();

  // Codex 审计：请求体大小限制（X 回调/票据均为小请求体，16kb 足够；
  // 防止恶意超大 body 拖垮 serverless 实例）
  app.use(express.json({ limit: '16kb' }));

  // Codex 审计：基础安全响应头（无额外依赖，手写中间件）
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    next();
  });

  // CORS 中间件：仅允许白名单来源，避免任意站点跨域调用 API
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
      }
      // 不在白名单的 origin 不设置 Allow-Origin → 浏览器阻止跨域读取
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  // ============================================================================
  // 链上行为分析 API（内存缓存 + TTL 自动同步；Vercel Cron 定期触发 forceSync）
  // ============================================================================
  app.get('/api/analytics/overview', async (_req, res) => {
    const store = await getSyncedStore();
    const data = store.dataRef;
    const hasData = data.sync.lastSyncAt.length > 0 && Object.keys(data.auctions).length > 0;
    res.json({
      synced: hasData,
      lastSyncAt: data.sync.lastSyncAt,
      lastBlock: data.sync.lastBlock,
      overview: hasData ? overviewForApi(data) : null,
    });
  });

  app.get('/api/analytics/auctions', async (_req, res) => {
    const store = await getSyncedStore();
    const auctions = Object.values(store.dataRef.auctions)
      .sort((a, b) => b.auctionId - a.auctionId)
      .slice(0, 50)
      .map((a) => ({
        id: a.auctionId,
        status: a.status,
        seller: a.seller,
        assetType: a.assetType,
        assetAddr: a.assetAddr,
        startPrice: a.startPrice,
        reservePrice: a.reservePrice,
        winner: a.winner ?? null,
        finalPrice: a.finalPrice ?? null,
        pool: a.pool ?? null,
      }));
    res.json({ auctions });
  });

  /**
   * Cron 触发的强制同步端点。
   * Vercel Cron 调用时带 authorization: Bearer <CRON_SECRET>。
   * 本地开发无 CRON_SECRET 时允许调用（仅 localhost）。
   */
  app.post('/api/analytics/sync', async (req, res) => {
    const cronSecret = process.env.CRON_SECRET;
    const isLocal = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
    if (cronSecret && !isLocal) {
      const auth = req.headers.authorization;
      if (!auth || auth !== `Bearer ${cronSecret}`) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }
    }
    try {
      const result = await forceSync();
      res.json({ ok: true, ...result });
    } catch (e) {
      res.status(500).json({ ok: false, error: (e as Error).message.slice(0, 200) });
    }
  });

  /** 同步状态（缓存年龄、拍卖数）—— 调试与监控用 */
  app.get('/api/analytics/sync-status', (_req, res) => {
    res.json({
      ...getCacheStatus(),
      ttlMs: DEFAULT_TTL_MS,
      vercel: Boolean(process.env.VERCEL),
      kvEnabled: kvEnabled(),
    });
  });

  return app;
}
