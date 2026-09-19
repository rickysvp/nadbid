import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { ConnectButton } from '../components/wallet';
import { NAV_ITEMS } from '../config/routes';
import { cn } from '../utils/cn';

/**
 * 顶部导航栏 — NEON VEGAS
 * 经典 DApp 布局：左 LOGO，右导航 + Connect。
 * - 首页顶部透明，滚动后暖黑毛玻璃 + 细下边框
 * - 导航项 hover 金色淡底，active 金色胶囊黑字
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
        scrolled
          ? 'bg-[#0f0a1a]/80 backdrop-blur-xl border-b border-white/[0.06]'
          : 'bg-transparent border-b border-transparent',
      )}
    >
      <div className="w-full flex items-center justify-between px-5 md:px-8 h-16 md:h-[72px] max-w-[1600px] mx-auto">
        {/* Logo */}
        <button
          onClick={() => go('/')}
          aria-label="NADBID home"
          className="logo-btn flex items-center cursor-pointer select-none"
        >
          <img
            src="/nadbid-logo.png?v=8"
            alt="NADBID"
            className="h-9 w-auto md:h-10 overflow-visible"
            draggable={false}
          />
        </button>

        {/* 居中导航 */}
        <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => go(item.path)}
                className={cn(
                  'flex items-center px-4 py-2 rounded-full text-sm font-medium tracking-wide transition-all duration-200 border-0 shadow-none bg-transparent',
                  active
                    ? 'bg-[#9333ea] text-[#0f0a1a] font-semibold'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.06]',
                )}
              >
                {item.label}
                {item.soon && (
                  <span
                    className={cn(
                      'ml-1.5 rounded px-1.5 py-0.5 text-[9px] font-semibold leading-none',
                      active ? 'bg-black/20 text-[#0f0a1a]' : 'bg-[#f97316]/20 text-[#fb923c]',
                    )}
                  >
                    SOON
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 右侧：Connect */}
        <div className="flex items-center gap-1.5 md:gap-2">
          <ConnectButton variant="dark" />

          {/* 移动端汉堡 */}
          <button
            className={cn(
              'lg:hidden flex items-center justify-center w-10 h-10 rounded-xl border transition-colors',
              'border-white/10 text-white/70 hover:bg-white/[0.06]',
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
            className="lg:hidden overflow-hidden border-t border-white/[0.06] bg-[#0f0a1a]/95 backdrop-blur-xl"
          >
            <div className="px-5 py-3 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => go(item.path)}
                    className={cn(
                      'flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium tracking-wide transition-colors border-0 shadow-none bg-transparent',
                      active
                        ? 'text-[#9333ea] bg-[#9333ea]/10'
                        : 'text-white/50 hover:text-white hover:bg-white/[0.06]',
                    )}
                  >
                    <span className="flex items-center">
                      {item.label}
                      {item.soon && (
                        <span
                          className={cn(
                            'ml-1.5 rounded px-1.5 py-0.5 text-[9px] font-semibold leading-none',
                            active ? 'bg-[#9333ea]/30 text-[#9333ea]' : 'bg-[#f97316]/20 text-[#fb923c]',
                          )}
                        >
                          SOON
                        </span>
                      )}
                    </span>
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
