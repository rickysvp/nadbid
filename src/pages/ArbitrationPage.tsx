import { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Scale, Vote, Clock, AlertTriangle, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { KolAvatar } from '../components/kol/KolAvatar';
import { TradeConfirmationModal, ConnectModal } from '../components/trade';
import type { TradeDetailItem } from '../components/trade';
import { useWalletStore } from '../stores/walletStore';
import { useKolHoldingsStore, normalizeHandle } from '../stores/kolHoldingsStore';
import { useArbitrationVote } from '../hooks/useArbitrationVote';
import type { ArbitrationVoteType } from '../hooks/useArbitrationVote';
import { useToast } from '../hooks/useToast';
import { auctionDetailPath, kolProfilePath } from '../config/routes';
import { cn } from '../utils/cn';
import type { ArbitrationStatus, Dispute } from '../types';

const statusVariant: Record<ArbitrationStatus, 'arbitrating' | 'failed' | 'settled' | 'neutral'> = {
  PENDING: 'arbitrating',
  VOTING: 'arbitrating',
  SLASH: 'failed',
  RELEASE: 'settled',
  TIED: 'neutral',
};

export default function ArbitrationPage() {
  const { isConnected, address } = useWalletStore();
  const holdings = useKolHoldingsStore((s) => s.holdings);
  const { info } = useToast();
  const arbitration = useArbitrationVote();
  const { disputes } = arbitration;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [pendingVote, setPendingVote] = useState<{ disputeId: string; voteType: ArbitrationVoteType } | null>(null);

  const activeDisputes = disputes.filter((d) => d.status === 'VOTING');
  const resolvedDisputes = disputes.filter((d) => d.status !== 'VOTING');

  /** 投票权判断：持有该争议对应 KOL 的 PASS 才有投票权 */
  const hasVotingPower = (handle: string): boolean => (holdings[normalizeHandle(handle)] ?? 0) > 0;

  /** 点击投票：未连接钱包 → ConnectModal；有投票权 → 打开确认弹窗 */
  const handleVoteClick = (dispute: Dispute, voteType: ArbitrationVoteType) => {
    if (arbitration.isSubmitting) return;
    if (dispute.status !== 'VOTING' || dispute.userVote) return;
    if (!isConnected) {
      setPendingVote({ disputeId: dispute.id, voteType });
      setConnectOpen(true);
      return;
    }
    if (!hasVotingPower(dispute.auction.kol.handle)) {
      info('You need to hold the related PASS to vote on this dispute');
      return;
    }
    arbitration.reset();
    setPendingVote({ disputeId: dispute.id, voteType });
    setConfirmOpen(true);
  };

  /** 连接成功后的续接：回到投票确认流程 */
  const handleConnected = () => {
    arbitration.reset();
    setConfirmOpen(true);
  };

  /** 确认投票：执行 mock 交易 → 成功后投票条与状态由 hook 自动更新 */
  const handleConfirmVote = async () => {
    if (!pendingVote) return;
    const result = await arbitration.vote(pendingVote.disputeId, pendingVote.voteType);
    if (!result) return; // 错误已由 TradeConfirmationModal 展示；用户拒绝 → 静默

    // 投票成功：短暂停留后关闭弹窗
    setTimeout(() => {
      setConfirmOpen(false);
      arbitration.reset();
      setPendingVote(null);
    }, 1200);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    arbitration.reset();
    setPendingVote(null);
  };

  const pendingDispute = pendingVote ? disputes.find((d) => d.id === pendingVote.disputeId) : null;
  const voteDetails: TradeDetailItem[] = pendingVote && pendingDispute
    ? [
        { label: 'Dispute', value: `#${pendingVote.disputeId}` },
        { label: 'KOL', value: `${pendingDispute.auction.kol.name} (${pendingDispute.auction.kol.handle})` },
        { label: 'Vote', value: pendingVote.voteType, highlight: true },
        { label: 'Voting Power', value: `${pendingDispute.votingPower} PTS` },
        { label: 'Wallet', value: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '—' },
      ]
    : [];

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
    const hasPower = hasVotingPower(dispute.auction.kol.handle);

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
              <Link to={kolProfilePath(dispute.auction.kol.handle)} className="flex items-center gap-3 mb-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 rounded-full border border-white/[0.06] bg-black/50 overflow-hidden flex items-center justify-center shrink-0">
                  <KolAvatar handle={dispute.auction.kol.handle} name={dispute.auction.kol.name} className="!w-full !h-full !rounded-full !border-0" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-white font-black text-[15px] tracking-tight leading-tight truncate">{dispute.auction.kol.name}</span>
                  <span className="text-white/40 text-[11px] font-mono truncate">{dispute.auction.kol.handle}</span>
                </div>
              </Link>

              {/* Status + Auction ID */}
              <div className="flex items-center gap-3 mb-2">
                <Badge variant={statusVariant[dispute.status]}>{dispute.status}</Badge>
                <span className="text-[11px] text-white/30 font-mono">#{dispute.auctionId}</span>
              </div>

              {/* Auction Title */}
              <Link to={auctionDetailPath(dispute.auctionId)} className="hover:opacity-80 transition-opacity">
                <h3 className="text-lg font-bold text-white">{dispute.auction.title}</h3>
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
                Your voting power:{' '}
                <span className="font-mono font-bold text-white/70">{hasPower ? dispute.votingPower : 0} PTS</span>
              </div>
              <div className="flex gap-3">
                {dispute.userVote ? (
                  <div className="flex items-center gap-2 text-[12px] font-bold text-white/50">
                    {dispute.userVote === 'SLASH' ? (
                      <><XCircle className="w-4 h-4 text-red-400" /> Voted: Slash</>
                    ) : (
                      <><CheckCircle className="w-4 h-4 text-[#3ec470]" /> Voted: Release</>
                    )}
                  </div>
                ) : !hasPower ? (
                  <div className="flex items-center gap-2 text-[12px] font-bold text-white/30">
                    <AlertTriangle className="w-4 h-4" /> No voting power
                  </div>
                ) : (
                  <>
                    <Button variant="danger" size="sm" disabled={arbitration.isSubmitting} onClick={() => handleVoteClick(dispute, 'SLASH')}>
                      Vote Slash
                    </Button>
                    <Button size="sm" disabled={arbitration.isSubmitting} onClick={() => handleVoteClick(dispute, 'RELEASE')}>
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

      {/* 投票确认弹窗 */}
      <TradeConfirmationModal
        open={confirmOpen}
        onClose={closeConfirm}
        title={pendingVote ? `Confirm ${pendingVote.voteType} Vote` : 'Confirm Vote'}
        description="Cast your vote on this dispute. Your vote is weighted by your PASS holdings."
        details={voteDetails}
        confirmText={pendingVote ? `Confirm ${pendingVote.voteType}` : 'Confirm Vote'}
        cancelText="Cancel"
        onConfirm={handleConfirmVote}
        status={arbitration.status}
        txHash={arbitration.txHash ?? undefined}
        error={arbitration.error ?? undefined}
      />

      {/* 钱包连接引导弹窗 */}
      <ConnectModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onConnected={handleConnected}
      />
    </div>
  );
}
