# Phase 1: 前端 UI 完成 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成所有页面 UI 优化，统一视觉风格，清理 legacy 代码，达到商业化上线的前端 UI 标准。

**Architecture:** 基于现有 React 19 + TypeScript + Tailwind CSS 4 架构，按照 demo 设计风格（深色背景 #161616、绿色主色调 #3ec470、等宽字体、高密度信息布局）统一所有页面，清理无用代码，建立组件规范。

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, Zustand 5, React Router 7, Motion 12, lucide-react

**依赖文档:** `docs/superpowers/plans/2026-08-31-project-master-plan.md`

---

## 文件结构映射

### 需要修改的文件
- `src/pages/ArbitrationPage.tsx` — 优化仲裁页面视觉风格
- `src/pages/WalletPage.tsx` — 优化钱包页面视觉风格
- `src/pages/DocsPage.tsx` — 小幅度优化文档页面
- `src/components/ui/Badge.tsx` — 统一 Badge 组件变体
- `src/components/ui/Button.tsx` — 统一 Button 组件变体
- `src/index.css` — 统一样式规范和 Tailwind 配置
- `src/App.tsx` — 清理路由和布局

### 需要删除的文件/目录
- `src/legacy/` — 整个 legacy 目录（包含旧版视图和组件）
- `src/components/auction/BidEngine.tsx` — 旧版出价引擎（已被新页面替代）
- `src/components/chart/DynamicBondingCurve.tsx` — 旧版债券曲线（已被新实现替代）
- `src/components/curve/BondingCurve.tsx` — 旧版债券曲线组件
- `src/components/layout/PagePlaceholder.tsx` — 页面占位组件
- `src/components/staking/StakedTable.tsx` — 旧版质押表格
- `src/components/staking/StakeTable.tsx` — 旧版可质押表格
- `src/components/trade/BurnPanel.tsx` — 旧版 Burn 面板
- `src/components/trade/MintPanel.tsx` — 旧版 Mint 面板
- `src/components/trade/StakePanel.tsx` — 旧版 Stake 面板
- `src/components/trade/TradeSummary.tsx` — 旧版交易摘要
- `src/hooks/useBondingCurve.ts` — 旧版债券曲线 hook
- `src/utils/curve.ts` — 旧版曲线计算工具

### 需要创建的文件
- `src/config/uiConstants.ts` — UI 常量统一管理（颜色、间距、字体等）
- `docs/ui-style-guide.md` — UI 风格规范文档

---

## Task 1: 优化 Arbitration 页面

**Files:**
- Modify: `src/pages/ArbitrationPage.tsx`

**目标:** 按照 demo 设计风格优化仲裁页面，统一视觉元素。

- [ ] **Step 1: 审查当前 ArbitrationPage 实现**

阅读 `src/pages/ArbitrationPage.tsx`，识别与 demo 风格不一致的地方：
- 卡片圆角应为 `rounded-2xl` 或 `rounded-lg`
- 背景色应为 `bg-[#161616]`
- 边框应为 `border-white/[0.04]`
- 标题字体应为 `font-black`
- 数据应使用等宽字体 `font-mono`

- [ ] **Step 2: 优化争议卡片视觉**

修改 `renderDisputeCard` 函数：
1. 卡片容器：`bg-[#161616] border border-white/[0.04] rounded-2xl overflow-hidden`
2. 标题区域：添加 KOL 头像和 handle 显示
3. 投票条：使用渐变背景，添加动画效果
4. 按钮：统一使用 `Button` 组件，`Vote Slash` 使用 `variant="danger"`，`Vote Release` 使用默认绿色

- [ ] **Step 3: 优化页面头部和统计卡片**

1. 页面标题：`text-3xl font-black tracking-tight text-white`
2. 统计卡片：统一使用 `bg-[#161616] border border-white/[0.04] rounded-xl p-5`
3. 统计数字：`font-mono text-2xl font-black`

- [ ] **Step 4: 运行 TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 5: 启动 dev server 验证页面渲染**

Run: `npm run dev`
访问: `http://localhost:3000/arbitration`
Expected: 页面正常渲染，无控制台错误，视觉风格与其他页面统一

