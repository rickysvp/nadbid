import { create } from 'zustand';
import type { StakeLockDays } from '@/types';
import { STAKING } from '@/constants/app';

/**
 * Demo 持仓状态（按 KOL handle 维度）。
 *
 * 状态机不变量（SPEC §5）：
 *  - userNftBalance = FREE_HOLD + Σ(positions.qty)；burn 只能消耗 FREE_HOLD。
 *  - stake → PENDING（STAKING.PENDING_HOURS 后激活）→ ACTIVE（受 lockDays 约束）。
 *  - unstake 仅允许 ACTIVE 且已过锁定期（或 legacy 无锁仓位）的 NFT，
 *    进入 UNLOCKING 冷却（STAKING.UNSTAKE_PENDING_HOURS），到期自动释放回 FREE_HOLD。
 *  - 所有时间推进统一走 tick()（AppProviders 每秒调用），时钟可用 advanceClock 偏移（仅 dev）。
 */

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** 单笔质押仓位状态：激活排队 → 生效计权 → 解押冷却。 */
export type StakePositionState = 'PENDING' | 'ACTIVE' | 'UNLOCKING';

export interface StakePosition {
  id: string;
  /** 本仓位包含的 NFT 数量。 */
  qty: number;
  /** 锁定档位天数；null = 存量种子仓位（无锁，随时可解押）。 */
  lockDays: StakeLockDays | null;
  /** 发起质押的时刻（UTC ms）。 */
  stakedAtUtcMs: number;
  /** PENDING → ACTIVE 的激活时刻；legacy 为 null（视为已激活）。 */
  activatesAtUtcMs: number | null;
  /** ACTIVE 状态下锁定期截止时刻；null = 无锁定。 */
  lockEndsAtUtcMs: number | null;
  state: StakePositionState;
  /** UNLOCKING → 释放回 FREE_HOLD 的时刻。 */
  releaseAtUtcMs: number | null;
}

/** 用户对单个 KOL 的动态持仓。 */
export interface KolHolding {
  userNftBalance: number;
  positions: StakePosition[];
  dividendsClaimedMon: number;
  dividendsPendingMon: number;
}

/** 以 profile.market 为基线的 seed 入参（旧模型字段，内部转换为仓位）。 */
export interface KolHoldingSeed {
  userNftBalance: number;
  stakedNfts: number;
  dividendsClaimedMon: number;
  dividendsPendingMon: number;
}

interface CurveDelta {
  supplyDelta: number;
  treasuryDeltaMon: number;
}

interface KolHoldingsState {
  /** DEV 时钟偏移（advanceClock 累加）。 */
  clockOffsetMs: number;
  /** 全局统一时钟（每秒 tick 刷新，倒计时/状态推进共用同一时间源）。 */
  nowUtcMs: number;
  holdings: Record<string, KolHolding>;
  /** 用户 mint/burn 引起的曲线供应量偏移（effectiveSupply = base + supplyDelta）。 */
  curveDeltas: Record<string, CurveDelta>;
  seed: (handle: string, seedData: KolHoldingSeed) => void;
  mint: (handle: string, qty: number, treasuryFeeMon?: number) => void;
  /** 只允许烧 FREE_HOLD；不足时返回 false 且不产生任何变更。 */
  burn: (handle: string, qty: number, treasuryFeeMon?: number) => boolean;
  /** 创建 PENDING 仓位；FREE_HOLD 不足返回 false。 */
  stake: (handle: string, qty: number, lockDays: StakeLockDays) => boolean;
  /** ACTIVE 且已过锁定期的仓位进入 UNLOCKING；可解押数量不足返回 false。 */
  unstake: (handle: string, qty: number) => boolean;
  /** 推进状态机：PENDING→ACTIVE、UNLOCKING→释放。每秒由全局 ticker 调用。 */
  tick: () => void;
  /** DEV ONLY：整体前移虚拟时钟并立即结算到期的状态迁移。 */
  advanceClock: (ms: number) => void;
}

const EMPTY: KolHolding = {
  userNftBalance: 0,
  positions: [],
  dividendsClaimedMon: 0,
  dividendsPendingMon: 0,
};

let positionSeq = 0;
const nextPositionId = () => `pos-${Date.now().toString(36)}-${(positionSeq++).toString(36)}`;

/** 把存量质押数量转成无锁 ACTIVE 仓位（mock 基线兼容）。 */
function makeLegacyPosition(qty: number, now: number): StakePosition {
  return {
    id: nextPositionId(),
    qty,
    lockDays: null,
    stakedAtUtcMs: now,
    activatesAtUtcMs: null,
    lockEndsAtUtcMs: null,
    state: 'ACTIVE',
    releaseAtUtcMs: null,
  };
}

