/** KOL (Key Opinion Leader) profile shown on auction cards. */
export interface AuctionKol {
  nickname: string;
  handle?: string;
  followers: string;
  holders: string;
  avatarUrl: string;
}

/** AuctionKol with a guaranteed handle. */
export interface AuctionKolWithHandle extends AuctionKol {
  handle: string;
}

/** Auction that is currently running. */
export interface OngoingAuction {
  /** Canonical auction id used for routing (`/auctions/:id`). */
  id: string;
  kol: AuctionKol;
  tvl: string;
  participants: number;
  totalBids: number;
  bidPrice: string;
  timeLeft: string;
  /** Absolute end time (UTC ms) — when present, the card renders a live ticking countdown. */
  endsAtUtcMs?: number;
  avatarAccentClass: string;
}

/** Auction scheduled to start soon. */
export interface UpcomingAuction {
  /** Canonical auction id used for routing (`/auctions/:id`). */
  id: string;
  kol: AuctionKol;
  title: string;
  description: string;
  bidPrice: string;
  startsIn: string;
  /** Absolute start time (UTC ms) — when present, the card renders a live ticking countdown. */
  startsAtUtcMs?: number;
  cardRotateClass: string;
  panelRotateClass: string;
  visibilityClass?: string;
}

/** Highlighted auction rendered in the home page hero section. */
export interface FeaturedAuction {
  kol: AuctionKolWithHandle;
  title: string;
  countdown: string;
  /** Absolute target time (UTC ms) the hero countdown ticks towards (end for ongoing, start for upcoming). */
  countdownTargetUtcMs?: number;
  bidPrice: string;
  routeId: string;
  /** Live-state of the featured slot; drives the status pill label. */
  status?: KolAuctionStatus;
}

/** Platform-level stat card shown in the dashboard column. */
export interface PlatformStat {
  id: 'totalVolume' | 'totalDividends' | 'activeBidders';
  label: string;
  value: string;
  change: string;
}

/** Single row on the bid board. */
export interface Bidder {
  rank: number;
  address: string;
  nickname: string | null;
  handle: string | null;
  avatarUrl: string | null;
  totalAmount: string;
  bidCount: number;
}

/** One point on the NFT floor price chart. */
export interface FloorPricePoint {
  time: string;
  price: number;
}

/** Summary stats shown in the AuctionSummaryCard box row. */
export interface AuctionLiveStats {
  costPerBid: string;
  totalBids: number;
  timeLeft: string;
}

/** NFT info rendered in NftPanel. */
export interface NftInfo {
  name: string;
  floorPrice: string;
  supply: string;
  staked: string;
  holders: string;
  revenueShare: string;
  sharedRevenue: string;
  mintPrice: string;
}

/** Fulfillment / dispute status info. */
export interface FulfillmentInfo {
  currentState: string;
  evidenceRequired: string;
  disputeWindow: string;
}

/* =======================================================
 * COMMON ENUMS (被 constants / utils / 组件共同依赖)
 * =====================================================*/

/** Bonding curve kind — 线性 or 指数。 */
export type BondingCurveKind = 'linear' | 'exponential';

/** SPEC §5.1 合法质押档位天数。 */
export type StakeLockDays = 7 | 30 | 90;

/** NFT 操作类型（交易历史过滤器使用）。 */
export type NftTradeKind = 'mint' | 'burn';

/* =======================================================
 * KOL Profile page types
 * =====================================================*/

export type KolBadgeId = 'og' | 'top100' | 'verified';

/** One sticker-style badge rendered under the profile card. */
export interface KolBadge {
  id: KolBadgeId;
  label: string;
}

/** KOL 绑定的 Bonding Curve 部署参数（部署时固化，供算法和前端读取）。 */
export interface KolNftCurveParams {
  kind: BondingCurveKind;
  /** 第 1 枚 mint 起始价（MON）。 */
  basePriceMon: number;
  /** 线性曲线斜率 / 指数曲线缩放因子。 */
  slope: number;
  /** 指数曲线用指数（线性不用）。 */
  exponent?: number;
}

/** 一条 mint/burn 交易（近期活动列表）。 */
export interface NftTrade {
  id: string;
  kind: NftTradeKind;
  /** mint/burn 的 NFT 数量。 */
  nftQuantity: number;
  /** 交易者地址（短格式显示）。 */
  address: string;
  /** 金额正负：mint 为负（用户支出），burn 为正（用户收入）。 */
  amountDelta: number;
  /** ISO timestamp。 */
  timestamp: string;
}

