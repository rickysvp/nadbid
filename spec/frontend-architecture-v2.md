# KOLFi / nadbid.fun — 前端架构与开发 SPEC v2.0

> **基于现有 DEMO 代码的正式开发规范。视觉风格保持不变，解决架构、工程化、重复代码、硬编码、死代码问题。**
> 代码基线：11 个源文件 / 2,897 行 / React 19 + TS + Vite 6 + Tailwind v4 + Motion + Lucide

---

## 1. 视觉规范（保持现有 DEMO 风格，不改变）

### 1.1 色彩系统（从现有代码提取，统一为 Design Tokens）

| Token | 值 | 用途 | 代码中的出现位置 |
|---|---|---|---|
| `--bg-canvas` | `#000000` / transparent | 页面画布（内页用 transparent 透出全局深色背景） | 所有页面 `bg-transparent` |
| `--bg-card` | `#161616` | 主卡片背景 | 所有页面卡片 `bg-[#161616]` |
| `--bg-inner` | `#0f0f0f` | 卡片内层 / 表格头 / 数据块 | `bg-[#0f0f0f]` |
| `--bg-input` | `#0a0a0a` | 输入框 / 图表区 | `bg-[#0a0a0a]` |
| `--bg-hover` | `rgba(255,255,255,0.02)` | hover 行背景 | `hover:bg-white/[0.02]` |
| `--border-default` | `rgba(255,255,255,0.04)` | 默认边框 | `border-white/[0.04]` |
| `--border-strong` | `rgba(255,255,255,0.08)` | 强调边框 / 表格分隔 | `border-white/[0.08]` |
| `--border-input` | `rgba(255,255,255,0.1)` | 输入框边框 | `border-white/10` |
| `--text-primary` | `#FFFFFF` | 主文字 | `text-white` |
| `--text-secondary` | `rgba(255,255,255,0.5)` | 次级文字 / 描述 | `text-white/50` |
| `--text-tertiary` | `rgba(255,255,255,0.4)` | 三级文字 / 标签 | `text-white/40` |
| `--text-quaternary` | `rgba(255,255,255,0.3)` | 四级文字 / 占位 | `text-white/30` |
| `--accent-green` | `#3ec470` | 主色 / CTA / 上涨 / 成功 | `text-[#3ec470]`, `bg-[#3ec470]` |
| `--accent-green-hover` | `#4ade80` | CTA hover | `hover:bg-[#4ade80]` |
| `--accent-green-soft` | `rgba(62,196,112,0.1)` | 绿色标签背景 | `bg-[#3ec470]/10` |
| `--accent-green-border` | `rgba(62,196,112,0.3)` | 绿色标签边框 | `border-[#3ec470]/30` |
| `--accent-green-glow` | `rgba(62,196,112,0.1)` | 绿色发光阴影 | `shadow-[0_0_15px_rgba(62,196,112,0.1)]` |
| `--accent-purple` | `#a855f7` | 辅助色 / 曲线渐变 / 点缀 | `#a855f7` (App.tsx curve) |
| `--accent-amber` | `#fbbf24` | 警告 / Refund 标签 | `text-[#fbbf24]` |
| `--accent-red` | `#ef4444` | 错误 / 危险 | (Toaster error) |

### 1.2 字体规范

| 用途 | 字体 | 代码 |
|---|---|---|
| 标题 / 正文 | Inter (400-900) | `font-sans` |
| 数字 / 价格 / 地址 / 倒计时 | IBM Plex Mono (500-700) | `font-mono` |

**强制规则**：
- 所有价格、数量、倒计时、钱包地址、TVL 数字必须用 `font-mono`
- 所有 section 标签必须用 `uppercase tracking-[0.15em] text-[9-10px] font-bold text-white/40`
- 大标题用 `font-black tracking-tight`

### 1.3 圆角与阴影

| 元素 | 圆角 | 阴影 |
|---|---|---|
| 主卡片 | `rounded-lg` / `rounded-xl` | 无（靠边框区分） |
| 拍卖卡片 | `rounded-2xl` | 无 |
| 按钮 | `rounded` / `rounded-lg` | CTA 绿色发光 `shadow-[0_0_15px_rgba(62,196,112,0.1)]` |
| 标签 | `rounded` / `rounded-full` | 无 |
| 输入框 | `rounded` / `rounded-lg` / `rounded-full` | 无 |

