# NADBID Wallet Integration Guide

## Overview

NADBID integrates Web3 wallet connectivity using **wagmi v2** + **viem** + **@tanstack/react-query**, with a Zustand global store for wallet state mirroring. This document covers the architecture, configuration, components, hooks, and common operations.

---

## Supported Wallets

| Wallet | Connector Type | Notes |
|--------|---------------|-------|
| MetaMask | `injected({ target: 'metaMask' })` | Browser extension |
| WalletConnect | `walletConnect({ projectId, showQrModal: true })` | Mobile + desktop via QR code |

Wallet options are rendered dynamically from `useConnect().connectors` — no hardcoded wallet list.

---

## Supported Chains

| Chain | Chain ID | Role | Native Currency |
|-------|----------|------|-----------------|
| Monad Testnet | `10143` | Primary | MON (18 decimals) |
| Sepolia | `11155111` | Fallback / testing | ETH (18 decimals) |

Chain configuration lives in `src/web3/config.ts`. The app requires Monad Testnet for all operations; a `WrongNetworkBanner` and `NetworkSwitcher` guide users to switch.

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# WalletConnect Project ID (https://cloud.walletconnect.com)
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Smart contract addresses (deploy后填入)
VITE_CONTRACT_PASS=0x...
VITE_CONTRACT_AUCTION=0x...
VITE_CONTRACT_STAKING=0x...
VITE_CONTRACT_DIVIDEND=0x...

# Optional: override Monad Testnet RPC
VITE_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
```

Contract addresses are read at runtime via `import.meta.env.VITE_CONTRACT_*`. When unset, `getContractConfig()` returns `undefined` and calling code should display "Contract not deployed" state.

---

## Architecture

### Provider Nesting Order

```
WagmiProvider (src/web3/WagmiProvider.tsx)
├── WagmiConfigProvider (wagmi)
│   └── QueryClientProvider (@tanstack/react-query)
│       ├── ReconnectController (auto-reconnect on mount)
│       ├── WalletStateSyncer (mirrors wagmi state → Zustand)
│       └── BrowserRouter → AppLayout → Pages
```

**Key constraint**: `QueryClientProvider` must be inside `WagmiConfigProvider` because wagmi hooks internally use React Query.

### State Flow

```
wagmi hooks (useAccount / useBalance / useChainId)
        ↓ (WalletStateSyncer, useEffect)
Zustand walletStore (src/stores/walletStore.ts)
        ↓ (useWalletStore selector)
UI Components (ConnectButton, AccountCard, WalletPage, etc.)
```

`WalletStateSyncer` is a renderless component that subscribes to wagmi hooks and writes to the store via internal `_setWagmiState()` / `_resetFromWagmi()` methods. Components never call these internal methods directly.

### Mock Fallback

When no real wallet is connected, `walletStore.connect()` provides mock data (address, balance, chainId) for development/demo. The syncer only overrides mock state when a real wagmi connection is detected (tracked via `wasWagmiConnected` ref).

---

## Wallet Connection Flow

1. User clicks **Connect Wallet** button (Navbar or WalletGuard)
2. `ConnectModal` opens, rendering available connectors from `useConnect().connectors`
3. User selects a wallet → `connect({ connector })` triggers wallet popup
4. On success: `useAccount` status → `connected`, `WalletStateSyncer` writes address/chainId/balance to store
5. UI re-renders: ConnectButton shows address + balance, WalletPage shows `AccountCard`
6. On failure: error banner in modal + toast notification (user rejection is silent)

### Auto-Reconnect

`ReconnectController` (inside `WagmiProvider`) calls `reconnect(wagmiConfig)` from `@wagmi/core` once on mount (`useEffect` with empty deps). This restores sessions from previously authorized connectors (MetaMask, WalletConnect).

- Success: `useAccount` status transitions `reconnecting → connected`, syncer mirrors state
- Failure (no authorized connector / wallet not installed): silently caught, app stays disconnected
- No infinite loops: `reconnect` runs exactly once per mount

---

## Network Switching

### Components

- **`NetworkSwitcher`** (`src/components/wallet/NetworkSwitcher.tsx`): Two modes
  - `compact`: Current network name + warning icon (wrong network) + "Switch to Monad Testnet" button
  - `full`: Chain list with PRIMARY/ACTIVE badges, click to switch
- **`WrongNetworkBanner`** (`src/components/wallet/WrongNetworkBanner.tsx`): Red banner with AlertTriangle icon + "Switch to Monad" button + dismissible X
- **`ConnectButton`**: Shows red border + `!` badge on avatar when on wrong network; dropdown includes compact NetworkSwitcher

### Implementation

Uses wagmi `useSwitchChain()` → `switchChain({ chainId }, { onSuccess, onError })`. Chain info (name, RPC, explorer) is read from wagmi config `supportedChains`, not hardcoded. If MetaMask doesn't have Monad Testnet, the wallet prompts to add the chain automatically.

---

## Error Handling

### Error Classification (`src/web3/web3Errors.ts`)

| Type | Trigger | Toast Behavior |
|------|---------|----------------|
| `user_rejected` | Error code 4001 / "User rejected" | Silent (no toast) |
| `network_error` | Chain not added / RPC failure / network changed | Warning toast |
| `contract_error` | Transaction reverted (with reason if available) | Error toast |
| `insufficient_gas` | "Insufficient funds" / "Out of gas" | Error toast |
| `unknown` | Anything else | Error toast with raw message |

### Usage

```ts
import { handleWeb3Error } from '../web3/web3Errors';
import { useToast } from '../hooks/useToast';

