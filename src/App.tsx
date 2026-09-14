import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { WagmiProvider } from './web3/WagmiProvider';
import { WalletStateSyncer } from './web3/WalletStateSyncer';
import { ErrorBoundary } from './components/ErrorBoundary';
import AppLayout from './app/AppLayout';
import { WalletGuard } from './components/wallet';
import HomePage from './pages/HomePage';
import { ROUTES } from './config/routes';

// NADBID 协议页面路由级懒加载
const NadbidAuctionsPage = lazy(() => import('./pages/NadbidAuctionsPage'));
const NadbidAuctionDetailPage = lazy(() => import('./pages/NadbidAuctionDetailPage'));
const NadbidCreateAuctionPage = lazy(() => import('./pages/NadbidCreateAuctionPage'));

/** 懒加载页面的加载占位 */
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-white/40 text-sm animate-pulse">Loading...</div>
    </div>
  );
}

/**
 * 应用入口 — React Router 路由配置（NADBID 链上拍卖协议）
 * 低频页面使用 React.lazy 路由级懒加载，拆分主包体积
 */
export default function App() {
  return (
    <ErrorBoundary>
      <WagmiProvider>
        <WalletStateSyncer />
        <BrowserRouter>
          <WalletGuard>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path={ROUTES.HOME} element={<HomePage />} />
                  <Route path={ROUTES.NADBID} element={<NadbidAuctionsPage />} />
                  <Route path={ROUTES.NADBID_DETAIL} element={<NadbidAuctionDetailPage />} />
                  <Route path={ROUTES.NADBID_CREATE} element={<NadbidCreateAuctionPage />} />
                  <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
                </Route>
              </Routes>
            </Suspense>
          </WalletGuard>
        </BrowserRouter>
      </WagmiProvider>
    </ErrorBoundary>
  );
}