**禁止**：硬阴影（`shadow-neo-*`）、模糊大阴影（`shadow-2xl`）。现有 `index.css` 中的 `--shadow-brutal-*` 和 `text-shadow-brutal` 是死代码，必须删除。

### 1.4 间距与布局

- 页面顶部 padding：`pt-32`（给 fixed navbar 留空间）
- 页面底部 padding：`pb-24`
- 内容最大宽度：`max-w-[1200px]` 或 `max-w-[1400px]`
- 水平 padding：`px-6 lg:px-12`
- 卡片间距：`gap-6` / `gap-8`
- 卡片内 padding：`p-5` / `p-6` / `p-8`

---

## 2. 目录结构规范（从 11 个平铺文件重构为模块化结构）

```
src/
├── main.tsx                    # 入口（保持）
├── App.tsx                     # 路由 + 全局 Provider（重构，移除内联组件）
├── index.css                   # Design Tokens + 全局样式（清理死代码）
│
├── app/                        # 应用骨架
│   ├── AppLayout.tsx           # Navbar + Footer + Outlet
│   ├── Navbar.tsx              # 从 App.tsx 提取
│   └── Footer.tsx              # 从 App.tsx 提取（当前无 Footer，需新增）
│
├── pages/                      # 页面级组件（每个文件 < 300 行）
│   ├── HomePage.tsx            # 从 App.tsx Hero + KOLRank + Partners 提取
│   ├── AuctionsPage.tsx        # AuctionsView 重命名
│   ├── AuctionDetailPage.tsx   # AuctionDetailView 重命名
│   ├── KolProfilePage.tsx      # ProfileView 重命名
│   ├── StakingPage.tsx         # StakingView 重命名
│   ├── ClaimPage.tsx           # ClaimView 重命名
│   ├── PointsPage.tsx          # PointsView 重命名
│   ├── ArbitrationPage.tsx     # 新增（SPEC §4.8）
│   ├── WalletPage.tsx          # 新增（SPEC §4.9）
│   └── DocsPage.tsx            # 新增（替换 "Coming Soon"）
│
├── components/                 # 可复用组件
│   ├── ui/                     # 基础 UI 组件
│   │   ├── Button.tsx          # 4 级按钮（Primary/Secondary/Ghost/Danger）
│   │   ├── Card.tsx            # 统一卡片容器
│   │   ├── Badge.tsx           # 状态标签（LIVE/UPCOMING/ENDED/SETTLED...）
│   │   ├── Input.tsx           # 统一输入框
│   │   ├── Table.tsx           # 统一表格（thead/tbody/row）
│   │   ├── StatCard.tsx        # KPI 数据卡
│   │   ├── Countdown.tsx       # 倒计时（统一 useCountdown）
│   │   ├── CircularProgress.tsx# 从 AuctionDetailView 提取
│   │   └── Toast.tsx           # 从 Toaster.tsx 提取 + 优化
│   │
│   ├── layout/                 # 布局组件
│   │   ├── PageHeader.tsx      # 页面标题 + 描述 + 操作区
│   │   └── SectionHeader.tsx   # section 标题
│   │
│   ├── kol/                    # KOL 相关组件
│   │   ├── KolAvatar.tsx       # 统一头像（dicebear + fallback）
│   │   ├── KolCard.tsx         # KOL 卡片（拍卖列表用）
│   │   ├── KolSummary.tsx      # KOL 概要（详情页左侧）
│   │   └── KolRankRow.tsx      # 排名行（首页 KOLRank）
│   │
│   ├── auction/                # 拍卖相关组件
│   │   ├── AuctionCard.tsx     # 从 AuctionsView 提取
│   │   ├── BidBoard.tsx        # 出价排行榜
│   │   ├── BidEngine.tsx       # 出价操作面板
│   │   └── LatestBidder.tsx    # 最后出价者
│   │
│   ├── curve/                  # Bonding Curve 组件（统一三处实现）
│   │   ├── BondingCurve.tsx    # 主曲线组件（统一算法）
│   │   ├── CurveChart.tsx      # SVG 曲线渲染
│   │   └── CurveTooltip.tsx    # Hover tooltip
│   │
│   ├── trade/                  # 交易操作组件
│   │   ├── MintPanel.tsx       # 从 ProfileView 提取
│   │   ├── BurnPanel.tsx       # 从 ProfileView 提取
│   │   ├── StakePanel.tsx      # 从 ProfileView 提取
│   │   └── TradeSummary.tsx    # 价格明细（subtotal/fees/total）
│   │
│   └── staking/                # 质押相关
│       ├── StakeTable.tsx      # 可质押列表
│       └── StakedTable.tsx     # 已质押列表
│
├── hooks/                      # 自定义 Hooks
│   ├── useCountdown.ts         # 统一倒计时（消除 AuctionsView + AuctionDetailView 重复）
│   ├── useBondingCurve.ts      # 统一曲线计算（消除三处不一致）
│   ├── useToast.ts             # Toast 管理
│   ├── useWallet.ts            # 钱包连接状态（从 WalletMenu 提取到全局）
│   ├── useAuctions.ts          # 拍卖数据查询
│   ├── useKolProfile.ts        # KOL 数据查询
│   └── useStaking.ts           # 质押数据查询
│
├── stores/                     # 状态管理（Zustand）
│   ├── walletStore.ts          # 钱包全局状态（连接/地址/余额）
│   ├── auctionStore.ts         # 拍卖状态（选中的拍卖/筛选）
│   └── uiStore.ts              # UI 状态（toast/modal/drawer）
│
├── services/                   # API / 链上服务层
│   ├── api/                    # REST API 封装
│   │   ├── httpClient.ts       # fetch 封装（baseURL/interceptor）
│   │   ├── auctionApi.ts       # 拍卖相关接口
│   │   ├── kolApi.ts           # KOL 相关接口
│   │   ├── stakingApi.ts       # 质押相关接口
│   │   └── claimApi.ts         # 领取相关接口
│   └── web3/                   # 链上交互
│       ├── walletConnector.ts  # 钱包连接（Monad）
│       ├── contractAddresses.ts# 合约地址配置（消除硬编码）
│       └── abi/                # 合约 ABI
│
├── types/                      # TypeScript 类型定义（消除 any）
│   ├── index.ts                # 导出所有类型
│   ├── kol.ts                  # KOL 类型
│   ├── auction.ts              # 拍卖类型
│   ├── pass.ts                 # PASS NFT 类型
│   ├── staking.ts              # 质押类型
│   ├── claim.ts                # 领取类型
│   ├── points.ts               # 积分类型
│   ├── wallet.ts               # 钱包类型
│   └── api.ts                  # API 响应类型
│
├── data/                       # Mock 数据（从组件内提取到统一层）
│   ├── mockAuctions.ts         # 从 AuctionsView 提取
│   ├── mockBidders.ts          # 从 AuctionDetailView 提取
│   ├── mockKols.ts             # 从 App.tsx KOLRank 提取
│   ├── mockStaking.ts          # 从 StakingView 提取
│   ├── mockClaim.ts            # 从 ClaimView 提取
│   └── mockPoints.ts           # 从 PointsView 提取
│
├── utils/                      # 工具函数
│   ├── format.ts               # 数字/地址/时间格式化
│   ├── curve.ts                # Bonding curve 计算函数（统一算法）
│   ├── cn.ts                   # className 合并
│   └── constants.ts            # 全局常量（消除魔法数字）
│
└── config/                     # 配置
    ├── env.ts                  # 环境变量类型化
    ├── routes.ts               # 路由配置
    └── designTokens.ts         # Design Tokens（TS 可引用）
```

