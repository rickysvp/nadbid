# NADBID Web3 钱包集成开发计划（TASK 2 – TASK 7）

> 项目：`/Users/ricky/AICode/nadbid`
> 技术栈：React 19 + TypeScript 5.8 + wagmi v2.19 + viem v2.56 + @tanstack/react-query v5 + Zustand v5 + react-router-dom v7
> 目标链：Monad Testnet（chainId 10143），备选 Sepolia（chainId 11155111）

---

## 项目现状摘要（TASK 1 已完成）

| 资产 | 路径 | 状态 |
|---|---|---|
| wagmi 配置 | `src/web3/config.ts` | 已创建，含 monadTestnet + sepolia、injected(metaMask) + walletConnect connectors，**未接入 Provider** |
| 旧 mock walletStore | `src/stores/walletStore.ts` | 硬编码 MOCK_ADDRESS / MOCK_BALANCE，被 `app/Navbar.tsx`、`pages/WalletPage.tsx`、`pages/ArbitrationPage.tsx` 使用 |
| 新 demo userWalletStore | `src/stores/userWalletStore.ts` | DEMO_SEED_BALANCE=1,000,000，默认 status='connected'，被 `MintBurnPanel.tsx`、legacy `NavBar.tsx`、legacy `KolProfile.tsx` 使用 |
| AppProviders | `src/providers/AppProviders.tsx` | 含 QueryClientProvider(staleTime=15_000) + ErrorBoundary + StoreTicker + ToastContainer，**未被 App.tsx 引用（死代码）** |
| App.tsx | `src/App.tsx` | 仅 BrowserRouter + Routes，**无任何 Provider 包裹** |
| wagmi hooks 使用 | 全项目 | **零使用** |

**关键问题**：存在两套 wallet store、一个未接入的 AppProviders、web3 config 未挂载。TASK 2–7 需系统性解决。

---

## TASK 2：WagmiProvider + React Query Provider 配置

### 任务目标
配置 WagmiProvider 和 React Query Provider，包裹整个应用，使 wagmi hooks 可在任意组件中使用。

### 需要创建/修改的文件

| 操作 | 路径 |
|---|---|
| 创建 | `src/web3/WagmiProvider.tsx` |
| 修改 | `src/App.tsx` |
| 确认（不改） | `src/main.tsx` |

### 具体实现要点

**`src/web3/WagmiProvider.tsx`**：
```tsx
import { WagmiProvider as WagmiConfigProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { wagmiConfig } from './config';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export function WagmiProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiConfigProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiConfigProvider>
  );
}
```

**`src/App.tsx`**：在 `<BrowserRouter>` 外层包裹 `<WagmiProvider>`：
```tsx
import { WagmiProvider } from './web3/WagmiProvider';

export default function App() {
  return (
    <WagmiProvider>
      <BrowserRouter>
        {/* ...existing Routes... */}
      </BrowserRouter>
    </WagmiProvider>
  );
}
```

**`src/main.tsx`**：保持不变，确认无需单独配置 React Query Provider。

### 验收标准
1. `npx tsc --noEmit` → 0 错误（新增/修改文件）
2. `npm run dev` 启动正常，页面无白屏
3. 浏览器 Console 无 React Provider 相关错误
4. 在任意组件中可正常 `import { useAccount, useConnect, useBalance } from 'wagmi'` 且不报错
5. React DevTools 中可见 `WagmiProvider` → `QueryClientProvider` → `BrowserRouter` 嵌套结构

### 边界约束
- 只创建 `WagmiProvider.tsx` 和修改 `App.tsx`
- **不**创建钱包连接组件（TASK 4）
- **不**修改 walletStore / userWalletStore（TASK 3）
- **不**实现钱包连接逻辑、auto-reconnect（TASK 6）
- **不**触碰 `src/providers/AppProviders.tsx`（其 QueryClientProvider 冗余问题留待 TASK 7 清理）
- 完成后不 commit

### 依赖关系
- 前置：无（TASK 1 已提供 web3/config.ts）
- 可并行：无，必须第一个执行

---

