import type { Auction, Bid } from '../types';
import { mockKols } from './mockKols';

/**
 * 拍卖 Mock 数据 — 从 AuctionsView + AuctionDetailView 提取
 */

const now = Date.now();
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

export const mockAuctions: Auction[] = [
  {
    id: 'auc-001',
    kolId: 'kol-001',
    kol: mockKols[0],
    title: 'Private Alpha Call Access',
    status: 'LIVE',
    startTime: now - 2 * DAY,
    endTime: now + 2 * DAY + 14 * HOUR + 35 * 60 * 1000,
    currentBid: 12450.5,
    minBid: 1000,
    bidIncrement: 0.05,
    lastBidder: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    lastBidAt: now - 2 * HOUR,
    totalBids: 47,
    passName: '0xChine Alpha PASS',
    passQuantity: 50,
    benefits: [
      'Private Telegram group access',
      'Weekly alpha calls',
      '1-on-1 monthly call',
      'Early access to new tools',
    ],
    fulfillmentStatus: 'IN_PROGRESS',
  },
  {
    id: 'auc-002',
    kolId: 'kol-002',
    kol: mockKols[1],
    title: 'DeFi Strategy Session',
    status: 'LIVE',
    startTime: now - 1 * DAY,
    endTime: now + 1 * DAY + 6 * HOUR,
    currentBid: 8200.0,
    minBid: 500,
    bidIncrement: 0.05,
    lastBidder: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
    lastBidAt: now - 30 * 60 * 1000,
    totalBids: 23,
    passName: 'CryptoQueen PASS',
    passQuantity: 30,
    benefits: ['DeFi strategy notes', 'Portfolio review', 'Yield farming alerts'],
  },
  {
    id: 'auc-003',
    kolId: 'kol-003',
    kol: mockKols[2],
    title: 'Monad Ecosystem Deep Dive',
    status: 'UPCOMING',
    startTime: now + 3 * DAY,
    endTime: now + 5 * DAY,
    currentBid: 0,
    minBid: 2000,
    bidIncrement: 0.05,
    totalBids: 0,
    passName: 'AlphaSeeker PASS',
    passQuantity: 25,
    benefits: ['Ecosystem research', 'Project deep dives', 'Early project access'],
  },
  {
    id: 'auc-004',
    kolId: 'kol-004',
    kol: mockKols[3],
    title: 'TA Masterclass Series',
    status: 'UPCOMING',
    startTime: now + 5 * DAY,
    endTime: now + 7 * DAY,
    currentBid: 0,
    minBid: 1500,
    bidIncrement: 0.05,
    totalBids: 0,
    passName: 'MoonShot PASS',
    passQuantity: 40,
    benefits: ['TA workshops', 'Chart analysis', 'Trading signals'],
  },
  {
    id: 'auc-005',
    kolId: 'kol-005',
    kol: mockKols[4],
    title: 'Degen Portfolio Access',
    status: 'ENDED',
    startTime: now - 7 * DAY,
    endTime: now - 2 * DAY,
    currentBid: 15800.0,
    minBid: 1000,
    bidIncrement: 0.05,
    lastBidder: '0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e',
    lastBidAt: now - 2 * DAY - 1 * HOUR,
    totalBids: 89,
    passName: 'DegenWizard PASS',
    passQuantity: 20,
    benefits: ['Portfolio mirroring', 'High-risk calls', 'Degen community'],
    fulfillmentStatus: 'COMPLETED',
  },
  {
    id: 'auc-006',
    kolId: 'kol-006',
    kol: mockKols[5],
    title: 'Whale Tracking Dashboard',
    status: 'ENDED',
    startTime: now - 10 * DAY,
    endTime: now - 5 * DAY,
    currentBid: 6700.0,
    minBid: 500,
    bidIncrement: 0.05,
    lastBidder: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
    lastBidAt: now - 5 * DAY,
    totalBids: 34,
    passName: 'WhaleWatch PASS',
    passQuantity: 35,
    benefits: ['Whale wallet alerts', 'Smart money tracking', 'Flow analysis'],
    fulfillmentStatus: 'DISPUTED',
  },
];

/** 出价记录 Mock */
export const mockBids: Bid[] = [
  { id: 'bid-001', auctionId: 'auc-001', bidder: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', amount: 12450.5, timestamp: now - 2 * HOUR },
  { id: 'bid-002', auctionId: 'auc-001', bidder: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b', amount: 11800.0, timestamp: now - 3 * HOUR },
  { id: 'bid-003', auctionId: 'auc-001', bidder: '0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e', amount: 11200.0, timestamp: now - 5 * HOUR },
  { id: 'bid-004', auctionId: 'auc-001', bidder: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c', amount: 10500.0, timestamp: now - 8 * HOUR },
  { id: 'bid-005', auctionId: 'auc-001', bidder: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d', amount: 9800.0, timestamp: now - 12 * HOUR },
];

/** 根据 ID 查找拍卖 */
export function getAuctionById(id: string): Auction | undefined {
  return mockAuctions.find((a) => a.id === id);
}

/** 获取拍卖的出价记录 */
export function getBidsByAuction(auctionId: string): Bid[] {
  return mockBids.filter((b) => b.auctionId === auctionId);
}
