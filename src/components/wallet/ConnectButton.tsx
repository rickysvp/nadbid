import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDisconnect } from 'wagmi';
import {
  Wallet,
  Copy,
  Check,
  ExternalLink,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useWalletStore } from '../../stores/walletStore';
import { useToast } from '../../hooks/useToast';
import { shortenAddress } from '../../utils/format';
import { cn } from '../../utils/cn';
import { supportedChains, monadTestnet } from '../../web3/config';
import { ConnectModal } from './ConnectModal';
import { NetworkSwitcher } from './NetworkSwitcher';

/**
 * ConnectButton — 钱包连接按钮 + 下拉菜单。
 *
 * 未连接：显示 "Connect Wallet" 按钮，点击打开 ConnectModal。
 * 已连接：显示地址缩写 + 余额，点击展开下拉菜单（复制地址、区块浏览器、断开连接）。
 *
 * 连接/断开使用真实 wagmi hooks（useConnect in ConnectModal, useDisconnect here），
 * 状态由 WalletStateSyncer 自动同步到 walletStore。
 */
type ConnectButtonVariant = 'dark' | 'light';

interface ConnectButtonProps {
  /** dark = 深色背景页（白色文字），light = 首页（黑色文字） */
  variant?: ConnectButtonVariant;
}

export function ConnectButton({ variant = 'dark' }: ConnectButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { isConnected, address, balanceMon, chainId, connectorName } = useWalletStore();
  const { disconnect } = useDisconnect();
  const { success, info } = useToast();

  const isDark = variant === 'dark';

  // 点击外部关闭下拉菜单
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      success('Address copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      info('Copy not available in this context');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setDropdownOpen(false);
    info('Wallet disconnected');
  };

  const handleExplorer = () => {
    if (!address || !chainId) return;
    const chain = supportedChains.find((c) => c.id === chainId);
    if (!chain) {
      info('Explorer not available for this network');
      return;
    }
    const url = `${chain.blockExplorers.default.url}/address/${address}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setDropdownOpen(false);
  };

  const isWrongNetwork = isConnected && chainId !== null && chainId !== monadTestnet.id;
  const avatarSeed = address?.slice(2, 6) ?? 'wallet';

  /* ---------- 未连接状态 ---------- */
  if (!isConnected) {
    return (
      <>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg whitespace-nowrap',
            isDark
              ? 'bg-[#3ec470] text-black hover:bg-[#4ade80]'
              : 'bg-[#111] text-[#3ec470] hover:bg-black',
          )}
        >
          <Wallet className="w-4 h-4" />
          Connect
        </button>
        <ConnectModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  /* ---------- 已连接状态 ---------- */
  return (
    <div className="relative" ref={dropdownRef}>
      {/* 已连接按钮 */}
      <button
        type="button"
        onClick={() => setDropdownOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl border transition-all',
          isWrongNetwork
            ? 'bg-red-500/10 border-red-500/40 text-white hover:bg-red-500/15'
            : isDark
              ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08] text-white'
              : 'bg-black/5 border-black/10 hover:bg-black/10 text-black',
          dropdownOpen && !isWrongNetwork && (isDark ? 'bg-white/[0.08] border-white/20' : 'bg-black/10'),
          dropdownOpen && isWrongNetwork && 'bg-red-500/15 border-red-500/50',
        )}
      >
        <div className="relative flex-shrink-0">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`}
            className={cn(
              'w-8 h-8 rounded-full border',
              isWrongNetwork
                ? 'bg-[#111] border-red-500/50'
                : isDark
                  ? 'bg-[#111] border-white/10'
                  : 'bg-white border-black/10',
            )}
            alt="Wallet avatar"
          />
          {isWrongNetwork && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-[#0e0e0e] flex items-center justify-center">
              <span className="text-[8px] font-black text-white leading-none">!</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-start text-left">
          <span
            className={cn(
              'text-[10px] font-bold uppercase tracking-widest leading-none mb-0.5',
              isDark ? 'opacity-60' : 'opacity-60',
            )}
          >
            {shortenAddress(address ?? '')}
          </span>
          <span className="text-[12px] font-mono font-bold leading-none text-[#3ec470]">
            {balanceMon.toLocaleString('en-US', { maximumFractionDigits: 2 })} MON
          </span>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 ml-0.5 opacity-50 transition-transform duration-200',
            dropdownOpen && 'rotate-180',
          )}
        />
      </button>

      {/* 下拉菜单 */}
      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'absolute right-0 top-full mt-2.5 w-72 border rounded-xl shadow-2xl overflow-hidden z-50 text-left',
              isDark
                ? 'bg-[#0e0e0e] border-white/[0.08] text-white'
                : 'bg-white border-black/10 text-black shadow-[0_10px_40px_rgba(0,0,0,0.1)]',
            )}
          >
            {/* 网络状态 + 切换（TASK 5: NetworkSwitcher） */}
            <div
              className={cn(
                'px-3 py-3 border-b',
                isDark ? 'border-white/[0.06] bg-[#161616]' : 'border-black/5 bg-gray-50',
              )}
            >
              {connectorName && (
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={cn(
                      'text-[9px] font-bold uppercase tracking-widest',
                      isDark ? 'text-white/40' : 'text-black/40',
                    )}
                  >
                    Wallet
                  </span>
                  <span
                    className={cn(
                      'text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border',
                      isDark
                        ? 'text-[#3ec470] bg-[#3ec470]/10 border-[#3ec470]/20'
                        : 'text-[#2a9d54] bg-[#3ec470]/10 border-[#3ec470]/30',
                    )}
                  >
                    {connectorName}
                  </span>
                </div>
              )}
              <NetworkSwitcher mode="compact" theme={isDark ? 'dark' : 'light'} />
            </div>

            {/* 地址 + 操作 */}
            <div className="p-2">
              {/* 复制地址 */}
              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-bold',
                  isDark
                    ? 'hover:bg-white/5 text-white/80 hover:text-white'
                    : 'hover:bg-black/5 text-black/70 hover:text-black',
                )}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-[#3ec470] flex-shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 opacity-60 flex-shrink-0" />
                )}
                <span className="flex-1 text-left truncate font-mono text-[12px]">
                  {copied ? 'Copied!' : shortenAddress(address ?? '')}
                </span>
              </button>

              {/* 区块浏览器 */}
              <button
                type="button"
                onClick={handleExplorer}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-bold',
                  isDark
                    ? 'hover:bg-white/5 text-white/80 hover:text-white'
                    : 'hover:bg-black/5 text-black/70 hover:text-black',
                )}
              >
                <ExternalLink className="w-4 h-4 opacity-60 flex-shrink-0" />
                <span className="flex-1 text-left">View on Explorer</span>
              </button>

              {/* 分隔线 */}
              <div
                className={cn(
                  'h-px w-full my-1',
                  isDark ? 'bg-white/[0.06]' : 'bg-black/5',
                )}
              />

              {/* 断开连接 */}
              <button
                type="button"
                onClick={handleDisconnect}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-bold',
                  isDark
                    ? 'hover:bg-red-500/10 text-red-400 hover:text-red-300'
                    : 'hover:bg-red-50 text-red-500 hover:text-red-600',
                )}
              >
                <LogOut className="w-4 h-4 opacity-70 flex-shrink-0" />
                <span className="flex-1 text-left">Disconnect</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
