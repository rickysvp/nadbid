# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.3] - 2026-09-11

### Fixed
- **复审 P0（纵深防御）**：KolAuction 继承 `ReentrancyGuard`，给 `claimRefund()` / `sweepRefundDust()` / `claimKol()` 增加 `nonReentrant` 修饰符。注：原 P0 数学上已不可利用（call 先扣 balance + totalRefunded 已递增，重入时 dust 不变），但 ReentrancyGuard 作为纵深防御防止未来代码变更引入重入。新增恶意收款合约重入测试（attackMode 开关，验证重入被阻断后双方仍可正常领取）
- **复审 P1**：`.env.example` 合约地址更新为 v0.8.3 最新部署（原仍指向 2026-09-03 旧合约）
- **复审 P2**：`WalletStateSyncer` 成功同步余额时设置 `balanceStale: false`，修复 RPC 恢复后仍长期显示 stale 的问题
- **复审 P2**：`KolProfilePage` 链上数据未就绪时，曲线图渲染 loading 空态（不再向 `InteractiveBondingCurve` 传默认曲线值），`passTvl` 仅在 `chainDataReady` 时计算
- **复审 P2**：`AuctionDetailPage` / `ArbitrationPage` 预计算 `safeFulfillmentUrl` / `safeDisputeUrl`，避免 JSX 中重复调用 `safeEvidenceUrl()`

### Changed
- Monad 测试网重部署 Registry + Factory（KolAuction 新增 ReentrancyGuard，字节码变更）
  - Registry: `0x08ea3839d47e6d2dfff093be8495102ab4e25aed`
  - Factory: `0xab53835d6c6327d84cfa37656802994c5503d266`
- package.json 版本 → 0.8.3

### Technical
- Foundry 测试 76/76 通过（含恶意合约重入测试 1）
- vitest 前端测试 55/55 通过
- TypeScript 0 错误，vite build 成功

## [0.8.2] - 2026-09-11

### Fixed
- **P0 — 退款池可被任何人提前清空**：`sweepRefundDust()` 原实现直接清扫 `address(this).balance` 全额，攻击者可在竞拍者领取退款前调用此函数将全部余额转入平台国库，后续 `claimRefund()` 因余额不足永久失败。修复：新增 `totalRefunded` 累计已领退款，sweep 只清扫 `balance - (refundPool - totalRefunded)` 的超额部分（整除尾差 + 误转资金），预留金永不被触碰。新增 3 个回归测试（先 sweep 后 claim / 只取超额 / 部分领取后预留）
- **P1 — evidence URI 可触发恶意链接**：合约 `submitFulfillment()`/`dispute()` 新增 `MAX_EVIDENCE_URI_LENGTH=512` 字节上限（防 gas/存储滥用）；前端新增 `safeEvidenceUrl()` 工具，严格限制协议为 `https:` 且域名为 `x.com`/`twitter.com`，不通过校验的 URI 降级为纯文本+安全警告，不再渲染为可点击链接。覆盖 AuctionDetailPage（3 处）+ ArbitrationPage（2 处），10 个单元测试
- **P1 — Solidity 测试未接入根目录验证流程**：package.json 新增 `test:contracts`（`cd contracts && forge test --offline`）和 `test:all`（vitest + forge）脚本，CI 可直接调用
- **P2 — Mint 数量输入可导致浏览器端超长循环**：`estimateMintCostWei()` 新增 `quantity > 50` 守卫（与合约 `MAX_MINT_QUANTITY` 对齐）；MintBurnPanel `qtyNum` 对 mint 上限 50，`maxMintQty` 上限 50，input `max=50`
- **P2 — 钱包余额读取失败时使用本地乐观余额**：新增 `balanceStale` 标志；`refreshBalance()` 链上查询失败时不再退化为本地 delta 推算，改为标记 stale 并保留上次已知值；ConnectButton/AccountCard 显示 `—` 及"RPC unavailable"提示
- **P2 — 链上数据不可用时仍展示默认模拟曲线**：KolProfilePage 新增 `chainDataReady` 标志，供应量/价格未就绪时显示 `—` 而非默认曲线值，防止 RPC 故障时把默认值冒充链上真实数据
- **P2 — 前端最多枚举 100 个 PASS**：`MAX_ENUM_TOKENS` 从 100 提高到 500（合约单笔 burn 上限 50，用户可分多笔）

### Changed
- Monad 测试网重部署 Registry + Factory（KolAuction 字节码内嵌于 Factory，P0/P1 修复后必须重部署）
  - Registry: `0xe2fcfa7db774de8dea8fd8bf039d12b1e591fe1a`
  - Factory: `0xae7f75ffc10a098cf99261a664203a1fa62c06fc`