## TASK 3：walletStore 重构 — wagmi 状态同步 + 双 Store 统一

### 任务目标
将 mock walletStore 替换为 wagmi 驱动的全局状态，统一 `walletStore` 与 `userWalletStore` 为单一真源，所有消费者迁移至统一 store。

### 需要创建/修改的文件

| 操作 | 路径 |
|---|---|
| 重写 | `src/stores/walletStore.ts` |
| 修改 | `src/types/index.ts`（扩展 WalletState） |
| 修改 | `src/stores/index.ts`（移除 userWalletStore 导出，导出 walletStore） |
| 创建 | `src/web3/WalletStateSyncer.tsx` |
| 修改 | `src/components/kol-profile/MintBurnPanel.tsx`（迁移 + 移除乐观扣减） |
| 修改 | `src/components/NavBar.tsx`（legacy，迁移 import） |
| 修改 | `src/pages/KolProfile.tsx`（legacy，迁移 import） |
| 删除 | `src/stores/userWalletStore.ts` |

### 具体实现要点

**1. 扩展 `WalletState`（`src/types/index.ts`）**：
```ts
export interface WalletState {
  status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  connectorId: string | null;
  balanceRaw: bigint | null;   // 原始 wei
  balanceMon: number;           // formatUnits 后的 MON 数量
}
```

**2. 重写 `src/stores/walletStore.ts`**：
- 使用 `@wagmi/core` 的 `connect(config, { connector })` / `disconnect(config)` 实现 action，**不依赖 React hooks**（Zustand store 无法调用 hooks）
- `connect({ connectorId })`：从 `wagmiConfig.connectors` 找到对应 connector，调用 core connect，设置 `status: 'connecting'`
- `disconnect()`：调用 core disconnect，重置全部状态
- 内部 setter：`setAccount`、`setBalance`、`setChain`、`setStatus` — 供 WalletStateSyncer 调用
- `balanceMon` 通过 `formatUnits(balanceRaw, 18)` 计算

**3. 创建 `src/web3/WalletStateSyncer.tsx`**：
```tsx
import { useAccount, useBalance, useChainId } from 'wagmi';
import { useEffect } from 'react';
import { formatUnits } from 'viem';
import { useWalletStore } from '../stores/walletStore';

/**
 * 挂载在 WagmiProvider 内部，将 wagmi 响应式状态镜像到 Zustand。
 * 自身不渲染任何 UI。
 */
export function WalletStateSyncer() {
  const { address, status, connector } = useAccount();
  const chainId = useChainId();
  const { data: balanceData } = useBalance({ address, chainId });

  useEffect(() => {
    useWalletStore.setState({
      status,
      isConnected: status === 'connected',
      address: address ?? null,
      chainId: chainId ?? null,
      connectorId: connector?.uid ?? null,
    });
  }, [address, status, connector, chainId]);

  useEffect(() => {
    if (balanceData) {
      useWalletStore.setState({
        balanceRaw: balanceData.value,
        balanceMon: parseFloat(formatUnits(balanceData.value, 18)),
      });
    } else {
      useWalletStore.setState({ balanceRaw: null, balanceMon: 0 });
    }
  }, [balanceData]);

  return null;
}
```
- 在 `WagmiProvider.tsx` 中作为 `<WalletStateSyncer />` 子节点渲染（TASK 3 修改 WagmiProvider，此为 TASK 3 对 TASK 2 文件的受控扩展）

**4. 迁移 `MintBurnPanel.tsx`**：
- `import { useUserWalletStore }` → `import { useWalletStore } from '../stores/walletStore'`
- **移除** `useUserWalletStore.setState((s) => ({ balanceMon: s.balanceMon - cost }))` 乐观扣减 — 余额必须来自链上，由 WalletStateSyncer 在交易确认后自动更新
- 如需交易后刷新余额，调用 `useWalletStore.getState().refreshBalance()`（新增 action，触发 queryClient.invalidateQueries 或直接重新读取）— 实际由 useBalance 的 staleTime 自动刷新即可

**5. 迁移 legacy 文件**：`NavBar.tsx`、`KolProfile.tsx` 的 import 路径替换

