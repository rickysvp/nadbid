import type { ReactNode } from 'react';
import { AlertTriangle, Loader2, Globe, Copy } from 'lucide-react';
import { useState } from 'react';
import { useWalletStore } from '../../stores/walletStore';
import { monadTestnet } from '../../web3/config';
import { useSwitchToMonad } from '../../web3/useSwitchToMonad';
import { useToast } from '../../hooks/useToast';

/**
 * WalletGuard — 路由级网络守卫（全局挂载）。
 *
 * 行为：
 *   - 未连接钱包：直接渲染 children（NADBID 允许游客浏览列表/详情，
 *     连接由各操作面板按需引导）
 *   - 已连接但网络错误：显示全屏阻断页 + "Switch to Monad" 按钮
 *     （显式 addEthereumChain 兜底，兼容 OKX；失败时提供手动添加参数）
 *   - 已连接且网络正确：直接渲染 children
 */
export function WalletGuard({ children }: { children: ReactNode }) {
  const { isConnected, chainId } = useWalletStore();
  const { switchToMonad, isPending } = useSwitchToMonad();
  const { success: toastSuccess, error: toastError } = useToast();
  const [showManual, setShowManual] = useState(false);

  // 未连接：放行（游客可浏览）
  if (!isConnected) {
    return <>{children}</>;
  }

  const isWrongNetwork = chainId !== null && chainId !== monadTestnet.id;

  // 错误网络：阻断业务渲染，强制切回 Monad Testnet
  if (isWrongNetwork) {
    const handleSwitch = async () => {
      if (isPending) return;
      try {
        await switchToMonad();
        toastSuccess('Switched to Monad Testnet');
      } catch {
        // 错误已由 useSwitchToMonad toast
      }
    };

    const copyRpc = async () => {
      try {
        await navigator.clipboard.writeText('https://testnet-rpc.monad.xyz');
        toastSuccess('RPC URL copied');
      } catch {
        toastError('Copy failed');
      }
    };

    return (
      <div className="min-h-screen bg-transparent pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-6 lg:px-12">
          <div className="bg-white/5 border border-red-500/30 rounded-3xl p-16 text-center">
            <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <AlertTriangle className="w-12 h-12 text-red-400" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-4">Wrong Network</h1>
            <p className="text-white/50 text-lg max-w-md mx-auto mb-3">
              NADBID runs on Monad Testnet (chain {monadTestnet.id}).
            </p>
            <p className="text-red-400/70 font-mono text-sm mb-10">
              Current chain: {chainId !== null ? `#${chainId}` : 'Unknown'}
            </p>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleSwitch}
                disabled={isPending}
                className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-black text-base transition-all ${
                  isPending
                    ? 'bg-[#9333ea]/50 text-white/50 cursor-not-allowed'
                    : 'bg-[#9333ea] text-white hover:bg-[#a855f7]'
                }`}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Switching…
                  </>
                ) : (
                  <>
                    <Globe className="w-5 h-5" />
                    Switch to Monad Testnet
                  </>
                )}
              </button>
            </div>

            {/* 手动添加 Monad 网络（OKX 等钱包自动切换失败的兜底） */}
            <div className="mt-8">
              <button
                type="button"
                onClick={() => setShowManual((v) => !v)}
                className="text-xs text-white/40 hover:text-white/70 underline underline-offset-4"
              >
                {showManual ? 'Hide' : "Wallet won't switch? Add Monad Testnet manually"}
              </button>
              {showManual && (
                <div className="mt-4 text-left bg-white/5 border border-white/15 nb-card p-5 font-mono text-xs text-white/70 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span>Network Name</span>
                    <span className="text-white">Monad Testnet</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>RPC URL</span>
                    <span className="flex items-center gap-2 text-[#ccff00]">
                      https://testnet-rpc.monad.xyz
                      <button type="button" onClick={copyRpc} className="hover:text-white" aria-label="Copy RPC">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Chain ID</span>
                    <span className="text-white">10143</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Currency Symbol</span>
                    <span className="text-white">MON</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Explorer</span>
                    <span className="text-[#ccff00]">https://testnet.monadexplorer.com</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