---

## 3. 架构规范

### 3.1 路由方案

**现状问题**：无路由库，`useState('Home')` 切换视图，导致：
- 拍卖详情页无法分享 URL
- 浏览器前进/后退失效
- 页面刷新后回到首页

**方案**：引入 `react-router-dom` v6

```tsx
// config/routes.ts
export const routes = [
  { path: '/', element: <HomePage /> },
  { path: '/auctions', element: <AuctionsPage /> },
  { path: '/auctions/:id', element: <AuctionDetailPage /> },
  { path: '/kols/:handle', element: <KolProfilePage /> },
  { path: '/staking', element: <StakingPage /> },
  { path: '/claim', element: <ClaimPage /> },
  { path: '/points', element: <PointsPage /> },
  { path: '/arbitration', element: <ArbitrationPage /> },
  { path: '/wallet', element: <WalletPage /> },
  { path: '/docs', element: <DocsPage /> },
];
```

### 3.2 状态管理方案

**现状问题**：
- 钱包连接状态锁死在 `WalletMenu` 内部，其他页面无法感知
- 各页面用本地 `useState` 管理 mock 数据，无法共享
- 无全局 toast 管理（用 window CustomEvent hack）

**方案**：引入 `zustand`（轻量，适合当前规模）

```tsx
// stores/walletStore.ts
interface WalletState {
  isConnected: boolean;
  address: string | null;
  balanceMon: number;
  connect: () => Promise<void>;
  disconnect: () => void;
}
```

