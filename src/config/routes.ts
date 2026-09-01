/**
 * 路由配置 — 集中管理所有页面路径
 */

export const ROUTES = {
  HOME: '/',
  AUCTIONS: '/auctions',
  AUCTION_DETAIL: '/auctions/:id',
  KOL_PROFILE: '/kols/:handle',
  STAKING: '/staking',
  CLAIM: '/claim',
  POINTS: '/points',
  ARBITRATION: '/arbitration',
  WALLET: '/wallet',
  KOL_ONBOARDING: '/kol/onboarding',
  DOCS: '/docs',
} as const;

/** 生成拍卖详情页路径 */
export function auctionDetailPath(id: string): string {
  return `/auctions/${id}`;
}

/** 生成 KOL Profile 路径 */
export function kolProfilePath(handle: string): string {
  return `/kols/${handle.replace(/^@/, '')}`;
}

/** 导航项配置（Navbar 使用） */
export const NAV_ITEMS = [
  { label: 'Home', path: ROUTES.HOME },
  { label: 'Auctions', path: ROUTES.AUCTIONS },
  { label: 'Staking', path: ROUTES.STAKING },
  { label: 'Claim', path: ROUTES.CLAIM },
  { label: 'Points', path: ROUTES.POINTS },
  { label: 'Docs', path: ROUTES.DOCS },
] as const;