**6. `src/stores/index.ts`**：`export * from './walletStore'`，移除 `export * from './userWalletStore'`

### 验收标准
1. `npx tsc --noEmit` → 0 错误
2. `npm run dev` 正常启动
3. 连接钱包后：`useWalletStore.getState().address` === `useAccount().address`
4. 切换链后：store.chainId 实时更新
5. 余额变化后（如转账）：store.balanceMon 在 staleTime 内更新
6. `grep -r "useUserWalletStore" src/` → 0 结果
7. `grep -r "MOCK_ADDRESS\|MOCK_BALANCE\|DEMO_SEED" src/` → 0 结果
8. MintBurnPanel 不再有本地余额扣减逻辑

### 边界约束
- **不**创建任何 UI 组件（连接弹窗、按钮等归 TASK 4）
- **不**实现网络切换 UI（TASK 5）
- **不**实现交易/签名 hooks（TASK 6）
- **不**修改 `app/Navbar.tsx` 的连接按钮交互（TASK 4）
- **不**触碰 `AppProviders.tsx`（TASK 7）
- WalletStateSyncer 是本任务唯一允许新增的组件，且不渲染 UI

### 依赖关系
- 前置：TASK 2（必须有 WagmiProvider 才能使用 wagmi hooks）
- 可并行：无，TASK 4/5/6 均依赖本任务的 store 接口稳定

---

## TASK 4：钱包连接 UI（ConnectModal + ConnectButton）

### 任务目标
创建可复用的钱包连接弹窗与触发按钮，支持 MetaMask（injected）和 WalletConnect，替换 Navbar 中的 mock 连接按钮。

### 需要创建/修改的文件

| 操作 | 路径 |
|---|---|
| 创建 | `src/components/wallet/ConnectModal.tsx` |
| 创建 | `src/components/wallet/ConnectButton.tsx` |
| 创建 | `src/components/wallet/index.ts` |
| 修改 | `src/app/Navbar.tsx`（替换断开状态的 Connect 按钮） |

### 具体实现要点

**1. `ConnectModal.tsx`**：
- 使用 `useConnect` from 'wagmi'：获取 `{ connectors, connectAsync, isPending, error }`
- `connectors` 遍历渲染卡片：MetaMask（injected）、WalletConnect
- 点击 connector → `connectAsync({ connector })`，期间显示 loading spinner
- 成功后自动关闭 modal（通过 `useAccount` 监听 status === 'connected'）
- 错误处理：`error` 非空时显示错误文案 + 重试按钮
- 使用 `motion/react` AnimatePresence 做进入/退出动画，匹配项目 neo-brutalist 设计系统
- 遮罩层点击关闭（仅在非 connecting 状态）

**2. `ConnectButton.tsx`**：
- 断开状态：渲染 "Connect Wallet" 按钮，点击打开 ConnectModal
- 连接状态：**本任务不重写已连接 UI**，直接 `return null` 或渲染占位，由 Navbar 现有 popover 继续处理连接后展示（TASK 5 会重构）
- 实际集成方式：Navbar 中 `{!isConnected ? <ConnectButton /> : <existing popover button>}`

**3. `src/app/Navbar.tsx` 修改**：
- 移除 `handleConnect` 中的 `await connect()`（store mock 方法）
- 断开状态按钮替换为 `<ConnectButton />`
- 已连接状态的 popover 结构暂时保留（TASK 5 重构），但 `connect`/`disconnect` 改为从统一 store 获取
- `disconnect` 调用 `useWalletStore.getState().disconnect()`

**4. `src/components/wallet/index.ts`**：`export { ConnectModal, ConnectButton } from './...'`

### 验收标准
1. `npx tsc --noEmit` → 0 错误
2. 点击 Navbar "Connect" 按钮 → 弹出 modal，显示 MetaMask + WalletConnect 两个选项
3. 点击 MetaMask → 触发浏览器扩展授权弹窗（或提示未安装）
4. 点击 WalletConnect → 显示 QR code（需有效 `VITE_WALLETCONNECT_PROJECT_ID`，否则提示配置缺失）
5. 连接成功后 modal 自动关闭，Navbar 显示地址 + 余额
6. 用户拒绝授权 → modal 内显示错误信息，可重试
7. connecting 状态下按钮显示 loading，不可重复点击

