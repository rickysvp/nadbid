// api/[...slug].ts
// Vercel Serverless 动态路由入口：匹配所有 /api/* 请求
// 比 vercel.json rewrites 更可靠，无需额外路由配置
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../server/app.js';

const app = createApp();

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
