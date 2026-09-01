import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, User, Package, TerminalSquare, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../hooks/useToast';
import { useClaim } from '../hooks/useClaim';
import { useWalletStore } from '../stores/walletStore';
import { TradeConfirmationModal, ConnectModal } from '../components/trade';
import type { TradeDetailItem } from '../components/trade';
import type { ClaimType, PendingReward } from '../types';
import { formatNumber } from '../utils/format';

/** 奖励类型展示文案（保持原页面 Badge 的 Title Case 展示） */
const TYPE_LABEL: Record<ClaimType, string> = {
  STAKING: 'Staking',
  REFUND: 'Refund',
  ROYALTY: 'Royalty',
  REFERRAL: 'Referral',
};

/** 格式化领取历史时间：'Oct 24, 2024 • 14:32 UTC' */
function formatClaimDate(timestamp: number): string {
  const d = new Date(timestamp);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
  return `${date} • ${time}`;
}

/** 待确认的领取动作（弹窗与连接引导共用） */
type PendingClaimAction =
  | { type: 'claim'; rewardId: string }
  | { type: 'claimAll' };

/**
 * 领取奖励（Claim / Claim All）页面：
 * - A. Pending Rewards Breakdown：待领取列表，每行 Claim 按钮 + 顶部 Claim All 批量领取
 * - B. Claiming Rules：领取规则说明（保持不变）
 * - C. Recent Claims History：领取历史表格（保持不变，数据来源 useClaim）
 * 未连接钱包 → ConnectModal 引导；确认后执行 mock 交易；成功后从 pending 移除并写入历史。
 */