### 边界约束
- **不**实现网络切换（TASK 5）
- **不**实现交易/签名（TASK 6）
- **不**重构已连接状态的 popover 内容（TASK 5）
- **不**创建路由守卫（TASK 7）
- **不**修改 walletStore 接口（TASK 3 已冻结）

### 依赖关系
- 前置：TASK 2、TASK 3
- 可并行：TASK 6（hooks 层，不碰 UI 文件）
- 与 TASK 5 均修改 Navbar.tsx → **必须串行**，TASK 4 先执行（只改断开状态按钮区）

---

## TASK 5：链切换 + 钱包信息展示组件

### 任务目标
创建网络切换器、钱包信息卡片和错误网络提示横幅，重构 Navbar 已连接 popover 和 WalletPage 头部，使链上数据真实展示。

### 需要创建/修改的文件

| 操作 | 路径 |
|---|---|
| 创建 | `src/components/wallet/NetworkSwitcher.tsx` |
| 创建 | `src/components/wallet/AccountCard.tsx` |
| 创建 | `src/components/wallet/WrongNetworkBanner.tsx` |
| 修改 | `src/app/Navbar.tsx`（已连接 popover 集成 NetworkSwitcher + AccountCard） |
| 修改 | `src/pages/WalletPage.tsx`（头部替换为 AccountCard，余额用 store 真实数据） |

### 具体实现要点

**1. `NetworkSwitcher.tsx`**：
- 使用 `useSwitchChain` from 'wagmi'：`{ chains, switchChain, isPending, error }`
- `chains` 来自 wagmiConfig（monadTestnet + sepolia）
- UI：当前链名称 + 图标，点击展开下拉列表，点击目标链调用 `switchChain({ chainId })`
- 处理 `ChainNotAddedToWalletError`：wagmi v2 的 `switchChain` 会自动提示添加链，无需手动 `wallet_addEthereumChain`
- 用户拒绝切换 → toast 提示 "Network switch rejected"
- isPending 时显示 loading

**2. `AccountCard.tsx`**：
- Props：`address`, `balanceMon`, `chainId`, `compact?: boolean`
- 展示：avatar（dicebear，seed 从 address 派生）、shortenAddress、Copy 按钮（navigator.clipboard.writeText + copied 状态）、Explorer 链接（`${chain.blockExplorers.default.url}/address/${address}`，从 wagmiConfig 查 chain）
- compact 模式用于 Navbar 按钮，完整模式用于 WalletPage 头部

**3. `WrongNetworkBanner.tsx`**：
- 从 store 读取 `chainId`，判断是否在 `supportedChains` 中
- 不在支持列表时渲染横幅："Unsupported Network" + "Switch to Monad Testnet" 按钮（调用 switchChain）
- 可全局挂载（AppLayout 内）或页面级挂载

**4. `Navbar.tsx` 已连接 popover 重构**：
- 头部区域替换为 `<AccountCard compact />`
- 新增 `<NetworkSwitcher />` 行
- 余额从 store 读取（已由 WalletStateSyncer 同步）
- Explorer 链接从 chain 配置动态生成，替换硬编码 `info('Opening Block Explorer...')`

**5. `WalletPage.tsx` 重构**：
- 头部 wallet 信息替换为 `<AccountCard />`
- 余额数字从 `useWalletStore` 读取，移除 mock
- "Connect Wallet" CTA 按钮替换为 `<ConnectButton />`（TASK 4 产物）
- 其余 mock 持仓/活动列表暂保留（非本任务范围）

