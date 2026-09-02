// server/index.ts
// 独立 Express 服务入口：为前端提供 KOL 验证等 API
// 运行：npx tsx server/index.ts（端口默认 3001，env PORT 可覆盖）
import 'dotenv/config';
import express from 'express';

import verifyTwitterRouter from './verify-twitter.js';
import xOAuthRouter from './x-oauth.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

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

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
