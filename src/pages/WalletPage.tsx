import { Link } from 'react-router-dom';
import { Coins, Layers, Trophy, Users, ArrowRight, Clock } from 'lucide-react';
import { KolAvatar } from '../components/kol/KolAvatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { AccountCard, WalletGuard } from '../components/wallet';
import { formatRelativeTime } from '../utils/format';
import { mockStakedPositions, mockClaimHistory, mockPointsBalance } from '../data/mockStaking';
import { kolProfilePath } from '../config/routes';

export default function WalletPage() {
  const totalStaked = mockStakedPositions.reduce((sum, p) => sum + p.passQuantity, 0);
  const totalYield = mockStakedPositions.reduce((sum, p) => sum + p.yieldEarned, 0);
  const pendingRewards = 7250.5;

  return (
    <WalletGuard
      title="Connect Your Wallet"
      description="Connect your wallet to view your PASS holdings, staking positions, rewards, and auction history."
    >
      <div className="min-h-screen bg-transparent pt-32 pb-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <AccountCard />

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
    </WalletGuard>
  );
}
