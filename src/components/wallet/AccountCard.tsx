import { useState } from 'react';
import { motion } from 'motion/react';
import { useDisconnect } from 'wagmi';
import { Wallet, Copy, Check, ExternalLink, LogOut, TrendingUp } from 'lucide-react';
import { useWalletStore } from '../../stores/walletStore';
import { useToast } from '../../hooks/useToast';
import { shortenAddress } from '../../utils/format';
import { supportedChains } from '../../web3/config';
import { Badge } from '../ui/Badge';
import { NetworkSwitcher } from './NetworkSwitcher';

/**
 * AccountCard — 账户信息卡片（WalletPage 头部）。
 *
 * 集成：钱包头像、完整地址（可复制）、MON 余额、NetworkSwitcher、
 * 区块浏览器链接、断开连接按钮。
 *
 * 状态从 walletStore 读取（由 WalletStateSyncer 同步 wagmi 真实状态）。
 */
interface AccountCardProps {
  /** 切换网络成功后的回调 */
  onNetworkSwitched?: (chainId: number) => void;
}

export function AccountCard({ onNetworkSwitched }: AccountCardProps) {
  const { address, balanceMon, chainId, connectorName } = useWalletStore();
  const { disconnect } = useDisconnect();
  const { success, info } = useToast();
  const [copied, setCopied] = useState(false);

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

  const handleExplorer = () => {
    if (!address || !chainId) return;
    const chain = supportedChains.find((c) => c.id === chainId);
    if (!chain) {
      info('Explorer not available for this network');
      return;
    }
    const url = `${chain.blockExplorers.default.url}/address/${address}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDisconnect = () => {
    disconnect();
    info('Wallet disconnected');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-gradient-to-br from-[#161616] via-[#0f0f0f] to-[#0a0a0a] border border-white/[0.06] rounded-3xl p-8 mb-8"
    >
      {/* 装饰光晕 */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-[#3ec470]/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10">
        {/* 顶部：头像 + 地址 + 操作按钮 */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3ec470] to-[#2a9d54] flex items-center justify-center shadow-[0_0_30px_rgba(62,196,112,0.3)]">
              <Wallet className="w-8 h-8 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-black text-white font-mono">
                  {shortenAddress(address ?? '')}
                </h1>
                <Badge variant="stake_active">CONNECTED</Badge>
              </div>
              <div className="text-[12px] text-white/40 font-mono break-all max-w-[320px]">
                {address}
              </div>
              {connectorName && (
                <div className="text-[10px] text-[#3ec470]/70 font-mono mt-1 uppercase tracking-wider">
                  via {connectorName}
                </div>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/80 hover:bg-white/[0.1] hover:text-white transition-all text-[13px] font-bold"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-[#3ec470]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={handleExplorer}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/80 hover:bg-white/[0.1] hover:text-white transition-all text-[13px] font-bold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Explorer
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all text-[13px] font-bold"
            >
              <LogOut className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </div>
        </div>

        {/* 余额 + 网络 双栏 */}
        <div className="mt-8 pt-8 border-t border-white/[0.06] grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* MON 余额 */}
          <div>
            <div className="text-[10px] text-white/40 font-bold uppercase tracking-[0.15em] mb-2">
              Wallet Balance
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-mono text-5xl font-black text-white tracking-tight">
                {balanceMon.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xl text-white/50 font-mono">$MON</span>
              <div className="flex items-center gap-1 bg-[#1a2f22] text-[#3ec470] text-[11px] font-bold px-2 py-1 rounded border border-[#3ec470]/30">
                <TrendingUp className="w-3 h-3" /> +2.4%
              </div>
            </div>
          </div>

          {/* 网络切换 */}
          <NetworkSwitcher mode="full" onSwitched={onNetworkSwitched} />
        </div>
      </div>
    </motion.div>
  );
}