### 3.3 API 层方案

**现状问题**：无 API 层，6 个文件各自硬编码 mock 数据。

**方案**：
- `services/api/httpClient.ts` — 统一 fetch 封装（baseURL、错误处理、拦截器）
- `services/api/*.ts` — 按领域拆分接口
- `data/mock*.ts` — 开发阶段用 mock，通过 `VITE_USE_MOCK=true` 切换
- 正式开发时，API 层返回真实数据，组件层不变

### 3.4 类型安全方案

**现状问题**：大量 `any`（auction props、mock data、event handlers），无统一 types 目录。

**方案**：
- `types/` 目录按领域拆分类型文件
- 所有 props 必须有明确类型，禁止 `any`
- `tsconfig.json` 开启 `strict: true`（当前未开启）
- API 响应类型化，禁止 `as any`

---

## 4. 组件规范（消除重复代码）

### 4.1 必须提取的公共组件（当前重复 3+ 次）

| 组件 | 当前重复位置 | 提取后位置 |
|---|---|---|
| `Countdown` | AuctionsView(64行) + AuctionDetailView(57行) + ProfileView(内联) | `components/ui/Countdown.tsx` |
| `BondingCurve` | App.tsx(292行) + ProfileView(100+行) + AuctionDetailView(67行) | `components/curve/BondingCurve.tsx` |
| `Card` | 所有页面手写 `bg-[#161616] border border-white/[0.04] rounded-lg` | `components/ui/Card.tsx` |
| `Badge` | LIVE/UPCOMING/SETTLED 标签散落各处 | `components/ui/Badge.tsx` |
| `Button` | CTA 按钮样式每页不同 | `components/ui/Button.tsx` |
| `Table` | Staking/Claim/Points/Profile 各写各的 table | `components/ui/Table.tsx` |
| `StatCard` | KPI 数据卡散落 | `components/ui/StatCard.tsx` |
| `KolAvatar` | 5+ 处拼 dicebear URL | `components/kol/KolAvatar.tsx` |
| `TradeSummary` | Mint/Burn/Bid 价格明细重复 | `components/trade/TradeSummary.tsx` |
| `CircularProgress` | AuctionDetailView 内联 | `components/ui/CircularProgress.tsx` |

### 4.2 必须提取的 Hooks

| Hook | 当前重复位置 | 用途 |
|---|---|---|
| `useCountdown(targetDate)` | AuctionsView + AuctionDetailView | 倒计时 |
| `useBondingCurve(params)` | App + Profile + AuctionDetail | 曲线计算 |
| `useToast()` | 全局 window CustomEvent | Toast 管理 |

### 4.3 按钮四级规范（从现有代码提取）

| 级别 | 样式 | 用途 | 代码示例 |
|---|---|---|---|
| Primary | `bg-[#3ec470] text-black hover:bg-[#4ade80] shadow-[0_0_15px_rgba(62,196,112,0.1)]` | 主要 CTA（Mint/Bid/Stake/Claim） | `Mint Pass`, `Place Bid` |
| Secondary | `bg-white/[0.05] border border-white/[0.08] text-white/80 hover:bg-white/[0.1]` | 次要操作（Unstake/Claim单项/Load More） | `Unstake`, `Claim` |
| Ghost | `bg-transparent text-white/50 hover:text-white` | 文字按钮（Back/导航） | `BACK`, `View` |
| Danger | `bg-red-500/10 text-red-400 border border-red-500/30` | 危险操作（Burn/Disconnect） | `Burn`, `Disconnect` |

