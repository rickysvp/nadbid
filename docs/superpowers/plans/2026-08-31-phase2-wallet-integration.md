# Phase 2: 钱包连接集成 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 集成真实 Web3 钱包连接（MetaMask / WalletConnect），接入 Monad 测试网，实现地址显示、余额查询、网络切换、交易签名基础能力。

**Architecture:** 使用 wagmi v2 + viem v2 作为 Web3 交互层，React Context 管理钱包状态，重构现有 walletStore 接入真实钱包数据。支持 MetaMask（注入式）和 WalletConnect（移动端）。

**Tech Stack:** wagmi v2.x, viem v2.x, @tanstack/react-query v5, Monad Testnet (chainId 10143)

**依赖文档:** `docs/superpowers/plans/2026-08-31-project-master-plan.md`

---

## 文件结构映射

### 需要创建的文件
- `src/web3/config.ts` — wagmi 配置（chains、transports、connectors）
- `src/web3/WagmiProvider.tsx` — Wagmi Provider 组件
- `src/web3/hooks/useWallet.ts` — 钱包连接 hook（封装 wagmi）
- `src/web3/hooks/useBalance.ts` — 余额查询 hook
- `src/web3/hooks/useNetwork.ts` — 网络切换 hook
- `src/components/wallet/WalletConnectModal.tsx` — 钱包连接弹窗
- `src/components/wallet/WalletButton.tsx` — 钱包按钮组件（连接状态/地址显示/下拉菜单）
- `.env.example` — 环境变量示例（WalletConnect Project ID 等）

### 需要修改的文件
- `src/stores/walletStore.ts` — 重构为接入真实钱包状态
- `src/app/Navbar.tsx` — 集成 WalletButton 组件
- `src/pages/WalletPage.tsx` — 使用真实钱包数据
- `src/App.tsx` — 包裹 WagmiProvider
- `src/main.tsx` — 配置 React Query Provider
- `package.json` — 添加 wagmi、viem、@tanstack/react-query 依赖
- `src/index.css` — 钱包弹窗样式

### 需要删除的文件
- 无（保留 mock 数据作为 fallback）

---

## Task 1: 安装依赖和配置 wagmi

**Files:**
- Modify: `package.json`
- Create: `src/web3/config.ts`
- Create: `.env.example`

- [ ] **Step 1: 安装依赖**

Run:
```bash
npm install wagmi viem @tanstack/react-query
```

Expected: 依赖安装成功，package.json 更新

- [ ] **Step 2: 创建 wagmi 配置文件**

Create `src/web3/config.ts`:

```typescript
import { http, createConfig } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// Monad 测试网配置
export const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
    public: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' },
  },
  testnet: true,
} as const;

// 支持的链
export const supportedChains = [monadTestnet, sepolia] as const;

// wagmi 配置
export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [
    injected({ target: 'metaMask' }),
    walletConnect({
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo',
      showQrModal: true,
    }),
  ],
  transports: {
    [monadTestnet.id]: http(),
    [sepolia.id]: http(),
  },
});
```

- [ ] **Step 3: 创建环境变量示例**

Create/Update `.env.example`:

```env
# WalletConnect Project ID (https://cloud.walletconnect.com)
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Monad Testnet RPC URL (optional, uses default if not set)
VITE_MONAD_RPC_URL=https://testnet-rpc.monad.xyz

# 应用名称
VITE_APP_NAME=NADBID
```

- [ ] **Step 4: 运行 TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 0 errors（可能有 wagmi 类型相关错误，需要修复）

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/web3/config.ts .env.example
git commit -m "feat: 安装 wagmi/viem 依赖并配置 Monad 测试网"
```

---

## Task 2: 配置 Provider 和 Context

**Files:**
- Create: `src/web3/WagmiProvider.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: 创建 WagmiProvider 组件**

Create `src/web3/WagmiProvider.tsx`:

```tsx
import { WagmiProvider as WagmiConfigProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from './config';
import type { ReactNode } from 'react';

const queryClient = new QueryClient();

interface WagmiProviderProps {
  children: ReactNode;
}

export function WagmiProvider({ children }: WagmiProviderProps) {
  return (
    <WagmiConfigProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiConfigProvider>
  );
}
```

- [ ] **Step 2: 修改 App.tsx 包裹 WagmiProvider**

Modify `src/App.tsx`:
- 导入 WagmiProvider
- 在最外层包裹 WagmiProvider

- [ ] **Step 3: 运行 TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: 启动 dev server 验证**

Run: `npm run dev`
访问: `http://localhost:3000/`
Expected: 页面正常渲染，无控制台错误（wagmi 初始化正常）

- [ ] **Step 5: Commit**

```bash
git add src/web3/WagmiProvider.tsx src/App.tsx
git commit -m "feat: 配置 WagmiProvider 和 React Query Provider"
```

---

## Task 3: 重构 walletStore 接入真实钱包

**Files:**
- Modify: `src/stores/walletStore.ts`
- Create: `src/web3/hooks/useWallet.ts`

- [ ] **Step 1: 创建 useWallet hook**

