import { Menu, Wallet, ExternalLink } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { PILL_NAV_ORDER, routes } from '@/routes/config';
import { useUiStore, useUserWalletStore } from '@/stores';
import { formatTokenAmount, shortenAddress } from '@/utils/format';
import { cn } from '@/utils/cn';
import { useMemo } from 'react';

/** 胶囊导航项（内部路由 + 外链 Docs）。 */
interface PillNavItem {
  key: string;
  label: string;
  isExternal: boolean;
  href?: string;
  path?: string;
}

function buildPillNavItems(): PillNavItem[] {
  return PILL_NAV_ORDER.map((entry, idx) => {
    if (entry.type === 'external') {
      return {
        key: `ext-${idx}`,
        label: entry.label,
        isExternal: true,
        href: entry.href,
      };
    }
    const def = routes.find((r) => r.path === entry.path);
    return {
      key: `r-${entry.path}`,
      label: def?.label ?? entry.path,
      isExternal: false,
      path: entry.path,
    };
  });
}

export default function NavBar() {
  const { status, address, balanceMon, connect, disconnect } = useUserWalletStore();
  const { isNavDrawerOpen, toggleNavDrawer, closeNavDrawer } = useUiStore();
  const location = useLocation();
  const pillNav = useMemo(buildPillNavItems, []);

  const isConnected = status === 'connected';
  const isLoading = status === 'connecting';

  /**
   * 胶囊激活判定：
   * - 路由项：path="/" 用 end 精确匹配；其它按前缀匹配 /staking /claim /points
   * - 外链 Docs：永远非激活（页面外跳转）
   */
  const isPillActive = (item: PillNavItem): boolean => {
    if (item.isExternal || !item.path) return false;
    const pathname = location.pathname;
    if (item.path === '/') return pathname === '/';
    if (item.path === '/staking') return pathname.startsWith('/staking');
    if (item.path === '/claim') return pathname.startsWith('/claim');
    if (item.path === '/points') return pathname.startsWith('/points');
    return false;
  };

  return (
    <header className="w-full sticky top-0 z-50">
      {/* 顶部栏：左侧 LOGO | 中央 胶囊导航 | 右侧 钱包。胶囊导航始终 md+ 居中显示。 */}
      <div className="bg-surface/90 backdrop-blur-md border-b-2 border-black shadow-neo-sm">
        <div className="flex items-center justify-between gap-2 md:gap-3 w-full px-container-padding py-2.5 md:py-3 max-w-7xl mx-auto">
          {/* LOGO */}
          <Link
            to="/"
            className="flex items-center gap-1.5 md:gap-2 btn-hover shrink-0"
            onClick={closeNavDrawer}
            aria-label="nadbid.fun"
          >
            <img
              src="/nadbid.png"
              alt="nadbid.fun"
              className="h-10 md:h-[46px] lg:h-[52px] w-auto object-contain drop-shadow-[0_2px_0_rgba(0,0,0,0.9)]"
            />
          </Link>

          {/* 桌面端：居中胶囊导航 —— 微缩精致款 + 响应式分级 */}
          <div className="hidden md:flex flex-1 items-center justify-center min-w-0">
            <nav
              aria-label="Primary"
              className="flex items-center rounded-full border-[2.5px] border-black bg-white shadow-[3px_3px_0_0_#111111] px-[3px] py-[3px] gap-0 md:px-1 md:py-[3px] lg:gap-0.5"
            >
              {pillNav.map((item) => {
                const active = isPillActive(item);
                const base =
                  'inline-flex items-center justify-center rounded-full px-2.5 py-[5px] md:px-3 md:py-1 lg:px-[14px] lg:py-[6px] font-condensed font-black text-[11px] md:text-[12px] lg:text-[13px] xl:text-sm uppercase tracking-normal lg:tracking-wide transition-all duration-150 select-none';
                const activeCls =
                  'bg-primary text-black border-2 border-black shadow-[1.5px_1.5px_0_0_#111111]';
                const inactiveCls =
                  'text-on-surface-variant hover:text-black hover:bg-bg-deep/40 border-2 border-transparent';
                if (item.isExternal) {
                  return (
                    <a
                      key={item.key}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(base, inactiveCls)}
                    >
                      {item.label}
                      <ExternalLink className="w-3 h-3 ml-1 -mt-0.5" strokeWidth={2.5} />
                    </a>
                  );
                }
                return (
                  <NavLink
                    key={item.key}
                    to={item.path!}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      cn(base, isActive || active ? activeCls : inactiveCls)
                    }
                  >
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* 钱包区 - 桌面端（微缩精致 + 响应式，与导航胶囊同节奏） */}
          <div className="hidden md:flex items-center gap-1.5 lg:gap-2 shrink-0">
            {isConnected ? (
              <div className="flex items-center gap-1.5 lg:gap-2">
                <span className="font-mono text-[10.5px] lg:text-[11px] text-on-surface-variant font-bold tabular-nums">
                  {formatTokenAmount(balanceMon)}
                </span>
                <button
                  type="button"
                  onClick={disconnect}
                  className="bg-bg-deep text-black px-2.5 py-1 lg:px-3.5 lg:py-1.5 rounded-md font-mono text-[9.5px] lg:text-[10.5px] uppercase tracking-wide btn-hover active:scale-95 transition-all border-2 border-black shadow-neo-xs lg:shadow-neo-sm font-bold"
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
                  'bg-primary text-black px-3 py-1.5 lg:px-4 lg:py-2 rounded-md font-mono text-[10px] lg:text-[11px] uppercase tracking-wide active:scale-95 transition-all border-2 border-black shadow-[3px_3px_0_0_#111111] lg:shadow-neo-md font-bold flex items-center gap-1 lg:gap-1.5',
                  isLoading ? 'opacity-70 cursor-wait' : 'btn-hover',
                )}
              >
                <Wallet className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                <span className="hidden lg:inline">{isLoading ? '…' : 'Connect'}</span>
                <span className="lg:hidden">{isLoading ? '…' : 'Wallet'}</span>
              </button>
            )}
          </div>

          {/* 移动端：右侧菜单/钱包入口 */}
          <div className="md:hidden flex items-center gap-2">
            {!isConnected && (
              <button
                type="button"
                onClick={() => void connect()}
                disabled={isLoading}
                className={cn(
                  'bg-primary text-black px-4 py-2 rounded-full font-mono text-[11px] uppercase tracking-wider active:scale-95 transition-all border-2 border-black shadow-neo-sm font-black',
                  isLoading && 'opacity-70 cursor-wait',
                )}
                aria-label="Connect wallet"
              >
                <Wallet className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded={isNavDrawerOpen}
              className="text-black p-2 border-2 border-black bg-white rounded-full shadow-neo-sm active:scale-95"
              onClick={toggleNavDrawer}
            >
              <Menu className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* 移动端 nav drawer：复制胶囊导航顺序（Auction Hall→Staking→Claim→Points→Docs） + 钱包 */}
        {isNavDrawerOpen && (
          <div className="md:hidden border-t-2 border-black bg-surface px-container-padding py-4 flex flex-col gap-3 shadow-neo-md">
            <div className="flex flex-col gap-2">
              {pillNav.map((item) => {
                const active = isPillActive(item);
                const base =
                  'inline-flex items-center justify-between rounded-2xl px-5 py-3.5 font-condensed font-black text-xl uppercase tracking-wider border-2 border-black transition-all active:scale-[0.99]';
                if (item.isExternal) {
                  return (
                    <a
                      key={item.key}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={closeNavDrawer}
                      className={cn(base, 'text-on-surface-variant bg-white shadow-neo-sm')}
                    >
                      <span>{item.label}</span>
                      <ExternalLink className="w-4 h-4" strokeWidth={2.5} />
                    </a>
                  );
                }
                return (
                  <NavLink
                    key={item.key}
                    to={item.path!}
                    end={item.path === '/'}
                    onClick={closeNavDrawer}
                    className={({ isActive }) =>
                      cn(
                        base,
                        isActive || active
                          ? 'bg-primary text-black shadow-neo-md'
                          : 'bg-white text-on-surface-variant shadow-neo-sm',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>{item.label}</span>
                        <span
                          aria-hidden
                          className={cn(
                            'w-3 h-3 rounded-full border-2 border-black',
                            isActive || active ? 'bg-black' : 'bg-transparent',
                          )}
                        />
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>

            {/* 钱包区与桌面端对等 */}
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
                  className="shrink-0 bg-bg-deep text-black px-4 py-2 rounded-md font-mono text-xs uppercase tracking-wider btn-hover active:scale-95 transition-all border-2 border-black shadow-neo-md font-bold"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              !isLoading && (
                <button
                  type="button"
                  onClick={() => void connect()}
                  disabled={isLoading}
                  className={cn(
                    'bg-primary text-black px-6 py-3 rounded-lg font-mono text-sm uppercase tracking-wider btn-hover active:scale-95 transition-all border-2 border-black shadow-neo-lg font-bold mt-2 flex items-center justify-center gap-2',
                    isLoading && 'opacity-70 cursor-wait',
                  )}
                >
                  <Wallet className="w-4 h-4" />
                  Connect Wallet
                </button>
              )
            )}
          </div>
        )}
      </div>
    </header>
  );
}
