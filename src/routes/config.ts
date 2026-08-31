import type { ComponentType } from 'react';
import Home from '@/pages/Home';
import AuctionDetail from '@/pages/AuctionDetail';
import KOLs from '@/pages/KOLs';
import KolProfile from '@/pages/KolProfile';
import Staking from '@/pages/Staking';
import Claim from '@/pages/Claim';
import Points from '@/pages/Points';
import NotFound from '@/pages/NotFound';

export interface RouteDefinition {
  path: string;
  label: string;
  element: ComponentType;
  inNav?: boolean;
  inFooter?: boolean;
}

/** 胶囊导航顺序（与设计稿一致）：Auction Hall → Staking → Claim → Points → Docs(外链) */
export const PILL_NAV_ORDER: Array<
  | { type: 'route'; path: string }
  | { type: 'external'; label: string; href: string }
> = [
  { type: 'route', path: '/' },
  { type: 'route', path: '/staking' },
  { type: 'route', path: '/claim' },
  { type: 'route', path: '/points' },
  { type: 'external', label: 'Docs', href: 'https://docs.nadbid.fun' },
];

export const routes: RouteDefinition[] = [
  { path: '/', label: 'AUCTIONS', element: Home, inNav: true },
  { path: '/auctions/:id', label: 'Auction Detail', element: AuctionDetail },
  { path: '/kols', label: 'KOLs', element: KOLs, inFooter: true },
  { path: '/kols/:handle', label: 'KOL Profile', element: KolProfile },
  { path: '/staking', label: 'Staking', element: Staking, inNav: true },
  { path: '/claim', label: 'Claim', element: Claim, inNav: true },
  { path: '/points', label: 'Points', element: Points, inNav: true },
];

export const catchAllRoute: RouteDefinition = {
  path: '*',
  label: 'Not Found',
  element: NotFound,
};

export const footerLinks: { label: string; href: string; external?: boolean }[] = [
  { label: 'KOLs', href: '/kols' },
  { label: 'Docs', href: 'https://docs.nadbid.fun', external: true },
  { label: 'Support', href: 'mailto:support@nadbid.fun', external: true },
  { label: 'Terms', href: 'https://nadbid.fun/terms', external: true },
  { label: 'Privacy', href: 'https://nadbid.fun/privacy', external: true },
];
