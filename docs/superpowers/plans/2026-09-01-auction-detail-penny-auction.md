# 拍卖详情页便士拍卖交互优化 — 实施计划

> **日期**：2026-09-01
> **来源**：`docs/superpowers/specs/2026-09-01-auction-detail-penny-auction-design.md`（已批准）
> **目标**：修正便士拍卖语义（无 Current Highest）、Last Bidder 突出大卡片 + 动态变更、模拟他人出价、固定出价 99 MON、品牌修正

**Tech Stack**：React 19 + TypeScript 5.8 + Vite 6 + Tailwind 4 + motion (framer-motion) + lucide-react + Zustand

---

### Task 1: 固定出价金额调整

**Files**：
- Modify: `src/utils/constants.ts:45` — `FIXED_BID_AMOUNT: 0.05` → `99`
- Modify: `src/data/mockAuctions.ts` — `auc-001.bidIncrement: 0.05` → `99`；`currentBid`/`minBid` 语义核对

**验证**：`grep FIXED_BID_AMOUNT` 确认 99；确认无其他文件硬编码 0.05。

### Task 2: 新建 `src/hooks/useSimulatedBids.ts`

**Create**：`src/hooks/useSimulatedBids.ts`

模拟他人出价 hook，封装定时器逻辑（保持页面聚焦）：

```ts
interface SimulatedBidder {
  address: string;   // 假钱包地址或 @昵称
  bids: number;
}
export interface UseSimulatedBidsOptions {
  enabled: boolean;           // 拍卖 LIVE 且未结束
  onSimulatedBid: (bidder: SimulatedBidder, amount: number) => void;  // 回调：更新页面状态
  /** 出价金额（默认从 AUCTION.FIXED_BID_AMOUNT） */
  bidAmount?: number;
}
export function useSimulatedBids(options): {
  pause: () => void;   // 用户自己出价时可选暂停（本设计：不暂停）
  resume: () => void;
}
```

- 内部 `useEffect`：enabled 时启动定时器，每 `9~18s` 随机间隔触发
- 地址池（混合）：`['0x1a2b...', '0x9f8e...', '@DegenKing', '@AlphaHunter', '0x2b3c...', '@WhaleWatcher', '0x3c4d...', '@MoonShot']` 随机选一
- 每次触发：`onSimulatedBid({ address, bids: 随机 1~3 }, bidAmount)`
- 清理：`clearTimeout` on unmount / enabled 变 false
- 提供 `pause()/resume()`（设计决定不暂停，但保留 API 备用）

### Task 3: 改造 `src/pages/AuctionDetailPage.tsx`

**Modify**：`src/pages/AuctionDetailPage.tsx`

1. **删除 2 处 "Current Highest"**（`:367-385` 双卡片 → Last Bidder 大卡片；`:469-478` 小格删除）
2. **Last Bidder 大卡片**（替换 `:367-385` 区域）：
   - 绿色光晕背景 + `LAST BIDDER` 标签（绿色 + 脉冲圆点）+ `Crown` 图标
   - 大号地址 `font-mono text-2xl font-black` + YOU 徽章
   - 高价值信息：出价次数 / 累计金额 / PASS 持仓
   - 底部：`→ 倒计时结束时，此地址赢得 {KOL} 服务`
   - `AnimatePresence` + 滑入动画、边框闪烁、地址脉冲
3. **模拟出价集成**：
   - 引入 `useSimulatedBids`，`enabled={isLive && !countdownEnded}`
   - `onSimulatedBid`：更新 lastBidder/endTime/totalBids/leaderboard/bidHistory
   - 复用 `upsertLeaderboardRow` 逻辑（注意模拟出价者的 bidder key）
4. **用户出价后不暂停**（模拟定时器持续运行）

### Task 4: 品牌文案修正

**Modify**：`src/pages/DocsPage.tsx:183` — `KOLFi auctions` → `nadbid.fun auctions`

### Task 5: 验证

- `npx tsc --noEmit` → 0 错误
- `npx vite build` → 成功
- dev server 浏览器验证：无 "Current Highest"、Last Bidder 卡片渲染、模拟出价动态生效、99 MON 正确

---

## 执行顺序
Task 1 → Task 2 → Task 3 → Task 4 → Task 5
（Task 1/4 独立，Task 2 需在 Task 3 前；Task 5 最终）
