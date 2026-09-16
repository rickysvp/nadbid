// server/indexer.ts
// 链上事件索引器 — 从 Monad 链拉取 NADBIDAuction 事件并规范化写入 IndexStore。
// 采用增量同步（从上次同步区块拉到最新），可反复调用，幂等。
import { createPublicClient, http, type Address, type Log, type Chain } from 'viem';
import { IndexStore, type StoredAuction, type StoredBid, type StoredClaim } from './store.js';

/** Monad 测试网链配置（server 端独立定义，不依赖 Vite 环境变量） */
export const monadTestnet: Chain = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.INDEXER_RPC_URL || 'https://testnet-rpc.monad.xyz'] },
    public: { http: [process.env.INDEXER_RPC_URL || 'https://testnet-rpc.monad.xyz'] },
  },
  testnet: true,
};

/** 合约地址：环境变量优先，缺省用测试网已部署地址 */
const AUCTION_ADDR = (process.env.INDEXER_AUCTION_ADDR ||
  process.env.VITE_NADBID_AUCTION ||
  '0xa4995aabf1910ec713a9b17a0b679e9ef95547ee') as Address;

/** 默认起始同步区块：合约部署区块（前端手动 trace 确认，覆盖历史事件） */
const DEFAULT_START_BLOCK = Number(process.env.INDEXER_START_BLOCK || 0);

/** 每次同步最多拉取的区块跨度（避免单次请求过大） */
const MAX_BLOCK_RANGE = Number(process.env.INDEXER_MAX_RANGE || 2000);

