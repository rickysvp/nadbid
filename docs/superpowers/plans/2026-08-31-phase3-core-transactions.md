# Phase 3: 核心交易功能 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现核心交易功能的完整 UI 交互流程，包括拍卖出价、PASS Mint/Burn、Stake/Unstake、Claim Rewards、仲裁投票。交易状态管理完整，合约调用部分使用占位符（待合约部署后替换 ABI 和地址）。

**Architecture:** 使用 Phase 2 创建的 useWriteContractTx hook 统一管理交易状态。每个交易功能封装为独立的 hook + 组件。交易确认后自动刷新余额和相关数据。Mock 模式下模拟交易延迟和状态变化，不实际发送链上交易。

**Tech Stack:** wagmi v2, viem v2, React Query, Zustand, Phase 2 交易 hooks

**依赖文档:** `docs/superpowers/plans/2026-08-31-project-master-plan.md`, `docs/wallet-integration.md`

---

## 关键约束和前提

### 合约状态
- 智能合约可能尚未部署，ABI 和地址待提供
- 本阶段实现**完整的交易 UI 交互流程**，合约调用部分使用占位符
- `src/web3/contracts.ts` 中已定义最小 ABI 片段和环境变量配置
- 合约部署后，只需更新 ABI 和地址，UI 交互流程无需修改

### Mock 模式
- 未连接钱包或合约未部署时，使用 mock 交易模式
- Mock 模式模拟：交易准备 → 钱包签名（模拟延迟）→ 交易提交 → 链上确认（模拟延迟）→ 成功/失败
- Mock 模式下更新本地状态（持仓、余额、质押等），不实际发送链上交易
- 真实模式下使用 useWriteContractTx hook，交易确认后刷新链上数据

### 交易后状态更新
- 交易成功后自动刷新钱包余额（WalletStateSyncer 或主动刷新）
- 交易成功后更新相关本地状态（持仓数量、质押状态、领取记录等）
- 交易失败后回滚状态变化（如果有乐观更新）
- 使用 toast 通知交易状态（提交、确认、失败）

---

## 文件结构映射

### 需要创建的文件
- `src/hooks/useAuctionBid.ts` — 拍卖出价 hook
- `src/hooks/usePassMintBurn.ts` — PASS Mint/Burn hook
- `src/hooks/useStaking.ts` — Stake/Unstake hook
- `src/hooks/useClaim.ts` — Claim Rewards hook
- `src/hooks/useArbitrationVote.ts` — 仲裁投票 hook
- `src/components/trade/TradeConfirmationModal.tsx` — 交易确认弹窗（通用）
- `src/components/trade/TransactionStatus.tsx` — 交易状态显示组件
- `src/utils/mockTransaction.ts` — Mock 交易工具函数

### 需要修改的文件
- `src/pages/AuctionDetailPage.tsx` — 集成出价功能
- `src/pages/KolProfilePage.tsx` — 集成 Mint/Burn 功能
- `src/components/kol-profile/MintBurnPanel.tsx` — 集成真实交易流程
- `src/pages/StakingPage.tsx` — 集成 Stake/Unstake 功能
- `src/pages/ClaimPage.tsx` — 集成 Claim 功能
- `src/pages/ArbitrationPage.tsx` — 集成投票功能
- `src/stores/walletStore.ts` — 添加余额刷新方法
- `src/web3/WalletStateSyncer.tsx` — 添加主动刷新余额能力

### 需要删除的文件
- 无（保留现有 mock 数据作为 fallback）

---

## Task 1: 创建通用交易组件和 Mock 工具

**Files:**
- Create: `src/components/trade/TradeConfirmationModal.tsx`
- Create: `src/components/trade/TransactionStatus.tsx`
- Create: `src/utils/mockTransaction.ts`
- Create: `src/components/trade/index.ts`

- [ ] **Step 1: 创建 Mock 交易工具函数**

Create `src/utils/mockTransaction.ts`:

