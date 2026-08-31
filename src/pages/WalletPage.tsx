import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Wallet, Coins, Layers, Trophy, Users, ArrowRight, Copy, ExternalLink, TrendingUp, Clock } from 'lucide-react';
import { KolAvatar } from '../components/kol/KolAvatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { useWalletStore } from '../stores/walletStore';
import { useToast } from '../hooks/useToast';
import { shortenAddress, formatRelativeTime } from '../utils/format';
import { mockStakedPositions, mockClaimHistory, mockPointsBalance } from '../data/mockStaking';
import { kolProfilePath } from '../config/routes';

export default function WalletPage() {
  const { isConnected, address, balanceMon, connect, disconnect } = useWalletStore();
  const { success, info } = useToast();

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      success('Address copied to clipboard!');
    }
  };

  const totalStaked = mockStakedPositions.reduce((sum, p) => sum + p.passQuantity, 0);
  const totalYield = mockStakedPositions.reduce((sum, p) => sum + p.yieldEarned, 0);
  const pendingRewards = 7250.5;

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
            <Button size="lg" onClick={connect}>
              <Wallet className="w-5 h-5" />
              Connect Wallet
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent pt-32 pb-24">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Wallet Header */}
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
              <Button variant="secondary" size="sm" onClick={() => info('Opening explorer...')}>
                <ExternalLink className="w-3.5 h-3.5" /> Explorer
              </Button>
              <Button variant="danger" size="sm" onClick={disconnect}>
                Disconnect
              </Button>
            </div>
          </div>

          {/* Balance */}
          <div className="relative z-10 mt-8 pt-8 border-t border-white/[0.06]">
            <div className="text-[10px] text-white/40 font-bold uppercase tracking-[0.15em] mb-2">Wallet Balance</div>
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-5xl font-black text-white tracking-tight">
                {balanceMon.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xl text-white/50 font-mono">$MON</span>
              <div className="flex items-center gap-1 bg-[#1a2f22] text-[#3ec470] text-[11px] font-bold px-2 py-1 rounded border border-[#3ec470]/30">
                <TrendingUp className="w-3 h-3" /> +2.4%
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <StatCard label="PASS Holdings" value="25" variant="green" />
          <StatCard label="Staked PASS" value={totalStaked.toString()} />
          <StatCard label="Pending Rewards" value={pendingRewards.toLocaleString()} unit="MON" variant="green" />
          <StatCard label="Total Yield Earned" value={totalYield.toLocaleString()} unit="MON" />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* PASS Holdings */}
          <div className="lg:col-span-2">
            <div className="bg-[#161616] border border-white/[0.04] rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/[0.04] flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#3ec470]" />
                  PASS Holdings
                </h3>
                <Link to="/staking">
                  <Button variant="secondary" size="sm">
                    Manage <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
              <div className="divide-y divide-white/[0.02]">
                {mockStakedPositions.slice(0, 5).map((position) => (
                  <Link
                    key={position.id}
                    to={kolProfilePath(position.kol.handle)}
                    className="flex items-center justify-between py-5 px-6 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <KolAvatar handle={position.kol.handle} size="md" name={position.kol.name} />
                      <div>
                        <div className="font-bold text-white text-[14px]">{position.kol.name}</div>
                        <div className="text-[11px] text-white/40 font-mono">{position.kol.handle}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-white">{position.passQuantity} PASS</div>
                      <Badge variant={position.status === 'ACTIVE' ? 'stake_active' : position.status === 'PENDING' ? 'stake_pending' : 'unlocking'}>
                        {position.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
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
                <Link to="/points">
                  <Button fullWidth variant="secondary" size="sm">
                    <Users className="w-4 h-4" /> View Points
                  </Button>
                </Link>
              </div>
            </div>

            {/* Points Summary */}
            <div className="bg-gradient-to-br from-[#0d1611] to-[#161616] border border-[#3ec470]/30 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-[#3ec470]" />
                <h3 className="text-[13px] font-bold text-[#3ec470] uppercase tracking-wider">Your Points</h3>
              </div>
              <div className="font-mono text-3xl font-black text-[#3ec470] mb-1">
                {mockPointsBalance.total.toLocaleString()}
              </div>
              <div className="text-[11px] text-white/40 mb-4">Global Rank #{mockPointsBalance.rank}</div>
              <Link to="/points">
                <Button fullWidth variant="secondary" size="sm">
                  View Details <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-[#161616] border border-white/[0.04] rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/[0.04]">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-white/40" />
              Recent Activity
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#0f0f0f]">
                  <th className="py-4 px-6 text-left text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Type</th>
                  <th className="py-4 px-6 text-left text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Event</th>
                  <th className="py-4 px-6 text-left text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Date</th>
                  <th className="py-4 px-6 text-right text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Amount</th>
                  <th className="py-4 px-6 text-center text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Status</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {mockClaimHistory.map((record) => (
                  <tr key={record.id} className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 px-6">
                      <Badge variant={record.type === 'STAKING' ? 'stake_active' : 'amber'}>{record.type}</Badge>
                    </td>
                    <td className="py-4 px-6 font-bold text-white/90">{record.event}</td>
                    <td className="py-4 px-6 text-white/40 font-mono text-[12px]">{formatRelativeTime(record.timestamp)}</td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-[#3ec470]">
                      + {record.amount.toLocaleString()} MON
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Badge variant="settled">{record.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