export default function ClaimPage() {
  const wallet = useWalletStore();
  const claim = useClaim();
  const { success, info } = useToast();

  const [pendingClaim, setPendingClaim] = useState<PendingClaimAction | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);

  /* ---------- 待确认动作对应的奖励（用于弹窗详情与交易入参） ---------- */

  const pendingReward = useMemo(() => {
    if (!pendingClaim || pendingClaim.type !== 'claim') return null;
    return claim.pendingRewards.find((r) => r.id === pendingClaim.rewardId) ?? null;
  }, [pendingClaim, claim.pendingRewards]);

  /* ---------- 领取交互 ---------- */

  const openConfirm = (action: PendingClaimAction) => {
    claim.reset();
    setPendingClaim(action);
  };

  /** 未连接钱包：先记录动作，连接成功后续接打开确认弹窗 */
  const handleConnected = () => {
    if (pendingClaim) openConfirm(pendingClaim);
  };

  const handleClaimClick = (reward: PendingReward) => {
    if (!wallet.isConnected) {
      setPendingClaim({ type: 'claim', rewardId: reward.id });
      setConnectOpen(true);
      return;
    }
    openConfirm({ type: 'claim', rewardId: reward.id });
  };

  const handleClaimAllClick = () => {
    if (claim.pendingRewards.length === 0) return;
    if (!wallet.isConnected) {
      setPendingClaim({ type: 'claimAll' });
      setConnectOpen(true);
      return;
    }
    openConfirm({ type: 'claimAll' });
  };

  /* ---------- 交易确认 ---------- */

  const handleConfirm = async () => {
    if (!pendingClaim) return;
    const result =
      pendingClaim.type === 'claim'
        ? await claim.claim(pendingClaim.rewardId)
        : await claim.claimAll();
    if (!result) return; // 错误由 TradeConfirmationModal 展示；用户拒绝 → 静默

    // 展示成功态后自动关闭并重置
    success(
      pendingClaim.type === 'claim'
        ? `Claimed ${result.totalAmount.toFixed(2)} MON successfully!`
        : `Claimed ${result.rewards.length} rewards (${result.totalAmount.toFixed(2)} MON) successfully!`,
    );
    setTimeout(() => {
      setPendingClaim(null);
      claim.reset();
    }, 1400);
  };

  /* ---------- 弹窗详情 ---------- */

  const isSingle = pendingClaim?.type === 'claim';
  const claimTotal =
    pendingClaim?.type === 'claimAll'
      ? claim.pendingRewards.reduce((sum, r) => sum + r.amount, 0)
      : pendingReward?.amount ?? 0;

  const confirmDetails: TradeDetailItem[] = isSingle
    ? [
        { label: 'Source', value: pendingReward ? pendingReward.title : '' },
        { label: 'Type', value: pendingReward ? TYPE_LABEL[pendingReward.type] : '' },
        { label: 'Amount', value: `${formatNumber(claimTotal, 2)} MON` },
        { label: 'Estimated to Receive', value: `+ ${formatNumber(claimTotal, 2)} MON`, highlight: true },
      ]
    : [
        { label: 'Rewards', value: `${claim.pendingRewards.length} available` },
        { label: 'Total Amount', value: `${formatNumber(claimTotal, 2)} MON` },
        { label: 'Estimated to Receive', value: `+ ${formatNumber(claimTotal, 2)} MON`, highlight: true },
      ];

  return (
    <div className="min-h-screen bg-transparent pt-32 pb-24 font-sans text-white relative">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6 border-b border-white/[0.04] pb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Pending Rewards Breakdown</h1>
            <p className="text-white/50 text-sm font-medium">Review and collect your outstanding balances.</p>
          </div>

          <Button
            onClick={handleClaimAllClick}
            disabled={claim.pendingRewards.length === 0 || claim.isSubmitting}
            className="whitespace-nowrap"
          >
            Claim All <Zap className="w-4 h-4" />
          </Button>
        </div>

        {/* Two Column Layout for Pending & Rules */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          {/* Left Column: Pending Rewards */}
          <div className="lg:col-span-8">
            <div className="flex justify-between text-white/40 text-[10px] font-bold uppercase tracking-[0.15em] mb-4 px-2">
              <span>Source (KOL/Event)</span>
              <span>Amount / Action</span>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {claim.pendingRewards.map((item) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    key={item.id}
                    className="bg-[#161616] border border-white/[0.04] rounded-xl p-5 flex items-center justify-between group hover:border-white/[0.08] transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-center shrink-0">
                        {item.type === 'STAKING' ? (
                          <User className="w-5 h-5 text-[#3ec470]/80" />
                        ) : (
                          <Package className="w-5 h-5 text-[#fbbf24]/80" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-white text-[15px] tracking-tight mb-1">{item.title}</div>
                        <Badge variant={item.type === 'STAKING' ? 'neutral' : 'amber'}>{TYPE_LABEL[item.type]}</Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="font-mono text-lg font-bold text-white">
                        {formatNumber(item.amount, 2)} <span className="text-[12px] text-white/50">MON</span>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={claim.isSubmitting}
                        onClick={() => handleClaimClick(item)}
                      >
                        Claim
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {claim.pendingRewards.length === 0 && (
                <div className="bg-[#161616] border border-white/[0.04] rounded-xl p-12 text-center text-white/40 text-sm font-medium">
                  No pending rewards. You are all caught up!
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Claim Rules */}
          <div className="lg:col-span-4">
            <div className="bg-[#161616] border border-white/[0.04] rounded-xl overflow-hidden h-full">
              <div className="bg-[#1a1a1a] border-b border-white/[0.04] p-4 flex items-center gap-2">
                <TerminalSquare className="w-4 h-4 text-white/50" />
                <span className="text-[10px] font-bold text-white/80 uppercase tracking-[0.15em]">Claim Rules</span>
              </div>

              <div className="p-6 space-y-6">
                {[
                  { num: '01.', title: 'STAKING DISTRIBUTED', desc: 'Calculated and unlocked every 24 hours based on active staked PASS volume.' },
                  { num: '02.', title: 'AUCTION REFUNDS', desc: '100% of outbid amounts become instantly liquid & claimable upon auction settlement.' },
                  { num: '03.', title: 'PLATFORM FEES', desc: 'A fixed 1% protocol fee applies to all claimed yields to support the Monad ecosystem.' },
                  { num: '04.', title: 'MINIMUM CLAIM', desc: 'No minimum balance constraint required for claiming $MON rewards.' },
                ].map((rule, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="font-mono text-[#3ec470] font-bold text-sm shrink-0">{rule.num}</span>
                    <div>
                      <div className="font-bold text-white text-[11px] uppercase tracking-[0.1em] mb-1.5">{rule.title}</div>
                      <p className="text-white/50 text-[12px] leading-relaxed">{rule.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* History Section */}
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide uppercase mb-6">Recent Claims History</h2>

          <div className="bg-[#161616] border border-white/[0.04] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#1a1a1a]">
                    <th className="py-4 px-6 text-white/40 text-[10px] font-bold uppercase tracking-[0.15em] w-32">Status</th>
                    <th className="py-4 px-6 text-white/40 text-[10px] font-bold uppercase tracking-[0.15em]">Event / Source</th>
                    <th className="py-4 px-6 text-white/40 text-[10px] font-bold uppercase tracking-[0.15em]">Date & Time</th>
                    <th className="py-4 px-6 text-right text-white/40 text-[10px] font-bold uppercase tracking-[0.15em]">Amount Settled</th>
                    <th className="py-4 px-6 text-center text-white/40 text-[10px] font-bold uppercase tracking-[0.15em] w-24">TX Link</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  <AnimatePresence>
                    {claim.history.map((item) => (
                      <motion.tr
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={item.id}
                        className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] transition-colors"
                      >
                        <td className="py-5 px-6">
                          <Badge variant="settled">{item.status}</Badge>
                        </td>
                        <td className="py-5 px-6 font-bold text-white/90">{item.event}</td>
                        <td className="py-5 px-6 font-mono text-white/50">{formatClaimDate(item.timestamp)}</td>
                        <td className="py-5 px-6 text-right font-bold font-mono text-[#3ec470]">
                          + {formatNumber(item.amount, 2)} MON
                        </td>
                        <td className="py-5 px-6 text-center">
                          <button onClick={() => info('Opening Transaction...')} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors mx-auto group">
                            <ExternalLink className="w-3.5 h-3.5 text-white/40 group-hover:text-white/80 transition-colors" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            <div className="p-6 flex justify-center border-t border-white/[0.04]">
              <Button variant="secondary" size="sm" onClick={() => info('Loading older history...')}>
                Load More History
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 交易确认弹窗 */}
      <TradeConfirmationModal
        open={pendingClaim !== null && !connectOpen}
        onClose={() => {
          setPendingClaim(null);
          claim.reset();
        }}
        title={isSingle ? 'Confirm Claim' : 'Confirm Claim All'}
        description={
          isSingle
            ? pendingReward
              ? `Claim ${formatNumber(pendingReward.amount, 2)} MON from ${pendingReward.title}.`
              : undefined
            : `Claim all ${claim.pendingRewards.length} pending rewards in a single transaction.`
        }
        details={confirmDetails}
        confirmText={isSingle ? 'Confirm Claim' : 'Confirm Claim All'}
        cancelText="Cancel"
        onConfirm={handleConfirm}
        status={claim.status}
        txHash={claim.txHash ?? undefined}
        error={claim.error ?? undefined}
      />

      {/* 钱包连接引导 */}
      <ConnectModal
        open={connectOpen}
        onClose={() => {
          setConnectOpen(false);
          setPendingClaim(null);
        }}
        onConnected={handleConnected}
      />
    </div>
  );
}
