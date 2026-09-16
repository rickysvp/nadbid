// server/analytics.ts
// 链上行为分析 — 基于索引数据的统计聚合。
// 所有金额以 string（wei）返回，由前端 formatUnits 展示，避免精度损失。
import type { IndexData } from './store.js';

const WEI_18 = 10n ** 18n;

export interface ProtocolOverview {
  totalAuctions: number;
  liveAuctions: number;
  settledAuctions: number;
  cancelledAuctions: number;
  totalBids: number;
  retainedBids: number;
  totalBidAmountWei: string; // 全部 BidPlaced 金额（含重复退款前）
  totalPoolWei: string; // 已结算拍卖池总额
  activeBidders: number; // 出价过的唯一地址
  totalSellers: number;
  totalRefundedWei: string;
  totalRewardsWei: string;
  totalProtocolFeesWei: string; // 估算：5% 池（settled pool * 5/100）
  avgFinalPriceWei: string;
  lastSyncAt: string;
  lastBlock: number;
}

export function computeOverview(data: IndexData): ProtocolOverview {
  const auctions = Object.values(data.auctions);
  const bids = data.bids;
  const claims = data.claims;

  const settled = auctions.filter((a) => a.status === 2);
  const live = auctions.filter((a) => a.status === 1);
  const cancelled = auctions.filter((a) => a.status === 3);

  let totalBidAmount = 0n;
  for (const b of bids) totalBidAmount += BigInt(b.price || '0');
  const retained = bids.filter((b) => b.retained);

  let totalPool = 0n;
  for (const a of settled) totalPool += BigInt(a.pool || '0');

  let totalRefunded = 0n;
  let totalRewards = 0n;
  for (const c of claims) {
    if (c.type === 'refund') totalRefunded += BigInt(c.amount);
    if (c.type === 'reward') totalRewards += BigInt(c.amount);
  }

  const bidders = new Set<string>();
  for (const b of bids) bidders.add(b.bidder.toLowerCase());
  const sellers = new Set<string>();
  for (const a of auctions) sellers.add(a.seller.toLowerCase());

  let avgFinal = 0n;
  if (settled.length > 0) {
    let s = 0n;
    for (const a of settled) s += BigInt(a.finalPrice || '0');
    avgFinal = s / BigInt(settled.length);
  }

  return {
    totalAuctions: auctions.length,
    liveAuctions: live.length,
    settledAuctions: settled.length,
    cancelledAuctions: cancelled.length,
    totalBids: bids.length,
    retainedBids: retained.length,
    totalBidAmountWei: totalBidAmount.toString(),
    totalPoolWei: totalPool.toString(),
    activeBidders: bidders.size,
    totalSellers: sellers.size,
    totalRefundedWei: totalRefunded.toString(),
    totalRewardsWei: totalRewards.toString(),
    totalProtocolFeesWei: ((totalPool * 5n) / 100n).toString(),
    avgFinalPriceWei: avgFinal.toString(),
    lastSyncAt: data.sync.lastSyncAt,
    lastBlock: data.sync.lastBlock,
  };
}

export function weiToDisplay(wei: string, decimals = 18): string {
  try {
    const v = BigInt(wei || '0');
    const whole = v / 10n ** BigInt(decimals);
    const frac = v % 10n ** BigInt(decimals);
    if (frac === 0n) return whole.toString();
    const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
    return `${whole}.${fracStr.slice(0, 6)}`;
  } catch {
    return '0';
  }
}

/** 便捷：给 API 用，返回带展示单位的概览（USDC=6 decimals） */
export function overviewForApi(data: IndexData) {
  const o = computeOverview(data);
  const d = 6; // USDC decimals
  return {
    ...o,
    totalBidAmount: weiToDisplay(o.totalBidAmountWei, d),
    totalPool: weiToDisplay(o.totalPoolWei, d),
    totalRefunded: weiToDisplay(o.totalRefundedWei, d),
    totalRewards: weiToDisplay(o.totalRewardsWei, d),
    totalProtocolFees: weiToDisplay(o.totalProtocolFeesWei, d),
    avgFinalPrice: weiToDisplay(o.avgFinalPriceWei, d),
  };
}