### 4.4 Badge 状态标签规范（从现有代码提取 + 补全）

| 状态 | 样式 | 用途 |
|---|---|---|
| `LIVE` | `bg-[#3ec470]/10 text-[#3ec470] border border-[#3ec470]/30` + 脉冲点 | 拍卖进行中 |
| `UPCOMING` | `bg-white/5 text-white/40 border border-white/10` | 即将开始 |
| `ENDED` | `bg-white/5 text-white/30 border border-white/10` | 已结束 |
| `SETTLED` | `bg-[#3ec470]/10 text-[#3ec470] border border-[#3ec470]/30` | 已结算 |
| `ARBITRATING` | `bg-orange-400/10 text-orange-400 border border-orange-400/30` | 仲裁中 |
| `FAILED` | `bg-red-400/10 text-red-400 border border-red-400/30` | 失败 |
| `CLAIMABLE` | `bg-[#3ec470]/10 text-[#3ec470] border border-[#3ec470]/30` | 可领取 |
| `STAKE_ACTIVE` | `bg-[#3ec470]/10 text-[#3ec470] border border-[#3ec470]/30` | 质押中 |
| `STAKE_PENDING` | `bg-amber-400/10 text-amber-400 border border-amber-400/30` | 激活中 |
| `UNLOCKING` | `bg-purple-500/10 text-purple-400 border border-purple-500/30` | 解押冷却中 |

---

## 5. 业务逻辑规范（消除不一致）

### 5.1 Bonding Curve 算法统一（当前三处不一致，必须统一）

**现状问题**：
- App.tsx: `price = Math.pow(progress, 3) * 12.4`
- ProfileView: `price = 12.4 * Math.pow(supply / 8492, 2)`
- AuctionDetailView: `price = currentPrice * Math.pow(displayPct, 3)`

**统一方案**：`utils/curve.ts`

```typescript
// 统一指数 bonding curve
export interface CurveParams {
  basePrice: number;      // 第 1 枚价格（MON）
  exponent: number;       // 指数（2 = 二次, 3 = 三次）
  referenceSupply: number; // 参考供应量（用于归一化）
}

export function getPriceAtSupply(supply: number, params: CurveParams): number {
  const normalized = supply / params.referenceSupply;
  return params.basePrice * Math.pow(normalized, params.exponent);
}

export function getMintPrice(qty: number, currentSupply: number, params: CurveParams): number {
  // 买入 qty 枚的平均价格
  let total = 0;
  for (let i = 0; i < qty; i++) {
    total += getPriceAtSupply(currentSupply + i + 1, params);
  }
  return total / qty;
}

export function getBurnPrice(qty: number, currentSupply: number, params: CurveParams): number {
  // 卖出 qty 枚的平均价格（扣 3% spread）
  let total = 0;
  for (let i = 0; i < qty; i++) {
    total += getPriceAtSupply(currentSupply - i, params) * 0.97;
  }
  return total / qty;
}
```

**默认参数**（从现有代码提取）：
- `basePrice = 12.4 MON`
- `exponent = 2`（ProfileView 用的 2 次方，更合理）
- `referenceSupply = 8492`

### 5.2 拍卖状态机

```
UPCOMING → LIVE → ENDED → SETTLED
                ↓            ↓
            (流拍)       ARBITRATING → SETTLED / FAILED
```

每个状态必须有：
- 对应的 Badge 样式（见 §4.4）
- 允许的操作（UPCOMING 不能 bid，LIVE 可以 bid，ENDED 不能操作）
- 倒计时目标（UPCOMING → startTime, LIVE → endTime）

### 5.3 质押状态机

```
FREE_HOLD → (stake) → STAKE_PENDING → (激活期结束) → STAKE_ACTIVE → (unstake) → UNLOCKING → (冷却期结束) → FREE_HOLD
```

**当前 StakingView 的问题**：stake/unstake 只是在两个数组间移动，无锁定期/冷却期。必须按状态机实现。

### 5.4 费用结构统一（从现有代码提取）

