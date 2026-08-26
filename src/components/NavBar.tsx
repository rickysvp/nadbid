import { Menu, Wallet } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { routes } from '@/routes/config';
import { useUiStore, useUserWalletStore } from '@/stores';
import { formatTokenAmount, shortenAddress } from '@/utils/format';
import { cn } from '@/utils/cn';

const NAV_ITEMS = routes.filter((r) => r.inNav).map(({ path, label }) => ({ path, label }));

function navLinkClasses({ isActive }: { isActive: boolean }): string {
  const stateClasses = isActive
    ? 'text-primary border-b-2 border-primary pb-1'
    : 'text-on-surface-variant hover:text-primary hover:scale-105';
  return `${stateClasses} transition-all duration-300 active:scale-95`;
}

export default function NavBar() {
  const { status, address, balanceMon, connect, disconnect } = useUserWalletStore();
  const { isNavDrawerOpen, toggleNavDrawer, closeNavDrawer } = useUiStore();

  const isConnected = status === 'connected';
  const isLoading = status === 'connecting';

  return (
    <nav className="bg-surface/90 backdrop-blur-md w-full sticky top-0 z-50 border-b-2 border-black shadow-neo-lg mb-8">
      <div className="flex justify-between items-center w-full px-container-padding py-4 max-w-7xl mx-auto">
        <Link
          to="/"
          className="flex items-center gap-2 btn-hover"
          onClick={closeNavDrawer}
          aria-label="nadbid.fun"
        >
          <img
            src="/nadbid.png"
            alt="nadbid.fun"
            className="h-9 md:h-10 w-auto object-contain drop-shadow-[0_2px_0_rgba(0,0,0,0.9)]"
          />
        </Link>

        <div className="hidden md:flex items-center gap-8 font-bold">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={navLinkClasses}
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isConnected ? (
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-on-surface-variant font-bold">
                {formatTokenAmount(balanceMon)}
              </span>
              <button
                type="button"
                onClick={disconnect}
                className="bg-zinc-100 text-black px-4 py-2 rounded-full font-mono text-xs uppercase tracking-wider btn-hover active:scale-95 transition-all border-2 border-black shadow-neo-md font-bold"
                title={address ? shortenAddress(address) : undefined}
              >
                {address ? shortenAddress(address) : 'Disconnect'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void connect()}
              disabled={isLoading}
              className={cn(
                'bg-primary text-on-primary px-6 py-2 rounded-full font-mono text-sm uppercase tracking-wider active:scale-95 transition-all border-2 border-black shadow-neo-lg font-bold flex items-center gap-2',
                isLoading ? 'opacity-70 cursor-wait' : 'btn-hover',
              )}
            >
              <Wallet className="w-4 h-4" />
              {isLoading ? 'Connecting…' : 'Connect Wallet'}
            </button>
          )}
        </div>

        <button
          type="button"
          aria-label="Toggle navigation menu"
          aria-expanded={isNavDrawerOpen}
          className="md:hidden text-primary p-2"
          onClick={toggleNavDrawer}
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile nav drawer */}
      {isNavDrawerOpen && (
        <div className="md:hidden border-t-2 border-black bg-surface px-container-padding py-4 flex flex-col gap-3 shadow-neo-md">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={closeNavDrawer}
              className={navLinkClasses}
            >
              {item.label}
            </NavLink>
          ))}
          {/* 钱包区与桌面端对等：连接前可 Connect，连接后显示余额 + Disconnect。 */}
          {isConnected ? (
            <div className="flex items-center justify-between gap-3 border-t-2 border-black/10 pt-3 mt-1">
              <div className="min-w-0">
                <div className="font-mono text-xs font-bold text-on-surface-variant truncate">
                  {formatTokenAmount(balanceMon)}
                </div>
                <div className="font-mono text-[10px] uppercase font-black text-black/50 truncate">
                  {address ?? 'Wallet'}
                </div>
              </div>
              <button
                type="button"
                onClick={disconnect}
                className="shrink-0 bg-zinc-100 text-black px-4 py-2 rounded-full font-mono text-xs uppercase tracking-wider btn-hover active:scale-95 transition-all border-2 border-black shadow-neo-md font-bold"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void connect()}
              disabled={isLoading}
              className={cn(
                'bg-primary text-on-primary px-6 py-2 rounded-full font-mono text-sm uppercase tracking-wider btn-hover active:scale-95 transition-all border-2 border-black shadow-neo-lg font-bold mt-2',
                isLoading && 'opacity-70 cursor-wait',
              )}
            >
              {isLoading ? 'Connecting…' : 'Connect Wallet'}
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
