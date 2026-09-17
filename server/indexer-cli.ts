// server/indexer-cli.ts
// 索引器 CLI：状态扫描 + 事件监听，把链上拍卖数据同步到本地 JSON。
// 用法：
//   npx tsx server/indexer-cli.ts            # 状态全量扫描（auctionCount + auctions(i)）
//   npx tsx server/indexer-cli.ts --watch 60 # 扫描后常驻，事件实时监听 + 每 60s 增量扫描
//   npx tsx server/indexer-cli.ts --logs     # 尝试从链上拉历史事件日志（RPC 受限时可能失败）
import { IndexStore } from './store.js';
import { scanAuctions, syncIndexer, watchEvents } from './indexer.js';
import { kvEnabled, kvSave } from './kvStore.js';

const args = process.argv.slice(2);
const doLogs = args.includes('--logs');
const watchIdx = args.indexOf('--watch');
const watchSeconds = watchIdx >= 0 ? Number(args[watchIdx + 1] || 60) : 0;

async function scanOnce(store: IndexStore) {
  const t0 = Date.now();
  const updated = await scanAuctions(store);
  console.log(
    `[indexer] state scan: ${updated} auctions updated, total=${Object.keys(store.dataRef.auctions).length} (${Date.now() - t0}ms)`,
  );
  return updated;
}

async function main() {
  const store = new IndexStore();

  await scanOnce(store);

  if (doLogs) {
    try {
      const r = await syncIndexer(store, { forceFull: true });
      console.log(`[indexer] event log sync: blocks ${r.fromBlock}→${r.toBlock} (+${r.newAuctions} auctions, +${r.newBids} bids, +${r.newClaims} claims)`);
    } catch (e) {
      console.error('[indexer] event log sync failed (RPC limit), continuing with state scan:', (e as Error).message.slice(0, 120));
    }
  }

  if (watchSeconds > 0) {
    console.log(`[indexer] watch mode: event listener + scan every ${watchSeconds}s (Ctrl+C to stop)`);
    if (kvEnabled()) {
      console.log('[indexer] KV persistence enabled — bids/claims will be saved to KV');
      store.afterSave = () => kvSave(store.dataRef);
    }
    const stop = watchEvents(store);
    const timer = setInterval(() => {
      scanOnce(store).catch((e) => console.error('[indexer] scan error:', e));
    }, watchSeconds * 1000);
    process.on('SIGINT', () => {
      stop();
      clearInterval(timer);
      process.exit(0);
    });
  }
}

main().catch((e) => {
  console.error('[indexer] fatal:', e);
  process.exit(1);
});