const toast = useToast();
try {
  await writeContractAsync({ ... });
} catch (err) {
  handleWeb3Error(err, toast); // classifies + toasts + logs in dev
}
```

---

## Transaction Hooks

### `useWriteContractTx`

Encapsulates `useWriteContract` + `useWaitForTransactionReceipt` with a full status machine and auto-toasts.

**Status machine**: `idle → preparing → pending → confirming → success | error`

```ts
import { useWriteContractTx } from '../web3/hooks';

const { write, status, txHash, isLoading, isSuccess, reset } = useWriteContractTx();

await write({
  address: contractAddresses.pass!,
  abi: passAbi,
  functionName: 'mint',
  args: [kolId, quantity],
  value: priceInWei,
  onSuccess: (hash, receipt) => {
    // Refresh balance, invalidate queries, etc.
    queryClient.invalidateQueries({ queryKey: ['balance'] });
  },
  submittedMessage: 'Mint transaction submitted',
  successMessage: 'Mint confirmed',
});
```

**Returns**: `write`, `status`, `txHash`, `error`, `isLoading`, `isSuccess`, `reset`

### `useSignMessage`

```ts
import { useSignMessage } from '../web3/hooks';

const { signMessage, signature, status, isLoading } = useSignMessage();

const sig = await signMessage({
  message: 'Sign in to NADBID',
  onSuccess: (sig) => console.log('Signed:', sig),
});
```

### `useReadContract`

Thin wrapper around wagmi's `useReadContract` with classified errors and auto-disable when address is undefined. Caching uses the global QueryClient config (`staleTime: 30_000`, `retry: 1`).

```ts
const { data, isLoading, classifiedError } = useReadContract({
  address: contractAddresses.pass,
  abi: passAbi,
  functionName: 'balanceOf',
  args: [address],
});
```

---

## Component Reference

### `ConnectModal`
- **Props**: `open: boolean`, `onClose: () => void`
- Controlled modal; renders connectors dynamically; loading/error states; ESC / overlay / X to close; fade + scale animation (motion/react)

### `ConnectButton`
- **Props**: `variant?: 'dark' | 'light'`
- Disconnected: "Connect Wallet" button → opens ConnectModal
- Connected: avatar + shortened address + MON balance; dropdown with copy address / view on explorer / disconnect / NetworkSwitcher (compact)
- Wrong network: red border + `!` badge

### `NetworkSwitcher`
- **Props**: `mode: 'compact' | 'full'`, `theme?: 'dark' | 'light'`
- Compact: used in ConnectButton dropdown / WrongNetworkBanner
- Full: used in AccountCard / WalletPage

### `AccountCard`
- Wallet header card: avatar, address, connector name, copy/explorer/disconnect buttons, MON balance display, full NetworkSwitcher

### `WrongNetworkBanner`
- **Props**: `className?: string`
- Shows when `isConnected && chainId !== 10143`; dismissible via local state

### `WalletGuard`
- **Props**: `children`, `title?`, `description?`
- Disconnected: renders connection guidance UI (icon + text + ConnectButton)
- Connected + wrong network: renders WrongNetworkBanner + children
- Connected + correct network: renders children directly

### `WalletStateSyncer`
- Renderless; mirrors wagmi `useAccount`/`useBalance`/`useChainId` to Zustand
- Must be rendered inside `WagmiProvider`

---

## Store Design (`src/stores/walletStore.ts`)

### State Fields

| Field | Type | Description |
|-------|------|-------------|
| `isConnected` | `boolean` | Real wallet or mock connected |
| `address` | `` `0x${string}` \| null`` | Wallet address |
| `balanceMon` | `number` | Native token balance (formatted) |
| `chainId` | `number \| null` | Current chain ID |
| `status` | `WalletStatus` | `idle / connecting / reconnecting / connected / disconnected` |
| `isConnecting` | `boolean` | True during connecting/reconnecting |
| `connectorId` | `string \| null` | Connector UID ('injected', 'walletConnect', 'mock') |
| `connectorName` | `string \| null` | Display name |
| `balanceRaw` | `bigint \| null` | Raw wei balance |

### Actions

| Action | Description |
|--------|-------------|
| `connect()` | Mock connect (dev/demo); sets mock address/balance/chain |
| `disconnect()` | Resets all fields to disconnected state |
| `setBalance(balance)` | Update balance (legacy compat) |
| `setChain(chainId)` | Update chain (legacy compat) |
| `_setWagmiState(patch)` | **Internal** — syncer writes wagmi state |
| `_setReconnecting()` | **Internal** — sets status to reconnecting |
| `_resetFromWagmi()` | **Internal** — full reset on wagmi disconnect |

> Components should only use `connect()`, `disconnect()`, and state selectors. Internal methods (`_`-prefixed) are for `WalletStateSyncer` only.

---

## Contract Configuration (`src/web3/contracts.ts`)

Contract addresses are environment-driven. ABIs are currently **minimal fragments** (balanceOf, mint, burn, placeBid, settleAuction, stake, unstake, claim, etc.) typed as viem `Abi`. After deployment, replace with full ABIs from contract artifacts.

```ts
import { contractAddresses, passAbi, getContractConfig } from '../web3/contracts';