```typescript
/**
 * Mock 交易工具函数
 * 用于合约未部署或未连接钱包时，模拟交易流程
 */

export interface MockTransactionOptions {
  /** 模拟准备时间（ms），默认 500 */
  prepareDelay?: number;
  /** 模拟签名时间（ms），默认 1000 */
  signDelay?: number;
  /** 模拟确认时间（ms），默认 2000 */
  confirmDelay?: number;
  /** 模拟失败概率（0-1），默认 0 */
  failureRate?: number;
  /** 失败原因 */
  failureReason?: string;
}

export interface MockTransactionResult {
  txHash: string;
  success: boolean;
  error?: string;
}

/**
 * 模拟交易流程
 * 返回 Promise，在模拟确认后 resolve
 */
export async function executeMockTransaction(
  options: MockTransactionOptions = {}
): Promise<MockTransactionResult> {
  const {
    prepareDelay = 500,
    signDelay = 1000,
    confirmDelay = 2000,
    failureRate = 0,
    failureReason = 'Transaction failed',
  } = options;

  // 模拟准备
  await delay(prepareDelay);

  // 模拟签名
  await delay(signDelay);

  // 生成模拟 txHash
  const txHash = '0x' + Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');

  // 模拟确认
  await delay(confirmDelay);

  // 模拟失败
  if (Math.random() < failureRate) {
    return { txHash, success: false, error: failureReason };
  }

  return { txHash, success: true };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 生成模拟 txHash
 */
export function generateMockTxHash(): string {
  return '0x' + Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}
```

- [ ] **Step 2: 创建交易状态显示组件**

Create `src/components/trade/TransactionStatus.tsx`:
- 显示交易状态：idle / preparing / pending / confirming / success / error
- 每种状态有对应的图标、颜色、文字
- success 状态显示 txHash 链接（可点击到区块浏览器）
- error 状态显示错误信息
- 使用 motion/react 做状态切换动画

- [ ] **Step 3: 创建通用交易确认弹窗**

Create `src/components/trade/TradeConfirmationModal.tsx`:
- 通用交易确认弹窗，用于所有交易类型
- Props：open、onClose、title、description、交易详情（金额、地址等）、confirmText、cancelText、onConfirm、status、txHash、error
- 状态流程：
  - 确认状态：显示交易详情 + 确认/取消按钮
  - 准备中：显示 loading spinner + "Preparing transaction..."
  - 签名中：显示 loading spinner + "Waiting for wallet signature..."
  - 提交中：显示 loading spinner + "Submitting transaction..."
  - 确认中：显示 loading spinner + "Waiting for confirmation..." + txHash
  - 成功：显示成功图标 + "Transaction confirmed!" + txHash 链接 + 关闭按钮
  - 失败：显示错误图标 + 错误信息 + 重试/关闭按钮
- 使用 motion/react 做动画
- 使用 useToast 做通知

- [ ] **Step 4: 创建 barrel export**

Create `src/components/trade/index.ts`:
```typescript
export { TradeConfirmationModal } from './TradeConfirmationModal';
export { TransactionStatus } from './TransactionStatus';
```

- [ ] **Step 5: 运行 TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 新增文件 0 错误

- [ ] **Step 6: 启动 dev server 验证**

访问: `http://localhost:3000/`
Expected: 页面正常渲染，组件可正常导入（不实际使用，只验证编译）

- [ ] **Step 7: Commit**

```bash
git add src/components/trade/ src/utils/mockTransaction.ts
git commit -m "feat: 创建通用交易组件和 Mock 工具"
```

---

## Task 2: 拍卖出价功能

**Files:**
- Create: `src/hooks/useAuctionBid.ts`
- Modify: `src/pages/AuctionDetailPage.tsx`

- [ ] **Step 1: 创建拍卖出价 hook**

