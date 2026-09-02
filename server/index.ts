// server/index.ts
// 独立 Express 服务入口：为前端提供 KOL 验证等 API
// 运行：npx tsx server/index.ts（端口默认 3001，env PORT 可覆盖）
import { createApp } from './app.js';

const app = createApp();
const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
