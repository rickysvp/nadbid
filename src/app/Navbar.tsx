import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Sparkles, Plus } from 'lucide-react';
import { ConnectButton } from '../components/wallet';
import { NAV_ITEMS, ROUTES } from '../config/routes';
import { cn } from '../utils/cn';

/**
 * 顶部导航栏 — NADBID
 * - fixed 定位：滚动 >24px 后切换为深色毛玻璃背景
 * - 居中 pill 导航：激活项用品牌绿高亮
 * - 右侧：Create 按钮 + ConnectButton
 * - 移动端：汉堡菜单收纳导航项
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
          ? 'bg-[#0e0e0e]/85 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.35)]'
          : 'bg-transparent border-b border-transparent',
      )}
    >
      <div className="w-full flex justify-between items-center px-6 md:px-10 py-4 md:py-5 max-w-[1600px] mx-auto">
        {/* Logo */}
        <div
          className={cn(
            'font-black text-2xl md:text-3xl tracking-tighter flex items-center gap-2.5 cursor-pointer select-none',
            onHome ? 'text-black' : 'text-white',
          )}
          onClick={() => go('/')}
        >
          <span
            className={cn(
              'w-2 h-2 rounded-full bg-[#3ec470]',
              onHome ? 'shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'shadow-[0_0_10px_rgba(52,211,153,0.8)]',
            )}
          />
          NADBID
        </div>

        {/* Desktop Navigation */}
        <div
          className={cn(
            'hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-1 px-3 py-1.5 rounded-full border transition-colors duration-300',
            solid
              ? 'bg-white/[0.04] border-white/[0.08]'
              : onHome
                ? 'bg-black/5 border-black/10'
                : 'bg-white/5 border-white/10 backdrop-blur-md',
          )}
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => go(item.path)}
                className={cn(
                  'relative px-3.5 py-2 rounded-full font-bold text-[13px] tracking-wide transition-all duration-200',
                  active
                    ? cn(
                        'text-[#3ec470]',
                        solid || !onHome
                          ? 'bg-[#3ec470]/10'
                          : 'bg-black/5',
                      )
                    : onHome
                      ? 'text-black/50 hover:text-black hover:bg-black/5'
                      : 'text-white/50 hover:text-white hover:bg-white/[0.06]',
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#3ec470]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => go(ROUTES.NADBID_CREATE)}
            className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3ec470] text-black font-bold text-sm transition-all hover:bg-[#4ade80] hover:shadow-[0_0_20px_rgba(62,196,112,0.4)] hover:-translate-y-0.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Create
          </button>

          <ConnectButton variant={onHome ? 'light' : 'dark'} />

          {/* 移动端汉堡 */}
          <button
            className={cn(
              'lg:hidden flex items-center justify-center w-10 h-10 rounded-xl border transition-colors',
              onHome ? 'border-black/10 text-black bg-black/5' : 'border-white/10 text-white bg-white/5',
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
            className="lg:hidden overflow-hidden border-t border-white/[0.06] bg-[#0e0e0e]/95 backdrop-blur-xl"
          >
            <div className="px-6 py-4 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => go(item.path)}
                    className={cn(
                      'flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-colors',
                      active
                        ? 'bg-[#3ec470]/10 text-[#3ec470]'
                        : 'text-white/60 hover:text-white hover:bg-white/[0.05]',
                    )}
                  >
                    {item.label}
                    {active && <Sparkles className="w-3.5 h-3.5 text-[#3ec470]" />}
                  </button>
                );
              })}

              <button
                onClick={() => go(ROUTES.NADBID_CREATE)}
                className="mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#3ec470] text-black font-bold text-sm transition-colors hover:bg-[#4ade80]"
              >
                <Plus className="w-4 h-4" />
                Create Auction
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
