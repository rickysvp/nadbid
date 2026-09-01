# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-09-01

### Added
- 5 大核心交易功能（Phase 3）：拍卖出价、PASS Mint/Burn、质押/解押、奖励领取、仲裁投票
- 通用交易组件：TradeConfirmationModal（4 态确认弹窗）、TransactionStatus（7 态状态展示）、mockTransaction（mock 交易模拟）
- 交易 hooks：useAuctionBid、usePassMintBurn、useStaking、useClaim、useArbitrationVote（7 态状态机 + 完整校验链）
- 债券曲线工具（bondingCurve）：curvePriceAt/supplyAfterMint/supplyAfterBurn，价格计算唯一来源
- 持仓 store（kolHoldingsStore）：PASS 持仓按 KOL 维度管理
- Web3 错误分类升级（web3Errors）：5 类错误 + retryable 标记 + 双签名兼容（toast/fallbackMessage）
- 交易流程文档（docs/transaction-flow.md）：状态机、mock/real 双模式、5 功能业务规则

### Changed
- 合并 workspace 与 AICode 双目录：以 AICode（wagmi v2 Phase 2）为基线，合入 Phase 3 全部产物
- 清理 52 个旧死代码文件至 src/legacy/（tsconfig 排除），TypeScript 错误 112 → 0
- walletStore 新增 refreshBalance(delta)/round2/setBalanceLoader/isRealWalletMode
- 修复 Staking/Claim 页未连接时确认弹窗与连接引导同时弹出的 bug
- web3Errors 统一为双签名兼容版（真实 wagmi hooks + 业务交易 hooks 共用）

### Fixed
- 双目录分叉导致的代码库不一致（见 audit-findings.html）
- Staking/Claim 双弹窗叠加问题
- favicon 缺失导致 403 请求

## [0.2.0] - 2026-09-01

### Added
- Web3 钱包连接完整集成（wagmi v2 + viem v2 + @tanstack/react-query v5）
- 支持 MetaMask（注入式）和 WalletConnect（移动端扫码）
- Monad 测试网（chainId 10143）+ Sepolia 测试网支持
- 钱包连接弹窗（ConnectModal）：动态渲染钱包选项、loading 状态、错误处理、ESC/遮罩/X 关闭
- 钱包按钮组件（ConnectButton）：未连接/已连接状态、下拉菜单、复制地址、区块浏览器、断开连接、dark/light 主题变体
- 网络切换组件（NetworkSwitcher）：compact/full 双模式、一键切换到 Monad 测试网、切换中状态、错误处理
- 账户信息卡片（AccountCard）：钱包头像、地址、余额、网络状态、操作按钮
- 网络错误横幅（WrongNetworkBanner）：检测错误网络、一键切换、可关闭
- 钱包路由守卫（WalletGuard）：未连接时显示连接引导、已连接时渲染内容
- 钱包状态同步器（WalletStateSyncer）：wagmi 状态自动同步到 Zustand store
- 交易 hooks：useWriteContractTx（6 态状态机 + 自动 toast + onSuccess 回调）、useSignMessage、useReadContract
- Web3 错误处理工具（web3Errors）：5 类错误分类、用户拒绝静默、统一 toast 处理
- 合约配置（contracts.ts）：环境变量配置合约地址、最小 ABI 片段、getContractConfig 便捷函数
- 自动重连（auto-reconnect）：页面刷新后自动恢复钱包连接
- 钱包集成交档（docs/wallet-integration.md）：完整架构说明、组件参考、hooks 使用、FAQ
- 环境变量：VITE_WALLETCONNECT_PROJECT_ID、VITE_CONTRACT_PASS/AUCTION/STAKING/DIVIDEND

### Changed
- walletStore 重构：统一为 wagmi 驱动 + mock fallback 的单一 Zustand store，新增 status/isConnecting/connectorId/connectorName/balanceRaw 字段
- Navbar 精简：从 224 行减至 76 行，移除全部 mock 连接逻辑，替换为 ConnectButton 组件
- WalletPage 重构：使用 AccountCard + WalletGuard，移除手写钱包头部和手动连接判断
- 移除 MintBurnPanel 中的乐观余额扣减（改为交易确认后主动刷新，待 Phase 3 实现）
- README.md 更新：添加钱包集成说明、环境变量表、技术栈、项目结构

