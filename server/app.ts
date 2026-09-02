// server/app.ts
// Express app 构造（本地与 Vercel serverless 共用）
import 'dotenv/config';
import express from 'express';

import verifyTwitterRouter from './verify-twitter.js';
import xOAuthRouter from './x-oauth.js';

export function createApp() {
  const app = express();

  app.use(express.json());

  // 手写 CORS 中间件（cors 未安装，不新增依赖）
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use('/api/kol', verifyTwitterRouter);
  app.use('/api/kol', xOAuthRouter);

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}
