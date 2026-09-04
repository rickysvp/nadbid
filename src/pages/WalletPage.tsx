import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useDisconnect } from 'wagmi';
import { Wallet, Layers, Coins, Trophy, Copy, ExternalLink, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { ConnectModal } from '../components/wallet/ConnectModal';
import { useWalletStore } from '../stores/walletStore';
import { useToast } from '../hooks/useToast';
import { shortenAddress } from '../utils/format';
import { useState } from 'react';

export default function WalletPage() {
  const { isConnected, address, balanceMon, disconnect: storeDisconnect } = useWalletStore();
  const { disconnect } = useDisconnect();
  const { success, info } = useToast();
  const [connectOpen, setConnectOpen] = useState(false);

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      success('Address copied to clipboard!');
    }
  };

  const handleDisconnect = () => {
    storeDisconnect();
    disconnect();
    info('Wallet disconnected');
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-transparent pt-32 pb-24">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
          <div className="bg-[#161616] border border-white/[0.04] rounded-3xl p-16 text-center">
            <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-[#3ec470] to-[#2a9d54] flex items-center justify-center shadow-[0_0_40px_rgba(62,196,112,0.35)]">
              <Wallet className="w-12 h-12 text-black" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-4">Connect Your Wallet</h1>
            <p className="text-white/50 text-[15px] max-w-md mx-auto mb-10 leading-relaxed">
              Connect your wallet to view your PASS holdings, staking positions, rewards, and auction history.
            </p>
            <Button size="lg" onClick={() => setConnectOpen(true)}>
              <Wallet className="w-5 h-5" />
              Connect Wallet
            </Button>
          </div>
          <ConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent pt-32 pb-24">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Wallet Header */}
        <div className="mb-6 flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-white/60 leading-relaxed">
            <span className="font-bold text-amber-400">MVP Preview：</span>
            Staking / Points / Activity 数据尚未上链，以下区域为占位，接入链上合约后显示真实数据。
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-[#161616] via-[#0f0f0f] to-[#0a0a0a] border border-white/[0.06] rounded-3xl p-8 mb-8"
        >
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#3ec470]/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3ec470] to-[#2a9d54] flex items-center justify-center shadow-[0_0_30px_rgba(62,196,112,0.3)]">
                <Wallet className="w-8 h-8 text-black" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-black text-white font-mono">{shortenAddress(address || '')}</h1>
                  <Badge variant="stake_active">CONNECTED</Badge>
                </div>
                <div className="text-[12px] text-white/40 font-mono">{address}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" size="sm" onClick={handleCopyAddress}>
                <Copy className="w-3.5 h-3.5" /> Copy
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  // Codex 审计：Explorer 按钮真正跳转 Monad 测试网区块浏览器（不再只弹 toast）
                  if (!address) return;
                  window.open(
                    `https://testnet.monadexplorer.com/address/${address}`,
                    '_blank',
                    'noopener,noreferrer',
                  );
                }}
              >
                <ExternalLink className="w-3.5 h-3.5" /> Explorer
              </Button>
              <Button variant="danger" size="sm" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </div>
          </div>

          {/* Balance（链上真实） */}
          <div className="relative z-10 mt-8 pt-8 border-t border-white/[0.06]">
            <div className="text-[10px] text-white/40 font-bold uppercase tracking-[0.15em] mb-2">Wallet Balance</div>
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-5xl font-black text-white tracking-tight">
                {balanceMon.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xl text-white/50 font-mono">$MON</span>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats（链上钱包维度的真实指标） */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <StatCard label="Wallet Balance" value={balanceMon.toFixed(2)} unit="MON" variant="green" />
          <StatCard label="Staked PASS" value="--" />
          <StatCard label="Pending Rewards" value="--" unit="MON" />
          <StatCard label="Total Yield" value="--" unit="MON" />
        </div>

        {/* Quick Actions */}
        <div className="space-y-6 mb-12">
          <div className="bg-[#161616] border border-white/[0.04] rounded-2xl p-6">
            <h3 className="text-[13px] font-bold text-white uppercase tracking-wider mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link to="/staking">
                <Button fullWidth variant="secondary" size="sm">
                  <Layers className="w-4 h-4" /> Stake PASS
                </Button>
              </Link>
              <Link to="/claim">
                <Button fullWidth variant="secondary" size="sm">
                  <Coins className="w-4 h-4" /> Claim Rewards
                </Button>
              </Link>
              <Link to="/auctions">
                <Button fullWidth variant="secondary" size="sm">
                  <Trophy className="w-4 h-4" /> Browse Auctions
                </Button>
              </Link>
            </div>
          </div>

          {/* PASS Holdings — 链上接入中占位 */}
          <div className="bg-[#161616] border border-white/[0.04] rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-white/[0.04] flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#3ec470]" />
                PASS Holdings
              </h3>
            </div>
            <div className="p-8 text-center">
              <p className="text-white/30 text-[12px] font-mono">
                On-chain PASS holdings list coming soon.
              </p>
            </div>
          </div>

          {/* Points Summary — 未上线占位 */}
          <div className="bg-gradient-to-br from-[#0d1611] to-[#161616] border border-[#3ec470]/30 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-[#3ec470]" />
              <h3 className="text-[13px] font-bold text-[#3ec470] uppercase tracking-wider">Your Points</h3>
            </div>
            <p className="text-white/30 text-[11px] font-mono mb-4">Points system not yet on-chain.</p>
          </div>
        </div>

        {/* Transaction History — 链上接入中占位 */}
        <div className="bg-[#161616] border border-white/[0.04] rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/[0.04]">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-white/40" />
              Recent Activity
            </h3>
          </div>
          <div className="p-8 text-center">
            <p className="text-white/30 text-[12px] font-mono">
              On-chain transaction history coming soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