Create `src/hooks/useAuctionBid.ts`:
- 封装拍卖出价逻辑
- 支持 mock 模式和真实模式
- 状态：idle / preparing / signing / pending / confirming / success / error
- 方法：placeBid(auctionId, bidAmount)
- 出价前验证：
  - 钱包已连接
  - 网络正确（Monad Testnet）
  - 拍卖状态为 LIVE
  - 出价金额 > 当前最高价
  - 余额足够
- 出价成功后：
  - 更新拍卖当前最高价
  - 更新最后出价者
  - 刷新钱包余额
  - 添加到出价历史
- 出价失败后：
  - 显示错误信息
  - 不更新状态
- 使用 useWriteContractTx（真实模式）或 executeMockTransaction（mock 模式）

- [ ] **Step 2: 修改拍卖详情页集成出价功能**

Modify `src/pages/AuctionDetailPage.tsx`:
- 导入 useAuctionBid hook
- 出价按钮点击后打开 TradeConfirmationModal
- 显示出价金额输入框（固定出价金额，便士拍卖每次出价固定金额）
- 显示出价规则（每次出价金额、倒计时延长规则等）
- 交易状态显示在出价区域
- 出价成功后更新页面数据（当前最高价、最后出价者、倒计时）
- 未连接钱包时，出价按钮点击后打开 ConnectModal
- 网络错误时，出价按钮显示警告

- [ ] **Step 3: 运行 TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 新增/修改文件 0 错误

- [ ] **Step 4: 启动 dev server 验证**

访问: `http://localhost:3000/auctions/auc-001`
Expected:
- 出价按钮正常显示
- 点击出价打开确认弹窗
- Mock 出价流程正常（准备 → 签名 → 提交 → 确认 → 成功）
- 出价成功后页面数据更新
- 出价失败显示错误信息
- 未连接钱包时引导连接

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAuctionBid.ts src/pages/AuctionDetailPage.tsx
git commit -m "feat: 拍卖出价功能"
```

---

## Task 3: PASS Mint/Burn 功能

**Files:**
- Create: `src/hooks/usePassMintBurn.ts`
- Modify: `src/components/kol-profile/MintBurnPanel.tsx`
- Modify: `src/pages/KolProfilePage.tsx`

- [ ] **Step 1: 创建 PASS Mint/Burn hook**

Create `src/hooks/usePassMintBurn.ts`:
- 封装 PASS Mint 和 Burn 逻辑
- 支持 mock 模式和真实模式
- 状态：idle / preparing / signing / pending / confirming / success / error
- 方法：
  - mintPass(kolHandle, amount) — 铸造 PASS
  - burnPass(kolHandle, amount) — 销毁 PASS
- Mint 前验证：
  - 钱包已连接
  - 网络正确
  - 余额足够（计算 mint 成本）
  - 数量 > 0
- Burn 前验证：
  - 钱包已连接
  - 持仓数量足够
  - 数量 > 0
- 交易成功后：
  - 更新持仓数量
  - 刷新钱包余额
  - 更新债券曲线价格
- 使用 useWriteContractTx 或 executeMockTransaction

- [ ] **Step 2: 修改 MintBurnPanel 组件**

Modify `src/components/kol-profile/MintBurnPanel.tsx`:
- 导入 usePassMintBurn hook
- Mint/Burn 按钮点击后打开 TradeConfirmationModal
- 显示交易详情（数量、预估成本、预计收到）
- 交易状态显示在面板中
- 交易成功后更新面板数据（持仓、价格）
- 移除乐观余额扣减（TASK 3 Phase 2 已移除，这里确认不再添加）
- 未连接钱包时引导连接

- [ ] **Step 3: 修改 KOL Profile 页面**

Modify `src/pages/KolProfilePage.tsx`:
- 确保 MintBurnPanel 正确集成
- 交易成功后更新页面数据（Overview 卡片、持仓、债券曲线）
- 添加交易历史显示（可选）

- [ ] **Step 4: 运行 TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 新增/修改文件 0 错误

- [ ] **Step 5: 启动 dev server 验证**

访问: `http://localhost:3000/kols/0xchine`
Expected:
- Mint/Burn 面板正常显示
- 点击 Mint/Burn 打开确认弹窗
- Mock 交易流程正常
- 交易成功后持仓和价格更新
- 未连接钱包时引导连接

