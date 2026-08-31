/**
 * 全局类型定义 — 按领域拆分
 */

// ============ KOL ============
export interface Kol {
  id: string;
  name: string;
  handle: string; // @xxx
  avatar?: string;
  bio?: string;
  followers: number;
  rank: number;
  socialLinks?: {
    twitter?: string;
    telegram?: string;
    website?: string;
  };
}

export interface KolStats {
  kolId: string;
  passSupply: number;
  passTvl: number;
  auctionTvl: number;
  currentPrice: number;
  totalAuctions: number;
  activeAuctions: number;
}

// ============ PASS NFT ============
export interface Pass {
  id: string;
  kolId: string;
  tokenId: number;
  owner: string;
  mintedAt: number;
  staked: boolean;
  stakedAt?: number;
}

// ============ 拍卖 ============
export type AuctionStatus =
  | 'UPCOMING'
  | 'LIVE'
  | 'ENDED'
  | 'SETTLED'
  | 'ARBITRATING'
  | 'FAILED';

export interface Auction {
  id: string;
  kolId: string;
  kol: Kol;
  title: string;
  status: AuctionStatus;
  startTime: number;
  endTime: number;
  currentBid: number;
  minBid: number;
  bidIncrement: number;
  lastBidder?: string;
  lastBidAt?: number;
  totalBids: number;
  passName: string;
  passQuantity: number;
  benefits: string[];
  fulfillmentStatus?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISPUTED';
}

export interface Bid {
  id: string;
  auctionId: string;
  bidder: string;
  amount: number;
  timestamp: number;
  txHash?: string;
}

// ============ 质押 ============
export type StakeStatus = 'PENDING' | 'ACTIVE' | 'UNLOCKING' | 'UNLOCKED';

export interface StakePosition {
  id: string;
  kolId: string;
  kol: Kol;
  passQuantity: number;
  status: StakeStatus;
  stakedAt: number;
  activatedAt?: number;
  unlockRequestedAt?: number;
  unlockAt?: number;
  yieldEarned: number;
  revShare: string;
}

// ============ 领取 ============
export type ClaimType = 'STAKING' | 'REFUND' | 'ROYALTY' | 'REFERRAL';
export type ClaimStatus = 'PENDING' | 'CLAIMING' | 'CLAIMED' | 'FAILED';

export interface PendingReward {
  id: string;
  title: string;
  type: ClaimType;
  amount: number;
  source: string;
  availableAt: number;
}

export interface ClaimRecord {
  id: string;
  status: 'SETTLED' | 'PENDING' | 'FAILED';
  event: string;
  type: ClaimType;
  amount: number;
  timestamp: number;
  txHash?: string;
}

// ============ 积分 ============
export interface PointsBalance {
  total: number;
  rank: number;
  season: string;
  lastUpdated: number;
  recentChange: number;
}

export interface PointsSource {
  id: string;
  label: string;
  points: number;
  icon: string;
}

export interface Referral {
  id: string;
  inviteeHandle: string;
  pointsEarned: number;
  joinedAt: number;
}

// ============ 仲裁 ============
export type ArbitrationStatus = 'PENDING' | 'VOTING' | 'SLASH' | 'RELEASE' | 'TIED';

export interface Dispute {
  id: string;
  auctionId: string;
  auction: Auction;
  reason: string;
  status: ArbitrationStatus;
  votesFor: number;
  votesAgainst: number;
  votingEndsAt: number;
  userVote?: 'FOR' | 'AGAINST' | null;
  votingPower: number;
}

// ============ 钱包 ============
export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balanceMon: number;
  chainId: number | null;
}

// ============ API ============
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ============ Toast ============
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}