/** 事件 ABI（仅索引所需字段） */
const eventsAbi = [
  {
    type: 'event',
    name: 'AuctionCreated',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'seller', type: 'address', indexed: true },
      { name: 'assetType', type: 'uint8', indexed: false },
      { name: 'assetAddr', type: 'address', indexed: false },
      { name: 'tokenId', type: 'uint256', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'startPrice', type: 'uint256', indexed: false },
      { name: 'incrementBps', type: 'uint256', indexed: false },
      { name: 'reservePrice', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'BidPlaced',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'batchId', type: 'uint256', indexed: true },
      { name: 'bidder', type: 'address', indexed: true },
      { name: 'price', type: 'uint256', indexed: false },
      { name: 'fee', type: 'uint256', indexed: false },
      { name: 'deadline', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'DuplicateBidRefunded',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'batchId', type: 'uint256', indexed: true },
      { name: 'bidder', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'BatchResolved',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'batchId', type: 'uint256', indexed: true },
      { name: 'selectedBidder', type: 'address', indexed: false },
      { name: 'candidates', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'AuctionFinalized',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'winner', type: 'address', indexed: false },
      { name: 'finalPrice', type: 'uint256', indexed: false },
      { name: 'pool', type: 'uint256', indexed: false },
      { name: 'sellerAmount', type: 'uint256', indexed: false },
      { name: 'rewardAmount', type: 'uint256', indexed: false },
      { name: 'platformAmount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'AuctionCancelled',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'reason', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'RefundClaimed',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'batchId', type: 'uint256', indexed: true },
      { name: 'bidder', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'RewardClaimed',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'batchId', type: 'uint256', indexed: true },
      { name: 'bidder', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'SellerClaimed',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'seller', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;

export interface SyncResult {
  fromBlock: number;
  toBlock: number;
  fetchedBlocks: number;
  newAuctions: number;
  newBids: number;
  newClaims: number;
  caughtUp: boolean;
}

function num(v: unknown): number {
  return typeof v === 'bigint' ? Number(v) : Number(v ?? 0);
}

function str(v: unknown): string {
  return typeof v === 'bigint' ? v.toString() : String(v ?? '0');
}

/**
 * 状态全量扫描（兜底路径，与前端读取同构，RPC 100% 可读）：
 * 读 auctionCount，再分块并发读 auctions(id) 完整 23 字段，写入 store。
 */
export async function scanAuctions(store: IndexStore, opts?: { limit?: number }): Promise<number> {
  const client = createPublicClient({
    chain: monadTestnet,
    transport: http(monadTestnet.rpcUrls.default.http[0]),
  });

  const count = Number(
    await client.readContract({
      address: AUCTION_ADDR,
      abi: [{ name: 'auctionCount', type: 'function', stateMutability: 'view', outputs: [{ name: '', type: 'uint256' }] }],
      functionName: 'auctionCount',
    }),
  );

  const limit = opts?.limit ?? count;
  const ids: bigint[] = [];
  for (let i = 1; i <= Math.min(count, limit); i++) ids.push(BigInt(i));

  const CONCURRENCY = 6;
  let updated = 0;
  for (let s = 0; s < ids.length; s += CONCURRENCY) {
    const chunk = ids.slice(s, s + CONCURRENCY);
    const results = await Promise.allSettled(
      chunk.map((id) =>
        client.readContract({
          address: AUCTION_ADDR,
          abi: [
            {
              name: 'auctions',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: '', type: 'uint256' }],
              // mapping getter 输出为展开字段（与前端 contracts.ts ABI 一致）
              outputs: [
                { name: 'status', type: 'uint8' },
                { name: 'seller', type: 'address' },
                { name: 'assetType', type: 'uint8' },
                { name: 'assetAddr', type: 'address' },
                { name: 'assetTokenId', type: 'uint256' },
                { name: 'assetAmount', type: 'uint256' },
                { name: 'startPrice', type: 'uint256' },
                { name: 'incrementBps', type: 'uint256' },
                { name: 'reservePrice', type: 'uint256' },
                { name: 'lastPrice', type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
                { name: 'lastBatchBlock', type: 'uint256' },
                { name: 'lastBatchId', type: 'uint256' },
                { name: 'batchStartId', type: 'uint256' },
                { name: 'batchCount', type: 'uint256' },
                { name: 'totalPool', type: 'uint256' },
                { name: 'candidatesPool', type: 'uint256' },
                { name: 'retainedFees', type: 'uint256' },
                { name: 'refunded', type: 'uint256' },
                { name: 'rpu', type: 'uint256' },
                { name: 'rpuFinal', type: 'uint256' },
                { name: 'finalPrice', type: 'uint256' },
                { name: 'winner', type: 'address' },
              ],
            },
          ],
          functionName: 'auctions',
          args: [id],
        }),
      ),
    );
    results.forEach((r, i) => {
      if (r.status !== 'fulfilled') return;
      const d = r.value as unknown[];
      if (!Array.isArray(d) || d.length < 23) return;
      const auctionId = Number(idOf(chunk[i]));
      const a: StoredAuction = {
        auctionId,
        seller: String(d[1]),
        assetType: num(d[2]),
        assetAddr: String(d[3]),
        tokenId: str(d[4]),
        amount: str(d[5]),
        startPrice: str(d[6]),
        incrementBps: str(d[7]),
        reservePrice: str(d[8]),
        createdAtBlock: 0, // 状态扫描不含部署区块
        status: num(d[0]),
        winner: String(d[22]) !== '0x0000000000000000000000000000000000000000' ? String(d[22]) : undefined,
        finalPrice: str(d[21]),
        pool: str(d[15]),
      };
      // 保留已有 createdAtBlock（首次从事件获得）
      const existing = store.getAuction(auctionId);
      if (existing?.createdAtBlock) a.createdAtBlock = existing.createdAtBlock;
      store.upsertAuction(a);
      updated++;
    });
    store.save();
  }
  // 状态扫描完成标记（lastBlock 保留 0=事件未同步，lastSyncAt 用于 API 判定"已有数据"）
  store.dataRef.sync.lastSyncAt = new Date().toISOString();
  store.save();
  return updated;
}

function idOf(v: bigint): bigint {
  return v;
}

export async function syncIndexer(
  store: IndexStore,
  opts?: { fromBlock?: number; forceFull?: boolean },
): Promise<SyncResult> {
  const client = createPublicClient({
    chain: monadTestnet,
    transport: http(monadTestnet.rpcUrls.default.http[0]),
  });

  const head = await client.getBlockNumber();
  let from = opts?.fromBlock ?? store.dataRef.sync.lastBlock;
  if (from <= 0) {
    from = opts?.forceFull ? 0 : DEFAULT_START_BLOCK;
  }
  const to = Number(head);
  if (from >= to) {
    return { fromBlock: from, toBlock: to, fetchedBlocks: 0, newAuctions: 0, newBids: 0, newClaims: 0, caughtUp: true };
  }

  const result: SyncResult = { fromBlock: from, toBlock: to, fetchedBlocks: 0, newAuctions: 0, newBids: 0, newClaims: 0, caughtUp: false };

  // 分块拉取事件日志（RPC 对单次 getLogs 的区块范围有限制）
  for (let start = from; start < to; start += MAX_BLOCK_RANGE) {
    const end = Math.min(start + MAX_BLOCK_RANGE, to);
    const logs = await client.getLogs({
      address: AUCTION_ADDR,
      events: eventsAbi,
      fromBlock: start,
      toBlock: end,
    });
    result.fetchedBlocks += end - start;

    for (const log of logs) {
      const name = applyLog(store, log as unknown as Log & { eventName?: string });
      if (name === 'AuctionCreated') result.newAuctions++;
      if (name === 'BidPlaced') result.newBids++;
      if (name === 'RefundClaimed' || name === 'RewardClaimed' || name === 'SellerClaimed') result.newClaims++;
    }
    store.updateSync(end);
    store.save();
  }

  result.caughtUp = true;
  return result;
}

/** 将单条事件日志规范化写入 store。返回事件名（便于调用方统计），未知事件返回 null。 */
export function applyLog(store: IndexStore, log: Log & { eventName?: string }): string | null {  const e = log.eventName;
  const args = log.args as Record<string, unknown> | undefined;
  if (!e || !args) return null;
  const block = Number(log.blockNumber ?? 0);

  if (e === 'AuctionCreated') {
    const auctionId = num(args.auctionId);
    const a: StoredAuction = {
      auctionId,
      seller: String(args.seller),
      assetType: num(args.assetType),
      assetAddr: String(args.assetAddr),
      tokenId: str(args.tokenId),
      amount: str(args.amount),
      startPrice: str(args.startPrice),
      incrementBps: str(args.incrementBps),
      reservePrice: str(args.reservePrice),
      createdAtBlock: block,
      status: 1, // LIVE
    };
    store.upsertAuction(a);
  } else if (e === 'BidPlaced') {
    const auctionId = num(args.auctionId);
    const bid: StoredBid = {
      auctionId,
      batchId: num(args.batchId),
      bidder: String(args.bidder),
      price: str(args.price),
      fee: str(args.fee),
      deadline: str(args.deadline),
      block,
    };
    store.addBids([bid]);
  } else if (e === 'BatchResolved') {
    const auctionId = num(args.auctionId);
    const batchId = num(args.batchId);
    const selected = String(args.selectedBidder);
    // 标记该批次的保留者（retained）
    const bid = store.dataRef.bids.find(
      (b) => b.auctionId === auctionId && b.batchId === batchId && b.bidder.toLowerCase() === selected.toLowerCase(),
    );
    if (bid) bid.retained = true;
  } else if (e === 'AuctionFinalized') {
    const auctionId = num(args.auctionId);
    const a = store.getAuction(auctionId);
    if (a) {
      a.status = 2; // SETTLED
      a.winner = String(args.winner);
      a.finalPrice = str(args.finalPrice);
      a.pool = str(args.pool);
      store.upsertAuction(a);
    }
  } else if (e === 'AuctionCancelled') {
    const auctionId = num(args.auctionId);
    const a = store.getAuction(auctionId);
    if (a) {
      a.status = 3; // CANCELLED
      store.upsertAuction(a);
    }
  } else if (e === 'RefundClaimed') {
    store.addClaims([{ type: 'refund', auctionId: num(args.auctionId), batchId: num(args.batchId), bidder: String(args.bidder), amount: str(args.amount), block }]);
  } else if (e === 'RewardClaimed') {
    store.addClaims([{ type: 'reward', auctionId: num(args.auctionId), batchId: num(args.batchId), bidder: String(args.bidder), amount: str(args.amount), block }]);
  } else if (e === 'SellerClaimed') {
    store.addClaims([{ type: 'seller', auctionId: num(args.auctionId), batchId: 0, bidder: String(args.seller), amount: str(args.amount), block }]);
  }
  return e;
}

/**
 * 实时事件监听（增量路径）：监听合约事件并写入 store。
 * 与 getLogs 历史拉取互补 —— 新事件实时可靠（测试网 RPC 已验证）。
 * 返回 unwatch 函数。
 */
export function watchEvents(store: IndexStore): () => void {
  const client = createPublicClient({
    chain: monadTestnet,
    transport: http(monadTestnet.rpcUrls.default.http[0]),
  });

  const onLog = (log: Log & { eventName?: string }) => {
    applyLog(store, log);
    store.save();
    console.log(`[indexer] event ${log.eventName} (block ${log.blockNumber?.toString() ?? '?'})`);
  };

  const unwatchAuction = client.watchEvent({
    address: AUCTION_ADDR,
    events: eventsAbi.filter((e) => e.name === 'AuctionCreated' || e.name === 'AuctionFinalized' || e.name === 'AuctionCancelled') as typeof eventsAbi,
    onLogs: (logs) => logs.forEach(onLog),
  });
  const unwatchBid = client.watchEvent({
    address: AUCTION_ADDR,
    events: eventsAbi.filter((e) => e.name === 'BidPlaced' || e.name === 'BatchResolved' || e.name === 'DuplicateBidRefunded') as typeof eventsAbi,
    onLogs: (logs) => logs.forEach(onLog),
  });
  const unwatchClaim = client.watchEvent({
    address: AUCTION_ADDR,
    events: eventsAbi.filter((e) => e.name === 'RefundClaimed' || e.name === 'RewardClaimed' || e.name === 'SellerClaimed') as typeof eventsAbi,
    onLogs: (logs) => logs.forEach(onLog),
  });

  return () => {
    unwatchAuction();
    unwatchBid();
    unwatchClaim();
  };
}
