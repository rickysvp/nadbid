import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { WagmiProvider } from './web3/WagmiProvider';
import { WalletStateSyncer } from './web3/WalletStateSyncer';
import { ErrorBoundary } from './components/ErrorBoundary';
import AppLayout from './app/AppLayout';
import { WalletGuard } from './components/wallet';
import HomePage from './pages/HomePage';
import ComingSoonPage from './pages/ComingSoonPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import RiskDisclaimerPage from './pages/RiskDisclaimerPage';
import NotFoundPage from './pages/NotFoundPage';
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
                  <Route
                    path={ROUTES.STAKING}
                    element={
                      <ComingSoonPage
                        title="Staking"
                        tagline="Stake NAD to unlock fee discounts, priority access to exclusive auctions and a share of protocol upside."
                        features={[
                          'Fee discount tiers for bidders & sellers',
                          'Priority access to whitelisted auctions',
                          'Protocol revenue share for stakers',
                        ]}
                        note="NAD token is not live yet. Staking will activate after the token launch."
                      />
                    }
                  />
                  <Route
                    path={ROUTES.CLAIM}
                    element={
                      <ComingSoonPage
                        title="Claim Center"
                        tagline="Collect your auction dividends, bidder rewards and any refundable balances in one place."
                        features={[
                          'Bidder dividend payouts from 15% reward pool',
                          'Refundable same-block losing bids',
                          'One-click claim of all accrued earnings',
                        ]}
                        note="Claims for live auctions already work on the auction detail page — this hub aggregates them across all auctions."
                      />
                    }
                  />
                  <Route
                    path={ROUTES.REFERRAL}
                    element={
                      <ComingSoonPage
                        title="Referral"
                        tagline="Earn a share of protocol fees by bringing bidders and sellers to NADBID."
                        features={[
                          'Share of bid fees from referred users',
                          'On-chain, verifiable referral tracking',
                          'Leaderboard for top referrers',
                        ]}
                        note="Referral program will launch after the token and fee structure are finalized."
                      />
                    }
                  />
                  <Route path={ROUTES.LEGAL_TERMS} element={<TermsOfServicePage />} />
                  <Route path={ROUTES.LEGAL_PRIVACY} element={<PrivacyPolicyPage />} />
                  <Route path={ROUTES.LEGAL_RISK} element={<RiskDisclaimerPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </Suspense>
          </WalletGuard>
        </BrowserRouter>
      </WagmiProvider>
    </ErrorBoundary>
  );
}