- [ ] **Step 6: Commit**

```bash
git add src/hooks/usePassMintBurn.ts src/components/kol-profile/MintBurnPanel.tsx src/pages/KolProfilePage.tsx
git commit -m "feat: PASS Mint/Burn 功能"
```

---

## Task 4: Staking 功能

**Files:**
- Create: `src/hooks/useStaking.ts`
- Modify: `src/pages/StakingPage.tsx`

- [ ] **Step 1: 创建 Staking hook**

Create `src/hooks/useStaking.ts`:
- 封装 Stake 和 Unstake 逻辑
- 支持 mock 模式和真实模式
- 状态：idle / preparing / signing / pending / confirming / success / error
- 方法：
  - stake(kolHandle, passAmount) — 质押 PASS
  - unstake(positionId, passAmount) — 解押 PASS
- Stake 前验证：
  - 钱包已连接
  - 持仓数量足够
  - 数量 > 0
- Unstake 前验证：
  - 钱包已连接
  - 质押数量足够
  - 解押期限已过（如果有锁定期）
- 交易成功后：
  - 更新质押状态
  - 更新持仓数量
  - 刷新钱包余额
- 使用 useWriteContractTx 或 executeMockTransaction

- [ ] **Step 2: 修改 Staking 页面**

Modify `src/pages/StakingPage.tsx`:
- 导入 useStaking hook
- Stake/Unstake 按钮点击后打开 TradeConfirmationModal
- 显示交易详情（KOL、数量、预计收益）
- 交易状态显示在行内或弹窗中
- 交易成功后更新表格数据
- 未连接钱包时引导连接（或使用 WalletGuard）

- [ ] **Step 3: 运行 TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 新增/修改文件 0 错误

- [ ] **Step 4: 启动 dev server 验证**

