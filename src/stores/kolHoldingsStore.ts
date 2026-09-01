import { create } from 'zustand';

/**
 * PASS 持仓状态 — 按 KOL handle 维度记录用户当前持有的 PASS 数量。
 *
 * 被多个组件（KolProfilePage / MintBurnPanel）共享，保证「当前持仓」跨页面一致：
 *  - Mint 成功后调用 addHolding 增加持仓；
 *  - Burn 成功后调用 removeHolding 减少持仓（持仓不足时返回 false 且不产生变更）。
 *  - 余额 / 曲线供应量与价格不在此维护（余额在 walletStore，曲线在页面统一状态）。
 */

/** 初始 demo 持仓 seed：为演示 KOL 预置部分 PASS，便于直接验证 Burn 流程 */
const INITIAL_HOLDINGS: Record<string, number> = {
  '0xchine': 25,
  'cryptoqueen': 12,
  'alphaseek': 8,
};

/** 归一化 KOL handle：去除 @ 前缀并转小写，作为 store key（与路由 /kols/:handle 一致） */
export function normalizeHandle(handle: string): string {
  return handle.replace(/^@/, '').toLowerCase();
}

interface KolHoldingsState {
  /** handle（无 @）→ 用户持有的 PASS 数量 */
  holdings: Record<string, number>;
  /** Mint 成功后增加持仓（qty > 0） */
  addHolding: (handle: string, qty: number) => void;
  /** Burn 成功后减少持仓；数量非法或持仓不足时返回 false 且不产生任何变更 */
  removeHolding: (handle: string, qty: number) => boolean;
}

export const useKolHoldingsStore = create<KolHoldingsState>((set, get) => ({
  holdings: { ...INITIAL_HOLDINGS },

  addHolding: (handle, qty) => {
    if (qty <= 0) return;
    const key = normalizeHandle(handle);
    set((s) => ({
      holdings: { ...s.holdings, [key]: (s.holdings[key] ?? 0) + qty },
    }));
  },

  removeHolding: (handle, qty) => {
    if (qty <= 0) return false;
    const key = normalizeHandle(handle);
    const current = get().holdings[key] ?? 0;
    if (qty > current) return false;
    set((s) => ({
      holdings: { ...s.holdings, [key]: current - qty },
    }));
    return true;
  },
}));

/** 读取某 KOL 下用户当前 PASS 持仓（未持有返回 0） */
export function useKolHolding(handle: string): number {
  const key = normalizeHandle(handle);
  return useKolHoldingsStore((s) => s.holdings[key] ?? 0);
}
