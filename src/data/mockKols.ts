import type { Kol, KolStats } from '../types';

/**
 * KOL Mock 数据 — 从 App.tsx KOLRank + ProfileView 提取
 */

export const mockKols: Kol[] = [
  {
    id: 'kol-001',
    name: '0xChine',
    handle: '@0xchine',
    bio: 'On-chain analyst & Monad maxi. Sharing alpha daily.',
    followers: 142500,
    rank: 1,
    socialLinks: {
      twitter: 'https://twitter.com/0xchine',
      telegram: 'https://t.me/oxchine',
    },
  },
  {
    id: 'kol-002',
    name: 'CryptoQueen',
    handle: '@cryptoqueen',
    bio: 'DeFi researcher. Yield farming expert.',
    followers: 98000,
    rank: 2,
  },
  {
    id: 'kol-003',
    name: 'AlphaSeeker',
    handle: '@alphaseek',
    bio: 'Hunting alpha in the Monad ecosystem.',
    followers: 76000,
    rank: 3,
  },
  {
    id: 'kol-004',
    name: 'MoonShot',
    handle: '@moonshot',
    bio: 'Technical analyst. Swing trader.',
    followers: 65000,
    rank: 4,
  },
  {
    id: 'kol-005',
    name: 'DegenWizard',
    handle: '@degenwiz',
    bio: 'Professional degen. High risk, high reward.',
    followers: 54000,
    rank: 5,
  },
  {
    id: 'kol-006',
    name: 'WhaleWatch',
    handle: '@whalewatch',
    bio: 'Tracking whale wallets and smart money.',
    followers: 43000,
    rank: 6,
  },
  {
    id: 'kol-007',
    name: 'DeFiGuru',
    handle: '@defiguru',
    bio: 'DeFi educator. Making complex protocols simple.',
    followers: 38000,
    rank: 7,
  },
  {
    id: 'kol-008',
    name: 'YieldFarm',
    handle: '@yieldfarm',
    bio: 'Yield optimizer. Farming the best APYs.',
    followers: 32000,
    rank: 8,
  },
  {
    id: 'kol-009',
    name: 'BlockBoss',
    handle: '@blockboss',
    bio: 'Blockchain developer & educator.',
    followers: 28000,
    rank: 9,
  },
  {
    id: 'kol-010',
    name: 'BobBuilder',
    handle: '@bobbuild',
    bio: 'Builder. Shipping on Monad.',
    followers: 24000,
    rank: 10,
  },
];

export const mockKolStats: Record<string, KolStats> = {
  'kol-001': {
    kolId: 'kol-001',
    passSupply: 8492,
    passTvl: 105420,
    auctionTvl: 245000,
    currentPrice: 12.42,
    totalAuctions: 12,
    activeAuctions: 1,
  },
};

/** 根据 handle 查找 KOL */
export function getKolByHandle(handle: string): Kol | undefined {
  return mockKols.find((k) => k.handle === handle || k.handle === `@${handle.replace(/^@/, '')}`);
}