const cfg = getContractConfig('pass');
if (!cfg) return <p>Contract not deployed</p>;
// cfg.address, cfg.abi
```

---

## FAQ

**Q: After refreshing the page, the wallet shows disconnected even though MetaMask is connected.**
A: Auto-reconnect only restores sessions that were previously authorized via this app. If the user connected before auto-reconnect was implemented, they may need to reconnect once. Ensure `VITE_WALLETCONNECT_PROJECT_ID` is set for WalletConnect persistence.

**Q: MetaMask says "Monad Testnet was not found" when switching networks.**
A: `useSwitchChain` automatically prompts MetaMask to add the chain (using config from `wagmiConfig.chains`). If the user rejects, the `WrongNetworkBanner` remains and they can retry.

**Q: Why is there both a wagmi state and a Zustand store?**
A: wagmi hooks require React context and can't be used outside components (e.g., in utility functions or legacy code). The Zustand store mirrors wagmi state so any module can read wallet state via `useWalletStore.getState()`.

**Q: How do I add a new wallet connector?**
A: Add it to `connectors` array in `src/web3/config.ts`. The `ConnectModal` automatically renders it from `useConnect().connectors`.

**Q: The production build has a >500kB chunk warning.**
A: Expected for Web3 apps (wagmi + viem + WalletConnect SDK are large). Consider code-splitting the ConnectModal with `React.lazy()` if needed.

---

## File Structure

```
src/web3/
├── config.ts              # wagmi config, chains, connectors
├── WagmiProvider.tsx      # Provider composition + ReconnectController
├── WalletStateSyncer.tsx  # wagmi → Zustand state mirror
├── contracts.ts           # Contract addresses + ABI fragments
├── web3Errors.ts          # Error classification + toast helper
├── index.ts               # Barrel export
└── hooks/
    ├── useWriteContractTx.ts  # Write contract + receipt + status machine
    ├── useSignMessage.ts      # Message signing wrapper
    ├── useReadContract.ts     # Read contract wrapper
    └── index.ts               # Barrel export

src/components/wallet/
├── ConnectModal.tsx       # Wallet connection modal
├── ConnectButton.tsx      # Navbar wallet button + dropdown
├── NetworkSwitcher.tsx    # Chain switcher (compact/full)
├── AccountCard.tsx        # Wallet account header card
├── WrongNetworkBanner.tsx # Wrong network warning banner
├── WalletGuard.tsx        # Route-level connection guard
└── index.ts               # Barrel export

src/stores/
└── walletStore.ts         # Zustand wallet store (wagmi-driven + mock fallback)
```
