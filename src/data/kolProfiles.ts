import type { KolProfile, KolNftCurveParams, DividendPoolInfo } from '@/types';
import { BONDING_CURVE, DIVIDEND_POOL } from '@/constants/app';
import {
  buildCurvePreview,
  calcCurrentNftPrice,
  calcDividendSharePerNft,
  getNextDividendSettlement,
  formatTokenAmount,
  roundMon,
} from '@/utils/format';

/**
 * Mock KOL profiles keyed by handle.
 * 所有价格/曲线/分红池均使用 utils 算法生成，无硬编码。
 * Real data comes from the backend later; the `useKolProfile` query hook
 * switches between this file and HTTP calls via `isMockEnabled()`.
 */

/* ---------- 4 个 KOL 的独立 curve 参数（起始价统一 100 MON，斜率不同体现流量差异） ---------- */
const CURVE_PARAMS: Record<string, KolNftCurveParams> = {
  CryptoChad: {
    kind: 'linear',
    basePriceMon: BONDING_CURVE.BASE_PRICE_MON,
    slope: 12,
    exponent: 1.05,
  },
  NFTQueen: {
    kind: 'linear',
    basePriceMon: BONDING_CURVE.BASE_PRICE_MON,
    slope: 22,
    exponent: 1.08,
  },
  DogeFather: {
    kind: 'linear',
    basePriceMon: BONDING_CURVE.BASE_PRICE_MON,
    slope: 48,
    exponent: 1.12,
  },
  CryptoKing: {
    kind: 'linear',
    basePriceMon: BONDING_CURVE.BASE_PRICE_MON,
    slope: 16,
    exponent: 1.04,
  },
};

/* ---------- 4 个 KOL 的流通量（总 supply）；用于定位当前价位置 ---------- */
const TOTAL_SUPPLY: Record<string, number> = {
  CryptoChad: 1850,
  NFTQueen: 2200,
  DogeFather: 5400,
  CryptoKing: 1200,
};

/* ---------- 全市场质押占比（demo：不同 KOL 质押热度不同，totalStakedNfts = supply × ratio） ---------- */
const STAKED_SUPPLY_RATIO: Record<string, number> = {
  CryptoChad: 0.22,
  NFTQueen: 0.31,
  DogeFather: 0.18,
  CryptoKing: 0.27,
};

/* ---------- 4 个 KOL 独立的分红池配置（大部分用默认 R%；DogeFather 因等级高 R=20%，覆盖默认） ---------- */
const DIVIDEND_OVERRIDE_BPS: Record<string, number> = {
  CryptoChad: DIVIDEND_POOL.DEFAULT_RATIO_BPS, // 15%
  NFTQueen: DIVIDEND_POOL.DEFAULT_RATIO_BPS, // 15%
  DogeFather: 2000, // 20%（Top KOL 覆盖）
  CryptoKing: 1200, // 12%
};

/* ---------- 近期 mint/burn 活动：每个 KOL 一组，数量/金额按 supply 规模缩放 ---------- */
function makeActivity(suffix: string, scaleUnitPrice: number): KolProfile['activity'] {
  const priceBase = scaleUnitPrice;
  return [
    {
      id: `tx-${suffix}-1`,
      kind: 'mint' as const,
      nftQuantity: 3,
      address: '0x4A2cF3…9F1',
      amountDelta: -roundMon(priceBase * 3 * 1.08),
      timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    },
    {
      id: `tx-${suffix}-2`,
      kind: 'burn' as const,
      nftQuantity: 2,
      address: '0x8Bb13…3C2',
      amountDelta: roundMon(priceBase * 2 * 0.92),
      timestamp: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    },
    {
      id: `tx-${suffix}-3`,
      kind: 'mint' as const,
      nftQuantity: 10,
      address: '0x1fF4e…4E5',
      amountDelta: -roundMon(priceBase * 10 * 1.08),
      timestamp: new Date(Date.now() - 1000 * 60 * 48).toISOString(),
    },
    {
      id: `tx-${suffix}-4`,
      kind: 'mint' as const,
      nftQuantity: 1,
      address: '0x7E2dA…9Bc',
      amountDelta: -roundMon(priceBase * 1 * 1.08),
      timestamp: new Date(Date.now() - 1000 * 60 * 68).toISOString(),
    },
    {
      id: `tx-${suffix}-5`,
      kind: 'burn' as const,
      nftQuantity: 3,
      address: '0xC31f1…D11',
      amountDelta: roundMon(priceBase * 3 * 0.92),
      timestamp: new Date(Date.now() - 1000 * 60 * 96).toISOString(),
    },
  ];
}

/* ---------- 每个 KOL 的分红池 mock 快照（本周待分红 + 已发放历史，按 supply 规模缩放） ---------- */
function makeDividendPool(handle: string, scale: number): DividendPoolInfo {
  const ratioBps = DIVIDEND_OVERRIDE_BPS[handle] ?? DIVIDEND_POOL.DEFAULT_RATIO_BPS;
  const lifetime = roundMon(12_500 * scale + Math.random() * 500);
  const lastSettled = roundMon(1_200 * scale + Math.random() * 80);
  const pendingThisWeek = roundMon(480 * scale + Math.random() * 120);
  return {
    ratioBps,
    pendingThisWeekMon: pendingThisWeek,
    lastSettledMon: lastSettled,
    lifetimeDistributedMon: lifetime,
    nextSettlementAtUtcMs: getNextDividendSettlement().getTime(),
  };
}

