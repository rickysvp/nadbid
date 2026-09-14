import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Sparkles } from 'lucide-react';
import { ConnectButton } from '../components/wallet';
import { NAV_ITEMS } from '../config/routes';
import { cn } from '../utils/cn';

/**
 * 顶部导航栏 — NADBID（LOGO 紫绿黄色系）
 * - fixed 定位：滚动 >24px 后切换为浅色毛玻璃背景
 * - 居中 pill 导航：Home / Staking / Claim / Referral
 * - 主色紫色（LOGO 渐变主色），active 紫底白字 + 黄色角标
 * - 右侧：ConnectButton
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
          ? 'bg-[#fffdf7]/92 backdrop-blur-xl border-b-2 border-[#111] shadow-[0_6px_0_rgba(17,17,17,0.14)]'
          : 'bg-transparent border-b-2 border-transparent',
      )}
    >
      <div className="w-full flex justify-between items-center px-6 md:px-10 py-4 md:py-5 max-w-[1600px] mx-auto">
        {/* Logo */}
        <button
          onClick={() => go('/')}
          aria-label="NADBID home"
          className="logo-btn flex items-center cursor-pointer select-none"
        >
          <img
            src="/nadbid-logo.png?v=8"
            alt="NADBID"
            className="h-10 w-auto md:h-11 overflow-visible"
            draggable={false}
          />
        </button>

        {/* Desktop Navigation — 紫调 pill */}
        <div
          className={cn(
            'hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-1 px-3 py-1.5 rounded-full border transition-colors duration-300',
            'bg-[#8b5cf6]/8 border-[#8b5cf6]/25',
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
                    ? 'bg-[#8b5cf6] text-white shadow-[2px_2px_0_#111]'
                    : 'text-[#6d28d9]/60 hover:text-[#6d28d9] hover:bg-[#8b5cf6]/10',
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#ffe94a] border border-[#111]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          <ConnectButton variant={onHome ? 'light' : 'dark'} />

          {/* 移动端汉堡 */}
          <button
            className={cn(
              'lg:hidden flex items-center justify-center w-10 h-10 rounded-xl border transition-colors',
              'border-[#8b5cf6]/30 text-[#6d28d9] bg-[#8b5cf6]/8',
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
            className="lg:hidden overflow-hidden border-t-2 border-[#111] bg-[#fffdf7]/97 backdrop-blur-xl"
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
                        ? 'bg-[#8b5cf6] text-white shadow-[2px_2px_0_#111]'
                        : 'text-[#6d28d9]/60 hover:text-[#6d28d9] hover:bg-[#8b5cf6]/10',
                    )}
                  >
                    {item.label}
                    {active && <Sparkles className="w-3.5 h-3.5 text-[#ffe94a]" />}
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
