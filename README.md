<div align="center">
<img width="1200" height="475" alt="NADBID Banner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# NADBID — Decentralized Influencer Auctions

The premier marketplace for KOL access passes and influencer-led auctions on Monad. Bid, stake, and earn network yield.

> **Wallet Integration**: Full Web3 wallet support via wagmi v2. See [Wallet Integration Guide](docs/wallet-integration.md) for architecture, hooks, and usage.

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Fill in `VITE_WALLETCONNECT_PROJECT_ID` (required for WalletConnect) and contract addresses after deployment.
3. Run the app:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript 5 |
| Build | Vite 6 |
| Web3 | [wagmi v2](https://wagmi.sh) + [viem](https://viem.sh) |
| Data Fetching | @tanstack/react-query v5 |
| State Management | Zustand v5 |
| Routing | react-router-dom v7 |
| Styling | Tailwind CSS 4 |
| Animation | motion (framer-motion) |
| Icons | lucide-react |
| Chains | Monad Testnet (10143), Sepolia (11155111) |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_WALLETCONNECT_PROJECT_ID` | Yes | WalletConnect Cloud project ID |
| `VITE_CONTRACT_PASS` | After deploy | PASS NFT contract address |
| `VITE_CONTRACT_AUCTION` | After deploy | Auction contract address |
| `VITE_CONTRACT_STAKING` | After deploy | Staking contract address |
| `VITE_CONTRACT_DIVIDEND` | After deploy | Dividend contract address |
| `VITE_MONAD_RPC_URL` | Optional | Monad Testnet RPC override |
| `GEMINI_API_KEY` | Optional | Gemini AI API key |

See [.env.example](.env.example) for the full template.

## Project Structure

```
src/
├── web3/                    # Web3 core (wagmi config, providers, hooks, contracts)
│   ├── config.ts            # wagmi config, chains, connectors
│   ├── WagmiProvider.tsx    # Provider composition + auto-reconnect
│   ├── WalletStateSyncer.tsx # wagmi → Zustand state mirror
│   ├── contracts.ts         # Contract addresses + ABI fragments
│   ├── web3Errors.ts        # Error classification + toast helper
│   └── hooks/               # Transaction hooks (write/sign/read)
├── components/wallet/       # Wallet UI components
│   ├── ConnectModal.tsx     # Wallet connection modal
│   ├── ConnectButton.tsx    # Navbar button + dropdown
│   ├── NetworkSwitcher.tsx  # Chain switcher
│   ├── AccountCard.tsx      # Wallet account header
│   ├── WrongNetworkBanner.tsx # Network warning banner
│   └── WalletGuard.tsx      # Route-level connection guard
├── stores/walletStore.ts    # Zustand wallet store
├── app/                     # App layout, Navbar, Footer
├── pages/                   # Route pages
└── hooks/useToast.ts        # Global toast notifications
```

## Wallet Features

- **MetaMask + WalletConnect** support (dynamically rendered connectors)
- **Auto-reconnect** on page refresh (via `@wagmi/core reconnect`)
- **Network switching** with Monad Testnet enforcement
- **Wrong network detection** with inline switch prompts
- **Transaction hooks** with status machines and auto-toasts (`useWriteContractTx`, `useSignMessage`)
- **Unified error handling** (user rejection silent, contract reverts detailed)
- **Mock wallet mode** for development without a browser extension

## Documentation

- [Wallet Integration Guide](docs/wallet-integration.md) — Full architecture, hooks API, component reference, FAQ
- [Web3 Wallet Integration Plan](docs/web3-wallet-integration-plan.md) — Original development plan (TASK 2–7)

## License

© 2024 nadbid.fun. All rights reserved.
