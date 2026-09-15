import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { ConnectButton } from '../components/wallet';
import { NAV_ITEMS } from '../config/routes';
import { cn } from '../utils/cn';

/**
 * 顶部导航栏 — NADBID
 * Editorial 编辑风三栏布局（参考 busy.land）：
 *   左：LOGO + 副标题小字（ON-CHAIN AUCTIONS · MONAD TESTNET）
 *   中：导航细字链接（hover 下划线，active 紫字）
 *   右：Connect Wallet
 * 顶部透明 → 滚动后半透明白毛玻璃 + 细下边框
 */
export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isHome = location.pathname === '/';
  const solid = scrolled;
  const onHome = isHome && !solid;

  const go = (path: string) => {
    setMobileOpen(false);
    navigate(path);
  };

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        solid
          ? 'bg-[#fffefd]/95 backdrop-blur-xl border-b border-[#111]/15'
          : 'bg-transparent border-b border-transparent',
      )}
    >
      <div className="w-full grid grid-cols-[1fr_auto_1fr] items-center px-6 md:px-10 h-16 md:h-[72px] max-w-[1600px] mx-auto">
        {/* 左：LOGO + 副标题 */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => go('/')}
            aria-label="NADBID home"
            className="logo-btn flex items-center cursor-pointer select-none shrink-0"
          >
            <img
              src="/nadbid-logo.png?v=8"
              alt="NADBID"
              className="h-9 w-auto md:h-10 overflow-visible"
              draggable={false}
            />
          </button>
          <div className="hidden sm:block leading-none">
            <div className="text-[10px] md:text-[11px] font-black tracking-[0.22em] text-[#111]/70">
              ON-CHAIN AUCTIONS
            </div>
            <div className="mt-1 text-[8px] md:text-[9px] font-bold tracking-[0.18em] text-[#8b5cf6]/80">
              MONAD TESTNET
            </div>
          </div>
        </div>

        {/* 中：导航细字链接 */}
        <div className="hidden lg:flex items-center gap-7">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => go(item.path)}
                className={cn(
                  'nav-link relative py-1 text-[12px] font-bold tracking-[0.14em] uppercase transition-colors duration-200 border-0 shadow-none bg-transparent rounded-none',
                  active
                    ? 'text-[#6d28d9]'
                    : 'text-[#111]/45 hover:text-[#6d28d9]',
                )}
              >
                {item.label}
                <span
                  className={cn(
                    'absolute left-0 -bottom-0.5 h-[2px] rounded-full bg-[#8b5cf6] transition-all duration-200',
                    active ? 'w-full' : 'w-0',
                  )}
                />
              </button>
            );
          })}
        </div>

        {/* 右：Connect + 移动端汉堡 */}
        <div className="flex items-center justify-end gap-2 md:gap-3">
          <ConnectButton variant={onHome ? 'light' : 'dark'} />

          {/* 移动端汉堡 */}
          <button
            className={cn(
              'lg:hidden flex items-center justify-center w-10 h-10 rounded-lg border shadow-none transition-colors',
              'border-[#111]/15 text-[#111] hover:bg-[#111]/5',
            )}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 移动端菜单 */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="lg:hidden overflow-hidden border-t border-[#111]/15 bg-[#fffefd]/97 backdrop-blur-xl"
          >
            <div className="px-6 py-4 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => go(item.path)}
                    className={cn(
                      'flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold tracking-wide uppercase transition-colors border-0 shadow-none bg-transparent',
                      active
                        ? 'text-[#6d28d9] bg-[#8b5cf6]/10'
                        : 'text-[#111]/60 hover:text-[#6d28d9] hover:bg-[#111]/5',
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
