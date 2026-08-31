import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './app/AppLayout';
import HomePage from './pages/HomePage';
import AuctionsPage from './pages/AuctionsPage';
import AuctionDetailPage from './pages/AuctionDetailPage';
import KolProfilePage from './pages/KolProfilePage';
import StakingPage from './pages/StakingPage';
import ClaimPage from './pages/ClaimPage';
import PointsPage from './pages/PointsPage';
import ArbitrationPage from './pages/ArbitrationPage';
import WalletPage from './pages/WalletPage';
import DocsPage from './pages/DocsPage';
import { ROUTES } from './config/routes';

/**
 * 应用入口 — React Router 路由配置
 * 阶段 1：建立路由骨架，页面为占位组件
 * 阶段 3：迁移实际页面内容
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path={ROUTES.HOME} element={<HomePage />} />
          <Route path={ROUTES.AUCTIONS} element={<AuctionsPage />} />
          <Route path={ROUTES.AUCTION_DETAIL} element={<AuctionDetailPage />} />
          <Route path={ROUTES.KOL_PROFILE} element={<KolProfilePage />} />
          <Route path={ROUTES.STAKING} element={<StakingPage />} />
          <Route path={ROUTES.CLAIM} element={<ClaimPage />} />
          <Route path={ROUTES.POINTS} element={<PointsPage />} />
          <Route path={ROUTES.ARBITRATION} element={<ArbitrationPage />} />
          <Route path={ROUTES.WALLET} element={<WalletPage />} />
          <Route path={ROUTES.DOCS} element={<DocsPage />} />
          <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
