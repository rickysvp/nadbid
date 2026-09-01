import type { StakePosition, PendingReward, ClaimRecord, PointsBalance, PointsSource, Referral, Dispute } from '../types';
import { mockAuctions } from './mockAuctions';

/**
 * 质押 / 领取 / 积分 Mock 数据 — 从 StakingView/ClaimView/PointsView 提取
 */

const now = Date.now();
const DAY = 86400 * 1000;

// ============ 质押 ============

export interface MockAvailableStake {
  id: string;
  /** KOL 全局 ID（与 mockKols / mockStakedPositions 对齐，供页面联动） */
  kolId: string;
  kolName: string;
  kolHandle: string;
  passQuantity: number;
  revShare: string;
}

export const mockAvailableStakes: MockAvailableStake[] = [
  { id: 'a1', kolId: 'kol-002', kolName: 'CryptoQueen', kolHandle: '@cryptoqueen', passQuantity: 12, revShare: '12%' },
  { id: 'a2', kolId: 'kol-003', kolName: 'AlphaSeeker', kolHandle: '@alphaseek', passQuantity: 8, revShare: '15%' },
  { id: 'a3', kolId: 'kol-004', kolName: 'MoonShot', kolHandle: '@moonshot', passQuantity: 20, revShare: '14%' },
  { id: 'a4', kolId: 'kol-005', kolName: 'DegenWizard', kolHandle: '@degenwiz', passQuantity: 3, revShare: '8%' },
  { id: 'a5', kolId: 'kol-006', kolName: 'WhaleWatch', kolHandle: '@whalewatch', passQuantity: 1, revShare: '5%' },
  { id: 'a6', kolId: 'kol-007', kolName: 'DeFiGuru', kolHandle: '@defiguru', passQuantity: 4, revShare: '10%' },
  { id: 'a7', kolId: 'kol-008', kolName: 'YieldFarm', kolHandle: '@yieldfarm', passQuantity: 15, revShare: '13%' },
  { id: 'a8', kolId: 'kol-009', kolName: 'BlockBoss', kolHandle: '@blockboss', passQuantity: 7, revShare: '9%' },
];

export const mockStakedPositions: StakePosition[] = [
  { id: 's1', kolId: 'kol-010', kol: { id: 'kol-010', name: 'BobBuilder', handle: '@bobbuild', followers: 24000, rank: 10 }, passQuantity: 10, status: 'ACTIVE', stakedAt: now - 14 * DAY, activatedAt: now - 13 * DAY, yieldEarned: 450.0, revShare: '11%' },
  { id: 's2', kolId: 'kol-011', kol: { id: 'kol-011', name: 'ArtDegen', handle: '@artdegen', followers: 18000, rank: 12 }, passQuantity: 1, status: 'ACTIVE', stakedAt: now - 7 * DAY, activatedAt: now - 6 * DAY, yieldEarned: 12.5, revShare: '5%' },
  { id: 's3', kolId: 'kol-006', kol: { id: 'kol-006', name: 'WhaleWatch', handle: '@whalewatch', followers: 43000, rank: 6 }, passQuantity: 5, status: 'ACTIVE', stakedAt: now - 30 * DAY, activatedAt: now - 29 * DAY, yieldEarned: 1200.0, revShare: '12%' },
  { id: 's4', kolId: 'kol-002', kol: { id: 'kol-002', name: 'CryptoQueen', handle: '@cryptoqueen', followers: 98000, rank: 2 }, passQuantity: 2, status: 'ACTIVE', stakedAt: now - 10 * DAY, activatedAt: now - 9 * DAY, yieldEarned: 85.0, revShare: '12%' },
  { id: 's5', kolId: 'kol-008', kol: { id: 'kol-008', name: 'YieldFarm', handle: '@yieldfarm', followers: 32000, rank: 8 }, passQuantity: 4, status: 'PENDING', stakedAt: now - 0.5 * DAY, yieldEarned: 0, revShare: '13%' },
  { id: 's6', kolId: 'kol-009', kol: { id: 'kol-009', name: 'BlockBoss', handle: '@blockboss', followers: 28000, rank: 9 }, passQuantity: 8, status: 'UNLOCKING', stakedAt: now - 60 * DAY, activatedAt: now - 59 * DAY, unlockRequestedAt: now - 2 * DAY, unlockAt: now + 5 * DAY, yieldEarned: 340.0, revShare: '9%' },
];

// ============ 领取 ============

export const mockPendingRewards: PendingReward[] = [
  { id: 'p1', title: '@0xChine PASS', type: 'STAKING', amount: 4100.0, source: 'Staking Rewards', availableAt: now, status: 'CLAIMABLE' },
  { id: 'p2', title: 'KOLF #842', type: 'REFUND', amount: 3150.5, source: 'Auction Refund', availableAt: now, status: 'CLAIMABLE' },
  { id: 'p3', title: '@DegenSpartan PASS', type: 'STAKING', amount: 4100.0, source: 'Staking Rewards', availableAt: now, status: 'CLAIMABLE' },
];

