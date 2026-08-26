import type { ComponentType } from 'react';
import Home from '@/pages/Home';
import AuctionDetail from '@/pages/AuctionDetail';
import KOLs from '@/pages/KOLs';
import KolProfile from '@/pages/KolProfile';
import Staking from '@/pages/Staking';
import NotFound from '@/pages/NotFound';

export interface RouteDefinition {
  path: string;
  label: string;
  element: ComponentType;
  inNav?: boolean;
  inFooter?: boolean;
}

export const routes: RouteDefinition[] = [
  { path: '/', label: 'Bid', element: Home, inNav: true },
  { path: '/auctions/:id', label: 'Auction Detail', element: AuctionDetail },
  { path: '/kols', label: 'KOLs', element: KOLs, inNav: true, inFooter: true },
  { path: '/kols/:handle', label: 'KOL Profile', element: KolProfile },
  { path: '/staking', label: 'Stake', element: Staking, inNav: true },
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
