import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, LogOut, User, Settings, Copy, ExternalLink, Wallet } from 'lucide-react';
import { useWalletStore } from '../stores/walletStore';
import { useToast } from '../hooks/useToast';
import { NAV_ITEMS } from '../config/routes';
import { shortenAddress } from '../utils/format';
import { cn } from '../utils/cn';

/**
 * 顶部导航栏 — 严格匹配原 DEMO 视觉
 * absolute 定位 + 居中 pill 导航 + Home 页黑色文字 / 其他页白色文字
 */
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isConnected, address, balanceMon, connect, disconnect } = useWalletStore();
  const { success, info } = useToast();

  const isHome = location.pathname === '/';
  const isDark = !isHome;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConnect = async () => {
    await connect();
    success('Wallet connected successfully!');
  };

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      success('Address copied!');
    }
  };

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

      {/* Wallet Button */}
      <div className="flex justify-end w-32 relative" ref={menuRef}>
        {!isConnected ? (
          <button
            onClick={handleConnect}
            className={cn(
              'px-6 py-2.5 rounded-xl font-bold text-sm items-center transition-all shadow-md hover:shadow-lg whitespace-nowrap',
              isDark ? 'bg-[#3ec470] text-black hover:bg-[#4ade80]' : 'bg-[#111] text-[#3ec470] hover:bg-black',
            )}
          >
            Connect
          </button>
        ) : (
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={cn(
              'flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-xl border transition-all',
              isDark
                ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08] text-white'
                : 'bg-black/5 border-black/10 hover:bg-black/10 text-black',
              menuOpen && (isDark ? 'bg-white/[0.08] border-white/20' : 'bg-black/10'),
            )}
          >
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${address?.slice(2, 6) || 'wallet'}`}
              className={cn('w-8 h-8 rounded-full border', isDark ? 'bg-[#111] border-white/10' : 'bg-white border-black/10')}
              alt="Avatar"
            />
            <div className="flex flex-col items-start text-left">
              <span className={cn('text-[10px] font-bold uppercase tracking-widest leading-none mb-0.5', isDark ? 'opacity-60' : 'opacity-60')}>
                {shortenAddress(address || '')}
              </span>
              <span className="text-[12px] font-mono font-bold leading-none text-[#3ec470]">
                {balanceMon.toLocaleString('en-US', { maximumFractionDigits: 2 })} MON
              </span>
            </div>
            <ChevronDown className={cn('w-4 h-4 ml-1 opacity-50 transition-transform duration-300', menuOpen && 'rotate-180')} />
          </button>
        )}

        {/* Asset Management Popover */}
        <AnimatePresence>
          {menuOpen && isConnected && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'absolute right-0 top-full mt-3 w-80 border rounded-xl shadow-2xl overflow-hidden z-50 text-left',
                isDark ? 'bg-[#0e0e0e] border-white/[0.08] text-white' : 'bg-white border-black/10 text-black shadow-[0_10px_40px_rgba(0,0,0,0.1)]',
              )}
            >
              {/* Header Profile */}
              <div className={cn('p-5 border-b', isDark ? 'border-white/[0.04] bg-[#161616]' : 'border-black/5 bg-gray-50')}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${address?.slice(2, 6) || 'wallet'}`}
                        className={cn('w-12 h-12 rounded-full border', isDark ? 'bg-black border-white/10' : 'bg-white border-black/10')}
                        alt="Avatar"
                      />
                      <div className={cn('absolute -bottom-1 -right-1 w-4 h-4 bg-[#3ec470] rounded-full border-2', isDark ? 'border-[#161616]' : 'border-white')}></div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-[13px]">{shortenAddress(address || '')}</span>
                      </div>
                      <div className="text-[9px] text-[#3ec470] font-bold uppercase tracking-widest bg-[#3ec470]/10 inline-block px-2 py-0.5 rounded border border-[#3ec470]/20">Connected</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={handleCopy}
                      className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-colors', isDark ? 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white' : 'bg-black/5 hover:bg-black/10 text-black/50 hover:text-black')}
                      title="Copy Address"
                    >
                      {copied ? <span className="text-[10px] font-bold text-[#3ec470]">OK</span> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); info('Opening Block Explorer...'); }}
                      className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-colors', isDark ? 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white' : 'bg-black/5 hover:bg-black/10 text-black/50 hover:text-black')}
                      title="View on Explorer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Balances */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={cn('border rounded-lg p-3', isDark ? 'bg-[#0a0a0a] border-white/[0.04]' : 'bg-white border-black/5')}>
                    <div className={cn('text-[9px] font-bold uppercase tracking-[0.1em] mb-1.5', isDark ? 'text-white/40' : 'text-black/40')}>Wallet Balance</div>
                    <div className="font-mono font-bold text-[17px]">
                      {balanceMon.toLocaleString('en-US', { maximumFractionDigits: 2 })} <span className={cn('text-[10px]', isDark ? 'text-white/30' : 'text-black/30')}>MON</span>
                    </div>
                  </div>
                  <div className={cn('border rounded-lg p-3', isDark ? 'bg-[#0a0a0a] border-white/[0.04]' : 'bg-white border-black/5')}>
                    <div className={cn('text-[9px] font-bold uppercase tracking-[0.1em] mb-1.5', isDark ? 'text-white/40' : 'text-black/40')}>NADBID Points</div>
                    <div className="font-mono font-bold text-[17px] text-[#3ec470]">124,500</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className={cn('p-3 border-b grid grid-cols-2 gap-2', isDark ? 'border-white/[0.04] bg-[#0e0e0e]' : 'border-black/5 bg-white')}>
                <button onClick={() => { setMenuOpen(false); info('Deposit flow initiated'); }} className={cn('font-bold text-[10px] py-2.5 rounded transition-colors uppercase tracking-widest', isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black')}>Deposit</button>
                <button onClick={() => { setMenuOpen(false); info('Withdrawal flow initiated'); }} className={cn('font-bold text-[10px] py-2.5 rounded transition-colors uppercase tracking-widest', isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black')}>Withdraw</button>
              </div>

              {/* Menu Options */}
              <div className={cn('p-2', isDark ? 'bg-[#0e0e0e]' : 'bg-white')}>
                <button onClick={() => { navigate('/wallet'); setMenuOpen(false); }} className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-bold', isDark ? 'hover:bg-white/5 text-white/70 hover:text-white' : 'hover:bg-black/5 text-black/70 hover:text-black')}>
                  <User className="w-4 h-4 opacity-70" /> My Profile
                </button>
                <button onClick={() => { setMenuOpen(false); info('Manage Wallets opened'); }} className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-bold', isDark ? 'hover:bg-white/5 text-white/70 hover:text-white' : 'hover:bg-black/5 text-black/70 hover:text-black')}>
                  <Wallet className="w-4 h-4 opacity-70" /> Manage Wallets
                </button>
                <button onClick={() => { setMenuOpen(false); info('Settings opened'); }} className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-bold', isDark ? 'hover:bg-white/5 text-white/70 hover:text-white' : 'hover:bg-black/5 text-black/70 hover:text-black')}>
                  <Settings className="w-4 h-4 opacity-70" /> Settings
                </button>
                <div className={cn('h-px w-full my-1', isDark ? 'bg-white/[0.04]' : 'bg-black/5')}></div>
                <button
                  onClick={() => { disconnect(); setMenuOpen(false); info('Wallet disconnected'); }}
                  className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-bold', isDark ? 'hover:bg-red-500/10 text-red-400 hover:text-red-300' : 'hover:bg-red-50 text-red-500 hover:text-red-600')}
                >
                  <LogOut className="w-4 h-4 opacity-70" /> Disconnect
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
