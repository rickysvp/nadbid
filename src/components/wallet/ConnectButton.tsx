import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { disconnectWallet } from '../../web3/disconnectWallet';
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
 * ConnectButton — 钱包连接按钮 + 下拉菜单（暗场版）
 */
type ConnectButtonVariant = 'dark' | 'light';

interface ConnectButtonProps {
  variant?: ConnectButtonVariant;
}

export function ConnectButton({ variant = 'dark' }: ConnectButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { isConnected, address, balanceMon, balanceStale, chainId, connectorName } = useWalletStore();

  const { success, info } = useToast();

  const isDark = variant === 'dark';

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

  const handleDisconnect = async () => {
    const { extensionReminder } = await disconnectWallet();
    setDropdownOpen(false);
    info(extensionReminder ? 'Wallet disconnected — 如需彻底退出，请在 OKX/MetaMask 扩展中移除本站授权' : 'Wallet disconnected');
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
            'flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap border-0',
            isDark
              ? 'bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-[#0f0a1a] hover:from-[#a855f7] hover:to-[#a5f3fc] shadow-[0_4px_20px_rgba(0,212,255,0.3)]'
              : 'bg-white/10 text-white hover:bg-white/20',
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
      <button
        type="button"
        onClick={() => setDropdownOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl border transition-all',
          isWrongNetwork
            ? 'bg-red-500/10 border-red-500/40 text-white hover:bg-red-500/15'
            : 'bg-white/[0.06] border-white/10 hover:bg-white/[0.1] text-white',
          dropdownOpen && !isWrongNetwork && 'bg-white/[0.1] border-white/20',
          dropdownOpen && isWrongNetwork && 'bg-red-500/15 border-red-500/50',
        )}
      >
        <div className="relative flex-shrink-0">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`}
            className={cn(
              'w-8 h-8 rounded-full border',
              isWrongNetwork
                ? 'bg-white/10 border-red-500/50'
                : 'bg-white/10 border-white/10',
            )}
            alt="Wallet avatar"
          />
          {isWrongNetwork && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-[#0a0a0f] flex items-center justify-center">
              <span className="text-[8px] font-bold text-white leading-none">!</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-start text-left">
          <span className="text-[10px] font-medium uppercase tracking-widest leading-none mb-0.5 text-white/50">
            {shortenAddress(address ?? '')}
          </span>
          <span className="text-[12px] font-mono font-semibold leading-none text-[#4ade80]">
            {balanceStale ? '— MON' : `${balanceMon.toLocaleString('en-US', { maximumFractionDigits: 2 })} MON`}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 ml-0.5 text-white/40 transition-transform duration-200',
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
            className="absolute right-0 top-full mt-2.5 w-72 border border-white/10 rounded-xl bg-[#161311] shadow-2xl overflow-hidden z-50 text-left"
          >
            {/* 网络状态 + 切换 */}
            <div className="px-3 py-3 border-b border-white/[0.08]">
              {connectorName && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-medium uppercase tracking-widest text-white/40">
                    Wallet
                  </span>
                  <span className="text-[9px] font-medium uppercase tracking-widest px-2 py-0.5 rounded border border-[#3ec470]/30 text-[#4ade80] bg-[#3ec470]/10">
                    {connectorName}
                  </span>
                </div>
              )}
              <NetworkSwitcher mode="compact" theme="dark" />
            </div>

            {/* 地址 + 操作 */}
            <div className="p-2">
              <button
                type="button"
                onClick={handleCopy}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm hover:bg-white/[0.06] text-white/70 hover:text-white"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-[#4ade80] flex-shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-white/40 flex-shrink-0" />
                )}
                <span className="flex-1 text-left truncate font-mono text-[12px]">
                  {copied ? 'Copied!' : shortenAddress(address ?? '')}
                </span>
              </button>

              <button
                type="button"
                onClick={handleExplorer}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm hover:bg-white/[0.06] text-white/70 hover:text-white"
              >
                <ExternalLink className="w-4 h-4 text-white/40 flex-shrink-0" />
                <span className="flex-1 text-left">View on Explorer</span>
              </button>

              <div className="h-px w-full my-1 bg-white/[0.06]" />

              <button
                type="button"
                onClick={handleDisconnect}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm hover:bg-red-500/10 text-red-400"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">Disconnect</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
