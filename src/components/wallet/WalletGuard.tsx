import type { ReactNode } from 'react';
import { Wallet, AlertTriangle, Loader2, Globe } from 'lucide-react';
import { useSwitchChain } from 'wagmi';
import { useWalletStore } from '../../stores/walletStore';
import { monadTestnet } from '../../web3/config';
import { ConnectButton } from './ConnectButton';
import { useToast } from '../../hooks/useToast';

/**
 * WalletGuard — 路由级钱包连接守卫。
 *
 * 行为（审计修复：错误网络不再"仅提示"，改为阻断业务渲染）：
 *   - 未连接：显示连接引导 UI（图标 + 说明 + ConnectButton），不渲染 children
 *   - 已连接但网络错误：显示全屏阻断页 + "Switch to Monad" 按钮（必须切回 Monad 才能继续），
 *     不渲染 children——防止用户在错误链上签名/读写 Monad 合约地址
 *   - 已连接且网络正确：直接渲染 children
 */
interface WalletGuardProps {
  children: ReactNode;
  /** 未连接时的引导标题（默认 "Connect Your Wallet"） */
  title?: string;
  /** 未连接时的引导描述（默认 "Connect your wallet to access this page."） */
  description?: string;
}

export function WalletGuard({
  children,
  title = 'Connect Your Wallet',
  description = 'Connect your wallet to access this page.',
}: WalletGuardProps) {
  const { isConnected, chainId } = useWalletStore();
  const { switchChain, isPending } = useSwitchChain();
  const { error: toastError } = useToast();

  // 未连接：显示引导 UI
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-transparent pt-32 pb-24">
        <div className="max-w-x] mx-auto px-6 lg:px-12">
          <div className="bg-[#161616] border border-white/[0.04] rounded-3xl p-16 text-center">
            <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-[#3ec470] to-[#2a9d54] flex items-center justify-center shadow-0_40px_rgba(62,196,112,0.35)]">
              <Wallet className="w-12 h-12 text-black" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-4">{title}</h1>
            <p className="text-white/50 text-lg max-w-md mx-auto mb-10">{description}</p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isWrongNetwork = chainId !== null && chainId !== monadTestnet.id;

  // 错误网络：阻断业务渲染，强制切回 Monad Testnet
  if (isWrongNetwork) {
    const handleSwitch = () => {
      if (isPending) return;
      switchChain(
        { chainId: monadTestnet.id },
        {
          onError: (err) => {
            toastError(err.message ?? 'Failed to switch network');
          },
        },
      );
    };

    return (
      <div className="min-h-screen bg-transparent pt-32 pb-24">
        <div className="max-w-x] mx-auto px-6 lg:px-12">
          <div className="bg-[#161616] border border-red-500/30 rounded-3xl p-16 text-center">
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
                    ? 'bg-[#3ec470]/50 text-black/50 cursor-not-allowed'
                    : 'bg-[#3ec470] text-black hover:bg-[#4ade80]'
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
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
