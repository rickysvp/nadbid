# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