### Removed
- `src/providers/AppProviders.tsx`（死代码，未被引用，包含重复的 QueryClientProvider）
- `src/components/ui/ToastContainer.tsx`（死代码，仅被 AppProviders 引用）
- `src/stores/userWalletStore.ts`（已统一进 walletStore）
- `src/providers/` 空目录

### Fixed
- wagmi v2 reconnect 导入路径修正（从 @wagmi/core 导入，而非 wagmi）
- ConnectModal 双重 toast 问题（移除 useEffect toast，仅保留 catch 块）
- ConnectModal 错误状态残留（添加 reset() 清除）
- 生产构建成功（5.20s，dist 4.0MB）

### Technical
- 新增依赖：wagmi@^2.19.5、viem@^2.56.1、@tanstack/react-query@^5.102.8、@wagmi/core
- TypeScript 编译：新增/修改文件 0 错误，项目总错误从 118 降至 112（删除死代码减少 6 个）
- 所有 10 个页面正常渲染，无控制台错误
- 14 项全流程测试全部通过

## [0.1.0] - 2026-08-31

### Added
- 完整的前端 UI 实现，包含 10 个页面
- 首页：绿色 HERO + 交互式债券曲线 + 3D 网格特性卡片 + KOL 排名表格
- 拍卖列表页：搜索 + 筛选 + 拍卖卡片网格
- 拍卖详情页：12 栅格布局 + Creator Profile + Live Leaderboard + 圆形倒计时 + Pass Info
- KOL Profile 页：Profile Card + Overview + Bonding Curve + Trade Pass + Dividend Pool + Staking + Historical Auctions
- Staking 页：3 KPI 卡片 + 双栏表格（Available / Staked）
- Claim 页：Pending Rewards + Claim Rules + History 表格
- Points 页：Points Balance + Global Rank + Invite & Earn + 来源拆分 + Referral List
- Arbitration 页：争议卡片 + 投票条 + 统计 + How it works
- Wallet 页：钱包头部 + 资产列表 + Quick Actions + 交易历史
- Docs 页：侧边栏导航 + 手风琴内容 + 6 个文档分区
- 组件库：Badge、Button、Card、Input、StatCard、Table、Countdown、CircularProgress
- 状态管理：Zustand（walletStore、uiStore）
- 路由：React Router 7，10 个页面路由
- Mock 数据：auctions、kols、staking、claims、points
- 设计规范文档：项目总计划 + Phase 1 详细计划
- 版本号规范：VERSIONING.md

### Changed
- 统一视觉风格：深色背景 #161616，绿色主色调 #3ec470，等宽字体
- 统一组件样式：卡片、按钮、标签、表格
- 统一排版：标题 font-black tracking-tight，数据 font-mono，标签 text-[10px] uppercase tracking-[0.15em]
- 响应式布局：桌面端 + 平板 + 移动端适配

### Removed
- `src/legacy/` 整个目录（9 个旧版视图和组件）
- 12 个未使用的旧组件/hooks/utils：
  - BidEngine、DynamicBondingCurve、BondingCurve、PagePlaceholder
  - StakedTable、StakeTable、BurnPanel、MintPanel、StakePanel、TradeSummary
  - useBondingCurve、curve.ts
- 5 个空目录：chart、curve、layout、staking、trade

### Fixed
- HomePage 中 DynamicBondingCurve 引用替换为内联 SVG 曲线
- Tailwind v4 任意值类显式定义（h-[600px]、w-[1500px]、text-[80px] 等）
- 品牌绿色（bg-brand-green）显式定义
- CircularProgress 组件 text-[9px] 类名修复
- ClaimPage motion 动画 bg 属性修复

### Technical
- React 19 + TypeScript 5.8 + Vite 6
- Tailwind CSS 4 + @tailwindcss/vite
- Zustand 5 状态管理
- React Router 7 路由
- Motion 12 动画
- lucide-react 图标
- TypeScript 编译 0 错误
- 生产构建成功

---

## [0.0.0] - 2026-08-31

### Added
- 项目初始化
- 基础前端 Demo 实现
