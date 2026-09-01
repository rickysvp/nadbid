import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, PiggyBank, Shield, Timer } from 'lucide-react';
import { KolAvatar } from '../components/kol/KolAvatar';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { useToast } from '../hooks/useToast';
import { useWalletStore } from '../stores/walletStore';
import { useStaking } from '../hooks/useStaking';
import { TradeConfirmationModal, ConnectModal } from '../components/trade';
import type { TradeDetailItem } from '../components/trade';
import { normalizeHandle } from '../stores/kolHoldingsStore';
import { mockAvailableStakes, mockStakedPositions } from '../data/mockStaking';
import type { StakeStatus } from '../types';
import { kolProfilePath } from '../config/routes';
import { cn } from '../utils/cn';

/** 可质押行（Available to Stake） */
interface StakableRow {
  id: string;
  kolId?: string;
  name: string;
  /** 含 @ 前缀（用于头像 seed / 展示） */
  handle: string;
  passQuantity: number;
  revShare: string;
}

/** 已质押行（Currently Staked） */
interface StakedRow {
  id: string;
  kolId: string;
  name: string;
  handle: string;
  passQuantity: number;
  revShare: string;
  status: StakeStatus;
  stakedAt: number;
  activatedAt?: number;
  unlockRequestedAt?: number;
  unlockAt?: number;
  yieldEarned: number;
}

const initAvailable = (): StakableRow[] =>
  mockAvailableStakes.map((s) => ({
    id: s.id,
    kolId: s.kolId,
    name: s.kolName,
    handle: s.kolHandle,
    passQuantity: s.passQuantity,
    revShare: s.revShare,
  }));

const initStaked = (): StakedRow[] =>
  mockStakedPositions.map((p) => ({
    id: p.id,
    kolId: p.kolId,
    name: p.kol.name,
    handle: p.kol.handle,
    passQuantity: p.passQuantity,
    revShare: p.revShare,
    status: p.status,
    stakedAt: p.stakedAt,
    activatedAt: p.activatedAt,
    unlockRequestedAt: p.unlockRequestedAt,
    unlockAt: p.unlockAt,
    yieldEarned: p.yieldEarned,
  }));

/** 待确认的质押 / 解押动作（弹窗与连接引导共用） */
type PendingAction =
  | { type: 'stake'; rowId: string; amount: number }
  | { type: 'unstake'; rowId: string; amount: number };

/**
 * 解锁期是否已过：非激活中（PENDING 拦截）且无未来 unlockAt（UNLOCKING 拦截）。
 * ACTIVE（无锁期）与 UNLOCKED 均视为可解押。
 */
function canUnstakeRow(row: StakedRow, now: number = Date.now()): boolean {
  return row.status !== 'PENDING' && (row.unlockAt === undefined || row.unlockAt <= now);
}