/* ---------- 构造单个 KOL profile 工厂 ---------- */
function buildProfile(opts: {
  handle: string;
  nickname: string;
  bio: string;
  avatarUrl: string;
  bannerAccentClass: string;
  rank: number;
  verified: boolean;
  followers: string;
  holders: string;
  xUrl: string;
  badgeIds: ('og' | 'top100' | 'verified')[];
  /** 用户持仓 mock（不同 KOL 给不同量方便展示 UI 分支）。 */
  userHolding: { total: number; staked: number; claimed: number; pending: number };
  /** 24h 涨跌。 */
  change24hPercent: number;
}): KolProfile {
  const { handle, userHolding } = opts;
  const totalSupply = TOTAL_SUPPLY[handle];
  const curveParams = CURVE_PARAMS[handle];
  const currentPriceNum = calcCurrentNftPrice(totalSupply, curveParams);
  const scalePerNft = currentPriceNum;

  const dividendPool = makeDividendPool(handle, totalSupply / 2000);
  const marketStakedNfts = Math.round(totalSupply * (STAKED_SUPPLY_RATIO[handle] ?? 0.2));
  const share = calcDividendSharePerNft(marketStakedNfts, 4);
  const treasury = roundMon(totalSupply * curveParams.basePriceMon * 0.4);

  return {
    handle,
    nickname: opts.nickname,
    bio: opts.bio,
    avatarUrl: opts.avatarUrl,
    bannerAccentClass: opts.bannerAccentClass,
    rank: opts.rank,
    verified: opts.verified,
    followers: opts.followers,
    holders: opts.holders,
    dividendSharePerNft: share,
    totalDividendsDistributedMon: formatTokenAmount(dividendPool.lifetimeDistributedMon),
    xUrl: opts.xUrl,
    badges: opts.badgeIds.map((id) => ({
      id,
      label: id === 'og' ? 'OG Creator' : id === 'top100' ? 'Top 100' : 'Verified KOL',
    })),
    curveParams,
    dividendPool,
    market: {
      currentPrice: formatTokenAmount(currentPriceNum),
      change24hPercent: opts.change24hPercent,
      treasuryBalanceMon: treasury,
      userNftBalance: userHolding.total,
      totalSupplyNfts: totalSupply,
      totalStakedNfts: Math.round(totalSupply * (STAKED_SUPPLY_RATIO[handle] ?? 0.2)),
      stakedNfts: userHolding.staked,
      dividendsClaimedMon: userHolding.claimed,
      dividendsPendingMon: userHolding.pending,
    },
    curve: buildCurvePreview(totalSupply, BONDING_CURVE.PREVIEW_POINT_COUNT, curveParams),
    activity: makeActivity(handle.toLowerCase().replace(/[^a-z]/g, ''), scalePerNft),
  };
}

export const kolProfiles: Record<string, KolProfile> = {
  CryptoChad: buildProfile({
    handle: 'CryptoChad',
    nickname: 'Crypto Chad',
    bio: 'Shitposting my way to the moon. Exploring the social layer of web3. NFA.',
    avatarUrl:
      'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=600',
    bannerAccentClass: 'from-primary via-purple-400 to-pink-500',
    rank: 42,
    verified: true,
    followers: '124.5K',
    holders: '3,492',
    xUrl: 'https://twitter.com/cryptochad_wtf',
    badgeIds: ['og', 'top100', 'verified'],
    userHolding: { total: 12, staked: 0, claimed: 84.32, pending: 12.08 },
    change24hPercent: 14.2,
  }),
  NFTQueen: buildProfile({
    handle: 'NFTQueen',
    nickname: 'NFT Queen',
    bio: 'Curating generative art drops 24/7. Owned a Punk before it was cool 💎👑',
    avatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600',
    bannerAccentClass: 'from-secondary via-emerald-400 to-teal-500',
    rank: 8,
    verified: true,
    followers: '850K',
    holders: '2,100',
    xUrl: 'https://twitter.com/nftqueen_eth',
    badgeIds: ['verified', 'top100'],
    userHolding: { total: 0, staked: 0, claimed: 0, pending: 0 },
    change24hPercent: 7.4,
  }),
  DogeFather: buildProfile({
    handle: 'DogeFather',
    nickname: 'Doge Father',
    bio: 'Much wow. Very trade. So social. 🐕💎🙌',
    avatarUrl:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=600',
    bannerAccentClass: 'from-tertiary via-yellow-400 to-orange-500',
    rank: 1,
    verified: true,
    followers: '3.4M',
    holders: '12K',
    xUrl: 'https://twitter.com/dogefather_btc',
    badgeIds: ['og', 'verified', 'top100'],
    userHolding: { total: 3, staked: 2, claimed: 126.45, pending: 38.12 },
    change24hPercent: 22.8,
  }),
  CryptoKing: buildProfile({
    handle: 'CryptoKing',
    nickname: 'CryptoKing',
    bio: 'Pinned tweets for degens. 24h viral shill guarantee. 48h delivery or refund.',
    avatarUrl:
      'https://images.unsplash.com/photo-1618365908648-e71bd5716cba?auto=format&fit=crop&q=80&w=600',
    bannerAccentClass: 'from-error via-rose-500 to-purple-600',
    rank: 15,
    verified: true,
    followers: '842K',
    holders: '1.2K',
    xUrl: 'https://twitter.com/cryptoking_degen',
    badgeIds: ['verified'],
    userHolding: { total: 0, staked: 0, claimed: 0, pending: 0 },
    change24hPercent: -3.1,
  }),
};

/** Returns every known handle so we can build 404s for unknown routes. */
export const knownKolHandles = Object.keys(kolProfiles);
