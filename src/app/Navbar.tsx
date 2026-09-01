import { useLocation, useNavigate } from 'react-router-dom';
import { ConnectButton } from '../components/wallet';
import { NAV_ITEMS } from '../config/routes';
import { cn } from '../utils/cn';

/**
 * 顶部导航栏 — 严格匹配原 DEMO 视觉
 * absolute 定位 + 居中 pill 导航 + Home 页黑色文字 / 其他页白色文字
 *
 * TASK 4: 钱包连接按钮替换为 ConnectButton 组件（真实 wagmi 连接 + 下拉菜单），
 * 原有的 mock connect/disconnect 逻辑和 popover 已移除。
 */
export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === '/';
  const isDark = !isHome;

  return (
    <nav className="w-full flex justify-between items-center px-8 md:px-12 py-8 absolute top-0 z-50">
      {/* Logo */}
      <div
        className={cn(
          'font-black text-3xl tracking-tighter flex items-center gap-3 w-32 cursor-pointer',
          isDark ? 'text-white' : 'text-black',
        )}
        onClick={() => navigate('/')}
      >
        NADBID
      </div>

      {/* Desktop Navigation */}
      <div className={cn(
        'hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-8 backdrop-blur-md px-8 py-3 rounded-full border',
        isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10',
      )}>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'font-bold text-sm transition-all',
                isActive
                  ? (isDark ? 'text-white drop-shadow-sm' : 'text-black drop-shadow-sm')
                  : (isDark ? 'text-white/50 hover:text-white' : 'text-black/50 hover:text-black/80'),
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Wallet Button — TASK 4: ConnectButton 组件（真实 wagmi 连接 + 下拉菜单） */}
      <div className="flex justify-end w-32">
        <ConnectButton variant={isDark ? 'dark' : 'light'} />
      </div>
    </nav>
  );
}
