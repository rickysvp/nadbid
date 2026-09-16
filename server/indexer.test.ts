// server/indexer.test.ts
// 索引器存储与分析逻辑的单元测试（不依赖网络：直接构造事件日志喂给 applyLog）
import { describe, it, expect, beforeEach } from 'vitest';
import { IndexStore } from './store.js';
import { applyLog } from './indexer.js';
import { computeOverview, weiToDisplay } from './analytics.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function makeLog(eventName: string, args: Record<string, unknown>, block = 100) {
  return {
    address: '0xa4995aabf1910ec713a9b17a0b679e9ef95547ee',
    blockNumber: BigInt(block),
    eventName,
    args,
  } as unknown as Parameters<typeof applyLog>[1];
}

function makeStore() {
  return new IndexStore(join(tmpdir(), `indexer-test-${Date.now()}-${Math.random()}.json`));
}

describe('IndexStore', () => {
  let store: IndexStore;

  beforeEach(() => {
    store = makeStore();
  });

  it('initializes empty', () => {
    expect(store.dataRef.sync.lastBlock).toBe(0);
    expect(Object.keys(store.dataRef.auctions)).toHaveLength(0);
  });

  it('persists and reloads', () => {
    store.updateSync(1234, 100);
    store.upsertAuction({
      auctionId: 1,
      seller: '0xabc',
      assetType: 0,
      assetAddr: '0xdef',
      tokenId: '0',
      amount: '1',
      startPrice: '1000000',
      incrementBps: '100',
      reservePrice: '0',
      createdAtBlock: 100,
      status: 1,
    });
    store.save();

    const reloaded = new IndexStore(storePath(store));
    expect(reloaded.dataRef.sync.lastBlock).toBe(1234);
    expect(reloaded.dataRef.auctions['1'].seller).toBe('0xabc');
  });

  it('applies AuctionCreated', () => {
    const name = applyLog(
      store,
      makeLog('AuctionCreated', {
        auctionId: 1n,
        seller: '0xSeller',
        assetType: 0,
        assetAddr: '0xAsset',
        tokenId: 0n,
        amount: 1n,
        startPrice: 10n ** 18n,
        incrementBps: 100n,
        reservePrice: 0n,
      }),
    );
    expect(name).toBe('AuctionCreated');
    const a = store.getAuction(1)!;
    expect(a.status).toBe(1);
    expect(a.startPrice).toBe((10n ** 18n).toString());
  });

  it('applies BidPlaced + BatchResolved retained flag', () => {
    applyLog(store, makeLog('BidPlaced', { auctionId: 1n, batchId: 1n, bidder: '0xAlice', price: 10n ** 18n, fee: 0n, deadline: 999n }, 101));
    applyLog(store, makeLog('BidPlaced', { auctionId: 1n, batchId: 1n, bidder: '0xBob', price: 10n ** 18n, fee: 0n, deadline: 999n }, 101));
    applyLog(store, makeLog('BatchResolved', { auctionId: 1n, batchId: 1n, selectedBidder: '0xBob', candidates: 2n }, 102));

    const bids = store.dataRef.bids;
    expect(bids).toHaveLength(2);
    const alice = bids.find((b) => b.bidder === '0xAlice');
    const bob = bids.find((b) => b.bidder === '0xBob');
    expect(alice?.retained).toBeFalsy();
    expect(bob?.retained).toBe(true);
  });

  it('applies Finalized + Cancelled status transitions', () => {
    applyLog(store, makeLog('AuctionCreated', { auctionId: 1n, seller: '0xS', assetType: 0, assetAddr: '0xA', tokenId: 0n, amount: 1n, startPrice: 1n, incrementBps: 100n, reservePrice: 0n }));
    applyLog(store, makeLog('AuctionFinalized', { auctionId: 1n, winner: '0xW', finalPrice: 5n, pool: 9n, sellerAmount: 7n, rewardAmount: 1n, platformAmount: 1n }, 200));
    expect(store.getAuction(1)!.status).toBe(2);
    expect(store.getAuction(1)!.winner).toBe('0xW');

    applyLog(store, makeLog('AuctionCreated', { auctionId: 2n, seller: '0xS', assetType: 1, assetAddr: '0xA', tokenId: 1n, amount: 1n, startPrice: 1n, incrementBps: 100n, reservePrice: 0n }));
    applyLog(store, makeLog('AuctionCancelled', { auctionId: 2n, reason: 'no bids' }, 210));
    expect(store.getAuction(2)!.status).toBe(3);
  });
});

describe('analytics', () => {
  it('computes overview with correct aggregation', () => {
    const store = makeStore();
    // 1 settled auction: 2 bids, 1 retained, pool 9 wei
    applyLog(store, makeLog('AuctionCreated', { auctionId: 1n, seller: '0xSeller', assetType: 0, assetAddr: '0xA', tokenId: 0n, amount: 1n, startPrice: 1n, incrementBps: 100n, reservePrice: 0n }));
    applyLog(store, makeLog('BidPlaced', { auctionId: 1n, batchId: 1n, bidder: '0xAlice', price: 9n, fee: 0n, deadline: 1n }));
    applyLog(store, makeLog('BidPlaced', { auctionId: 1n, batchId: 1n, bidder: '0xBob', price: 9n, fee: 0n, deadline: 1n }));
    applyLog(store, makeLog('BatchResolved', { auctionId: 1n, batchId: 1n, selectedBidder: '0xBob', candidates: 2n }));
    applyLog(store, makeLog('AuctionFinalized', { auctionId: 1n, winner: '0xBob', finalPrice: 9n, pool: 9n, sellerAmount: 7n, rewardAmount: 1n, platformAmount: 1n }));
    applyLog(store, makeLog('RewardClaimed', { auctionId: 1n, batchId: 1n, bidder: '0xAlice', amount: 1n }));

    const o = computeOverview(store.dataRef);
    expect(o.totalAuctions).toBe(1);
    expect(o.settledAuctions).toBe(1);
    expect(o.totalBids).toBe(2);
    expect(o.retainedBids).toBe(1);
    expect(o.activeBidders).toBe(2);
    expect(o.totalSellers).toBe(1);
    expect(o.totalPoolWei).toBe('9');
    expect(o.totalRewardsWei).toBe('1');
    expect(o.totalProtocolFeesWei).toBe('0'); // 9 * 5 / 100 = 0
    expect(o.avgFinalPriceWei).toBe('9');
  });

  it('formats wei to display', () => {
    expect(weiToDisplay((10n ** 18n).toString())).toBe('1');
    expect(weiToDisplay('1500000000000000000')).toBe('1.5');
    expect(weiToDisplay('0')).toBe('0');
  });
});

/** 取出 store 的路径用于重载测试 */
function storePath(store: IndexStore): string {
  // 通过实例内部字段取路径（测试专用）
  return (store as unknown as { path: string }).path;
}