访问: `http://localhost:3000/staking`
Expected:
- Stake/Unstake 按钮正常显示
- 点击打开确认弹窗
- Mock 交易流程正常
- 交易成功后表格数据更新
- 未连接钱包时引导连接

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useStaking.ts src/pages/StakingPage.tsx
git commit -m "feat: Staking 功能"
```

---

## Task 5: Claim Rewards 功能

**Files:**
- Create: `src/hooks/useClaim.ts`
- Modify: `src/pages/ClaimPage.tsx`

- [ ] **Step 1: 创建 Claim hook**

Create `src/hooks/useClaim.ts`:
- 封装 Claim Rewards 逻辑
- 支持单项领取和批量领取
- 支持 mock 模式和真实模式
- 状态：idle / preparing / signing / pending / confirming / success / error
- 方法：
  - claim(rewardId) — 领取单项奖励
  - claimAll(rewardIds) — 批量领取
- Claim 前验证：
  - 钱包已连接
  - 奖励可领取（状态为 CLAIMABLE）
  - 数量 > 0
- 交易成功后：
  - 更新奖励状态为 CLAIMED
  - 刷新钱包余额
  - 添加到领取历史
- 使用 useWriteContractTx 或 executeMockTransaction

- [ ] **Step 2: 修改 Claim 页面**

Modify `src/pages/ClaimPage.tsx`:
- 导入 useClaim hook
- Claim/Claim All 按钮点击后打开 TradeConfirmationModal
- 显示交易详情（奖励来源、数量、类型）
- 交易状态显示
- 交易成功后更新列表和历史
- 未连接钱包时引导连接

- [ ] **Step 3: 运行 TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 新增/修改文件 0 错误

- [ ] **Step 4: 启动 dev server 验证**

访问: `http://localhost:3000/claim`
Expected:
- Claim/Claim All 按钮正常显示
- 点击打开确认弹窗
- Mock 交易流程正常
- 交易成功后列表和历史更新
- 未连接钱包时引导连接

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useClaim.ts src/pages/ClaimPage.tsx
git commit -m "feat: Claim Rewards 功能"
```

---

## Task 6: 仲裁投票功能

**Files:**
- Create: `src/hooks/useArbitrationVote.ts`
- Modify: `src/pages/ArbitrationPage.tsx`

- [ ] **Step 1: 创建仲裁投票 hook**

Create `src/hooks/useArbitrationVote.ts`:
- 封装仲裁投票逻辑
- 支持 SLASH 和 RELEASE 两种投票
- 支持 mock 模式和真实模式
- 状态：idle / preparing / signing / pending / confirming / success / error
- 方法：
  - vote(disputeId, voteType) — 投票（SLASH / RELEASE）
- 投票前验证：
  - 钱包已连接
  - 持有相关 PASS（有投票权）
  - 争议状态为 ARBITRATING
  - 未投过票（或允许更改投票，根据业务规则）
- 交易成功后：
  - 更新投票比例
  - 更新用户投票状态
  - 刷新钱包余额（如果有 gas 消耗）
- 使用 useWriteContractTx 或 executeMockTransaction

- [ ] **Step 2: 修改仲裁页面**

Modify `src/pages/ArbitrationPage.tsx`:
- 导入 useArbitrationVote hook
- Vote 按钮点击后打开 TradeConfirmationModal
- 显示交易详情（争议 ID、投票类型、投票权）
- 交易状态显示
- 交易成功后更新投票条和状态
- 未连接钱包时引导连接
- 无投票权时显示提示

- [ ] **Step 3: 运行 TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 新增/修改文件 0 错误

- [ ] **Step 4: 启动 dev server 验证**

访问: `http://localhost:3000/arbitration`
Expected:
- Vote 按钮正常显示
- 点击打开确认弹窗
- Mock 投票流程正常
- 投票成功后投票条更新
- 未连接钱包时引导连接
- 无投票权时显示提示

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useArbitrationVote.ts src/pages/ArbitrationPage.tsx
git commit -m "feat: 仲裁投票功能"
```

---

## Task 7: 交易后余额刷新和全局优化

**Files:**
- Modify: `src/stores/walletStore.ts`
- Modify: `src/web3/WalletStateSyncer.tsx`
- Modify: `src/pages/WalletPage.tsx`（可选）
- Modify: 所有交易页面（统一错误处理）

- [ ] **Step 1: 添加余额刷新方法到 walletStore**

Modify `src/stores/walletStore.ts`:
- 添加 `refreshBalance()` 方法
- 真实模式下触发 WalletStateSyncer 重新查询余额
- Mock 模式下重新计算 mock 余额（根据交易历史）

- [ ] **Step 2: 完善 WalletStateSyncer 主动刷新能力**

Modify `src/web3/WalletStateSyncer.tsx`:
- 暴露刷新余额的方法（通过 React Context 或 ref）
- 或者使用 QueryClient 的 invalidateQueries 触发 useBalance 重新查询
- 交易成功后调用刷新

- [ ] **Step 3: 统一所有交易页面的错误处理**

检查所有交易页面：
- 交易失败后显示清晰的错误信息
- 用户拒绝交易不显示错误 toast（静默处理）
- 网络错误显示重试选项
- 合约错误显示具体原因（如果有）
- 使用 web3Errors.ts 中的 classifyWeb3Error 和 handleWeb3Error

- [ ] **Step 4: 运行 TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 0 错误（新增/修改文件）

- [ ] **Step 5: 启动 dev server 全流程验证**

逐项验证：
- [ ] 拍卖出价完整流程
- [ ] PASS Mint 完整流程
- [ ] PASS Burn 完整流程
- [ ] Stake 完整流程
- [ ] Unstake 完整流程
- [ ] Claim 单项领取
- [ ] Claim All 批量领取
- [ ] 仲裁投票（SLASH）
- [ ] 仲裁投票（RELEASE）
- [ ] 交易成功后余额刷新
- [ ] 交易失败错误处理
- [ ] 用户拒绝交易静默处理
- [ ] 未连接钱包引导连接
- [ ] 网络错误提示

- [ ] **Step 6: 运行生产构建检查**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 7: 创建交易功能文档**

Create `docs/transaction-flow.md`:
- 交易架构说明
- 通用交易流程（确认 → 签名 → 提交 → 确认）
- 各交易功能说明（出价、Mint/Burn、Stake、Claim、投票）
- Mock 模式和真实模式切换
- 交易后状态更新机制
- 错误处理说明
- 合约部署后替换指南

- [ ] **Step 8: 最终 Commit**

```bash
git add -A
git commit -m "feat: 交易后余额刷新和全局优化 + 文档"
```

---

## 验收标准

### 功能验收
- [ ] 拍卖出价功能完整（出价、确认、成功/失败、状态更新）
- [ ] PASS Mint/Burn 功能完整
- [ ] Stake/Unstake 功能完整
- [ ] Claim Rewards 功能完整（单项 + 批量）
- [ ] 仲裁投票功能完整（SLASH + RELEASE）
- [ ] 交易确认弹窗统一使用
- [ ] 交易状态显示清晰（准备、签名、提交、确认、成功、失败）
- [ ] 交易成功后余额和相关数据自动刷新
- [ ] 交易失败后错误信息清晰
- [ ] 用户拒绝交易静默处理
- [ ] 未连接钱包时引导连接
- [ ] 网络错误时提示切换

### 技术验收
- [ ] TypeScript 编译 0 错误（新增/修改文件）
- [ ] 生产构建成功
- [ ] 所有交易 hook 类型完整
- [ ] 通用组件复用（TradeConfirmationModal、TransactionStatus）
- [ ] Mock 工具函数统一使用
- [ ] 无硬编码的交易逻辑
- [ ] 合约调用部分使用占位符，待部署后替换

### UX 验收
- [ ] 交易流程流畅，状态变化有明确反馈
- [ ] 交易详情清晰（金额、地址、预估成本）
- [ ] loading 状态有动画和文字提示
- [ ] 成功状态有 txHash 链接
- [ ] 失败状态有错误信息和重试选项
- [ ] toast 通知及时（提交、确认、失败）
- [ ] 未连接钱包引导不突兀
- [ ] 所有页面响应式正常

---

## 风险和依赖

### 关键依赖
1. **智能合约 ABI 和地址**：当前使用最小 ABI 片段和环境变量占位，合约部署后需要替换
2. **Monad 测试网 RPC**：真实交易需要 RPC 节点稳定可用
3. **钱包连接**：交易功能依赖 Phase 2 的钱包连接
4. **Mock 数据**：交易状态更新依赖现有 mock 数据结构

### 主要风险
1. **合约未部署**：无法测试真实交易，只能使用 mock 模式
2. **ABI 不完整**：最小 ABI 片段可能缺少某些方法，部署后需要补充
3. **交易状态同步**：交易成功后链上状态更新可能有延迟，需要处理轮询或事件监听
4. **Gas 估算**：真实交易需要估算 gas，当前 mock 模式不涉及

### 缓解措施
1. **Mock 模式优先**：先实现完整的 mock 交易流程，合约部署后只需替换合约调用部分
2. **统一交易 hook**：所有交易使用相同的状态管理和错误处理，替换合约调用不影响 UI
3. **乐观更新 + 回滚**：交易提交后乐观更新状态，失败后回滚（当前 mock 模式直接更新）
4. **文档完整**：详细记录合约部署后需要替换的部分

---

## 下一步

Phase 3 完成后，进入 **Phase 4：数据层升级**

详细计划见：`docs/superpowers/plans/2026-08-31-phase4-data-layer.md`（待创建）

Phase 4 核心内容：
- 智能合约事件监听
- 从 mock 数据切换到真实链上数据
- 实时更新（拍卖、出价、质押状态）
- 后端 API 集成（Points 系统、推荐系统）
- 数据缓存和优化
