import { create } from 'zustand';
import type { WalletState } from '../types';

/**
 * 全局钱包 Store — wagmi 驱动 + mock fallback。
 *
 * 状态来源优先级：
 *   1. 真实钱包连接时：由 WalletStateSyncer 通过 _setWagmiState 写入链上数据
 *   2. 未连接真实钱包时：connect() 提供 mock 数据（开发/演示用）
 *   3. 默认：未连接状态（isConnected=false, address=null）
 *
 * TASK 3 阶段：connect() 仍为 mock 实现，真实连接逻辑在 TASK 4 接入。
 */

/** Mock 钱包地址（开发阶段使用，正式环境由真实钱包覆盖） */
const MOCK_ADDRESS = '0x4F8a7B9c2D1e3F4a5B6c7D8e9F0a1B2c3D4e3aB9';
/** Mock 余额（MON） */
const MOCK_BALANCE = 12450.75;
/** Mock 链 ID（Monad Testnet） */
const MOCK_CHAIN_ID = 10143;

/** 当前是否 real 模式（VITE_WALLET_MODE=real），与 WalletStateSyncer 判定一致 */
function isRealWalletMode(): boolean {
  return (import.meta.env?.VITE_WALLET_MODE as string | undefined)?.toLowerCase() === 'real';
}

/** 链上余额查询函数（Phase 2 接入真实 provider 后通过 setBalanceLoader 注册） */
type BalanceLoader = () => Promise<number>;
let balanceLoader: BalanceLoader | null = null;

/**
 * 注册链上余额查询函数（仅 real 模式生效）。
 * 例：setBalanceLoader(() => provider.getBalance(address).then((b) => Number(b)));
 */
export function setBalanceLoader(loader: BalanceLoader | null): void {
  balanceLoader = loader;
}

/** 2 位小数取整，规避二进制浮点误差（如 12450.75 - 0.05） */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

interface WalletStore extends WalletState {
  /**
   * 连接钱包。
   * TASK 3: mock 占位（设置模拟地址与余额）。
   * TASK 4: 将替换为 wagmi useConnect / @wagmi/core connect。
   */
  connect: () => Promise<void>;
  /** 断开钱包，重置全部状态 */
  disconnect: () => void;
  /** 更新余额（兼容旧 API，真实余额由 WalletStateSyncer 同步） */
  setBalance: (balance: number) => void;
  /** 切换链（兼容旧 API，真实链切换由 wagmi useSwitchChain 处理） */
  setChain: (chainId: number) => void;
  /**
   * 刷新余额（交易成功后统一调用）：
   * - mock 模式：delta > 0 表示本次已花费（扣减余额，如出价 / Mint），
   *   delta < 0 表示资金流入（增加余额，如领取 / Burn 返还），delta = 0 仅刷新。
   * - real 模式（Phase 2 预留）：通过 setBalanceLoader 注册的链上查询函数
   *   获取真实余额；查询失败时退化为本地增量更新，不阻断交易流程。
   */
  refreshBalance: (delta?: number) => Promise<void>;
  /**
   * @internal 仅供 WalletStateSyncer 调用：将 wagmi 真实状态写入 store。
   * 组件不应直接调用此方法。
   */
  _setWagmiState: (patch: Partial<WalletState>) => void;
  /**
   * @internal 仅供 WalletStateSyncer / ReconnectController 调用：
   * 标记正在重连（status='reconnecting', isConnecting=true），
   * 不触碰 isConnected / address（避免重连期间 UI 闪烁）。
   */
  _setReconnecting: () => void;
  /**
   * @internal 仅供 WalletStateSyncer 调用：真实钱包断开时重置 store。
   * 与 disconnect() 的区别：仅在 syncer 检测到 wagmi 从 connected→disconnected 时触发。
   */
  _resetFromWagmi: () => void;
}

/** 初始未连接状态 */
const initialState: WalletState = {
  isConnected: false,
  address: null,
  balanceMon: 0,
  chainId: null,
  status: 'idle',
  isConnecting: false,
  connectorId: null,
  connectorName: null,
  balanceRaw: null,
};

export const useWalletStore = create<WalletStore>((set) => ({
  ...initialState,

  connect: async () => {
    // TASK 3: mock 连接。TASK 4 接入真实 wagmi connect 后移除此模拟逻辑。
    set({ status: 'connecting', isConnecting: true });
    await new Promise((resolve) => setTimeout(resolve, 500));
    set({
      isConnected: true,
      address: MOCK_ADDRESS,
      balanceMon: MOCK_BALANCE,
      chainId: MOCK_CHAIN_ID,
      status: 'connected',
      isConnecting: false,
      connectorId: 'mock',
      connectorName: 'Mock Wallet',
      balanceRaw: null,
    });
  },

  disconnect: () => {
    // 完整重置所有钱包状态字段
    set({
      isConnected: false,
      address: null,
      balanceMon: 0,
      chainId: null,
      status: 'disconnected',
      isConnecting: false,
      connectorId: null,
      connectorName: null,
      balanceRaw: null,
    });
  },

  setBalance: (balance) => set({ balanceMon: balance }),

  setChain: (chainId) => set({ chainId }),

  _setWagmiState: (patch) => set(patch),

  _setReconnecting: () =>
    set({
      status: 'reconnecting',
      isConnecting: true,
    }),

  _resetFromWagmi: () => {
    // wagmi 真实断开时的完整重置（与 disconnect 相同逻辑）
    set({
      isConnected: false,
      address: null,
      balanceMon: 0,
      chainId: null,
      status: 'disconnected',
      isConnecting: false,
      connectorId: null,
      connectorName: null,
      balanceRaw: null,
    });
  },

  refreshBalance: async (delta = 0) => {
    // real 模式：优先查询链上真实余额（已注册 loader 时）
    if (isRealWalletMode() && balanceLoader) {
      try {
        const balance = await balanceLoader();
        set({ balanceMon: Math.max(0, round2(balance)) });
        return;
      } catch {
        // 链上查询失败 → 退化为本地增量更新，不阻断交易流程
      }
    }
    // mock 模式：delta > 0 扣减（出价 / Mint 花费），delta < 0 入账（领取 / Burn 返还）
    await new Promise((resolve) => setTimeout(resolve, 400));
    set((state) => ({
      balanceMon: Math.max(0, round2(state.balanceMon - delta)),
    }));
  },
}));
