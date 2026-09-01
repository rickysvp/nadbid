# 拍卖详情页便士拍卖交互优化 — 设计文档

> **日期**：2026-09-01
> **状态**：已确认（用户已批准方案）
> **关联**：`src/pages/AuctionDetailPage.tsx` 为主战场

## 目标

修正拍卖详情页的便士拍卖（Penny Auction）语义，突出"最后出价人 = 当前赢家"的核心概念，并通过模拟他人出价营造真实竞争氛围。

## 背景与约束

- **拍卖标的是 KOL 的服务**（非商品、**无奖池概念**），项目品牌是 **nadbid.fun**（非 KOLFi）。
- **便士拍卖机制**：每次出价固定 **99 MON**，出价后倒计时 +30s，**价格不随出价上涨**。
- 因此当前页面的 **"Current Highest" 语义错误**，必须移除。
- 用户偏好：模拟他人出价（A 方案）、地址池**混合**（假钱包地址 + @昵称）、自己出价后**完全不暂停**模拟出价、Last Bidder 需**特殊突出设计**（颜色/样式）、**无 leading 徽章**。

## 需求清单

### 1. 移除 "Current Highest"（2 处）

- **左栏信息卡**（`AuctionDetailPage.tsx:367-385`）：删除原 `Current Highest + Last Bidder` 双卡片，由**单张 Last Bidder 大卡片**替代。
- **出价控制区小格**（`:469-478`）：删除 "Current Highest" 小格子，仅保留固定出价价格展示（出价按钮上方已有 `Fixed Bid Amount 99.00 MON` 大字）。

### 2. Last Bidder 重设计为突出大卡片

**视觉**（深色 neo-brutalist，与全站一致）：
- 背景 `#161616` 卡片 + **绿色光晕**（`bg-[#3ec470]/[0.06] blur`）突出"当前领先者"地位。
- 左上角标签 `LAST BIDDER`：绿色小字 + 脉冲圆点，暗示"正在竞争"。
- 大号地址：`font-mono text-2xl font-black text-white` + 绿色 `Crown` 图标（lucide）。
- 地址下方高价值信息：
  - **出价次数**（该地址累计出价 N 次）
  - **累计金额**（该地址累计出价 × 99 MON）
  - **当前持仓** PASS 数（可选，来自 holdings store）
- 底部小字：`→ 倒计时结束时，此地址赢得 {KOL} 服务`（点明"最后出价人 = 赢家"）。

**动态变更效果**（核心交互）：
- 每次出价成功（自己或模拟他人）→ Last Bidder 变化时：
  - 旧地址淡出 + 新地址从右侧滑入（`motion` `AnimatePresence` + slide-in）。
  - 卡片绿色边框闪烁 + 光晕脉冲（`motion` 循环 ~1.2s 高亮）。
  - 地址短暂放大脉冲（`scale: [1, 1.04, 1]`）。
  - 变化者为当前用户时：显示 `YOU` 徽章 + 金色脉冲。
  - **Bid Board 顶部的 leading bidder 同步更新**。

### 3. 模拟他人出价机制（A 方案）

**逻辑**：拍卖 `LIVE` 且倒计时未结束时激活。

- **定时器**：每 `9~18s` 随机间隔触发一次模拟出价（避免机械感）。
- **地址池**：混合 = 假钱包地址（`0x1a2b...` 等 6~8 个）+ 部分 `@DegenKing`、`@AlphaHunter` 等昵称（与 leaderboard 一致）。
- **每次模拟出价效果**：
  - Last Bidder → 该模拟地址（触发上述动画）。
  - 倒计时 +30s（`setEndTime`）。
  - 总出价次数 +1（`setTotalBids`）。
  - leaderboard 对应行 +1 次 / +99 MON（复用 `upsertLeaderboardRow`）。
  - bid history 顶部新增一条记录（复用现有结构）。
  - **不影响用户钱包余额**。
- **自己出价后完全不暂停**：用户出价成功后，模拟定时器继续随机运行（可能立刻被抢），保持真实竞争压力。
- 拍卖结束 / 页面卸载 → 清理定时器（`useEffect` cleanup）。

### 4. 固定出价金额 99 MON

- `AUCTION.FIXED_BID_AMOUNT` 常量：`0.05` → **`99`**（`src/utils/constants.ts`）。
- mock 数据 `auc-001.bidIncrement`：`0.05` → `99`。
- `currentBid` 语义修正：不再代表"当前价"，页面改用总出价次数 × 99 的逻辑。
- 出价确认弹窗、leaderboard TVL、bid history 自动适配（金额从常量读取）。

### 5. 品牌文案修正

- `DocsPage.tsx:183`：`KOLFi auctions` → `nadbid.fun auctions`。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/pages/AuctionDetailPage.tsx` | 删 2 处 Current Highest、Last Bidder 大卡片 + 动画、模拟出价逻辑 |
| `src/utils/constants.ts` | FIXED_BID_AMOUNT 0.05 → 99 |
| `src/data/mockAuctions.ts` | bidIncrement/currentBid 语义修正 |
| `src/pages/DocsPage.tsx` | KOLFi → nadbid.fun |
| `src/hooks/useSimulatedBids.ts`（新建） | 模拟出价逻辑独立封装，保持页面聚焦 |

## 验收标准

1. 页面不再出现 "Current Highest" 字样。
2. Last Bidder 大卡片：绿色光晕 + 皇冠 + 出价次数/累计金额/持仓 + "倒计时结束即赢得服务"提示。
3. 拍卖进行中，每 9~18s 有模拟出价：Last Bidder 更换 + 动画、倒计时 +30s、次数 +1、leaderboard/历史更新。
4. 模拟出价地址池为混合（钱包地址 + @昵称）。
5. 自己出价后模拟不暂停。
6. 出价固定 99 MON（常量 + mock 数据同步）。
7. DocsPage 品牌修正为 nadbid.fun。
8. 用户出价时显示 YOU 徽章；非用户变化仅显示地址 + 动画。
9. tsc 0 错误、build 成功、页面渲染无控制台错误。