/** 分红池展示信息。 */
export interface DividendPoolInfo {
  /** R%：KOL 80% 收入池内进入分红池的比例（全局默认 15%，可按 KOL×分类 override）。 */
  ratioBps: number;
  /** 本周已进入分红池、待周日结算的 $MON（= accrue 到目前为止）。 */
  pendingThisWeekMon: number;
  /** 上周已结算、当前快照可被 claim 的总额 $MON。 */
  lastSettledMon: number;
  /** 历史累计已发放分红 $MON。 */
  lifetimeDistributedMon: number;
  /** 下次结算时间（UTC ms 时间戳；也可在前端通过 getNextDividendSettlement 动态计算）。 */
  nextSettlementAtUtcMs: number;
}

/** Current price & growth stats above the bonding curve chart. */
export interface KolMarketStats {
  /** 当前单价（展示字符串，含 $MON）。 */
  currentPrice: string;
  /** 24h 百分比变化（正 / 负）。 */
  change24hPercent: number;
  /** 曲线国库余额（支撑曲线的 $MON）。 */
  treasuryBalanceMon: number;
  /** 钱包中该 KOL NFT 总持有数（FREE_HOLD + 各种 pending，组件自己分类型）。 */
  userNftBalance: number;
  /** 总流通 NFT 数。 */
  totalSupplyNfts: number;
  /** 全市场质押中的 NFT 数（所有持有者，supply 的子集）。 */
  totalStakedNfts: number;
  /** STAKE_ACTIVE 状态的用户 NFT 数。 */
  stakedNfts: number;
  /** 用户历史累计已领取分红 $MON。 */
  dividendsClaimedMon: number;
  /** 用户当前待领取分红 $MON（已结算可 claim 的）。 */
  dividendsPendingMon: number;
}

/** Full KOL profile page view model. */
export interface KolProfile {
  handle: string;
  nickname: string;
  bio: string;
  avatarUrl: string;
  bannerAccentClass: string;
  /** Rank sticker (#42)。 */
  rank: number;
  verified: boolean;
  /** @deprecated 替换为 dividend/share info；保留给拍卖卡片兼容。 */
  followers?: string;
  holders: string;
  /** @deprecated 替换为 per-hold share info；保留兼容。 */
  marketCap?: string;
  /** 每枚 NFT 占分红池份额（展示字符串，由 totalSupplyNfts 计算）。 */
  dividendSharePerNft: string;
  /** 历史累计分红发放（展示字符串）。 */
  totalDividendsDistributedMon: string;
  /** X (Twitter) URL。 */
  xUrl: string;
  badges: KolBadge[];
  /** 该 KOL 的 Bonding Curve 固化参数（供算法计算价）。 */
  curveParams: KolNftCurveParams;
  /** 分红池配置与快照。 */
  dividendPool: DividendPoolInfo;
  market: KolMarketStats;
  /** 曲线预览点（组件直接传给 AreaChart）。 */
  curve: BondingCurvePoint[];
  /** 近期 mint/burn 活动。 */
  activity: NftTrade[];
}

/** One sticker-style price point on the bonding curve chart. */
export interface BondingCurvePoint {
  /** X-axis tick (e.g. "#1840" / "#1850"). */
  t: string;
  /** Price in $MON. */
  price: number;
}

/* =======================================================
 * KOL-linked auctions (Profile tabs)
 * =====================================================*/

export type KolAuctionStatus = 'upcoming' | 'ongoing' | 'past';

export interface KolAuction {
  id: string;
  status: KolAuctionStatus;
  handle: string;
  title: string;
  description: string;
  bidPrice: string;
  /** Upcoming → Starts In, Ongoing → Time Left, Past → Finalized. */
  timeLabel: string;
  /** Ongoing only: absolute end time (UTC ms) driving the live countdown. */
  endsAtUtcMs?: number;
  /** Upcoming only: absolute start time (UTC ms) driving the live countdown. */
  startsAtUtcMs?: number;
  tvl?: string;
  participants?: number;
  totalBids?: number;
  winningBid?: string;
  winnerAddress?: string;
  cardRotateClass?: string;
  visibilityClass?: string;
  panelRotateClass?: string;
}

/** Bundle grouped exactly how the Profile page tabs consume it. */
export interface KolAuctionsBundle {
  handle: string;
  upcoming: KolAuction[];
  ongoing: KolAuction[];
  past: KolAuction[];
}