### 验收标准
1. `npx tsc --noEmit` → 0 错误
2. 已连接状态下 Navbar popover 显示 NetworkSwitcher，可在 Monad / Sepolia 间切换
3. 切换到未添加的链时钱包弹出 "Add Network" 提示
4. 切换到不支持的链（如 Ethereum Mainnet）时出现 WrongNetworkBanner
5. AccountCard 的 Copy 按钮可复制地址，Explorer 链接打开对应链的浏览器
6. WalletPage 头部显示真实地址和链上余额
7. 用户拒绝网络切换 → toast 错误提示，不崩溃

### 边界约束
- **不**修改连接弹窗逻辑（TASK 4）
- **不**实现交易/签名 hooks（TASK 6）
- **不**创建路由守卫（TASK 7）
- **不**修改 walletStore（TASK 3 已冻结）
- **不**替换 WalletPage 的 mock 持仓/活动数据（仅头部钱包信息）

### 依赖关系
- 前置：TASK 2、TASK 3、TASK 4（Navbar 结构已由 TASK 4 调整）
- 可并行：TASK 6（不碰 UI）

---

## TASK 6：交易/签名 Hooks + 自动重连 + 断开清理

### 任务目标
构建可复用的合约写入和消息签名 hooks（集成 toast 通知），实现页面刷新后的自动重连，确保断开连接时状态完全清理。

### 需要创建/修改的文件

| 操作 | 路径 |
|---|---|
| 创建 | `src/hooks/web3/useWriteContractTx.ts` |
| 创建 | `src/hooks/web3/useSignMessage.ts` |
| 创建 | `src/web3/contracts.ts` |
| 创建 | `src/utils/web3Errors.ts` |
| 修改 | `src/web3/WagmiProvider.tsx`（添加 auto-reconnect effect） |
| 修改 | `src/stores/walletStore.ts`（disconnect 完整清理 + reconnect 状态处理） |

### 具体实现要点

**1. Auto-reconnect（`WagmiProvider.tsx`）**：
```tsx
import { reconnect } from '@wagmi/core';
import { useEffect } from 'react';

export function WagmiProvider({ children }) {
  useEffect(() => {
    reconnect(wagmiConfig);
  }, []);
  // ...existing provider JSX, plus <WalletStateSyncer />
}
```
- `reconnect` 是幂等的，React StrictMode 双调用安全
- 重连期间 WalletStateSyncer 的 `useAccount().status` 为 `'reconnecting'`，store 同步设置

**2. `useWriteContractTx.ts`**：
- 封装 `useWriteContract` + `useWaitForTransactionReceipt`
- 集成 `useToast`：
  - 调用 `writeContract` 时 → `info('Transaction submitted...')`
  - `isConfirming` → 保持 pending toast 或更新
  - receipt 成功 → `success('Transaction confirmed!')` + explorer 链接
  - 错误 → `error(parseWalletError(err))`
- 返回 `{ write, isPending, isConfirming, receipt, hash, error }`
- 内部使用 `useChainId` 动态获取 explorer base URL

**3. `useSignMessage.ts`**：
- 薄封装 wagmi `useSignMessage`
- 错误统一走 `parseWalletError`
- 返回 `{ signMessage, data, isPending, error }`

**4. `src/web3/contracts.ts`**：
```ts
import type { Address } from 'viem';
export const CONTRACTS = {
  monadTestnet: {
    passNft: '0x...' as Address,      // 占位，部署后填入
    auction: '0x...' as Address,
    staking: '0x...' as Address,
  },
  // ...其他链
} as const;
export function getContractAddress(chainId: number, key: keyof typeof CONTRACTS[keyof typeof CONTRACTS]) { ... }
```
- ABI 单独文件或内联，本任务只建结构占位

**5. `src/utils/web3Errors.ts`**：
```ts
import { UserRejectedRequestError, ChainNotConfiguredError, ContractFunctionRevertedError } from 'viem';
export function parseWalletError(err: unknown): string {
  if (err instanceof UserRejectedRequestError) return 'User rejected the request.';
  if (err instanceof ChainNotConfiguredError) return 'Network not supported.';
  if (err instanceof ContractFunctionRevertedError) return `Transaction reverted: ${err.data?.errorName ?? 'unknown'}`;
  // ...insufficient funds, RPC error
  return 'An unexpected error occurred.';
}
```