- [ ] **Step 6: Commit**

```bash
git add src/pages/ArbitrationPage.tsx
git commit -m "feat: optimize Arbitration page UI style"
```

---

## Task 2: 优化 Wallet 页面

**Files:**
- Modify: `src/pages/WalletPage.tsx`

**目标:** 按照 demo 设计风格优化钱包页面，统一视觉元素。

- [ ] **Step 1: 审查当前 WalletPage 实现**

阅读 `src/pages/WalletPage.tsx`，识别与 demo 风格不一致的地方。

- [ ] **Step 2: 优化钱包头部卡片**

1. 卡片背景：`bg-gradient-to-br from-[#161616] via-[#0f0f0f] to-[#0a0a0a]`
2. 钱包图标：绿色渐变背景 `bg-gradient-to-br from-[#3ec470] to-[#2a9d54]`
3. 地址显示：`font-mono text-2xl font-black`
4. 余额显示：`font-mono text-5xl font-black`

- [ ] **Step 3: 优化资产列表和交易历史**

1. PASS Holdings 列表：统一行高和间距
2. Quick Actions 按钮：统一使用 `Button` 组件
3. 交易历史表格：表头 `bg-[#0f0f0f]`，数据行 `hover:bg-white/[0.01]`

- [ ] **Step 4: 优化未连接状态**

1. 未连接时的引导卡片：居中布局，清晰的 CTA
2. Connect Wallet 按钮：绿色主按钮 `bg-[#3ec470] text-black`

- [ ] **Step 5: 运行 TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 6: 启动 dev server 验证页面渲染**

访问: `http://localhost:3000/wallet`
Expected: 页面正常渲染，无控制台错误

- [ ] **Step 7: Commit**

```bash
git add src/pages/WalletPage.tsx
git commit -m "feat: optimize Wallet page UI style"
```

---

## Task 3: 优化 Docs 页面

**Files:**
- Modify: `src/pages/DocsPage.tsx`

**目标:** 小幅度优化文档页面，确保视觉风格统一。

- [ ] **Step 1: 审查当前 DocsPage 实现**

阅读 `src/pages/DocsPage.tsx`，当前实现已较完整，主要检查细节一致性。

- [ ] **Step 2: 优化侧边栏导航**

1. 侧边栏容器：`bg-[#161616] border border-white/[0.04] rounded-2xl p-4 sticky top-28`
2. 导航项：激活状态 `bg-[#3ec470]/10 text-[#3ec470]`

- [ ] **Step 3: 优化手风琴内容卡片**

1. 问题编号：`font-mono text-[#3ec470] font-bold text-sm`
2. 答案文本：`text-white/60 text-[14px] leading-relaxed`

- [ ] **Step 4: 运行 TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/pages/DocsPage.tsx
git commit -m "feat: optimize Docs page UI style"
```

---

## Task 4: 清理 legacy 代码

**Files:**
- Delete: `src/legacy/` 整个目录
- Delete: 已被替代的旧组件和 hooks

**目标:** 删除所有不再使用的 legacy 代码，减少代码库体积，避免混淆。

- [ ] **Step 1: 确认 legacy 目录无引用**

Run: `grep -r "from.*legacy" src/ --include="*.ts" --include="*.tsx"`
Expected: 无输出（确认没有文件引用 legacy 目录）

- [ ] **Step 2: 删除 legacy 目录**

```bash
rm -rf src/legacy/
```

- [ ] **Step 3: 确认旧组件无引用**

检查以下组件是否被引用：
- `BidEngine`
- `DynamicBondingCurve`
- `BondingCurve` (components/curve)
- `PagePlaceholder`
- `StakedTable`
- `StakeTable`
- `BurnPanel`
- `MintPanel`
- `StakePanel`
- `TradeSummary`

Run: `grep -r "BidEngine\|DynamicBondingCurve\|PagePlaceholder\|StakedTable\|StakeTable\|BurnPanel\|MintPanel\|StakePanel\|TradeSummary" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"`
Expected: 只有定义文件本身的引用，无其他文件引用

