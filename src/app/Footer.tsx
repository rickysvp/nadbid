import { useToast } from '../hooks/useToast';

/**
 * 页脚 — 严格匹配原 DEMO 视觉
 * Logo + 描述 + Platform/Resources/Legal 链接 + 社交媒体 + 巨型底部 Logo
 */
export function Footer() {
  const { info } = useToast();

  const handleLink = (label: string) => {
    info(`${label} coming soon`);
  };

  return (
    <footer className="bg-transparent text-white border-t border-white/5 flex flex-col pt-24 relative z-10">
      <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24 mb-24 relative z-10">
        <div>
          <div className="font-bold text-2xl tracking-tight mb-4 flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-brand-green rounded-full"></div>
            NADBID
          </div>
          <p className="text-gray-500 text-sm max-w-sm leading-relaxed">
            Decentralized influencer auctions and KOL access passes on Monad.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          <div>
            <h4 className="font-semibold text-xs tracking-wider uppercase text-gray-400 mb-6">Platform</h4>
            <ul className="space-y-4 text-gray-500 text-sm">
              <li><a href="#" onClick={(e) => { e.preventDefault(); handleLink('Trade Passes'); }} className="hover:text-white transition-colors">Trade Passes</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); handleLink('Stake & Earn'); }} className="hover:text-white transition-colors">Stake & Earn</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); handleLink('Leaderboard'); }} className="hover:text-white transition-colors">Leaderboard</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-xs tracking-wider uppercase text-gray-400 mb-6">Resources</h4>
            <ul className="space-y-4 text-gray-500 text-sm">
              <li><a href="#" onClick={(e) => { e.preventDefault(); handleLink('Documentation'); }} className="hover:text-white transition-colors">Documentation</a></li>
              <li>
                <a
                  href="https://testnet.monadexplorer.com/address/0x192ef59aad1578083b9f636f5b19760b61959138"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Registry Contract
                </a>
              </li>
              <li>
                <a
                  href="https://testnet.monadexplorer.com/address/0x43d026719122d1020ed56fd4c8d41c945bab866c"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Factory Contract
                </a>
              </li>
              <li>
                <a
                  href="https://testnet.monadexplorer.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Monad Testnet Explorer
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-xs tracking-wider uppercase text-gray-400 mb-6">Legal</h4>
            <ul className="space-y-4 text-gray-500 text-sm">
              <li><a href="#" onClick={(e) => { e.preventDefault(); handleLink('Terms of Service'); }} className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); handleLink('Privacy Policy'); }} className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); handleLink('Risk Disclaimer'); }} className="hover:text-white transition-colors">Risk Disclaimer</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="w-full border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center py-8 text-gray-500 text-sm">
          <p>&copy; 2024 nadbid.fun. All rights reserved.</p>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <a href="#" onClick={(e) => { e.preventDefault(); handleLink('X'); }} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-brand-green hover:text-black transition-all duration-300">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); handleLink('Discord'); }} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-brand-green hover:text-black transition-all duration-300">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.461-.63.873-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.028zM8.02 15.33c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Giant Bottom Logo */}
      <div className="w-full overflow-hidden flex justify-center items-end pointer-events-none select-none mt-4 -mb-4">
        <h1 className="text-[22vw] md:text-[24vw] font-black tracking-tighter leading-[0.75] text-white/[0.03] text-center w-full">
          NADBID
        </h1>
      </div>
    </footer>
  );
}