Create `src/web3/hooks/useWallet.ts`:

```typescript
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { monadTestnet } from '../config';

export function useWallet() {
  const { address, isConnected, chain, chainId } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const isWrongNetwork = isConnected && chainId !== monadTestnet.id;

  const connectMetaMask = () => {
    const metaMask = connectors.find((c) => c.type === 'injected');
    if (metaMask) {
      connect({ connector: metaMask });
    }
  };

  const connectWalletConnect = () => {
    const wc = connectors.find((c) => c.type === 'walletConnect');
    if (wc) {
      connect({ connector: wc });
    }
  };

  const switchToMonad = () => {
    switchChain({ chainId: monadTestnet.id });
  };

  return {
    address,
    isConnected,
    chain,
    chainId,
    isWrongNetwork,
    isConnecting,
    isSwitching,
    connectors,
    connect,
    connectMetaMask,
    connectWalletConnect,
    disconnect,
    switchToMonad,
  };
}
```

- [ ] **Step 2: 重构 walletStore**

Modify `src/stores/walletStore.ts`:
- 保留 zustand store 结构
- 添加 `syncWithWallet` 方法，从 wagmi 同步状态
- 保留 mock 数据作为 fallback（开发阶段）
- 添加 `isWrongNetwork` 状态

- [ ] **Step 3: 运行 TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/web3/hooks/useWallet.ts src/stores/walletStore.ts
git commit -m "feat: 重构 walletStore 接入真实钱包状态"
```

---

## Task 4: 创建钱包连接弹窗和按钮组件

**Files:**
- Create: `src/components/wallet/WalletConnectModal.tsx`
- Create: `src/components/wallet/WalletButton.tsx`

- [ ] **Step 1: 创建 WalletConnectModal 组件**

Create `src/components/wallet/WalletConnectModal.tsx`:
- 弹窗布局：居中卡片，深色背景
- 钱包选项：MetaMask（图标 + 名称）、WalletConnect（图标 + 名称）
- 连接中状态：loading 动画
- 错误状态：错误信息 + 重试按钮
- 关闭按钮
- 点击遮罩关闭
- 动画：淡入 + 缩放

- [ ] **Step 2: 创建 WalletButton 组件**

Create `src/components/wallet/WalletButton.tsx`:
- 未连接状态：显示 "Connect Wallet" 按钮，点击打开弹窗
- 已连接状态：显示地址缩写（0x1234...abcd）+ 网络状态
- 下拉菜单：
  - 完整地址（可复制）
  - 余额显示
  - 在区块浏览器中查看
  - 切换网络（如果网络错误）
  - 断开连接
- 网络错误状态：红色边框 + 警告提示

- [ ] **Step 3: 运行 TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: 启动 dev server 验证**

访问: `http://localhost:3000/`
Expected:
- Navbar 显示 Connect Wallet 按钮
- 点击打开连接弹窗
- 弹窗显示 MetaMask 和 WalletConnect 选项
- 弹窗可关闭

- [ ] **Step 5: Commit**

```bash
git add src/components/wallet/
git commit -m "feat: 创建钱包连接弹窗和按钮组件"
```

---

## Task 5: 集成 Navbar 和 WalletPage

**Files:**
- Modify: `src/app/Navbar.tsx`
- Modify: `src/pages/WalletPage.tsx`
- Create: `src/web3/hooks/useBalance.ts`

- [ ] **Step 1: 创建 useBalance hook**

Create `src/web3/hooks/useBalance.ts`:
- 封装 wagmi useBalance
- 查询 MON 余额
- 格式化显示（保留 4 位小数）
- loading 状态
- error 状态

- [ ] **Step 2: 修改 Navbar 集成 WalletButton**

Modify `src/app/Navbar.tsx`:
- 导入 WalletButton 组件
- 替换原有的 Connect Wallet 按钮
- 保留移动端菜单中的钱包入口

- [ ] **Step 3: 修改 WalletPage 使用真实钱包数据**

Modify `src/pages/WalletPage.tsx`:
- 导入 useWallet 和 useBalance hooks
- 未连接状态：显示 Connect Wallet 按钮（点击打开弹窗）
- 已连接状态：
  - 显示真实钱包地址
  - 显示真实 MON 余额
  - 显示网络状态
  - 复制地址功能
  - 断开连接功能
- 保留 mock 数据作为 fallback（PASS 持仓、质押、交易历史等）

- [ ] **Step 4: 运行 TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 5: 启动 dev server 验证**

访问: `http://localhost:3000/wallet`
Expected:
- 未连接时显示 Connect Wallet 引导
- Navbar 钱包按钮正常工作
- 连接弹窗正常打开和关闭

- [ ] **Step 6: Commit**

```bash
git add src/web3/hooks/useBalance.ts src/app/Navbar.tsx src/pages/WalletPage.tsx
git commit -m "feat: 集成钱包连接到 Navbar 和 WalletPage"
```

---

## Task 6: 网络切换和错误处理

**Files:**
- Modify: `src/components/wallet/WalletButton.tsx`
- Modify: `src/components/wallet/WalletConnectModal.tsx`
- Create: `src/components/wallet/NetworkSwitcher.tsx`