| 费用项 | 比例 | 用途 | 代码位置 |
|---|---|---|---|
| Protocol Fee (Mint/Burn) | 3% | 协议费 | ProfileView, AuctionDetailView |
| KOL Royalty (Auction) | 5% | KOL 分成 | AuctionDetailView |
| Treasury (Auction) | 92% | 国库 | AuctionDetailView |
| Burn Spread | 3% | 买卖价差 | ProfileView |
| Claim Fee | 1% | 领取费 | ClaimView |

**必须统一到 `utils/constants.ts`，禁止硬编码在组件内。**

---

## 6. 页面规范

### 6.1 现有页面优化清单

| 页面 | 当前文件 | 主要问题 | 优化方向 |
|---|---|---|---|
| Home | App.tsx 内联 | 842 行单体，含 10 个内联组件 | 拆分为 HomePage + Hero + KOLRank + PartnersMarquee |
| Auctions | AuctionsView.tsx | mock 数据硬编码，AuctionCard 内联 | 提取 AuctionCard，mock 移到 data/ |
| AuctionDetail | AuctionDetailView.tsx | 431 行，CircularProgress/InteractiveBondingCurve 内联 | 提取子组件，统一 curve 算法 |
| KolProfile | ProfileView.tsx | 571 行，curve/stake/mint 全内联，stake MAX 按钮 bug | 拆分为子组件，修复 bug |
| Staking | StakingView.tsx | mock 硬编码，无锁定期/冷却期 | 提取 Table 组件，实现状态机 |
| Claim | ClaimView.tsx | mock 硬编码 | 提取组件，mock 移到 data/ |
| Points | PointsView.tsx | mock 硬编码 | 提取组件，mock 移到 data/ |

### 6.2 缺失页面（必须新增）

#### ArbitrationPage（SPEC §4.8）
- 争议拍卖列表（卡片式）
- 每张卡：dispute status、auction ID、争议原因、当前倾向、投票条、截止时间、Vote/Review 按钮
- 持有相关 PASS 的用户才有投票权
- 投票结果状态：`SLASH / RELEASE / TIED`

#### WalletPage（SPEC §4.9）
- 钱包地址 + 连接状态
- PASS 持仓列表
- 质押状态概览
- 可领取收益汇总
- 拍卖参与历史
- 推荐记录
- 积分记录

#### DocsPage（替换 "Coming Soon"）
- 规则中心：拍卖规则、PASS 机制、质押规则、领取规则、仲裁规则
- 轻说明页，不承载主流程
- Markdown 渲染或静态组件

---

## 7. 硬编码治理清单（必须消除）

| 硬编码内容 | 当前位置 | 治理方案 |
|---|---|---|
| 颜色值 `#3ec470`, `#161616`, `#0f0f0f`, `#0a0a0a` | 所有文件 | 统一为 CSS variables / Tailwind theme tokens |
| 合约地址 `0x742d35Cc6634C0532925a3b844Bc454e4438f44e` | ProfileView.tsx:385 | `services/web3/contractAddresses.ts` |
| 钱包地址 `0x4F8a...3aB9` | WalletMenu.tsx | 从 walletStore 读取 |
| KOL 数据（0xChine, 142.5K followers 等） | ProfileView, App.tsx | `data/mockKols.ts` → 正式开发从 API 读取 |
| 拍卖 mock 数据 | AuctionsView, AuctionDetailView | `data/mockAuctions.ts` → API |
| Bonding curve 参数（12.4, 8492, 指数 2/3） | App, Profile, AuctionDetail | `utils/curve.ts` + `config/designTokens.ts` |
| 费用比例（3%, 5%, 92%, 1%） | Profile, AuctionDetail, Claim | `utils/constants.ts` |
| 倒计时初始值（2d 14h 35m） | ProfileView.tsx:39 | 从 API/合约读取目标时间 |
| Staking mock 数据 | StakingView | `data/mockStaking.ts` → API |
| Claim mock 数据 | ClaimView | `data/mockClaim.ts` → API |
| Points mock 数据 | PointsView | `data/mockPoints.ts` → API |
| dicebear API URL + seed | 5+ 处 | `components/kol/KolAvatar.tsx` 统一封装 |
| 推荐链接 `https://nadbid.fun/ref?code=you` | PointsView.tsx:84 | 从 walletStore + config 生成 |

