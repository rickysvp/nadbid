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
5. Run tests:
   ```bash
   npm test           # 前端 vitest（55 项）
   npm run test:contracts  # 智能合约 forge test（76 项）
   npm run test:all   # 全部测试（前端 + 合约）
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
| Chains | Monad Testnet (10143) |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_WALLETCONNECT_PROJECT_ID` | Yes | WalletConnect Cloud project ID |
| `VITE_CONTRACT_REGISTRY` | After deploy | NadbidRegistry contract address (Monad testnet) |
| `VITE_CONTRACT_FACTORY` | After deploy | NadbidFactory contract address (Monad testnet) |
| `X_CLIENT_ID` | For KOL verify | X (Twitter) OAuth 2.0 Client ID — KOL 入驻身份验证 |
| `X_CLIENT_SECRET` | For KOL verify | X OAuth 2.0 Client Secret |
| `SOCIALDATA_API_KEY` | Optional | SocialData.tools API key — 粉丝数查询备用通道 |
| `VITE_MONAD_RPC_URL` | Optional | Monad Testnet RPC override |
| `PLATFORM_SIGNER_PRIVATE_KEY` | For KOL register | 平台注册签名私钥 — X 验证通过后对 (wallet, handle, followers) 签发 ECDSA 签名 |

See [.env.example](.env.example) for the full template.

## Smart Contracts (SP-1)

Foundry 工程位于 `contracts/`，四合约架构部署到 **Monad 测试网**（chainId 10143）：

| 合约 | 职责 | 关键逻辑 |
|------|------|----------|
| `NadbidRegistry` | KOL 入驻注册表 | 连接钱包 + X OAuth 验证（粉丝 ≥ 1000）→ 注册；**1 MON 担保**质押解锁创建资格，48h 赎回窗口 |
| `NadbidFactory` | 合约工厂 | KOL 自建 `KolPass`（填铸造价/最高价）与 `KolAuction`（固定出价 + 拍卖内容） |
| `KolPass` | 债券曲线 ERC721 | `price = basePrice + (maxPrice-basePrice) × (supply/baseSupply)²`，起铸价 10 MON；mint/burn 滑点保护（maxCost/minRefund）；8% 手续费即时拆分（5% KOL + 3% 平台） |
| `KolAuction` | 便士拍卖 | 固定出价（Factory 部署时设定，默认 0.1 MON）、40s 倒计时重置、最后出价者中标、结算 20/80；履约状态机 + 仲裁 + 违约退款；ReentrancyGuard 保护 |

### 运行合约测试

```bash
cd contracts
forge test        # 76 项测试（6 合约单测 + 集成全流程 + 重入/滑点回归）
```

### 部署（Monad 测试网）

```bash
cd contracts
# 准备 .env（PRIVATE_KEY / PLATFORM_TREASURY / MIN_FOLLOWERS / PLATFORM_SIGNER）
forge script script/Deploy.s.sol \
  --rpc-url monad_testnet \
  --private-key $PRIVATE_KEY --broadcast \
  --disable-code-size-limit   # Monad 128KB 上限，超本地 24KB 检查
```

部署后将 `NadbidRegistry` / `NadbidFactory` 地址填入前端 `.env`：
`VITE_CONTRACT_REGISTRY=0x…` / `VITE_CONTRACT_FACTORY=0x…`

### KOL 验证服务

```bash
npm run server    # 启动 Express（默认 3001），X OAuth 2.0 + SocialData 备用查询
```

KOL 入驻通过 X OAuth 验证身份，粉丝数 ≥ 1000 通过注册；平台签名私钥对 (wallet, handle, followers) 签发 ECDSA 签名，合约验签注册。

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
├── test/                    # 76 项 Foundry 测试（含重入/滑点/退款清扫回归）
└── script/Deploy.s.sol      # Monad 测试网部署脚本

server/                      # Express 后端（X OAuth 2.0 身份验证 + SocialData 粉丝查询）
├── index.ts                 # 入口（默认 3001，CORS）
├── app.ts                   # Express app 工厂（测试复用）
└── x-oauth.ts               # X OAuth 2.0 流程 + 粉丝验证 + 注册签名签发
```

## Wallet Features

- **MetaMask + WalletConnect** support (dynamically rendered connectors)
- **Auto-reconnect** on page refresh (via `@wagmi/core reconnect`)
- **Network switching** with Monad Testnet enforcement
- **Wrong network detection** with inline switch prompts
- **Transaction hooks** with status machines and auto-toasts (`useWriteContractTx`, `useSignMessage`)
- **Unified error handling** (user rejection silent, contract reverts detailed)
- **Real wallet only** — no mock mode; all transactions go through wagmi + viem

## Documentation

- [Wallet Integration Guide](docs/wallet-integration.md) — Full architecture, hooks API, component reference, FAQ
- [Web3 Wallet Integration Plan](docs/web3-wallet-integration-plan.md) — Original development plan (TASK 2–7)

## License

© 2024 nadbid.fun. All rights reserved.
