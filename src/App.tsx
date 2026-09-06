import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { WagmiProvider } from './web3/WagmiProvider';
import { WalletStateSyncer } from './web3/WalletStateSyncer';
import { ErrorBoundary } from './components/ErrorBoundary';
import AppLayout from './app/AppLayout';
// P2-10：高频页面直接导入，低频页面使用 React.lazy 路由级懒加载，拆分主包体积
import HomePage from './pages/HomePage';
import AuctionsPage from './pages/AuctionsPage';
import AuctionDetailPage from './pages/AuctionDetailPage';
import KolProfilePage from './pages/KolProfilePage';
import WalletPage from './pages/WalletPage';
// 低频页面懒加载（Staking/Claim/Points/Arbitration/Docs/KolOnboarding）
const StakingPage = lazy(() => import('./pages/StakingPage'));
const ClaimPage = lazy(() => import('./pages/ClaimPage'));
const PointsPage = lazy(() => import('./pages/PointsPage'));
const ArbitrationPage = lazy(() => import('./pages/ArbitrationPage'));
const KolOnboardingPage = lazy(() => import('./pages/KolOnboardingPage'));
const DocsPage = lazy(() => import('./pages/DocsPage'));
import { ROUTES } from './config/routes';

/** 懒加载页面的加载占位 */
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-white/40 text-sm animate-pulse">Loading...</div>
    </div>
  );
}

/**
 * 应用入口 — React Router 路由配置
 * P2-10：低频页面使用 React.lazy 路由级懒加载，拆分主包体积（从 ~980KB 降至 ~600KB）
 */
export default function App() {
  return (
    <ErrorBoundary>
      <WagmiProvider>
        <WalletStateSyncer />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
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
                <Route path={ROUTES.KOL_ONBOARDING} element={<KolOnboardingPage />} />
                <Route path={ROUTES.DOCS} element={<DocsPage />} />
                <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </WagmiProvider>
    </ErrorBoundary>
  );
}