export const mockClaimHistory: ClaimRecord[] = [
  { id: 'h1', status: 'SETTLED', event: 'Claimed Staking Rewards', type: 'STAKING', amount: 450.0, timestamp: now - 2 * DAY },
  { id: 'h2', status: 'SETTLED', event: 'Auction Refund: KOLF #842', type: 'REFUND', amount: 1200.0, timestamp: now - 4 * DAY },
];

// ============ 积分 ============

export const mockPointsBalance: PointsBalance = {
  total: 124500,
  rank: 42,
  season: 'Season 1',
  lastUpdated: now - 2 * 60 * 1000,
  recentChange: 1200,
};

export const mockPointsSources: PointsSource[] = [
  { id: 'ps1', label: 'Minting PASS', points: 45000, icon: 'ticket' },
  { id: 'ps2', label: 'Bidding Activity', points: 32500, icon: 'zap' },
  { id: 'ps3', label: 'Referral Bonuses', points: 22000, icon: 'users' },
  { id: 'ps4', label: 'Staking Multipliers', points: 15000, icon: 'shield' },
  { id: 'ps5', label: 'Auction Wins', points: 10000, icon: 'trophy' },
];

export const mockReferrals: Referral[] = [
  { id: 'r1', inviteeHandle: '@AlphaHunter', pointsEarned: 12500, joinedAt: now - 2 * DAY },
  { id: 'r2', inviteeHandle: '@DegenKing', pointsEarned: 8420, joinedAt: now - 5 * DAY },
  { id: 'r3', inviteeHandle: '@CryptoWhale', pointsEarned: 4100, joinedAt: now - 7 * DAY },
  { id: 'r4', inviteeHandle: '@OxPunk', pointsEarned: 2150, joinedAt: now - 10 * DAY },
];

// ============ 仲裁 ============

/** 争议 Mock 数据 — 仲裁（Arbitration）页面数据源 */
export const mockDisputes: Dispute[] = [
  {
    id: 'disp-001',
    auctionId: 'auc-001',
    auction: mockAuctions.find((a) => a.id === 'auc-001')!,
    reason: 'Winner never received the private Telegram group invite despite multiple claims. KOL unresponsive for 3 days.',
    status: 'VOTING',
    votesFor: 342,
    votesAgainst: 128,
    votingEndsAt: now + 2 * DAY + 6 * 3600 * 1000,
    userVote: null,
    votingPower: 25,
  },
  {
    id: 'disp-002',
    auctionId: 'auc-002',
    auction: mockAuctions.find((a) => a.id === 'auc-002')!,
    reason: 'Winner claims the strategy session was cut short. KOL provided portfolio review but skipped the yield farming deep-dive.',
    status: 'VOTING',
    votesFor: 89,
    votesAgainst: 215,
    votingEndsAt: now + 4 * DAY,
    userVote: 'RELEASE',
    votingPower: 12,
  },
  {
    id: 'disp-003',
    auctionId: 'auc-010',
    auction: mockAuctions.find((a) => a.id === 'auc-010')!,
    reason: 'KOL failed to deliver promised alpha signals channel access within 48 hours of auction settlement.',
    status: 'VOTING',
    votesFor: 156,
    votesAgainst: 98,
    votingEndsAt: now + 3 * DAY,
    userVote: null,
    votingPower: 8,
  },
  {
    id: 'disp-004',
    auctionId: 'auc-006',
    auction: mockAuctions.find((a) => a.id === 'auc-006')!,
    reason: 'Winner claims the dashboard was never delivered and KOL is unresponsive to all messages.',
    status: 'VOTING',
    votesFor: 78,
    votesAgainst: 156,
    votingEndsAt: now + 3 * DAY,
    userVote: null,
    votingPower: 0,
  },
  {
    id: 'disp-005',
    auctionId: 'auc-005',
    auction: mockAuctions.find((a) => a.id === 'auc-005')!,
    reason: 'Dispute over call duration — KOL claims 30min, auction description says 60min.',
    status: 'SLASH',
    votesFor: 512,
    votesAgainst: 88,
    votingEndsAt: now - 1 * DAY,
    userVote: 'SLASH',
    votingPower: 8,
  },
  {
    id: 'disp-006',
    auctionId: 'auc-004',
    auction: mockAuctions.find((a) => a.id === 'auc-004')!,
    reason: 'Artwork delivered but quality significantly below what was promised in auction description.',
    status: 'RELEASE',
    votesFor: 45,
    votesAgainst: 378,
    votingEndsAt: now - 2 * DAY,
    userVote: null,
    votingPower: 8,
  },
];
