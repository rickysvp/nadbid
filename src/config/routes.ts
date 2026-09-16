/**
 * 路由配置 — 集中管理所有页面路径（NADBID 链上拍卖协议）
 */

export const ROUTES = {
  HOME: '/',
  /** 新协议 NADBID（USDC 结算链上拍卖） */
  NADBID: '/nadbid',
  NADBID_DETAIL: '/nadbid/:id',
  NADBID_CREATE: '/nadbid/create',
  /** 生态模块 */
  STAKING: '/staking',
  CLAIM: '/claim',
  REFERRAL: '/referral',
  /** 法律与帮助 */
  LEGAL_TERMS: '/legal/terms',
  LEGAL_PRIVACY: '/legal/privacy',
  LEGAL_RISK: '/legal/risk',
} as const;

/** 生成新协议拍卖详情页路径 */
export function nadbidDetailPath(id: string | bigint): string {
  return `/nadbid/${id.toString()}`;
}

/** 导航项配置（Navbar 使用） */
export interface NavItem {
  label: string;
  path: string;
  /** 未上线模块，导航中标记 SOON */
  soon?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: ROUTES.HOME },
  { label: 'Auctions', path: ROUTES.NADBID },
  { label: 'Staking', path: ROUTES.STAKING, soon: true },
  { label: 'Claim', path: ROUTES.CLAIM, soon: true },
  { label: 'Referral', path: ROUTES.REFERRAL, soon: true },
];
