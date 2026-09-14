/**
 * 路由配置 — 集中管理所有页面路径（NADBID 链上拍卖协议）
 */

export const ROUTES = {
  HOME: '/',
  /** 新协议 NADBID（USDC 结算链上拍卖） */
  NADBID: '/nadbid',
  NADBID_DETAIL: '/nadbid/:id',
  NADBID_CREATE: '/nadbid/create',
} as const;

/** 生成新协议拍卖详情页路径 */
export function nadbidDetailPath(id: string | bigint): string {
  return `/nadbid/${id.toString()}`;
}

/** 导航项配置（Navbar 使用） */
export const NAV_ITEMS = [
  { label: 'Home', path: ROUTES.HOME },
  { label: 'Auctions', path: ROUTES.NADBID },
  { label: 'Create', path: ROUTES.NADBID_CREATE },
] as const;
