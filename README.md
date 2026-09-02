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
| `VITE_CONTRACT_REGISTRY` | After deploy | NadbidRegistry contract address (Monad testnet) |
| `VITE_CONTRACT_FACTORY` | After deploy | NadbidFactory contract address (Monad testnet) |
| `X_API_BEARER_TOKEN` | For KOL verify | X (Twitter) API v2 Bearer Token — KOL 入驻粉丝数验证；未配置时返回 mock 数据 |
| `VITE_MONAD_RPC_URL` | Optional | Monad Testnet RPC override |
| `GEMINI_API_KEY` | Optional | Gemini AI API key |

See [.env.example](.env.example) for the full template.

## Smart Contracts (SP-1)

Foundry 工程位于 `contracts/`，四合约架构部署到 **Monad 测试网**（chainId 10143）：

| 合约 | 职责 | 关键逻辑 |
|------|------|----------|
| `NadbidRegistry` | KOL 入驻注册表 | 连接钱包 + 绑定推特（粉丝 ≥ 1 万）→ 注册；**10 MON 担保**质押解锁创建资格，48h 赎回窗口 |
| `NadbidFactory` | 合约工厂 | KOL 自建 `KolPass`（填铸造价）与 `KolAuction`（填固定出价 + 拍卖内容） |
| `KolPass` | 债券曲线 ERC721 | `price = basePrice × (supply/1000)²`；8% 手续费即时拆分（5% KOL + 3% 平台） |
| `KolAuction` | 便士拍卖 | **固定出价 99 MON/次**、40s 倒计时重置、最后出价者中标、结算 20/80 |

### 运行合约测试

```bash
cd contracts
forge test        # 18 项测试（4 合约单测 + 集成全流程）
```

### 部署（Monad 测试网）

```bash
cd contracts
# 准备 .env（PRIVATE_KEY / PLATFORM_TREASURY）
forge script script/Deploy.s.sol \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key $PRIVATE_KEY --broadcast
```

部署后将 `NadbidRegistry` / `NadbidFactory` 地址填入前端 `.env`：
`VITE_CONTRACT_REGISTRY=0x…` / `VITE_CONTRACT_FACTORY=0x…`

### KOL 验证服务

```bash
npm run server    # 启动 Express（默认 3001），POST /api/kol/verify-twitter
```

粉丝数 ≥ 1 万验证通过；`X_API_BEARER_TOKEN` 未配置时返回 mock 数据供开发联调。

## Project Structure

```
src/
├── web3/                    # Web3 core (wagmi config, providers, hooks, contracts)
│   ├── config.ts            # wagmi config, chains, connectors
│   ├── WagmiProvider.tsx    # Provider composition + auto-reconnect
│   ├── WalletStateSyncer.tsx # wagmi → Zustand state mirror
│   ├── contracts.ts         # Contract addresses + real ABIs (registry/factory/KolPass/KolAuction)
│   ├── web3Errors.ts        # Error classification + toast helper
│   └── hooks/               # useWriteContractTx / useReadContract + 4 链上 hooks
│       ├── useKolPass.ts    # curvePrice / totalSupply / mint / burn
│       ├── useAuction.ts    # getAuction / placeBid / settle + BidPlaced 订阅
│       ├── useRegistry.ts   # registerKol / depositBond / bond 赎回
│       └── useFactory.ts    # createKolPass / createKolAuction
├── components/wallet/       # Wallet UI components
├── stores/walletStore.ts    # Zustand wallet store
├── pages/                   # Route pages (含 KolOnboardingPage /kol/onboarding)
└── hooks/useToast.ts        # Global toast notifications

contracts/                   # Foundry 智能合约工程
├── src/                     # NadbidRegistry / NadbidFactory / KolPass / KolAuction
├── test/                    # 18 项 Foundry 测试
└── script/Deploy.s.sol      # Monad 测试网部署脚本

server/                      # Express 后端（X API 粉丝验证）
├── index.ts                 # 入口（默认 3001，CORS）
└── verify-twitter.ts        # POST /api/kol/verify-twitter
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
