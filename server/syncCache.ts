// server/syncCache.ts
// 生产持久化层：模块级内存缓存 + TTL 自动同步。
// 设计目标：Vercel serverless 无持久盘，用实例内存缓存 + 定期 Cron 同步保持数据新鲜。
// 冷启动时缓存为空，首次请求自动触发链上状态扫描（约 1-2 秒），之后命中内存缓存。
// 可选：若配置了 KV_REST_API_URL（Vercel KV），可扩展为持久层；当前版本用内存 + /tmp JSON 兜底。
import { IndexStore, type IndexData } from './store.js';
import { scanAuctions } from './indexer.js';

/** 缓存默认 TTL：5 分钟（与 Vercel Cron 同步频率一致） */
export const DEFAULT_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  store: IndexStore;
  syncedAt: number; // Date.now()
}

let cache: CacheEntry | null = null;
let inflight: Promise<IndexStore> | null = null;

/**
 * 获取已同步的 IndexStore。
 * - 缓存新鲜（< maxAgeMs）：直接返回
 * - 缓存过期或为空：触发一次链上状态扫描（single-flight，并发请求只同步一次）
 * - 同步失败：返回旧缓存（若有）或空 store
 */
export async function getSyncedStore(maxAgeMs: number = DEFAULT_TTL_MS): Promise<IndexStore> {
  const now = Date.now();
  if (cache && now - cache.syncedAt < maxAgeMs) {
    return cache.store;
  }

  // single-flight：并发请求只触发一次同步
  if (!inflight) {
    inflight = (async () => {
      try {
        // Vercel serverless 用 /tmp 路径（可写但实例回收后丢失；内存缓存是主存储）
        const store = new IndexStore(
          process.env.VERCEL ? '/tmp/nadbid-index.json' : undefined,
        );
        const updated = await scanAuctions(store);
        cache = { store, syncedAt: Date.now() };
        if (updated > 0) {
          console.log(`[syncCache] synced ${updated} auctions at ${new Date().toISOString()}`);
        }
        return store;
      } finally {
        inflight = null;
      }
    })();
  }

  try {
    return await inflight;
  } catch (e) {
    console.error('[syncCache] sync failed, returning stale/empty cache:', (e as Error).message.slice(0, 120));
    if (cache) return cache.store;
    return new IndexStore();
  }
}

/** 强制同步（绕过 TTL），供 Cron 端点调用 */
export async function forceSync(): Promise<{ updated: number; syncedAt: string }> {
  cache = null; // 清缓存强制重同步
  const store = await getSyncedStore(0);
  return {
    updated: Object.keys(store.dataRef.auctions).length,
    syncedAt: store.dataRef.sync.lastSyncAt,
  };
}

/** 查看缓存状态（调试用） */
export function getCacheStatus(): { cached: boolean; ageMs: number; auctionCount: number } {
  if (!cache) return { cached: false, ageMs: 0, auctionCount: 0 };
  return {
    cached: true,
    ageMs: Date.now() - cache.syncedAt,
    auctionCount: Object.keys(cache.store.dataRef.auctions).length,
  };
}
