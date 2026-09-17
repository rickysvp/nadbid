// server/kvStore.ts
// KV 持久化层 — 让索引数据在 serverless 实例回收后仍然保留。
// 支持两种环境变量（自动检测，任一可用即启用）：
//   1. Vercel KV（旧）: KV_REST_API_URL / KV_REST_API_TOKEN
//   2. Upstash Redis（新，Vercel Marketplace 集成）: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
// 未配置时静默降级为内存缓存。
// KV key: nadbid:index:v1，TTL 7 天（每次同步刷新）。
import type { IndexData } from './store.js';

const KV_KEY = 'nadbid:index:v1';
const KV_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 天

interface KvCredentials {
  url: string;
  token: string;
  source: 'vercel-kv' | 'upstash';
}

/** 检测可用的 KV 凭证（Vercel KV 或 Upstash Redis） */
function getCredentials(): KvCredentials | null {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return {
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
      source: 'vercel-kv',
    };
  }
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return {
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      source: 'upstash',
    };
  }
  return null;
}

/** KV 是否可用 */
export function kvEnabled(): boolean {
  return getCredentials() !== null;
}

/** 当前使用的 KV 来源（调试用） */
export function kvSource(): string {
  return getCredentials()?.source ?? 'none';
}

/** 创建 KV 客户端（懒加载 @vercel/kv） */
async function getClient() {
  const creds = getCredentials();
  if (!creds) return null;
  try {
    const { createClient } = await import('@vercel/kv');
    return createClient({ url: creds.url, token: creds.token });
  } catch (e) {
    console.error('[kvStore] createClient failed:', (e as Error).message.slice(0, 120));
    return null;
  }
}

/**
 * 从 KV 读取完整索引数据。
 * 返回 null 表示 KV 不可用或无数据（调用方应回退到链上扫描）。
 */
export async function kvLoad(): Promise<IndexData | null> {
  const client = await getClient();
  if (!client) return null;
  try {
    const raw = await client.get<string>(KV_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as IndexData;
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
    const client = await getClient();
    if (!client) return;
    try {
      await client.set(KV_KEY, JSON.stringify(data), { ex: KV_TTL_SECONDS });
    } catch (e) {
      console.error('[kvStore] save failed:', (e as Error).message.slice(0, 120));
    }
  })();
}

/** 清除 KV 中的索引数据（调试/重置用） */
export async function kvClear(): Promise<void> {
  const client = await getClient();
  if (!client) return;
  try {
    await client.del(KV_KEY);
  } catch (e) {
    console.error('[kvStore] clear failed:', (e as Error).message.slice(0, 120));
  }
}
