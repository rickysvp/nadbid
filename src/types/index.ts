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

/** 待领取奖励的可领取状态：CLAIMABLE 可领 / LOCKED 未到解锁 / CLAIMED 已领取 */
export type PendingRewardStatus = 'CLAIMABLE' | 'LOCKED' | 'CLAIMED';

export interface PendingReward {
  id: string;
  title: string;
  type: ClaimType;
  amount: number;
  source: string;
  availableAt: number;
  /** 可领取状态（缺省视为 CLAIMABLE；CLAIMED 表示已领取，应从待领取列表移除） */
  status?: PendingRewardStatus;
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
  /** SLASH 票数（惩罚） */
  votesFor: number;
  /** RELEASE 票数（放行） */
  votesAgainst: number;
  /** 投票截止时间（时间戳 ms） */
  votingEndsAt: number;
  /** 当前用户对争议的投票：SLASH / RELEASE / 未投（null） */
  userVote?: 'SLASH' | 'RELEASE' | null;
  /** 持有相关 PASS 的用户投票权重（票数） */
  votingPower: number;
}

// ============ 钱包 ============
export type WalletStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface WalletState {
  /** 是否已连接（真实钱包或 mock） */
  isConnected: boolean;
  /** 钱包地址，未连接时为 null */
  address: string | null;
  /** 原生代币余额（MON，已 formatUnits 为 number） */
  balanceMon: number;
  /** 当前链 ID，未连接时为 null */
  chainId: number | null;
  /** wagmi 连接状态机 */
  status: WalletStatus;
  /** 是否正在连接（status === 'connecting' || 'reconnecting'） */
  isConnecting: boolean;
  /** 当前 connector ID（如 'injected'、'walletConnect'），mock 连接时为 'mock' */
  connectorId: string | null;
  /** 当前 connector 显示名称 */
  connectorName: string | null;
  /** 原始余额（wei），未连接或未查询时为 null */
  balanceRaw: bigint | null;
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
