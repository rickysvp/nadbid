import { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Scale, Vote, Clock, AlertTriangle, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { KolAvatar } from '../components/kol/KolAvatar';
import { useWalletStore } from '../stores/walletStore';
import { useToast } from '../hooks/useToast';
import { auctionDetailPath, kolProfilePath } from '../config/routes';
import { cn } from '../utils/cn';
import type { ArbitrationStatus } from '../types';

interface Dispute {
  id: string;
  auctionId: string;
  auctionTitle: string;
  kolName: string;
  kolHandle: string;
  reason: string;
  status: ArbitrationStatus;
  votesFor: number;
  votesAgainst: number;
  votingEndsAt: number;
  userVote: 'FOR' | 'AGAINST' | null;
  votingPower: number;
}

const mockDisputes: Dispute[] = [
  {
    id: 'disp-001',
    auctionId: 'auc-006',
    auctionTitle: 'Whale Tracking Dashboard',
    kolName: 'WhaleWatch',
    kolHandle: '@whalewatch',
    reason: 'KOL failed to deliver promised dashboard access within 48 hours of auction settlement.',
    status: 'VOTING',
    votesFor: 342,
    votesAgainst: 128,
    votingEndsAt: Date.now() + 2 * 86400 * 1000 + 6 * 3600 * 1000,
    userVote: null,
    votingPower: 15,
  },
  {
    id: 'disp-002',
    auctionId: 'auc-007',
    auctionTitle: 'Private Alpha Group Access',
    kolName: 'CryptoQueen',
    kolHandle: '@cryptoqueen',
    reason: 'Winner claims the Telegram group was never created and KOL is unresponsive.',
    status: 'VOTING',
    votesFor: 89,
    votesAgainst: 215,
    votingEndsAt: Date.now() + 4 * 86400 * 1000,
    userVote: 'AGAINST',
    votingPower: 15,
  },
  {
    id: 'disp-003',
    auctionId: 'auc-008',
    auctionTitle: '1-on-1 Strategy Call',
    kolName: 'AlphaSeeker',
    kolHandle: '@alphaseeker',
    reason: 'Dispute over call duration — KOL claims 30min, auction description says 60min.',
    status: 'SLASH',
    votesFor: 512,
    votesAgainst: 88,
    votingEndsAt: Date.now() - 86400 * 1000,
    userVote: 'FOR',
    votingPower: 15,
  },
  {
    id: 'disp-004',
    auctionId: 'auc-009',
    auctionTitle: 'NFT Art Commission',
    kolName: 'ArtDegen',
    kolHandle: '@artdegen',
    reason: 'Artwork delivered but quality significantly below what was promised in auction description.',
    status: 'RELEASE',
    votesFor: 45,
    votesAgainst: 378,
    votingEndsAt: Date.now() - 2 * 86400 * 1000,
    userVote: null,
    votingPower: 15,
  },
];

const statusVariant: Record<ArbitrationStatus, 'arbitrating' | 'failed' | 'settled' | 'neutral'> = {
  PENDING: 'arbitrating',
  VOTING: 'arbitrating',
  SLASH: 'failed',
  RELEASE: 'settled',
  TIED: 'neutral',
};

export default function ArbitrationPage() {
  const [disputes, setDisputes] = useState<Dispute[]>(mockDisputes);
  const { isConnected } = useWalletStore();
  const { success, info } = useToast();

  const activeDisputes = disputes.filter((d) => d.status === 'VOTING');
  const resolvedDisputes = disputes.filter((d) => d.status !== 'VOTING');

  const handleVote = (disputeId: string, vote: 'FOR' | 'AGAINST') => {
    if (!isConnected) {
      info('Please connect your wallet to vote');
      return;
    }
    setDisputes((prev) =>
      prev.map((d) => {
        if (d.id !== disputeId) return d;
        const newVotesFor = d.votesFor + (vote === 'FOR' ? d.votingPower : 0);
        const newVotesAgainst = d.votesAgainst + (vote === 'AGAINST' ? d.votingPower : 0);
        return { ...d, votesFor: newVotesFor, votesAgainst: newVotesAgainst, userVote: vote };
      }),
    );
    success(`Vote submitted: ${vote === 'FOR' ? 'Slash' : 'Release'} (${disputes.find((d) => d.id === disputeId)?.votingPower} voting power)`);
  };

  const formatTimeLeft = (target: number) => {
    const diff = Math.max(0, target - Date.now());
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  };

  const renderDisputeCard = (dispute: Dispute) => {
    const totalVotes = dispute.votesFor + dispute.votesAgainst;
    const forPercent = totalVotes > 0 ? (dispute.votesFor / totalVotes) * 100 : 50;
    const isVoting = dispute.status === 'VOTING';

    return (
      <motion.div
        key={dispute.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#161616] border border-white/[0.04] rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/[0.04]">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              {/* KOL Identity Row */}
              <Link to={kolProfilePath(dispute.kolHandle.replace(/^@/, ''))} className="flex items-center gap-3 mb-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 rounded-full border border-white/[0.06] bg-black/50 overflow-hidden flex items-center justify-center shrink-0">
                  <KolAvatar handle={dispute.kolHandle} name={dispute.kolName} className="!w-full !h-full !rounded-full !border-0" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-white font-black text-[15px] tracking-tight leading-tight truncate">{dispute.kolName}</span>
                  <span className="text-white/40 text-[11px] font-mono truncate">{dispute.kolHandle}</span>
                </div>
              </Link>

              {/* Status + Auction ID */}
              <div className="flex items-center gap-3 mb-2">
                <Badge variant={statusVariant[dispute.status]}>{dispute.status}</Badge>
                <span className="text-[11px] text-white/30 font-mono">#{dispute.auctionId}</span>
              </div>

              {/* Auction Title */}
              <Link to={auctionDetailPath(dispute.auctionId)} className="hover:opacity-80 transition-opacity">
                <h3 className="text-lg font-bold text-white">{dispute.auctionTitle}</h3>
              </Link>
            </div>
            {isVoting && (
              <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-bold shrink-0 ml-4">
                <Clock className="w-3.5 h-3.5" />
                {formatTimeLeft(dispute.votingEndsAt)} left
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="flex items-start gap-3 bg-[#0f0f0f] border border-white/[0.04] rounded-lg p-4">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[13px] text-white/60 leading-relaxed">{dispute.reason}</p>
          </div>
        </div>

        {/* Voting Bar */}
        <div className="p-6 border-b border-white/[0.04]">
          <div className="flex justify-between text-[11px] font-bold mb-2">
            <span className="text-red-400">SLASH ({dispute.votesFor})</span>
            <span className="text-white/40">{totalVotes.toLocaleString()} total votes</span>
            <span className="text-[#3ec470]">RELEASE ({dispute.votesAgainst})</span>
          </div>
          <div className="h-3 bg-white/5 rounded-full overflow-hidden flex">
            <motion.div
              className="h-full bg-gradient-to-r from-red-600 to-red-400"
              initial={{ width: 0 }}
              animate={{ width: `${forPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
            <motion.div
              className="h-full bg-gradient-to-r from-[#3ec470] to-[#4ade80]"
              initial={{ width: 0 }}
              animate={{ width: `${100 - forPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-6">
          {isVoting ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-[11px] text-white/40">
                Your voting power: <span className="font-mono font-bold text-white/70">{dispute.votingPower} PTS</span>
              </div>
              <div className="flex gap-3">
                {dispute.userVote ? (
                  <div className="flex items-center gap-2 text-[12px] font-bold text-white/50">
                    {dispute.userVote === 'FOR' ? (
                      <><XCircle className="w-4 h-4 text-red-400" /> Voted: Slash</>
                    ) : (
                      <><CheckCircle className="w-4 h-4 text-[#3ec470]" /> Voted: Release</>
                    )}
                  </div>
                ) : (
                  <>
                    <Button variant="danger" size="sm" onClick={() => handleVote(dispute.id, 'FOR')}>
                      Vote Slash
                    </Button>
                    <Button size="sm" onClick={() => handleVote(dispute.id, 'AGAINST')}>
                      Vote Release
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className={cn(
                'flex items-center gap-2 text-[13px] font-bold',
                dispute.status === 'SLASH' ? 'text-red-400' : dispute.status === 'RELEASE' ? 'text-[#3ec470]' : 'text-white/50',
              )}>
                {dispute.status === 'SLASH' && <><XCircle className="w-4 h-4" /> Funds slashed to treasury</>}
                {dispute.status === 'RELEASE' && <><CheckCircle className="w-4 h-4" /> Funds released to KOL</>}
                {dispute.status === 'TIED' && 'Vote tied — manual review'}
              </div>
              <Link to={auctionDetailPath(dispute.auctionId)}>
                <Button variant="secondary" size="sm">
                  View Auction <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-transparent pt-32 pb-24">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#3ec470]/10 border border-[#3ec470]/30 flex items-center justify-center">
              <Scale className="w-6 h-6 text-[#3ec470]" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Arbitration</h1>
              <p className="text-white/50 text-[13px]">Decentralized dispute resolution for auction fulfillment</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <div className="bg-[#161616] border border-white/[0.04] rounded-xl p-5 text-center">
            <div className="font-mono text-2xl font-black text-amber-400">{activeDisputes.length}</div>
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em] mt-1">Active Disputes</div>
          </div>
          <div className="bg-[#161616] border border-white/[0.04] rounded-xl p-5 text-center">
            <div className="font-mono text-2xl font-black text-red-400">{resolvedDisputes.filter((d) => d.status === 'SLASH').length}</div>
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em] mt-1">Slashed</div>
          </div>
          <div className="bg-[#161616] border border-white/[0.04] rounded-xl p-5 text-center">
            <div className="font-mono text-2xl font-black text-[#3ec470]">{resolvedDisputes.filter((d) => d.status === 'RELEASE').length}</div>
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em] mt-1">Released</div>
          </div>
        </div>

        {/* Active Disputes */}
        {activeDisputes.length > 0 && (
          <div className="mb-12">
            <h2 className="text-lg font-black tracking-tight text-white mb-6 flex items-center gap-2">
              <Vote className="w-5 h-5 text-amber-400" />
              Active Voting
            </h2>
            <div className="space-y-6">{activeDisputes.map(renderDisputeCard)}</div>
          </div>
        )}

        {/* Resolved Disputes */}
        {resolvedDisputes.length > 0 && (
          <div>
            <h2 className="text-lg font-black tracking-tight text-white mb-6">Resolved</h2>
            <div className="space-y-6 opacity-70">{resolvedDisputes.map(renderDisputeCard)}</div>
          </div>
        )}

        {/* How it works */}
        <div className="mt-16 bg-[#161616] border border-white/[0.04] rounded-2xl p-8">
          <h3 className="text-lg font-black tracking-tight text-white mb-6">How Arbitration Works</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Dispute Raised', desc: 'Winner raises a dispute within 7 days if KOL fails to fulfill.' },
              { step: '02', title: 'Voting Period', desc: 'PASS holders vote on whether to slash or release funds. 48h voting window.' },
              { step: '03', title: 'Resolution', desc: 'Majority vote decides. Slashed funds go to treasury. Tied votes go to manual review.' },
              { step: '04', title: 'Appeal', desc: 'Either party can appeal within 24h with additional evidence.' },
            ].map((item) => (
              <div key={item.step}>
                <div className="font-mono text-[#3ec470] font-bold text-sm mb-2">{item.step}</div>
                <div className="font-bold text-white text-[13px] mb-1">{item.title}</div>
                <p className="text-white/40 text-[12px] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
