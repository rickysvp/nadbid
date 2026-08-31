import { create } from 'zustand';
import type { WalletState } from '../types';

interface WalletStore extends WalletState {
  /** 连接钱包（模拟，后续替换为真实 Web3 连接） */
  connect: () => Promise<void>;
  /** 断开钱包 */
  disconnect: () => void;
  /** 更新余额 */
  setBalance: (balance: number) => void;
  /** 切换链 */
  setChain: (chainId: number) => void;
}

// 模拟钱包地址（开发阶段使用，正式开发从 Web3 钱包读取）
const MOCK_ADDRESS = '0x4F8a7B9c2D1e3F4a5B6c7D8e9F0a1B2c3D4e3aB9';
const MOCK_BALANCE = 12450.75;

export const useWalletStore = create<WalletStore>((set) => ({
  isConnected: false,
  address: null,
  balanceMon: 0,
  chainId: null,

  connect: async () => {
    // TODO: 正式开发时替换为真实 Web3 钱包连接（Monad）
    // 例如：window.ethereum.request({ method: 'eth_requestAccounts' })
    await new Promise((resolve) => setTimeout(resolve, 500));

    set({
      isConnected: true,
      address: MOCK_ADDRESS,
      balanceMon: MOCK_BALANCE,
      chainId: 10143, // Monad 测试网 chainId（待确认）
    });
  },

  disconnect: () => {
    set({
      isConnected: false,
      address: null,
      balanceMon: 0,
      chainId: null,
    });
  },

  setBalance: (balance) => set({ balanceMon: balance }),

  setChain: (chainId) => set({ chainId }),
}));