**6. walletStore disconnect 完善**：
- `disconnect()` 调用 `@wagmi/core disconnect(wagmiConfig)` 后，重置：status='disconnected', isConnected=false, address=null, chainId=null, connectorId=null, balanceRaw=null, balanceMon=0
- WalletStateSyncer 会自动同步，但 action 内主动 set 可避免延迟闪烁

### 验收标准
1. `npx tsc --noEmit` → 0 错误
2. 连接钱包后刷新页面 → 自动恢复连接状态，无需手动重连
3. `useWriteContractTx` 触发交易 → toast 显示 submitted → confirmed 完整生命周期
4. 用户拒绝交易 → toast 显示 "User rejected the request."
5. `useSignMessage` 可正常签名并返回 signature
6. 断开连接后 → store 全部字段重置，Navbar 回到断开状态
7. WalletConnect 会话在断开后被清除（下次连接重新扫码）

### 边界约束
- **不**创建 UI 组件（TASK 4/5）
- **不**在页面中集成交易流程（TASK 7 做集成）
- **不**部署合约或填入真实主网地址（仅占位结构）
- **不**修改 Navbar / WalletPage UI
- **不**创建路由守卫（TASK 7）

### 依赖关系
- 前置：TASK 2
- 可并行：TASK 4、TASK 5（本任务只碰 hooks / provider / store，不碰 UI 组件）
- 注意：本任务修改 `WagmiProvider.tsx` 和 `walletStore.tsx`，若 TASK 3 尚未合并需等 TASK 3 完成

---

## TASK 7：集成打磨 + 路由守卫 + 错误处理 + 死代码清理

### 任务目标
完成全链路集成：受保护路由守卫、统一错误处理、加载状态、AppProviders 清理、残余 mock 移除，最终验证完整钱包交互流程。

### 需要创建/修改的文件

| 操作 | 路径 |
|---|---|
| 创建 | `src/components/wallet/WalletGuard.tsx` |
| 修改 | `src/App.tsx`（受保护路由包裹 WalletGuard） |
| 修改 | `src/providers/AppProviders.tsx`（移除 QueryClientProvider，保留 ErrorBoundary/StoreTicker/ToastContainer，作为外层包裹） |
| 修改 | `src/pages/StakingPage.tsx`、`ClaimPage.tsx`、`PointsPage.tsx`（接入 WalletGuard 或连接提示） |
| 修改 | `src/pages/ArbitrationPage.tsx`（验证统一 store 兼容） |
| 修改 | `src/app/AppLayout.tsx`（挂载 WrongNetworkBanner） |
| 删除 | `src/stores/userWalletStore.ts`（若 TASK 3 未删） |
| 确认删除 | `src/components/NavBar.tsx`（legacy，确认无引用后删除） |

### 具体实现要点

**1. `WalletGuard.tsx`**：
```tsx
export function WalletGuard({ children }: { children: ReactNode }) {
  const isConnected = useWalletStore((s) => s.isConnected);
  const status = useWalletStore((s) => s.status);
  if (status === 'reconnecting' || status === 'connecting') return <LoadingSpinner />;
  if (!isConnected) return <ConnectPrompt />; // 含 <ConnectButton />
  return <>{children}</>;
}
```
- 在 `App.tsx` 中对需要连接的路由（Staking、Claim、Points、Wallet）使用嵌套 layout route 包裹 `<WalletGuard>`

**2. AppProviders 重构**：
- 移除 `QueryClientProvider`（已由 WagmiProvider 提供，避免双 Provider）
- 保留：`AppErrorBoundary`、`StoreTicker`（质押状态机心跳，必须运行）、`DevClockBridge`、`ToastContainer`
- 在 `App.tsx` 中作为最外层包裹：
```tsx
<AppProviders>
  <WagmiProvider>
    <BrowserRouter>...</BrowserRouter>
  </WagmiProvider>
</AppProviders>
```
- 注意：`ToastContainer` 在 AppProviders 内，`useToast` 可正常使用