/** 兼容旧模型：profile.market（含 stakedNfts 字段）也能当 fallback 使用。 */
export function toKolHolding(baseline: KolHoldingSeed | KolHolding): KolHolding {
  if ('positions' in baseline) return baseline;
  return {
    userNftBalance: baseline.userNftBalance,
    positions:
      baseline.stakedNfts > 0
        ? [makeLegacyPosition(baseline.stakedNfts, Date.now())]
        : [],
    dividendsClaimedMon: baseline.dividendsClaimedMon,
    dividendsPendingMon: baseline.dividendsPendingMon,
  };
}

/* ---------------- 派生选择器（纯函数，供 UI 与校验共用） ---------------- */

export function selectActiveStakedQty(h: KolHolding): number {
  return h.positions.reduce((n, p) => (p.state === 'ACTIVE' ? n + p.qty : n), 0);
}

export function selectPendingStakedQty(h: KolHolding): number {
  return h.positions.reduce((n, p) => (p.state === 'PENDING' ? n + p.qty : n), 0);
}

export function selectUnlockingStakedQty(h: KolHolding): number {
  return h.positions.reduce((n, p) => (p.state === 'UNLOCKING' ? n + p.qty : n), 0);
}

/** FREE_HOLD = 总持有 − 所有占用中（pending+active+unlocking）的仓位。 */
export function selectFreeQty(h: KolHolding): number {
  const occupied = h.positions.reduce((n, p) => n + p.qty, 0);
  return Math.max(0, h.userNftBalance - occupied);
}

/** 当前时刻可发起解押的 ACTIVE 数量（已过锁定期或 legacy 无锁）。 */
export function selectUnstakableQty(h: KolHolding, now: number): number {
  return h.positions.reduce(
    (n, p) =>
      p.state === 'ACTIVE' &&
      (p.lockDays === null || p.lockEndsAtUtcMs === null || now >= p.lockEndsAtUtcMs)
        ? n + p.qty
        : n,
    0,
  );
}

/** 最近一个待激活时刻（PENDING 中最早），无则 null。 */
export function selectNextActivationAt(h: KolHolding): number | null {
  let min: number | null = null;
  for (const p of h.positions) {
    if (p.state === 'PENDING' && p.activatesAtUtcMs !== null) {
      min = min === null ? p.activatesAtUtcMs : Math.min(min, p.activatesAtUtcMs);
    }
  }
  return min;
}

/** 最近一个释放完成时刻（UNLOCKING 中最早），无则 null。 */
export function selectNextReleaseAt(h: KolHolding): number | null {
  let min: number | null = null;
  for (const p of h.positions) {
    if (p.state === 'UNLOCKING' && p.releaseAtUtcMs !== null) {
      min = min === null ? p.releaseAtUtcMs : Math.min(min, p.releaseAtUtcMs);
    }
  }
  return min;
}

/* ---------------- 内部：按当前时间推进仓位集合 ---------------- */

function advancePositions(
  positions: StakePosition[],
  now: number,
): { positions: StakePosition[]; releasedQty: number; mutated: boolean } {
  let releasedQty = 0;
  let mutated = false;
  const next: StakePosition[] = [];
  for (const p of positions) {
    let cur = p;
    if (
      cur.state === 'PENDING' &&
      cur.activatesAtUtcMs !== null &&
      now >= cur.activatesAtUtcMs
    ) {
      cur = { ...cur, state: 'ACTIVE' };
      mutated = true;
    }
    if (
      cur.state === 'UNLOCKING' &&
      cur.releaseAtUtcMs !== null &&
      now >= cur.releaseAtUtcMs
    ) {
      releasedQty += cur.qty;
      mutated = true;
      continue;
    }
    next.push(cur);
  }
  return { positions: next, releasedQty, mutated };
}

/** 从一组可解押仓位中划出 qty（FIFO，支持部分拆分），返回新集合与拆出的部分。 */
function takeUnstakable(
  positions: StakePosition[],
  qty: number,
  now: number,
): { remaining: StakePosition[]; unlocking: StakePosition[] } | null {
  const eligibleIdx: number[] = [];
  positions.forEach((p, i) => {
    if (
      p.state === 'ACTIVE' &&
      (p.lockDays === null || p.lockEndsAtUtcMs === null || now >= p.lockEndsAtUtcMs)
    ) {
      eligibleIdx.push(i);
    }
  });
  const available = eligibleIdx.reduce((n, i) => n + positions[i].qty, 0);
  if (qty <= 0 || qty > available) return null;

  let need = qty;
  const remaining = [...positions];
  const unlocking: StakePosition[] = [];
  const cooldownMs = STAKING.UNSTAKE_PENDING_HOURS * HOUR_MS;
  for (const i of eligibleIdx) {
    if (need <= 0) break;
    const p = remaining[i];
    const take = Math.min(p.qty, need);
    need -= take;
    unlocking.push({
      ...p,
      id: nextPositionId(),
      qty: take,
      state: 'UNLOCKING',
      releaseAtUtcMs: now + cooldownMs,
    });
    remaining[i] = take >= p.qty ? { ...p, qty: 0 } : { ...p, qty: p.qty - take };
  }
  return { remaining: remaining.filter((p) => p.qty > 0), unlocking };
}

