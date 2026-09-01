import type { ReactNode } from 'react';
import { Wallet } from 'lucide-react';
import { useWalletStore } from '../../stores/walletStore';
import { monadTestnet } from '../../web3/config';
import { ConnectButton } from './ConnectButton';
import { WrongNetworkBanner } from './WrongNetworkBanner';

/**
 * WalletGuard — 路由级钱包连接守卫。
 *
 * 行为：
 *   - 未连接：显示连接引导 UI（图标 + 说明 + ConnectButton），不渲染 children
 *   - 已连接但网络错误：顶部显示 WrongNetworkBanner，仍渲染 children（不强制阻止）
 *   - 已连接且网络正确：直接渲染 children
 *
 * @example
 * <WalletGuard title="Staking" description="Connect your wallet to view staking positions.">
 *   <StakingContent />
 * </WalletGuard>
 */
interface WalletGuardProps {
  children: ReactNode;
  /** 未连接时的引导标题（默认 "Connect Your Wallet"） */
  title?: string;
  /** 未连接时的引导描述 */
  description?: string;
}

export function WalletGuard({
  children,
  title = 'Connect Your Wallet',
  description = 'Connect your wallet to access this page.',
}: WalletGuardProps) {
  const { isConnected, chainId } = useWalletStore();

  // 未连接：显示引导 UI
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-transparent pt-32 pb-24">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
          <div className="bg-[#161616] border border-white/[0.04] rounded-3xl p-16 text-center">
            <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-[#3ec470] to-[#2a9d54] flex items-center justify-center shadow-[0_0_40px_rgba(62,196,112,0.35)]">
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

  return (
    <>
      {isWrongNetwork && <WrongNetworkBanner className="mb-4" />}
      {children}
    </>
  );
}