/** 数量解析：空输入回退为整行数量（默认全质押）；显式非法输入（0/负/NaN）视为 0 */
function resolveQty(map: Record<string, string>, id: string, fallback: number): number {
  const raw = map[id];
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

const statusBadgeConfig: Record<StakeStatus, { label: string; cls: string }> = {
  ACTIVE: { label: 'Active', cls: 'text-[#3ec470] bg-[#3ec470]/10 border-[#3ec470]/25' },
  PENDING: { label: 'Activating', cls: 'text-amber-400 bg-amber-400/10 border-amber-400/25' },
  UNLOCKING: { label: 'Unlocking', cls: 'text-blue-400 bg-blue-400/10 border-blue-400/25' },
  UNLOCKED: { label: 'Unlocked', cls: 'text-blue-400 bg-blue-400/10 border-blue-400/25' },
};

export default function StakingPage() {
  const wallet = useWalletStore();
  const trade = useStaking();
  const { success: toastSuccess, error: toastError } = useToast();

  const [available, setAvailable] = useState<StakableRow[]>(initAvailable);
  const [staked, setStaked] = useState<StakedRow[]>(initStaked);
  const [availQty, setAvailQty] = useState<Record<string, string>>({});
  const [stakedQty, setStakedQty] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);

  /* ---------- 待确认动作对应的当前行（用于弹窗详情与交易入参） ---------- */

  const pendingRow = useMemo(() => {
    if (!pending) return null;
    return pending.type === 'stake'
      ? (available.find((r) => r.id === pending.rowId) ?? null)
      : (staked.find((r) => r.id === pending.rowId) ?? null);
  }, [pending, available, staked]);

  const openConfirm = (action: PendingAction) => {
    trade.reset();
    setPending(action);
  };

  /** 未连接钱包：先记录动作，连接成功后续接打开确认弹窗 */
  const handleConnected = () => {
    if (pending) openConfirm(pending);
  };

  /* ---------- Stake 交互 ---------- */

  const handleStakeClick = (row: StakableRow, qty: number) => {
    if (qty <= 0) return;
    if (qty > row.passQuantity) {
      toastError(`Insufficient PASS. Only ${row.passQuantity} PASS available to stake for ${row.name}.`);
      return;
    }
    if (!wallet.isConnected) {
      setPending({ type: 'stake', rowId: row.id, amount: qty });
      setConnectOpen(true);
      return;
    }
    openConfirm({ type: 'stake', rowId: row.id, amount: qty });
  };

  /* ---------- Unstake 交互 ---------- */

  const handleUnstakeClick = (row: StakedRow, qty: number) => {
    if (qty <= 0) return;
    if (!canUnstakeRow(row)) {
      toastError(
        row.status === 'PENDING'
          ? 'This position is still activating and cannot be unstaked yet.'
          : 'This position is still in its unlock period. Please wait before unstaking.',
      );
      return;
    }
    if (qty > row.passQuantity) {
      toastError(`Insufficient staked PASS. Only ${row.passQuantity} PASS staked for ${row.name}.`);
      return;
    }
    if (!wallet.isConnected) {
      setPending({ type: 'unstake', rowId: row.id, amount: qty });
      setConnectOpen(true);
      return;
    }
    openConfirm({ type: 'unstake', rowId: row.id, amount: qty });
  };

  /* ---------- 交易确认 ---------- */

  const handleConfirm = async () => {
    if (!pending || !pendingRow) return;
    const { type, rowId, amount } = pending;
    const result =
      type === 'stake'
        ? await trade.stake({
            kolHandle: normalizeHandle(pendingRow.handle),
            kolName: pendingRow.name,
            amount,
            maxAmount: pendingRow.passQuantity,
          })
        : await trade.unstake({
            positionId: rowId,
            kolHandle: normalizeHandle(pendingRow.handle),
            kolName: pendingRow.name,
            amount,
            stakedAmount: pendingRow.passQuantity,
            unlockPassed: canUnstakeRow(pendingRow as StakedRow),
          });
    if (!result) return; // 错误由 TradeConfirmationModal 展示；用户拒绝 → 静默

    // pending 类型与 pendingRow 由同一来源（useMemo 按 pending.type 查表）派生，此处收窄是安全的
    if (type === 'stake') moveStake(pendingRow as StakableRow, amount);
    else moveUnstake(pendingRow as StakedRow, amount);

    // 展示成功态后自动关闭并重置
    setTimeout(() => {
      setPending(null);
      trade.reset();
    }, 1400);
  };

  /* ---------- 列表联动：成功后数据在「可质押 / 已质押」间移动 ---------- */

  const moveStake = (row: StakableRow, amount: number) => {
    setAvailable((prev) => {
      const remaining = row.passQuantity - amount;
      return remaining > 0
        ? prev.map((r) => (r.id === row.id ? { ...r, passQuantity: remaining } : r))
        : prev.filter((r) => r.id !== row.id);
    });
    // 每次质押新建一个仓位（StakePosition 语义，与初始 mock 多仓位展示一致）
    setStaked((prev) => {
      const now = Date.now();
      const newPos: StakedRow = {
        id: `stk-${now}`,
        kolId: row.kolId ?? '',
        name: row.name,
        handle: row.handle,
        passQuantity: amount,
        revShare: row.revShare,
        status: 'ACTIVE',
        stakedAt: now,
        activatedAt: now,
        yieldEarned: 0,
      };
      return [newPos, ...prev];
    });
    setAvailQty((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
    toastSuccess(`Staked ${amount} ${row.name} PASS 🔒`);
  };

  const moveUnstake = (row: StakedRow, amount: number) => {
    setStaked((prev) => {
      const remaining = row.passQuantity - amount;
      return remaining > 0
        ? prev.map((s) => (s.id === row.id ? { ...s, passQuantity: remaining, yieldEarned: 0 } : s))
        : prev.filter((s) => s.id !== row.id);
    });
    setAvailable((prev) => {
      const existing = prev.find((a) => a.handle === row.handle);
      if (existing) {
        return prev.map((a) =>
          a.id === existing.id ? { ...a, passQuantity: a.passQuantity + amount } : a,
        );
      }
      return [
        {
          id: `a-${Date.now()}`,
          kolId: row.kolId,
          name: row.name,
          handle: row.handle,
          passQuantity: amount,
          revShare: row.revShare,
        },
        ...prev,
      ];
    });
    setStakedQty((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
    toastSuccess(`Unstaked ${amount} ${row.name} PASS`);
  };

  /* ---------- 弹窗详情 ---------- */

  const isStakePending = pending?.type === 'stake';
  const confirmDetails: TradeDetailItem[] = pendingRow
    ? isStakePending
      ? [
          { label: 'KOL', value: `${pendingRow.name} (${pendingRow.handle})` },
          { label: 'Action', value: 'Stake PASS' },
          { label: 'Quantity', value: `${pending!.amount} PASS` },
          { label: 'Rev. Share', value: (pendingRow as StakableRow).revShare },
          { label: 'Rewards', value: 'Yield + Rev Share', highlight: true },
        ]
      : [
          { label: 'KOL', value: `${pendingRow.name} (${pendingRow.handle})` },
          { label: 'Action', value: 'Unstake PASS' },
          { label: 'Quantity', value: `${pending!.amount} PASS` },
          {
            label: 'Accumulated Yield',
            value: `${(pendingRow as StakedRow).yieldEarned.toFixed(2)} MON`,
          },
          { label: 'Return', value: `${pending!.amount} PASS → Available`, highlight: true },
        ]
    : [];

  /* ---------- 规则说明 ---------- */

  const rules = [
    {
      icon: PiggyBank,
      chip: 'Earn while locked',
      title: 'Rev Share + Yield',
      desc: 'Staked PASS earns a share of KOL auction revenue plus protocol yield. The more PASS you stake, the larger your share.',
    },
    {
      icon: Shield,
      chip: 'Activates shortly',
      title: 'Activation Period',
      desc: 'Newly staked PASS enters an activation window before it starts earning. PENDING positions accrue no yield yet.',
    },
    {
      icon: Timer,
      chip: 'Unlock may apply',
      title: 'Unlock / Cooling',
      desc: 'Unstaking may require waiting for an unlock period. UNLOCKING positions can only be unstaked after the timer passes.',
    },
    {
      icon: Lock,
      chip: '1 stake per PASS',
      title: 'No Double-Staking',
      desc: 'Already staked PASS cannot be re-staked. It stays under Currently Staked until you unstake it back to available.',
    },
  ];

  return (
    <div className="min-h-screen bg-transparent pt-32 pb-24 font-sans text-white relative">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Staking for Yield</h1>
            <p className="text-white/50 text-[13px] font-medium">Manage your active stakes and check distributed yields.</p>
          </div>

          <div className="flex flex-wrap gap-4">
            <StatCard label="TVL" value="12.45M" unit="$MON" />
            <StatCard label="Total Staked" value="45,280" variant="green" />
            <StatCard label="Total Yield" value="1.24M" unit="$MON" variant="green" />
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Left Column: Available to Stake */}
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide mb-6">Available to Stake</h2>

            <div className="bg-[#161616] border border-white/[0.04] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#0f0f0f]">
                    <th className="py-4 px-6 text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">KOL</th>
                    <th className="py-4 px-6 text-center text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Pass</th>
                    <th className="py-4 px-6 text-center text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Rev. Share</th>
                    <th className="py-4 px-6 text-center text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Yield ($MON)</th>
                    <th className="py-4 px-6 text-right text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Action</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  <AnimatePresence>
                    {available.map((item) => {
                      const qty = resolveQty(availQty, item.id, item.passQuantity);
                      const exceeds = qty > item.passQuantity;
                      const stakeDisabled = qty <= 0 || trade.isSubmitting;
                      return (
                        <motion.tr
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          key={item.id}
                          className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] transition-colors"
                        >
                          <td className="py-4 px-6">
                            <Link to={kolProfilePath(item.handle)} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                              <div className="w-9 h-9 rounded-full bg-[#0a0a0a] border border-white/5 overflow-hidden flex items-center justify-center">
                                <KolAvatar handle={item.handle} name={item.name} className="!w-full !h-full !rounded-full !border-0" />
                              </div>
                              <div>
                                <div className="font-bold text-white tracking-tight hover:text-[#3ec470] transition-colors">{item.name}</div>
                                <div className="text-[11px] text-white/40 font-mono">{item.handle}</div>
                              </div>
                            </Link>
                          </td>
                          <td className="py-4 px-6 text-center font-bold font-mono text-white/80">{item.passQuantity}</td>
                          <td className="py-4 px-6 text-center font-bold font-mono text-white/80">{item.revShare}</td>
                          <td className="py-4 px-6 text-center font-bold font-mono text-white/30">-</td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <input
                                type="number"
                                min={1}
                                max={item.passQuantity}
                                value={availQty[item.id] ?? ''}
                                onChange={(e) => setAvailQty((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                placeholder={String(item.passQuantity)}
                                aria-label={`Stake quantity for ${item.name}`}
                                className="w-14 bg-[#0a0a0a] border border-white/[0.08] rounded px-2 py-1.5 font-mono text-[12px] text-white outline-none focus:border-[#3ec470]/50"
                              />
                              <Button
                                size="sm"
                                disabled={stakeDisabled}
                                title={exceeds ? `Only ${item.passQuantity} PASS available` : undefined}
                                onClick={() => handleStakeClick(item, qty)}
                              >
                                Stake
                              </Button>
                            </div>
                            {exceeds && (
                              <div className="text-red-400 text-[9px] font-mono mt-1">
                                Only {item.passQuantity} available
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                  {available.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-white/30 text-sm font-medium">No passes available to stake.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>

          {/* Right Column: Currently Staked */}
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide mb-6">Currently Staked</h2>

            <div className="bg-[#161616] border border-white/[0.04] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#0f0f0f]">
                    <th className="py-4 px-6 text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">KOL</th>
                    <th className="py-4 px-6 text-center text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Staked</th>
                    <th className="py-4 px-6 text-center text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Yield ($MON)</th>
                    <th className="py-4 px-6 text-center text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Status</th>
                    <th className="py-4 px-6 text-right text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Action</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  <AnimatePresence>
                    {staked.map((item) => {
                      const qty = resolveQty(stakedQty, item.id, item.passQuantity);
                      const unlockable = canUnstakeRow(item);
                      const exceeds = qty > item.passQuantity;
                      const badge = statusBadgeConfig[item.status];
                      const unstakeDisabled = qty <= 0 || !unlockable || trade.isSubmitting;
                      return (
                        <motion.tr
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          key={item.id}
                          className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] transition-colors"
                        >
                          <td className="py-4 px-6">
                            <Link to={kolProfilePath(item.handle)} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                              <div className="w-9 h-9 rounded-full bg-[#0a0a0a] border border-white/5 overflow-hidden flex items-center justify-center">
                                <KolAvatar handle={item.handle} name={item.name} className="!w-full !h-full !rounded-full !border-0" />
                              </div>
                              <div>
                                <div className="font-bold text-white tracking-tight hover:text-[#3ec470] transition-colors">{item.name}</div>
                                <div className="text-[11px] text-white/40 font-mono">{item.handle}</div>
                              </div>
                            </Link>
                          </td>
                          <td className="py-4 px-6 text-center font-bold font-mono text-white/80">{item.passQuantity}</td>
                          <td className="py-4 px-6 text-center font-bold font-mono text-[#3ec470]">
                            {item.yieldEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={cn('inline-block rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] border', badge.cls)}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <input
                                type="number"
                                min={1}
                                max={item.passQuantity}
                                value={stakedQty[item.id] ?? ''}
                                onChange={(e) => setStakedQty((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                placeholder={String(item.passQuantity)}
                                aria-label={`Unstake quantity for ${item.name}`}
                                disabled={!unlockable}
                                className="w-14 bg-[#0a0a0a] border border-white/[0.08] rounded px-2 py-1.5 font-mono text-[12px] text-white outline-none focus:border-[#3ec470]/50 disabled:opacity-40 disabled:cursor-not-allowed"
                              />
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={unstakeDisabled}
                                title={!unlockable ? 'Locked — wait for activation / unlock period' : undefined}
                                onClick={() => handleUnstakeClick(item, qty)}
                              >
                                Unstake
                              </Button>
                            </div>
                            {!unlockable && (
                              <div className="text-white/40 text-[9px] font-mono mt-1">
                                {item.status === 'PENDING' ? 'Activating…' : 'In unlock period'}
                              </div>
                            )}
                            {exceeds && unlockable && (
                              <div className="text-red-400 text-[9px] font-mono mt-1">
                                Only {item.passQuantity} staked
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                  {staked.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-white/30 text-sm font-medium">No active stakes.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </div>

        {/* Staking Rules */}
        <div className="mt-14">
          <h2 className="text-lg font-bold text-white tracking-wide mb-6">Staking Rules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {rules.map((r) => (
              <div key={r.title} className="bg-[#161616] border border-white/[0.04] rounded-xl p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#3ec470]/10 border border-[#3ec470]/20 flex items-center justify-center">
                    <r.icon className="w-4 h-4 text-[#3ec470]" />
                  </div>
                  <div className="text-[9px] text-white/40 font-bold uppercase tracking-[0.15em]">{r.chip}</div>
                </div>
                <h3 className="text-[13px] font-bold text-white tracking-tight mb-1.5">{r.title}</h3>
                <p className="text-[12px] text-white/50 leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 交易确认弹窗 */}
      <TradeConfirmationModal
        open={pending !== null && !connectOpen}
        onClose={() => {
          setPending(null);
          trade.reset();
        }}
        title={isStakePending ? 'Confirm Stake' : 'Confirm Unstake'}
        description={
          isStakePending
            ? pendingRow
              ? `Stake ${pending!.amount} ${pendingRow.name} PASS and start earning Rev Share + Yield.`
              : undefined
            : pendingRow
              ? `Unstake ${pending!.amount} ${pendingRow.name} PASS and return it to your available balance.`
              : undefined
        }
        details={confirmDetails}
        confirmText={isStakePending ? 'Confirm Stake' : 'Confirm Unstake'}
        cancelText="Cancel"
        onConfirm={handleConfirm}
        status={trade.status}
        txHash={trade.txHash ?? undefined}
        error={trade.error ?? undefined}
      />

      {/* 钱包连接引导 */}
      <ConnectModal
        open={connectOpen}
        onClose={() => {
          setConnectOpen(false);
          setPending(null);
        }}
        onConnected={handleConnected}
      />
    </div>
  );
}