- foundry.toml 注释说明部署需加 `--disable-code-size-limit`（Monad 128KB 上限 vs 本地 24KB 检查）
- package.json 版本 → 0.8.2

### Technical
- Foundry 测试 75/75 通过（含 P0 回归 3 + URI 长度 2）
- vitest 前端测试 55/55 通过（含 evidenceUrl 10）
- TypeScript 0 错误，vite build 成功

## [0.8.1] - 2026-09-10

### Added
- **KolPass 滑点防护（D7）**：`mint(quantity, maxCost)` 新增 `maxCost` 参数——用户提交后若其他交易先推高供应导致实际总花费（含 8% 费）超过 `maxCost`，整笔 revert（错误码 `SLIPPAGE`），防止按意外高价成交
- **KolPass burn 滑点防护**：`burn(tokenIds, minRefund)` 新增 `minRefund` 参数——实际净返还低于 `minRefund` 时整笔 revert，防止按意外低价成交
- **KolPass 挤兑防护**：新增 `MAX_BURN_QUANTITY = 50`，与 `MAX_MINT_QUANTITY` 对齐，强制大户分批回购，阻断"一键砸盘"与单笔巨额转账失败（`REFUND_FAIL` 导致整笔回滚）

### Changed
- 前端 `MintBurnPanel` / `useKolPass` / `contracts.ts` 同步新 ABI：mint/burn 调用传入滑点参数（基于当前报价 + 缓冲计算 maxCost/minRefund）
- Monad 测试网重部署 Registry + Factory（KolPass 字节码内嵌于 Factory，必须重部署才能生效）
  - Registry: `0x37bc1212d2f67bfba4050688ecd15218ce6c2740`
  - Factory: `0x69541d1cfa4f1c9aa41b359273e9bb810e206422`
- package.json 版本 → 0.8.1

### Technical
- Foundry 测试 70/70 通过（含新增滑点 revert 测试）
- vitest 前端测试 45/45 通过
- vite build 成功

## [0.4.0] - 2026-09-02

### Added
- **链上合约层（Foundry）**：NadbidRegistry（KOL 入驻 + 10 MON 担保 + 48h 赎回）、NadbidFactory（创建 KolPass/KolAuction）、KolPass（债券曲线 ERC721 + 8% 手续费即时拆分）、KolAuction（便士拍卖 + 40s 倒计时重置 + 结算 20/80）
- 合约测试：18 项全通过（4 合约单测 + 集成全流程）
- 部署脚本（contracts/script/Deploy.s.sol）：Monad 测试网（chainId 10143）一键部署三笔交易
- **前端真实 ABI**：contracts.ts 从编译 artifacts 提取 4 合约真实 ABI，contractAddresses 从环境变量读取 registry/factory
- **链上 hooks**：useKolPass（curvePrice/totalSupply/mint）、useAuction（getAuction/placeBid/settle + BidPlaced 事件订阅）、useRegistry（registerKol/depositBond/赎回）、useFactory（createKolPass/createKolAuction）
- **后端 X API 粉丝验证服务**（server/）：Express + `POST /api/kol/verify-twitter`，粉丝 ≥ 1 万通过，无 token 时 mock fallback
- **KOL 入驻页**（/kol/onboarding）：5 步流程（连接钱包 → 验证推特 → 质押 10 MON → 创建 PASS → 创建拍卖），链上状态自动推导步骤
- 拍卖详情页链上双路径（0x 地址 → 链上真实数据 + BidPlaced 事件驱动刷新；mock id 回退兼容）
- KolProfile / 首页拍卖列表链上双路径（Registry 索引 + 各 KolAuction 状态；合约未部署时 mock 回退）

### Changed
- package.json 版本 → 0.4.0
- Monad 测试网合约上限确认 128KB（非以太坊 24KB），Foundry via_ir 编译

### Fixed
- Deploy.s.sol 缺失 console2 import（原 organizer 失败根因）
- "contract size limit" 误报（Monad 128KB 上限 vs forge 本地以太坊默认 24KB，用 --disable-code-size-limit）

### Technical
- Foundry 1.5.1 + OpenZeppelin 5.3.0 + forge-std
- 前端 tsc 0 错误、build 成功、合约 18/18 测试通过
- 部署后需填 VITE_CONTRACT_REGISTRY / VITE_CONTRACT_FACTORY + X_API_BEARER_TOKEN

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
