import { create } from 'zustand';

interface UserWalletState {
  status: 'connected' | 'connecting' | 'disconnected';
  /** Address of the active wallet, e.g. "0x1234...abcd". */
  address: string | null;
  /** User's $MON token balance that backs BUY transactions on the page. */
  balanceMon: number;
  /** Trigger the wallet connection flow (demo-mode friendly). */
  connect: () => Promise<void>;
  /** Clear wallet state. */
  disconnect: () => void;
}

/**
 * Demo seed — a comfortable balance so the user can freely test Mint /
 * Burn / Stake on any KOL profile page without a "deposit" detour. Backed
 * by $MON so it looks like real money in the UI, but resets on refresh
 * (local only).
 */
const DEMO_SEED_BALANCE = 1_000_000;

export const useUserWalletStore = create<UserWalletState>((set) => ({
  status: 'connected',
  address: '0xYou0000…Demo',
  balanceMon: DEMO_SEED_BALANCE,

  connect: async () => {
    set({ status: 'connecting' });
    // Simulated network roundtrip for a wallet-connect UX.
    await new Promise((r) => setTimeout(r, 650));
    set({
      status: 'connected',
      address: '0xYou0000…Demo',
      balanceMon: DEMO_SEED_BALANCE,
    });
  },

  disconnect: () => {
    set({
      status: 'disconnected',
      address: null,
      balanceMon: 0,
    });
  },
}));
