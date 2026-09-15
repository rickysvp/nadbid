import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { ConnectButton } from '../components/wallet';
import { NAV_ITEMS } from '../config/routes';
import { cn } from '../utils/cn';

/**
 * 顶部导航栏 — NADBID
 * 经典 DApp 布局：左 LOGO，右导航 + Connect。
 * - 首页顶部透明，滚动后纸白毛玻璃 + 细下边框
 * - 导航项 hover 淡紫底，active 紫胶囊白字
 * - 克制的留白，无粗黑边框
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
          ? 'bg-[#fffdf7]/95 backdrop-blur-xl border-b border-[#111]/10'
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

        {/* 右侧：导航 + Connect */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Desktop 导航 */}
          <div className="hidden lg:flex items-center gap-1 mr-2">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => go(item.path)}
                  className={cn(
                    'px-3.5 py-2 rounded-lg text-sm font-bold tracking-wide transition-colors duration-200 border-0 shadow-none bg-transparent',
                    active
                      ? 'bg-[#8b5cf6] text-white'
                      : 'text-[#111]/60 hover:text-[#6d28d9] hover:bg-[#8b5cf6]/10',
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

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
            className="lg:hidden overflow-hidden border-t border-[#111]/10 bg-[#fffdf7]/97 backdrop-blur-xl"
          >
            <div className="px-5 py-3 flex flex-col gap-0.5">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => go(item.path)}
                    className={cn(
                      'flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold tracking-wide transition-colors border-0 shadow-none bg-transparent',
                      active
                        ? 'text-white bg-[#8b5cf6]'
                        : 'text-[#111]/60 hover:text-[#6d28d9] hover:bg-[#8b5cf6]/10',
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
