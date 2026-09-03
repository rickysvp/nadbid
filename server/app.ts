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

  app.use(express.json());

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