---

## 8. 死代码清理清单

| 死代码 | 位置 | 处理 |
|---|---|---|
| `--shadow-brutal`, `--shadow-brutal-sm`, `--shadow-brutal-lg` | index.css:11-13 | 删除（代码中未使用） |
| `--color-surface-dark`, `--color-surface-card` | index.css:8-9 | 删除（未使用，实际用 #161616/#0f0f0f） |
| `.text-shadow-brutal` utility | index.css:17-19 | 删除（未使用） |
| `Features = () => null` | App.tsx:536 | 删除（注释说 "Removed, merged into Hero"） |
| 未使用的 imports | 各文件 | tsc --noUnusedLocals 检查后删除 |
| `GeometricBackground` 中大量 SVG circle | App.tsx:757-804 | 简化或删除（当前是装饰性背景，性能开销大） |
| 根目录 `.cjs` 脚本（14 个） | 项目根目录 | 归档到 `scripts/archive/` 或删除 |
| 根目录 `.txt` 参考文件（9 个） | 项目根目录 | 归档到 `docs/references/` 或删除 |
| `temp_auctions.tsx`, `test_curve.tsx` | 项目根目录 | 删除（临时文件） |

---

## 9. 开发路线图（分 4 个阶段）

### 阶段 1：基础设施（1-2 天）
- [ ] 引入 react-router-dom，建立路由体系
- [ ] 引入 zustand，建立 walletStore + uiStore
- [ ] 建立目录结构（pages/components/hooks/stores/services/types/data/utils/config）
- [ ] 清理 index.css 死代码，建立 Design Tokens
- [ ] 开启 tsconfig strict 模式
- [ ] 提取 `useCountdown`, `useToast`, `cn`, `format` 基础工具

### 阶段 2：组件提取（2-3 天）
- [ ] 提取基础 UI 组件（Button/Card/Badge/Input/Table/StatCard/Countdown/CircularProgress/Toast）
- [ ] 提取 BondingCurve 统一组件 + `useBondingCurve` hook
- [ ] 提取 KolAvatar/KolCard/KolSummary
- [ ] 提取 AuctionCard/BidBoard/BidEngine
- [ ] 提取 MintPanel/BurnPanel/StakePanel/TradeSummary
- [ ] 提取 StakeTable/StakedTable
- [ ] 所有 mock 数据移到 `data/` 目录

### 阶段 3：页面重构（3-4 天）
- [ ] 重构 HomePage（从 App.tsx 拆分）
- [ ] 重构 AuctionsPage
- [ ] 重构 AuctionDetailPage
- [ ] 重构 KolProfilePage（修复 stake MAX 按钮 bug）
- [ ] 重构 StakingPage（实现质押状态机）
- [ ] 重构 ClaimPage
- [ ] 重构 PointsPage
- [ ] Navbar + Footer 提取到 AppLayout

### 阶段 4：补全 + 联调（2-3 天）
- [ ] 新增 ArbitrationPage
- [ ] 新增 WalletPage
- [ ] 新增 DocsPage
- [ ] API 层对接（httpClient + 各领域 API）
- [ ] Web3 钱包连接（Monad）
- [ ] 合约地址配置化
- [ ] 根目录清理（.cjs/.txt 临时文件归档）
- [ ] 全量 tsc 类型检查 + 构建验证

---

## 10. 质量门禁

### 10.1 提交前必须通过
```bash
npm run lint      # tsc --noEmit + eslint
npm run build     # vite build 成功
```

### 10.2 禁止项
- 禁止 `any` 类型（API 响应除外，必须立即类型化）
- 禁止硬编码颜色值（用 Design Tokens）
- 禁止硬编码合约地址/钱包地址（用 config）
- 禁止在组件内写 mock 数据（用 data/ 层）
- 禁止重复实现已提取的组件/hook
- 禁止单文件超过 300 行（页面级除外，页面级不超过 400 行）

### 10.3 推荐项
- 每个组件文件只导出一个默认组件
- 每个 hook 文件只导出一个 hook
- Props 类型用 `interface`，不用 `type`
- 所有交互元素有 `aria-label`
- 所有图片有 `alt`

---

*END OF SPEC v2.0 — 基于现有 DEMO 代码的正式开发规范*