- [ ] **Step 1: 创建 NetworkSwitcher 组件**

Create `src/components/wallet/NetworkSwitcher.tsx`:
- 显示当前网络
- 网络错误时显示警告
- 一键切换到 Monad 测试网按钮
- 切换中状态
- 切换失败错误提示

- [ ] **Step 2: 完善 WalletConnectModal 错误处理**

Modify `src/components/wallet/WalletConnectModal.tsx`:
- 用户拒绝连接：显示 "Connection rejected" + 重试
- 钱包未安装：显示 "MetaMask not installed" + 下载链接
- 网络错误：显示错误信息
- 超时处理

- [ ] **Step 3: 完善 WalletButton 下拉菜单**

Modify `src/components/wallet/WalletButton.tsx`:
- 添加 NetworkSwitcher 组件
- 添加 "Switch to Monad" 按钮（网络错误时）
- 添加余额刷新按钮
- 添加交易历史链接

- [ ] **Step 4: 运行 TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 5: 启动 dev server 验证**

访问: `http://localhost:3000/`
Expected:
- 网络错误时显示警告
- 切换网络功能正常
- 错误提示清晰

- [ ] **Step 6: Commit**

```bash
git add src/components/wallet/
git commit -m "feat: 完善网络切换和错误处理"
```

---

## Task 7: 全流程测试和文档

**Files:**
- Modify: `README.md`
- Create: `docs/wallet-integration.md`

- [ ] **Step 1: 完整功能测试**

测试清单：
- [ ] MetaMask 连接（安装/未安装）
- [ ] WalletConnect 连接
- [ ] 断开连接
- [ ] 地址显示和复制
- [ ] 余额查询和显示
- [ ] 网络切换（Monad / Sepolia）
- [ ] 网络错误提示
- [ ] 连接拒绝处理
- [ ] 页面刷新后状态保持
- [ ] 移动端响应式

- [ ] **Step 2: 运行 TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: 运行生产构建检查**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 4: 创建钱包集成交档**

Create `docs/wallet-integration.md`:
- 支持的钱包列表
- 支持的链列表
- 环境变量配置说明
- 钱包连接流程
- 网络切换流程
- 错误处理说明
- 常见问题 FAQ

- [ ] **Step 5: 更新 README.md**

Modify `README.md`:
- 添加钱包连接功能说明
- 添加环境变量配置说明
- 添加技术栈更新（wagmi、viem）

- [ ] **Step 6: 最终 Commit**

```bash
git add -A
git commit -m "docs: 钱包集成交档和 README 更新"
```

---

## 验收标准

### 功能验收
- [ ] MetaMask 可正常连接和断开
- [ ] WalletConnect 可正常连接（扫码）
- [ ] 连接后显示真实钱包地址和 MON 余额
- [ ] 地址可复制到剪贴板
- [ ] 网络错误时提示切换到 Monad 测试网
- [ ] 一键切换网络功能正常
- [ ] 连接拒绝/钱包未安装有清晰错误提示
- [ ] 页面刷新后钱包状态保持
- [ ] 所有页面的 Connect Wallet 按钮功能正常

### 技术验收
- [ ] TypeScript 编译 0 错误
- [ ] 生产构建成功
- [ ] wagmi 配置正确（chains、connectors、transports）
- [ ] React Query Provider 配置正确
- [ ] 环境变量配置完整
- [ ] 代码符合现有规范（无硬编码、无重复代码）

### UX 验收
- [ ] 连接弹窗视觉风格与全站统一
- [ ] 钱包按钮状态清晰（未连接/已连接/网络错误）
- [ ] 下拉菜单交互流畅
- [ ] loading 状态有明确反馈
- [ ] 错误提示可操作（不是纯文字）
- [ ] 移动端响应式正常

---

## 风险和依赖

### 关键依赖
1. **WalletConnect Project ID**：需要用户在 https://cloud.walletconnect.com 注册获取
2. **Monad 测试网 RPC**：RPC 节点稳定可用
3. **MetaMask 安装**：用户浏览器安装 MetaMask
4. **Monad 链配置**：MetaMask 中添加 Monad 测试网

### 主要风险
1. **wagmi v2 API 变更**：v2 与 v1 API 差异较大，需要仔细核对
2. **WalletConnect 配置**：Project ID 无效会导致连接失败
3. **Monad 链兼容性**：wagmi 可能没有内置 Monad 链，需要自定义
4. **移动端兼容性**：WalletConnect 在移动端的行为可能不同

### 缓解措施
1. **使用注入式连接器优先**：MetaMask 作为主要连接方式，WalletConnect 作为备选
2. **自定义链配置**：在 config.ts 中明确定义 Monad 测试网
3. **完善错误处理**：所有可能的错误场景都有清晰提示
4. **保留 mock fallback**：开发阶段保留 mock 数据，不影响 UI 开发

---

## 下一步

Phase 2 完成后，进入 **Phase 3：核心交易功能**

详细计划见：`docs/superpowers/plans/2026-08-31-phase3-core-transactions.md`（待创建）