**3. 统一错误处理落地**：
- 所有钱包交互点（ConnectModal、NetworkSwitcher、useWriteContractTx）统一使用 `parseWalletError`
- 新增全局 `window.addEventListener('unhandledrejection')` 过滤钱包相关错误（可选）

**4. 加载状态**：
- ConnectButton connecting 状态 spinner
- 交易 pending 时按钮 disabled + loading
- reconnecting 时页面显示骨架屏或 "Reconnecting..." 而非空白

**5. 死代码清理**：
- 删除 `userWalletStore.ts`
- 确认 `components/NavBar.tsx`（legacy）无引用后删除
- 移除 walletStore 中的 MOCK 常量
- `grep` 验证无残留

**6. 全链路验证清单**：
- [ ] 未连接访问 /staking → 显示连接提示，不暴露内容
- [ ] 连接 MetaMask → Navbar 更新 → 访问 /wallet 显示真实余额
- [ ] 切换到 Sepolia → WrongNetworkBanner 出现 → 切回 Monad → banner 消失
- [ ] 刷新页面 → 自动重连，状态保持
- [ ] 断开连接 → 所有受保护页面回到连接提示
- [ ] Console 无 error / warning
- [ ] `npx tsc --noEmit` → 0 错误

### 验收标准
1. `npx tsc --noEmit` → 0 错误（全项目）
2. `npm run dev` 无控制台错误/警告
3. 受保护路由（/staking, /claim, /points, /wallet）未连接时显示连接 CTA
4. 完整流程：Connect → Switch Network → View Balance → Disconnect → Reconnect 全部正常
5. `grep -r "MOCK_ADDRESS\|MOCK_BALANCE\|DEMO_SEED\|useUserWalletStore" src/` → 0 结果
6. AppProviders 不再包含 QueryClientProvider，StoreTicker 正常运行（质押倒计时走动）
7. 所有钱包错误均有用户友好的 toast 提示

### 边界约束
- **不**新增功能特性（仅集成与清理）
- **不**修改合约 ABI / 地址（TASK 6）
- **不**改变视觉设计系统
- **不**替换 WalletPage 的 mock 持仓数据（仅钱包头部已在 TASK 5 完成）
- **不**实现实际的 mint/burn/stake 链上交易（仅 hooks 就绪，页面集成为后续任务）

### 依赖关系
- 前置：TASK 2、TASK 3、TASK 4、TASK 5、TASK 6 全部完成
- 可并行：无，必须最后执行

---

## 任务依赖图与执行顺序

```
┌─────────────────────────────────────────────────────────┐
│  TASK 2: WagmiProvider + QueryClientProvider            │
│  (必须第一个执行)                                        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  TASK 3: walletStore 重构 + wagmi 状态同步 + 双 store 统一 │
│  (必须第二个执行，后续所有任务依赖 store 接口)             │
└──────────┬───────────────────────┬──────────────────────┘
           │                       │
           ▼                       ▼
┌──────────────────────┐  ┌──────────────────────────────┐
│  TASK 4: Connect UI  │  │  TASK 6: Tx/Sign Hooks       │
│  (Modal + Button)    │  │  + Auto-reconnect            │
│  修改 Navbar 断开区   │  │  (hooks 层，不碰 UI)         │
└──────────┬───────────┘  └──────────────────────────────┘
           │
           ▼
┌──────────────────────┐
│  TASK 5: Network     │  ← 可与 TASK 6 并行
│  Switcher + Account  │
│  Card + WrongNetwork │
│  Banner              │
└──────────┬───────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  TASK 7: 集成打磨 + 路由守卫 + 错误处理 + 死代码清理        │
│  (必须最后执行)                                          │
└─────────────────────────────────────────────────────────┘
```

### 推荐执行序列

| 阶段 | 任务 | 说明 |
|---|---|---|
| 1 | TASK 2 | Provider 基础设施 |
| 2 | TASK 3 | 状态层统一（关键路径） |
| 3 | TASK 4 + TASK 6 | 并行：UI 连接层 + hooks/重连层 |
| 4 | TASK 5 | 网络/信息展示（需 TASK 4 先改完 Navbar 断开区） |
| 5 | TASK 7 | 最终集成与清理 |

