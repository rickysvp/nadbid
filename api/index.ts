// api/index.ts
// Vercel Serverless 入口：把 Express app 暴露为 serverless 函数
// vercel.json 将 /api/* 路由到本函数
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../server/app.js';

const app = createApp();

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