export const useKolHoldingsStore = create<KolHoldingsState>((set, get) => ({
  clockOffsetMs: 0,
  nowUtcMs: Date.now(),
  holdings: {},
  curveDeltas: {},

  seed: (handle, seedData) => {
    if (get().holdings[handle]) return;
    const now = Date.now() + get().clockOffsetMs;
    const legacy =
      seedData.stakedNfts > 0 ? [makeLegacyPosition(seedData.stakedNfts, now)] : [];
    set((s) => ({
      holdings: {
        ...s.holdings,
        [handle]: {
          userNftBalance: seedData.userNftBalance,
          positions: legacy,
          dividendsClaimedMon: seedData.dividendsClaimedMon,
          dividendsPendingMon: seedData.dividendsPendingMon,
        },
      },
    }));
  },

  mint: (handle, qty, treasuryFeeMon = 0) =>
    set((s) => {
      const cur = s.holdings[handle] ?? EMPTY;
      const delta = s.curveDeltas[handle] ?? { supplyDelta: 0, treasuryDeltaMon: 0 };
      return {
        holdings: {
          ...s.holdings,
          [handle]: { ...cur, userNftBalance: cur.userNftBalance + qty },
        },
        curveDeltas: {
          ...s.curveDeltas,
          [handle]: {
            supplyDelta: delta.supplyDelta + qty,
            treasuryDeltaMon: delta.treasuryDeltaMon + treasuryFeeMon,
          },
        },
      };
    }),

  burn: (handle, qty, treasuryFeeMon = 0) => {
    const cur = get().holdings[handle];
    if (!cur || qty <= 0 || qty > selectFreeQty(cur)) return false;
    set((s) => {
      const holding = s.holdings[handle] ?? EMPTY;
      const delta = s.curveDeltas[handle] ?? { supplyDelta: 0, treasuryDeltaMon: 0 };
      return {
        holdings: {
          ...s.holdings,
          [handle]: { ...holding, userNftBalance: Math.max(0, holding.userNftBalance - qty) },
        },
        curveDeltas: {
          ...s.curveDeltas,
          [handle]: {
            supplyDelta: delta.supplyDelta - qty,
            treasuryDeltaMon: delta.treasuryDeltaMon + treasuryFeeMon,
          },
        },
      };
    });
    return true;
  },

  stake: (handle, qty, lockDays) => {
    const s = get();
    const cur = s.holdings[handle];
    if (!cur || qty <= 0 || qty > selectFreeQty(cur)) return false;
    const now = Date.now() + s.clockOffsetMs;
    const activatesAt = now + STAKING.PENDING_HOURS * HOUR_MS;
    const position: StakePosition = {
      id: nextPositionId(),
      qty,
      lockDays,
      stakedAtUtcMs: now,
      activatesAtUtcMs: activatesAt,
      lockEndsAtUtcMs: activatesAt + lockDays * DAY_MS,
      state: 'PENDING',
      releaseAtUtcMs: null,
    };
    set((st) => ({
      holdings: {
        ...st.holdings,
        [handle]: {
          ...(st.holdings[handle] ?? EMPTY),
          positions: [...(st.holdings[handle]?.positions ?? []), position],
        },
      },
    }));
    return true;
  },

  unstake: (handle, qty) => {
    const s = get();
    const cur = s.holdings[handle];
    if (!cur) return false;
    const now = Date.now() + s.clockOffsetMs;
    const taken = takeUnstakable(cur.positions, qty, now);
    if (!taken) return false;
    set((st) => ({
      holdings: {
        ...st.holdings,
        [handle]: {
          ...(st.holdings[handle] ?? EMPTY),
          positions: [...taken.remaining, ...taken.unlocking],
        },
      },
    }));
    return true;
  },

  tick: () => {
    const s = get();
    const now = Date.now() + s.clockOffsetMs;
    let changed = false;
    const patch: Record<string, KolHolding> = {};
    for (const [handle, holding] of Object.entries(s.holdings)) {
      const advanced = advancePositions(holding.positions, now);
      if (advanced.mutated) {
        changed = true;
        patch[handle] = { ...holding, positions: advanced.positions };
      }
    }
    set(changed ? { nowUtcMs: now, holdings: { ...s.holdings, ...patch } } : { nowUtcMs: now });
  },

  advanceClock: (ms) => {
    set((s) => ({ clockOffsetMs: s.clockOffsetMs + ms }));
    get().tick();
  },
}));

/**
 * 读取某 KOL 的动态持仓；未 seed 时把传入的基线（profile.market 或 KolHolding）规范化后兜底。
 */
export function useKolHolding(handle: string, fallback: KolHoldingSeed | KolHolding): KolHolding {
  const stored = useKolHoldingsStore((s) => s.holdings[handle]);
  return stored ?? toKolHolding(fallback);
}