---

## 整体风险点与注意事项

### 1. wagmi v2 API 差异（高风险）
- `useConnect` 返回 `{ connectors, connect, connectAsync, isPending, error }`，**不是** v1 的 `connect` 单一函数
- `useBalance` 必须传 `{ address, chainId }`，address 为 null 时不查询
- `useSwitchChain` 返回 `switchChain`（非 `switchNetwork`），chains 来自 config
- 非 React 环境调用连接/断开用 `@wagmi/core` 的 `connect(config, ...)` / `disconnect(config)` / `reconnect(config)`
- `useAccount().status` 枚举：`'connecting' | 'reconnecting' | 'connected' | 'disconnected'`，无 `'idle'`（初始为 `'disconnected'`）
- `useChainId` 在未连接时返回 config 的默认链（第一个 chain），需区分"钱包实际链"与"默认链"

### 2. Provider 嵌套顺序（高风险）
- 正确顺序：`<AppProviders(ErrorBoundary)>` → `<WagmiProvider>` → `<QueryClientProvider>` → `<BrowserRouter>` → 页面
- **QueryClientProvider 必须在 WagmiProvider 内部**（wagmi hooks 内部使用 React Query）
- WalletStateSyncer 必须在 WagmiProvider 内部渲染
- TASK 7 重构 AppProviders 后，StoreTicker 在最外层运行，不依赖 wagmi，安全

### 3. 双 Wallet Store 统一（中风险）
- `userWalletStore` 默认 `status: 'connected'` + 假地址，`MintBurnPanel` 依赖此做乐观余额扣减
- 统一后 `MintBurnPanel` 的 `setState balanceMon -= cost` 必须移除，否则会与链上余额冲突
- legacy `NavBar.tsx` / `KolProfile.tsx` 可能仍被路由引用？需确认：当前路由用 `*Page.tsx` 版本，legacy 文件应无引用，但 TASK 7 需 grep 验证

### 4. AppProviders 死代码与 StoreTicker（中风险）
- `AppProviders.tsx` 当前未被引用，意味着 `StoreTicker`（质押状态机 1s 心跳）未运行，质押倒计时可能不走
- TASK 2 新建的 QueryClient（staleTime 30_000）与 AppProviders 中的（15_000）配置不一致，TASK 7 必须移除 AppProviders 的 QueryClientProvider 避免双实例
- TASK 7 将 AppProviders 作为外层包裹后，StoreTicker 恢复运行

### 5. Auto-reconnect 与 StrictMode（低风险）
- React 19 StrictMode 双调用 effect，`reconnect(wagmiConfig)` 幂等，安全
- 重连期间 `useAccount().status === 'reconnecting'`，WalletGuard 应显示 loading 而非 "not connected"

### 6. WalletConnect 配置（低风险）
- `VITE_WALLETCONNECT_PROJECT_ID` 未设置时 fallback 为 `'demo'`，可能无法正常扫码
- TASK 4 验收时需提示用户配置真实 projectId，或接受 demo 限制

### 7. Monad 链添加（低风险）
- 用户钱包可能未添加 Monad Testnet，`switchChain` 会自动触发 `wallet_addEthereumChain`
- 若用户拒绝添加，`parseWalletError` 需正确识别并提示

### 8. TypeScript 严格模式（持续注意）
- `noUnusedLocals` / `noUnusedParameters` 开启，所有新代码不得有未使用变量
- `balanceRaw: bigint | null` 在序列化时需注意（Zustand devtools 可选）
- `formatUnits` 返回 string，需 `parseFloat` 转 number，精度损失可接受（展示用）

### 9. 状态同步延迟（低风险）
- WalletStateSyncer 通过 useEffect 镜像状态，存在一帧延迟
- 交易确认后余额更新依赖 useBalance 的 staleTime（30s），如需即时刷新可在交易成功后 `queryClient.invalidateQueries({ queryKey: ['readContracts', ...] })` — 此优化可放 TASK 6 或后续

---

*文档版本：v1.0 | 生成时间：2026-09-01*