- [ ] **Step 4: 删除旧组件和 hooks**

```bash
rm src/components/auction/BidEngine.tsx
rm src/components/chart/DynamicBondingCurve.tsx
rm src/components/curve/BondingCurve.tsx
rm src/components/layout/PagePlaceholder.tsx
rm src/components/staking/StakedTable.tsx
rm src/components/staking/StakeTable.tsx
rm src/components/trade/BurnPanel.tsx
rm src/components/trade/MintPanel.tsx
rm src/components/trade/StakePanel.tsx
rm src/components/trade/TradeSummary.tsx
rm src/hooks/useBondingCurve.ts
rm src/utils/curve.ts
```

- [ ] **Step 5: 删除空目录**

```bash
rmdir src/components/chart src/components/curve src/components/layout src/components/staking src/components/trade 2>/dev/null || true
```

- [ ] **Step 6: 运行 TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 0 errors（如果有错误，修复缺失的引用）

- [ ] **Step 7: 启动 dev server 验证所有页面**

访问所有页面，确认无报错：
- `/`
- `/auctions`
- `/auctions/auc-001`
- `/kols/0xchine`
- `/staking`
- `/claim`
- `/points`
- `/arbitration`
- `/wallet`
- `/docs`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: remove legacy code and unused components"
```

---

## Task 5: 统一组件库和样式规范

**Files:**
- Create: `src/config/uiConstants.ts`
- Modify: `src/components/ui/Badge.tsx`
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/index.css`

**目标:** 建立统一的 UI 常量和组件规范，确保全站视觉一致性。

- [ ] **Step 1: 创建 UI 常量配置文件**

Create `src/config/uiConstants.ts`:

```typescript
/**
 * UI 常量统一管理
 * 所有颜色、间距、字体等设计令牌集中在此
 */

// 颜色
export const COLORS = {
  background: '#0a0a0a',
  card: '#161616',
  cardHover: '#1a1a1a',
  border: 'rgba(255, 255, 255, 0.04)',
  borderHover: 'rgba(255, 255, 255, 0.08)',
  primary: '#3ec470',
  primaryHover: '#4ade80',
  primaryDim: 'rgba(62, 196, 112, 0.1)',
  primaryBorder: 'rgba(62, 196, 112, 0.3)',
  danger: '#ef4444',
  warning: '#fbbf24',
  text: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textFaint: 'rgba(255, 255, 255, 0.3)',
} as const;

// 圆角
export const RADIUS = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  full: 'rounded-full',
} as const;

// 间距
export const SPACING = {
  cardPadding: 'p-6',
  sectionGap: 'gap-6',
} as const;

// 字体
export const TYPOGRAPHY = {
  mono: 'font-mono',
  title: 'font-black tracking-tight',
  label: 'text-[10px] font-bold uppercase tracking-[0.15em]',
} as const;

// 阴影
export const SHADOWS = {
  card: 'shadow-lg',
  primaryGlow: 'shadow-[0_0_15px_rgba(62,196,112,0.1)]',
  primaryGlowHover: 'shadow-[0_0_25px_rgba(62,196,112,0.2)]',
} as const;
```

- [ ] **Step 2: 审查并统一 Badge 组件**

阅读 `src/components/ui/Badge.tsx`，确保包含以下变体：
- `live` — 绿色，带脉冲点
- `upcoming` — 灰色
- `ended` — 灰色
- `settled` — 绿色
- `failed` — 红色
- `arbitrating` — 琥珀色
- `stake_active` — 绿色
- `stake_pending` — 灰色
- `unlocking` — 琥珀色
- `neutral` — 灰色

- [ ] **Step 3: 审查并统一 Button 组件**

阅读 `src/components/ui/Button.tsx`，确保包含以下变体：
- `default` — 绿色主按钮 `bg-[#3ec470] text-black hover:bg-[#4ade80]`
- `secondary` — 白底黑边 `bg-white/5 border border-white/10 text-white hover:bg-white/10`
- `danger` — 红色 `bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20`
- `ghost` — 透明背景

