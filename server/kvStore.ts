// server/kvStore.ts
// Vercel KV 持久化层 — 让索引数据在 serverless 实例回收后仍然保留。
// 检测到 KV_REST_API_URL 环境变量时自动启用；未配置时静默降级为内存缓存。
// KV key: nadbid:index:v1，TTL 7 天（每次同步刷新）。
import type { IndexData } from './store.js';

const KV_KEY = 'nadbid:index:v1';
const KV_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 天

/** KV 是否可用（检测环境变量） */
export function kvEnabled(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

/**
 * 从 KV 读取完整索引数据。
 * 返回 null 表示 KV 不可用或无数据（调用方应回退到链上扫描）。
 */
export async function kvLoad(): Promise<IndexData | null> {
  if (!kvEnabled()) return null;
  try {
    const { kv } = await import('@vercel/kv');
    const raw = await kv.get<string>(KV_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as IndexData;
    // 基本校验
    if (!data.auctions || !data.sync) return null;
    return data;
  } catch (e) {
    console.error('[kvStore] load failed:', (e as Error).message.slice(0, 120));
    return null;
  }
}

/**
 * 写入 KV（异步，不阻塞主流程）。
 * 失败只打日志，不影响内存缓存。
 */
export function kvSave(data: IndexData): void {
  if (!kvEnabled()) return;
  (async () => {
    try {
      const { kv } = await import('@vercel/kv');
      await kv.set(KV_KEY, JSON.stringify(data), { ex: KV_TTL_SECONDS });
    } catch (e) {
      console.error('[kvStore] save failed:', (e as Error).message.slice(0, 120));
    }
  })();
}

/** 清除 KV 中的索引数据（调试/重置用） */
export async function kvClear(): Promise<void> {
  if (!kvEnabled()) return;
  try {
    const { kv } = await import('@vercel/kv');
    await kv.del(KV_KEY);
  } catch (e) {
    console.error('[kvStore] clear failed:', (e as Error).message.slice(0, 120));
  }
}
