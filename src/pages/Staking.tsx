import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Clock,
  ExternalLink,
  Lock,
  LockOpen,
  PiggyBank,
  Shield,
  Timer,
  Trophy,
} from 'lucide-react';
import { STAKING, DIVIDEND_POOL } from '@/constants/app';
import { kolProfiles, knownKolHandles } from '@/data/kolProfiles';
import {
  selectActiveStakedQty,
  selectFreeQty,
  selectPendingStakedQty,
  selectUnlockingStakedQty,
  selectUnstakableQty,
  useKolHoldingsStore,
  useKolHolding,
  useUiStore,
} from '@/stores';
import type { StakePosition } from '@/stores';
import type { KolProfile, StakeLockDays } from '@/types';
import { formatCountdown, formatTokenAmount, getNextDividendSettlement, cn } from '@/utils';

/** 质押权益说明卡片（所有用户可见的质押规则与收益约定）。 */
function StakeGuides() {
  const nextSettlement = useMemo(() => getNextDividendSettlement(), []);
  const countdown = useMemo(() => formatCountdown(nextSettlement.getTime()), [nextSettlement]);

  const guides = [
    {
      icon: PiggyBank,
      color: 'text-primary',
      chip: `Every ${DIVIDEND_POOL.WEEKDAY_UTC_LABELS[DIVIDEND_POOL.SETTLEMENT_UTC_DAY]} ${DIVIDEND_POOL.SETTLEMENT_UTC_HOUR.toString().padStart(2, '0')}:00 UTC`,
      title: 'Weekly dividend pool',
      desc: `KOL 拍卖收入按比例进入分红池，每周日 UTC 00:00 自动结算，由当期处于 STAKE_ACTIVE 状态的 NFT 等分。未质押 / 激活中 / 冷却中的 NFT 不参与。`,
    },
    {
      icon: Shield,
      color: 'text-secondary',
      chip: `Activate ${STAKING.PENDING_HOURS}h · Release ${STAKING.UNSTAKE_PENDING_HOURS}h`,
      title: 'Activation & cooling',
      desc: `质押后 ${STAKING.PENDING_HOURS} 小时计入分红权重；解押后需再冷却 ${STAKING.UNSTAKE_PENDING_HOURS} 小时，期间 NFT 不可用于拍卖/销毁。`,
    },
    {
      icon: Timer,
      color: 'text-tertiary',
      chip: `${STAKING.LOCK_DAYS.join(' / ')} days`,
      title: 'Flexible lock periods',
      desc: `支持 ${STAKING.LOCK_DAYS.map((d) => STAKING.LOCK_LABELS[d]).join(
        ' / ',
      )}，自由选择质押时长，到期自动解锁。`,
    },
    {
      icon: Trophy,
      color: 'text-error',
      chip: 'Per-NFT share',
      title: 'Equal per-NFT weight',
      desc: `同一 KOL 下每枚 NFT 权重相等，多质押 = 多分红。Stake 越多，拍卖收益中分到的 $MON 越可观。`,
    },
  ];

  return (
    <div className="rounded-3xl border-3 border-black shadow-neo-xl bg-white overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 md:px-8 py-5 border-b-2 border-black bg-[#FFF8E7]">
        <div className="min-w-0">
          <h2 className="font-display font-black text-xl md:text-2xl uppercase tracking-tight text-black leading-tight">
            Stake &amp; Earn · 权益说明
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] md:text-xs font-bold text-black/60">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5 text-primary" /> Next settlement in {countdown}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-secondary" /> Curated by nadbid treasury
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-xl border-2 border-black bg-white px-4 py-2 font-mono text-[11px] md:text-xs uppercase font-black text-black shadow-neo-md">
          <BadgeCheck className="w-4 h-4 text-primary" /> Automated · Trustless
        </span>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 px-5 md:px-8 py-6">
        {guides.map((g) => (
          <div
            key={g.title}
            className="rounded-2xl border-2 border-black bg-surface-container-lowest p-4 shadow-neo-sm flex gap-3.5"
          >
            <div
              className={cn(
                'shrink-0 w-11 h-11 rounded-xl border-2 border-black bg-white grid place-items-center shadow-neo-sm',
                g.color,
              )}
            >
              <g.icon className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className={cn('font-mono text-[10px] uppercase font-black tracking-wider', g.color)}>
                {g.chip}
              </div>
              <h3 className="font-display font-black text-base text-black leading-tight">{g.title}</h3>
              <p className="mt-1 font-body text-[13px] leading-snug text-black/70">{g.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 单个质押位置的行内展示：状态徽章 + 统一时钟倒计时。 */
function StakePositionRow({ pos, now }: { pos: StakePosition; now: number }) {
  const lockLabel = pos.lockDays ? STAKING.LOCK_LABELS[pos.lockDays] : 'Legacy · no lock';
  let Icon = Lock;
  let color = 'text-primary';
  let label: string;
  if (pos.state === 'PENDING') {
    Icon = Timer;
    color = 'text-tertiary';
    label = `Activates in ${formatCountdown(pos.activatesAtUtcMs ?? now, now)}`;
  } else if (pos.state === 'UNLOCKING') {
    Icon = Clock;
    color = 'text-error';
    label = `Releases in ${formatCountdown(pos.releaseAtUtcMs ?? now, now)}`;
  } else if (pos.lockEndsAtUtcMs !== null && pos.lockEndsAtUtcMs > now) {
    label = `Unlocks in ${formatCountdown(pos.lockEndsAtUtcMs, now)}`;
  } else {
    Icon = LockOpen;
    color = 'text-secondary';
    label = 'Unlocked · ready to unstake';
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border-2 border-black bg-white px-3 py-2 font-mono text-[10px] md:text-[11px] font-bold text-black/70 shadow-neo-sm">
      <Icon className={cn('w-3.5 h-3.5 shrink-0', color)} />
      <span className="uppercase font-black text-black">{pos.qty} NFT</span>
      <span className="rounded-md border border-black/20 px-1.5 py-0.5 uppercase">{lockLabel}</span>
      <span className="ml-auto tabular-nums">{label}</span>
      {pos.state === 'ACTIVE' && (pos.lockEndsAtUtcMs === null || pos.lockEndsAtUtcMs <= now) && (
        <span className="rounded-md bg-secondary px-1.5 py-0.5 uppercase font-black text-black">
          can unstake
        </span>
      )}
    </div>
  );
}

/** 单个 KOL 的质押卡片：展示可质押 NFT + 质押/解押操作 + 分红信息。 */
function StakingKolCard({ profile }: { profile: KolProfile }) {
  const { handle, nickname, avatarUrl, verified, market, dividendSharePerNft, dividendPool } =
    profile;
  const pushToast = useUiStore((s) => s.pushToast);
  const seedHoldings = useKolHoldingsStore((s) => s.seed);
  const stakeThen = useKolHoldingsStore((s) => s.stake);
  const unstakeThen = useKolHoldingsStore((s) => s.unstake);

  const holding = useKolHolding(handle, market);
  const nowUtcMs = useKolHoldingsStore((s) => s.nowUtcMs);
  const total = holding.userNftBalance;
  const activeStaked = selectActiveStakedQty(holding);
  const pendingQty = selectPendingStakedQty(holding);
  const unlockingQty = selectUnlockingStakedQty(holding);
  const transitioning = pendingQty + unlockingQty;
  const liquid = selectFreeQty(holding);
  const unstakable = selectUnstakableQty(holding, nowUtcMs);
  const unstakeHint =
    unstakable > 0 ? '' : activeStaked + transitioning > 0 ? '(locked)' : '(0 staked)';

  const [stakeQty, setStakeQty] = useState(1);
  const [unstakeQty, setUnstakeQty] = useState(1);
  const [lockDays, setLockDays] = useState<StakeLockDays>(STAKING.LOCK_DAYS[0]);

  useEffect(() => {
    seedHoldings(handle, {
      userNftBalance: market.userNftBalance,
      stakedNfts: market.stakedNfts,
      dividendsClaimedMon: market.dividendsClaimedMon,
      dividendsPendingMon: market.dividendsPendingMon,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle]);

  const doStake = () => {
    const qty = Math.floor(stakeQty);
    if (!qty || qty <= 0) {
      pushToast({ kind: 'warn', title: 'Choose how many NFT to stake', description: 'Pick at least 1 NFT (FREE_HOLD) to lock in.', ttlMs: 2800 });
      return;
    }
    if (qty > liquid) {
      pushToast({ kind: 'error', title: `Only ${liquid} NFT available`, description: `You hold ${total}: ${liquid} FREE_HOLD, ${activeStaked} STAKE_ACTIVE, ${transitioning} activating/releasing. Mint more to stake.`, ttlMs: 3600 });
      return;
    }
    stakeThen(handle, qty, lockDays);
    pushToast({
      kind: 'success',
      title: `Staked ${qty} @${handle} NFT 🔒`,
      description: `${STAKING.LOCK_LABELS[lockDays]} lock · activates in ${STAKING.PENDING_HOURS}h.`,
      ttlMs: 4200,
    });
    setStakeQty(1);
  };

  const doUnstake = () => {
    const qty = Math.floor(unstakeQty);
    if (!qty || qty <= 0) {
      pushToast({ kind: 'warn', title: 'Choose how many NFT to unstake', description: 'Pick at least 1 NFT to release.', ttlMs: 2800 });
      return;
    }
    if (qty > unstakable) {
      pushToast({
        kind: 'error',
        title: `Only ${unstakable} NFT can unstake now`,
        description: `${activeStaked} STAKE_ACTIVE but locked or cooling. Locked NFT cannot be released early — wait for the lock countdown.`,
        ttlMs: 4200,
      });
      return;
    }
    unstakeThen(handle, qty);
    pushToast({
      kind: 'info',
      title: `Unstaking ${qty} @${handle} NFT`,
      description: `Cooling ${STAKING.UNSTAKE_PENDING_HOURS}h before FREE_HOLD · no dividend weight until then.`,
      ttlMs: 4600,
    });
    setUnstakeQty(1);
  };

  return (
    <div className="rounded-3xl border-3 border-black shadow-neo-xl bg-white overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 px-5 md:px-6 py-4 border-b-2 border-black bg-surface-container-lowest">
        <img
          src={avatarUrl}
          alt={handle}
          loading="lazy"
          className="w-12 h-12 rounded-full border-2 border-black object-cover shadow-neo-sm"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Link
              to={`/kols/${handle}`}
              className="font-display font-black text-lg text-black leading-tight hover:text-primary"
            >
              @{handle}
            </Link>
            {verified && <BadgeCheck className="w-4 h-4 text-primary shrink-0" />}
          </div>
          <div className="font-mono text-[11px] font-bold text-on-surface-variant truncate">
            {nickname} · {market.currentPrice} / NFT
          </div>
        </div>
        <a
          href={profile.xUrl}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 rounded-lg border-2 border-black bg-white px-2.5 py-1.5 font-mono text-[10px] uppercase font-black text-black shadow-neo-sm hover:text-primary"
        >
          X <ExternalLink className="w-3 h-3" />
        </a>
      </header>

      {/* Holdings summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x-2 divide-black border-b-2 border-black">
        <div className="px-3 py-3 text-center">
          <div className="font-display font-black text-xl text-black">{total}</div>
          <div className="font-mono text-[10px] uppercase font-black text-on-surface-variant">
            Total NFT
          </div>
        </div>
        <div className="px-3 py-3 text-center bg-primary/10">
          <div className="font-display font-black text-xl text-primary">{liquid}</div>
          <div className="font-mono text-[10px] uppercase font-black text-on-surface-variant">
            FREE_HOLD
          </div>
        </div>
        <div className="px-3 py-3 text-center bg-secondary/10">
          <div className="font-display font-black text-xl text-secondary">{activeStaked}</div>
          <div className="font-mono text-[10px] uppercase font-black text-on-surface-variant">
            STAKE_ACTIVE
          </div>
        </div>
        <div className="px-3 py-3 text-center bg-tertiary/10">
          <div className="font-display font-black text-xl text-tertiary">{transitioning}</div>
          <div className="font-mono text-[10px] uppercase font-black text-on-surface-variant">
            Activating / cooling
          </div>
        </div>
      </div>

      {/* Dividend info strip */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-5 md:px-6 py-3 border-b-2 border-black bg-surface-container-lowest font-mono text-[11px] font-bold text-black/70">
        <span className="inline-flex items-center gap-1.5">
          <PiggyBank className="w-3.5 h-3.5 text-primary" /> Share/NFT: {dividendSharePerNft}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-secondary" /> Pending:{' '}
          <span className="text-black">{formatTokenAmount(holding.dividendsPendingMon)}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-black/60">
          <CalendarClock className="w-3.5 h-3.5" /> Dist ~{formatTokenAmount(dividendPool.pendingThisWeekMon)}
        </span>
      </div>

      {/* Staked positions */}
      {holding.positions.length > 0 && (
        <div className="space-y-1.5 px-5 md:px-6 py-3 border-b-2 border-black bg-surface-container-lowest">
          <div className="font-mono text-[10px] uppercase font-black tracking-wider text-black/50">
            Staked positions · {holding.positions.length}
          </div>
          {holding.positions.map((pos) => (
            <StakePositionRow key={pos.id} pos={pos} now={nowUtcMs} />
          ))}
        </div>
      )}

      {/* Stake / Unstake controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 md:p-6">
        {/* STAKE */}
        <div className="rounded-2xl border-2 border-black bg-primary/10 p-4 shadow-neo-sm">
          <div className="flex items-center gap-2 font-mono text-xs uppercase font-black text-black mb-3">
            <Lock className="w-4 h-4 text-primary" /> Stake
          </div>
          <select
            value={lockDays}
            onChange={(e) => setLockDays(Number(e.target.value) as StakeLockDays)}
            className="w-full mb-3 rounded-xl border-2 border-black bg-white px-3 py-2.5 font-mono text-xs font-black text-black focus:outline-none"
            aria-label={`Lock period for ${handle}`}
          >
            {STAKING.LOCK_DAYS.map((d) => (
              <option key={d} value={d}>
                {STAKING.LOCK_LABELS[d]} — {STAKING.LOCK_HINT[d]}
              </option>
            ))}
          </select>
          <div className="rounded-xl border-2 border-black bg-white shadow-neo-sm overflow-hidden mb-3">
            <div className="flex items-stretch">
              <input
                type="number"
                min={0}
                max={liquid || undefined}
                value={stakeQty}
                onChange={(e) => setStakeQty(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                className="flex-1 bg-transparent px-3 py-2.5 font-display font-black text-lg text-black text-center focus:outline-none"
                aria-label={`Stake quantity for ${handle}`}
              />
              <div className="px-3 flex items-center border-l-2 border-black bg-surface-container-lowest font-mono text-[11px] uppercase font-black text-on-surface-variant">
                NFT
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={doStake}
            disabled={liquid <= 0}
            className="w-full btn-hover font-display font-black uppercase text-base rounded-xl border-3 border-black shadow-neo-lg bg-primary text-on-primary py-3 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" /> Stake {stakeQty || ''} {liquid > 0 ? '' : '(no FREE_HOLD)'}
          </button>
        </div>

        {/* UNSTAKE */}
        <div className="rounded-2xl border-2 border-black bg-secondary/10 p-4 shadow-neo-sm">
          <div className="flex items-center gap-2 font-mono text-xs uppercase font-black text-black mb-3">
            <LockOpen className="w-4 h-4 text-secondary" /> Unstake
          </div>
          <div className="rounded-xl border-2 border-black bg-white shadow-neo-sm overflow-hidden mb-3">
            <div className="flex items-stretch">
              <input
                type="number"
                min={0}
                max={unstakable || undefined}
                value={unstakeQty}
                onChange={(e) => setUnstakeQty(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                className="flex-1 bg-transparent px-3 py-2.5 font-display font-black text-lg text-black text-center focus:outline-none"
                aria-label={`Unstake quantity for ${handle}`}
              />
              <div className="px-3 flex items-center border-l-2 border-black bg-surface-container-lowest font-mono text-[11px] uppercase font-black text-on-surface-variant">
                NFT
              </div>
            </div>
          </div>
          <div className="mb-3 rounded-xl border-2 border-black bg-surface-container-lowest px-3 py-2 flex items-center gap-2 font-mono text-[10px] font-bold text-black/60">
            <Timer className="w-3.5 h-3.5 text-secondary" />
            Release after {STAKING.UNSTAKE_PENDING_HOURS}h cooling
          </div>
          <button
            type="button"
            onClick={doUnstake}
            disabled={unstakable <= 0}
            className="w-full btn-hover font-display font-black uppercase text-base rounded-xl border-3 border-black shadow-neo-lg bg-white text-black py-3 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            <LockOpen className="w-4 h-4" /> Unstake {unstakeQty || ''} {unstakeHint}
          </button>
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 px-5 md:px-6 py-3 border-t-2 border-black bg-surface-container-lowest">
        <span className="font-mono text-[11px] font-bold text-on-surface-variant">
          Weight: {activeStaked} × {dividendSharePerNft}
        </span>
        <Link
          to={`/kols/${handle}`}
          className="inline-flex items-center gap-1 font-mono text-[11px] uppercase font-black text-primary hover:text-black underline decoration-dotted underline-offset-4"
        >
          View profile <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </footer>
    </div>
  );
}

export default function Staking() {
  const holdings = useKolHoldingsStore((s) => s.holdings);

  const rows = knownKolHandles.map((h) => kolProfiles[h]);

  const { totalStaked, totalPending } = useMemo(() => {
    let stakedSum = 0;
    let pendingSum = 0;
    for (const h of knownKolHandles) {
      const p = kolProfiles[h];
      const eff = holdings[h];
      if (eff) {
        stakedSum +=
          selectActiveStakedQty(eff) + selectPendingStakedQty(eff) + selectUnlockingStakedQty(eff);
        pendingSum += eff.dividendsPendingMon;
      } else {
        stakedSum += p.market.stakedNfts;
        pendingSum += p.market.dividendsPendingMon;
      }
    }
    return { totalStaked: stakedSum, totalPending: pendingSum };
  }, [holdings]);

  return (
    <main className="flex-grow pb-20 pt-6">
      <div className="w-full px-container-padding max-w-7xl mx-auto space-y-8">
        {/* Page header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-primary text-on-primary px-4 py-1.5 font-mono text-[11px] uppercase font-black shadow-neo-md mb-3">
              <Lock className="w-3.5 h-3.5" /> Staking
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-black text-black tracking-tight leading-none">
              Stake NFTs · <span className="text-primary">Earn weekly</span>
            </h1>
            <p className="mt-3 font-body text-base md:text-lg text-on-surface-variant font-bold max-w-2xl leading-relaxed">
              Lock your KOL NFTs to lock in dividend weight. KOL auction income flows into each
              dividend pool and is split to every holder every Sunday.
            </p>
          </div>

          {/* Mini portfolio summary */}
          <div className="flex items-stretch gap-3">
            <div className="rounded-2xl border-2 border-black bg-secondary/15 px-5 py-3 shadow-neo-md text-center min-w-[9rem]">
              <div className="font-display font-black text-2xl text-black">{totalStaked}</div>
              <div className="font-mono text-[10px] uppercase font-black text-on-surface-variant">
                Staked NFT
              </div>
            </div>
            <div className="rounded-2xl border-2 border-black bg-primary/15 px-5 py-3 shadow-neo-md text-center min-w-[9rem]">
              <div className="font-display font-black text-2xl text-primary tabular-nums">
                {formatTokenAmount(totalPending)}
              </div>
              <div className="font-mono text-[10px] uppercase font-black text-on-surface-variant">
                Pending rewards
              </div>
            </div>
          </div>
        </header>

        {/* 权益说明 */}
        <StakeGuides />

        {/* 所有用户可质押的 NFT */}
        <section>
          <header className="flex items-center justify-between mb-4 gap-4">
            <h2 className="font-display text-2xl md:text-3xl font-black text-black">
              Your stakable NFTs
            </h2>
            <span className="font-mono text-sm font-black bg-black text-white px-3 py-1.5 rounded-full shadow-neo-md">
              {rows.length} KOLs
            </span>
          </header>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {rows.map((p) => (
              <StakingKolCard key={p.handle} profile={p} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}