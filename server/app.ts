// server/app.ts
// Express app 构造（本地与 Vercel serverless 共用）
import 'dotenv/config';
import express from 'express';

import xOAuthRouter from './x-oauth.js';

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

  app.use('/api/kol', xOAuthRouter);

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}