确保包含以下尺寸：
- `sm` — 小按钮
- `md` — 中按钮（默认）
- `lg` — 大按钮

- [ ] **Step 4: 审查并统一 index.css**

阅读 `src/index.css`，确保：
1. Tailwind v4 配置正确（`@import "tailwindcss";`）
2. 自定义主题变量定义完整
3. 任意值类（如 `h-[600px]`）有显式定义
4. 全局样式（滚动条、选择文本等）统一

- [ ] **Step 5: 运行 TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/config/uiConstants.ts src/components/ui/Badge.tsx src/components/ui/Button.tsx src/index.css
git commit -m "feat: unify UI component library and style constants"
```

---

## Task 6: 全局 UI Review 和修复

**Files:**
- 所有页面文件
- 所有组件文件

**目标:** 全局审查所有页面和组件，修复视觉不一致、响应式问题、控制台错误。

- [ ] **Step 1: 逐页面审查视觉一致性**

访问以下页面，检查视觉一致性：
1. `/` — 首页
2. `/auctions` — 拍卖列表
3. `/auctions/auc-001` — 拍卖详情
4. `/kols/0xchine` — KOL Profile
5. `/staking` — 质押
6. `/claim` — 领取
7. `/points` — 积分
8. `/arbitration` — 仲裁
9. `/wallet` — 钱包
10. `/docs` — 文档

检查清单：
- [ ] 背景色统一（透明/深色）
- [ ] 卡片样式统一（`bg-[#161616] border border-white/[0.04] rounded-2xl`）
- [ ] 标题字体统一（`font-black tracking-tight`）
- [ ] 数据字体统一（`font-mono`）
- [ ] 按钮样式统一
- [ ] 标签样式统一
- [ ] 间距统一
- [ ] 颜色使用统一（主色 #3ec470）

- [ ] **Step 2: 检查响应式布局**

使用浏览器开发者工具，检查以下断点：
- 桌面端（1280px+）
- 平板（768px - 1024px）
- 移动端（375px - 414px）

检查清单：
- [ ] 所有页面在移动端可正常滚动
- [ ] 表格在移动端有横向滚动
- [ ] 网格布局在移动端正确堆叠
- [ ] 导航栏在移动端正常显示
- [ ] 文字不溢出容器

- [ ] **Step 3: 检查控制台错误**

逐页面打开浏览器控制台，检查：
- [ ] 无 JavaScript 错误
- [ ] 无 React 警告（key、useEffect 依赖等）
- [ ] 无 Tailwind 类名错误
- [ ] 无图片加载失败

- [ ] **Step 4: 修复发现的问题**

根据审查结果，修复所有发现的问题。每个修复单独 commit。

- [ ] **Step 5: 运行最终 TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 6: 运行生产构建检查**

Run: `npm run build`
Expected: 构建成功，无错误

- [ ] **Step 7: 最终 Commit**

```bash
git add -A
git commit -m "fix: global UI review and consistency fixes"
```

---

## 验收标准

### 功能验收
- [ ] 所有 10 个页面可正常访问
- [ ] 所有页面无控制台错误
- [ ] TypeScript 编译 0 错误
- [ ] 生产构建成功

### 视觉验收
- [ ] 所有页面视觉风格统一（深色背景、绿色主色调、等宽字体）
- [ ] 卡片、按钮、标签、表格样式统一
- [ ] 标题、数据、标签字体层级清晰
- [ ] 间距、圆角、边框统一

### 响应式验收
- [ ] 桌面端（1280px+）布局正常
- [ ] 平板（768px - 1024px）布局正常
- [ ] 移动端（375px - 414px）布局正常，可正常滚动

### 代码质量验收
- [ ] 无 legacy 代码残留
- [ ] 无未使用的组件和 hooks
- [ ] 无重复代码
- [ ] 无硬编码的样式值（应使用常量或 Tailwind 类）
- [ ] UI 常量统一管理

---

## 下一步

Phase 1 完成后，进入 **Phase 2: 钱包连接集成**

详细计划见：`docs/superpowers/plans/2026-08-31-phase2-wallet-integration.md`（待创建）
