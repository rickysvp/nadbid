# nadbid.fun · 产品技术 SPEC v2.4

> **文档类型**：Reference（工程规范·权威规则）· 附带 ADR 摘要
> **版本号**：v2.4（核心规则修订版）· 生效日期 2026-08-26
> **与历史版本冲突处理**：凡与既有版本存在条款冲突，一律以本版为准。
> **责任路径 / Owner**：nadbid 团队 — 合约、后端、前端、积分四条子线 owner 按各自章节签字确认。
> **权威副本（Source of Truth · 不重复原则）**：本文件 **`spec/nadbid-SPEC-v2.4.md`** 是 _产品规则 + 核心技术约束_ 的唯一权威副本。前端页面/信息架构/交互稿/视觉稿 单独进入 **Frontend SPEC v2.4**（见 §15）。任何 README / Wiki / 飞书文档不得复制本表内容；如需引用，请链接到本文件。
> **Freshness 规则**：
>
> - Verification Cadence：每 90 天或任何参数/状态机/费率/资格变更前做一次对照校验。
> - Staleness Signal：若 "Last verified" > 90 天 OR 对应代码路径（见 §19 Codebase Map）发生影响规则的 PR 合入但本文件未同步更新 → 自动标记 `STALE`，必须由相关 owner 重新签字。
> - Update Trigger：合约接口升级、费率治理多签生效、积分参数表变更、前端新增 KOL/NFT 页面、拍卖终态定义修改。
>   **Docs-as-code**：SPEC 文档与代码走同一条 PR 流水线，CI 跑 markdownlint + link-checker + 锚点引用扫描；任何破链或错别字均为合入阻断项。

---

## 扉页 · v2.4 Changelog（相对既有版本的修订要点）

| #   | 章节                       | 变更摘要                                                                                                                    | 影响面                                                        |
| --- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1   | §0 项目定义                | 明确项目名称 **nadbid.fun**；定位从"NFT 拍卖"统一为"KOL 社交权益的链上拍卖系统"。                                           | 品牌 + 合约命名空间                                           |
| 2   | §3 KOL 准入                | 新增 **10,000 MON 现金担保** 与 **KOL 专属 NFT 质押 30 天** 二选一准入模型，明确罚没/赎回路径。                             | 合约 Bonding、前端 KOL 准入面板、后端风控                     |
| 3   | §4 NFT 定义                | **删除"平台统一 NFT"概念**；每个 KOL 独立发行自己专属的 KOL NFT，权益严格隔离。                                             | 合约发行模型、`MintBurnPanel`（前端已对应）、结算映射         |
| 4   | §4.3 / §12 铸造销毁        | 曲线参数固化于部署；**禁止转账/二级市场/租赁**；Mint & Burn 均收 8% 手续费（5% KOL + 3% 平台），与拍卖池独立。              | 铸造/销毁合约、`MintBurnPanel` Toast 校验、前端拆分手续费显示 |
| 5   | §5 质押档位                | 仅支持 **7d / 30d / 90d** 三档；`STAKE_PENDING → STAKE_ACTIVE → UNSTAKE_PENDING → FREE_HOLD` 四段状态机，每步 24h 冷却。    | 质押合约、前端质押倒计时组件、资格校验                        |
| 6   | §6 出价资格                | 持有 **FREE_HOLD** 状态 NFT 才可出价；STAKE_* / UNSTAKE_PENDING 一律不得作为竞拍资格。                                      | 竞拍前置校验、拍卖 UI 的资格判断 Toast                        |
| 7   | §6.3 / §7 拍卖频率         | 单次出价 **X≥100 MON** 且单场内 X 固定；**滚动 7 天窗口** 内同一 KOL 最多 1 场拍卖。                                        | 出价合约、前端创建拍卖表单的频控拦截                          |
| 8   | §8 / §9 / §10 结算履约资金 | 结算 20% 平台费 + 80% 担保金锁定 → **48h 履约窗口 + 72h 自动确认 + 争议 SLA 72h** → 终态只有 `COMPLETED / BREACHED`。       | 资金/结算/争议合约、Admin 后台、中标者与 KOL 通知             |
| 9   | §11 质押分红               | 仅从 **KOL 80% 池内提取 R%**；仅 `STAKE_ACTIVE` 快照 NFT 可分；**Pull Claim 批量领取**。                                    | 分红合约、`Your snapshot` 卡片 Pending/Claimed 字段           |
| 10  | §13 积分                   | Points **只用于空投权重**；来源仅允许 **邀请实际出价、竞拍顺序前 20% 加成、质押天数×数量** 三条。治理/折扣/优先权一律不接。 | 积分参数表、积分结算合约、空投权重计算                        |
| 11  | §15 前端边界               | 本 SPEC **不包含** 页面布局/信息架构/交互稿/视觉稿；由独立的 **Frontend SPEC v2.4** 负责。                                  | 交付职责切分                                                  |
| 12  | §16 合约安全               | 清单化必须具备 / 必须避免的 15+ 条机制；**20 个关键 Event 必须 Emit**（见 §16.3）。                                         | 合约审计 checklist                                            |

---

# 正文 · 产品与技术规则

## §0. 项目定义

### 0.1 项目名称

- 正式名称（主域 / 品牌 / DApp 名）：**nadbid.fun**

### 0.2 产品定位

nadbid.fun 是一个**面向 KOL 社交权益的链上拍卖系统**。
四条核心机制共同构成产品闭环：

1. 持有 **KOL 专属 NFT（FREE_HOLD）** → 获得该 KOL 拍卖的**竞拍资格**；
2. 质押 **KOL 专属 NFT（STAKE_ACTIVE）** → 获得该 KOL 拍卖流水的**收益分红资格**；
3. KOL 通过拍卖出售**明确、可验证、可履约**的社交权益；
4. 平台通过**担保金 + 履约约束 + 积分赛季 + 空投机制**组织供需两端。

---

## §1. 名词定义

### 1.1 资产与流程类

| 名词         | 精确定义                                                                             |
| ------------ | ------------------------------------------------------------------------------------ |
| **MON**      | 系统计价与支付单位（也是 MINT/BURN、担保、分红的单位）。                             |
| **Gas**      | 链上交易手续费，**始终由发起交易方承担**。                                           |
| **拍卖流水** | 单场拍卖所有有效出价金额之和。                                                       |
| **有效出价** | 链上确认成功、金额 == bidFixedCost、未回滚、拍卖 ACTIVE 时入块的出价。               |
| **KOL NFT**  | 某个 KOL 独立发行的专属 NFT 系列，权益只对应该 KOL。                                 |
| **Points**   | 系统积分；**只用于空投权重**；**不用于**治理/手续费折扣/竞拍优先权/分红/白名单准入。 |

### 1.2 角色类

| 角色                | 定义                                                                | 约束（关键）                                                 |
| ------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| 平台管理员          | 白名单、争议裁定、紧急终止、参数治理、积分/空投参数配置、多签权限。 | 不得单点改结果；不得事后改积分；使用多签 admin。             |
| **KOL**             | 发行自己的 KOL NFT，创建拍卖并交付社交权益的一方。                  | 必须担保有效 · 未封禁 · 名下无未终态拍卖 · 社媒/钱包已绑定。 |
| 出价用户            | 提交有效出价的一方。                                                | 出价时钱包中必须至少 1 枚该 KOL `FREE_HOLD` NFT。            |
| 中标者              | 拍卖结束快照时**最后一笔有效出价**对应的地址。                      | —                                                            |
| NFT 持有者          | 钱包中持有 ≥1 枚某 KOL NFT 的用户。                                 | 与质押者可能不同一地址。                                     |
| 质押者              | 将某 KOL ≥1 枚 NFT 锁入质押合约的用户。                             | 质押中 NFT 不能竞拍；只能分红。                              |
| 邀请人 / 被邀请用户 | 通过邀请码 / 邀请链接产生归属关系，并实际参与拍卖的用户 / KOL。     | 仅"实际发生 ≥1 笔有效出价"后才计入邀请积分触发。             |

---

## §2. 系统范围 · 拍卖标的

### 2.1 当前仅启用：**社交权益类（白名单）**

拍卖标的必须属于"**明确 + 可验证 + 可履约**"的社交权益：

- 关注对方（follow）
- 发布合法合规的定制推文
- 转发指定内容
- 置顶推文
- 主持主题专场 AMA / Space
- 公开点名（shoutout / mention）
- 其他可被**明确描述、可被链外证据验证履约、可被争议裁定**的社交权益

### 2.2 未来可扩展（预留类型 · 未启用）

- NFT
- BTC
- 其他链上或实物权益

### 2.3 扩展原则（强约束）

- **v2.4 仅启用 §2.1 社交权益类。**
- 其他品类仅以 `ITEM_CATEGORY = RESERVED` 枚举保留，不得创建真实拍卖。
- 新类别上线**必须补充四标**：**履约标准 / 验证标准 / 争议标准 / 结算标准**，并由 Admin 多签升级枚举。

---

## §3. KOL 准入与担保规则

### 3.1 准入方式（二选一，可叠加；叠加时违约可双罚没）

#### A. **现金担保**（CASH_BOND）

- 锁定 **10,000 MON** 作为全局履约保证金。
- 赎回条件：KOL 主动注销（deactivate）AND 无未结争议 AND 名下所有拍卖均已进入终态。

#### B. **NFT 担保**（NFT_BOND）

- 持有平台白名单的 **KOL 专属 NFT**（例：`RealNads NFT`，白名单由治理配置）。
- 该 NFT 必须**质押到平台担保合约**。
- **最短质押周期 30 天**。
- 到期后**必须 KOL 手动发起解押**（不可自动解押，防止无人值守的担保解除漏洞）。
- 质押期间 NFT 不可参与任何其他用途（如二次质押为自身分红、竞拍等互斥路径）。

### 3.2 准入前置条件清单

```
✅ 基础身份核验完成（KYC / 链上可信身份证明，或 Admin 人工核验）
✅ 主钱包地址已绑定且签名验证通过
✅ 对应社媒账号已绑定并通过 OAuth + 发帖凭证双校验
✅ 未处于 BANNED / SUSPENDED 状态
✅ §3.1 A 或 B 至少一项担保处于有效状态
```

### 3.3 创建拍卖前置

```
✅ 担保状态有效（且 NFT_BOND 仍处于质押而非被解押申请中）
✅ 账户未封禁
✅ 名下不存在任何未进入终态（非 COMPLETED / BREACHED）的拍卖
✅ 滚动 7 天窗口未超过 1 场上限（§7.1）
```

### 3.4 违约罚没

满足 §9.6 任一违约条件时，系统可执行：

- 罚没 **10,000 MON 现金保证金**（若走 A 通道）
- 罚没 **已质押的 KOL 专属 NFT**（若走 B 通道，归属退款池）
- 两种担保同时存在时**可同时罚没**
- 罚没后该 KOL `CAN_CREATE_AUCTION` 权限立即被冻结，需 Admin 多签人工复核解冻。

### 3.5 保证金/担保赎回

| 担保       | 赎回条件                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------- |
| 现金保证金 | KOL 注销 + 名下无未结争议 + 名下所有拍卖 COMPLETED/BREACHED。                                     |
| NFT 担保   | ≥30 天最低质押周期已满足 + 名下所有拍卖终态 + KOL 手动解押交易入块。存在未终态拍卖时调用 revert。 |

---

## §4. KOL NFT 规则

### 4.1 NFT 定义

> **不存在统一平台 NFT。**

每个 KOL 独立部署自己的 **KOL NFT 专属合约**（独立 Collection / 独立 address）。每枚 NFT 只对应该 KOL 的权益，绝不跨 KOL 通用。

### 4.2 权益边界

KOL NFT 仅代表：

- 指定 KOL 的**拍卖参与资格**（FREE_HOLD 时）
- 指定 KOL 的**质押分红资格**（STAKE_ACTIVE 时）
- 指定 KOL 的链上附属权益（治理/白名单等未来扩展，不影响本次 SPEC）

**KOL NFT 绝不代表平台权益（平台不承担 NFT 价值背书）。**

### 4.3 发行与流转约束

- 每系列由**该 KOL 专属合约**发行。
- 用户**只能在该 KOL 的 Profile 页面**完成：**铸造 / 销毁 / 质押 / 解押 / 领取分红 / 查询权益状态**（前端已实装：`MintBurnPanel` + `ProfileHeaderCard 快照`）。
- 曲线参数（斜率/初始价/手续费率）在 KOL 部署时**链上固化**。
- **禁止自由转账（soulbound-ticket：transferFrom 对非合约地址一律 revert，或白名单地址）。**
- **禁止挂单二级市场。**
- **禁止租赁。**
- **禁止合约外方式变相转移权益。**

### 4.4 / 4.5 · NFT 四态 + 权限矩阵

> **唯一允许的四种状态 + 权限映射**，任何不在此表中的状态为 UB 违规：

| 状态                               | 竞拍资格？ | 分红资格？ | 可发生的合法操作                           |
| ---------------------------------- | ---------- | ---------- | ------------------------------------------ |
| `FREE_HOLD`                        | ✅ 可竞拍  | ❌         | stake() / burn()                           |
| `STAKE_PENDING`（质押后 24h 冷却） | ❌         | ❌         | activateStake()（仅满 24h 后入块成功）     |
| `STAKE_ACTIVE`                     | ❌         | ✅ 可分红  | requestUnstake()（仅满足最短周期后）       |
| `UNSTAKE_PENDING`（解押 24h 等待） | ❌         | ❌         | finalizeUnstake()（满 24h 后 → FREE_HOLD） |

### 4.6 操作范围（前端约束 + 合约）

所有操作只允许发生在 **对应 KOL Profile 页面 / 对应合约接口**：铸造、销毁、质押、解押、领取分红、查询权益状态。前端禁止在首页/别的 KOL 页面出现"全局 MINT 入口"。

---

## §5. 质押市场规则

### 5.1 档位（严格三选一，传参不匹配直接 revert）

```
7 days  |  30 days  |  90 days
```

### 5.2 质押生效路径

```
stake(tokenId, 7|30|90 days)
       ↓
STAKE_PENDING  ←(状态 24h)
       ↓  (block.timestamp ≥ stakeStartAt + 24 hours)  activateStake()
STAKE_ACTIVE  ←(开始获得分红资格，持续到 lockPeriod 结束)
```

- **24h 冷却期不计入收益资格**（防快进快出）。

### 5.3 解押路径

```
require(block.timestamp ≥ stakeStartAt + lockPeriod)  ;  requestUnstake()
       ↓
UNSTAKE_PENDING  ←(再等待 24h)
       ↓  (block.timestamp ≥ unstakeStartAt + 24 hours)  finalizeUnstake()
FREE_HOLD
```

- 解押等待期间：**不可竞拍 / 不可分红 / 不可重新 STAKE_ACTIVE**。

### 5.4 防快进快出四件套

1. 质押后 24h 不计入收益资格；
2. 最短周期 **7/30/90d** 内不得提前 requestUnstake；
3. 解押后 24h 才恢复 FREE_HOLD → 竞拍资格；
4. 同一枚 NFT 同时只允许一种状态（由枚举 `nftState[tokenId]` 硬约束，非法跳转 revert）。

---

## §6. 拍卖资格与出价规则

### 6.1 出价前置（placeBid 入口 require 顺序不可调换）

```solidity
require(auction.status == ACTIVE, "!ACTIVE");
require(msg.value == auction.bidFixedCost, "!fixed");      // §6.3：X 固定
require(msg.value >= 100 MON, "<min");
require(!auction.settled);
require(hasFreeHoldNFT(msg.sender), "!HOLDER");             // 仅 FREE_HOLD 算
require(!userBanned[msg.sender]);
```

### 6.2 竞拍与质押互斥（资格判定定义）

- `STAKE_PENDING / STAKE_ACTIVE / UNSTAKE_PENDING`：**全部不计入竞拍资格**。
- 竞拍资格**按钱包地址**做存在性判定：**只要 ≥1 枚 FREE_HOLD 即通过**。
- 前端必须从链上查询后再渲染"出价按钮"可用态，**不得本地判断**。

### 6.3 出价金额

- `X ≥ 100 MON`（最小出价门槛）
- 单场内 `X` **固定**（所有出价者都付同一个 bidFixedCost）。
- Gas 由出价用户承担。

### 6.4 有效出价合约处理链

```
recordBidder(address, value) → cumulativeBid[auctionId][bidder]+=X
→ updateLastBidder(bidder)
→ resetCountdown(60 seconds)   ← 最后一笔出价延长 60s
→ emit BidPlaced(auctionId, bidder, X, block.timestamp)
```

### 6.5 并发出价（同区块）

- 按链上 EVM 执行顺序处理；
- **全部成功入块者**都计入累计金额；
- **最后执行的 tx** 成为 lastBidder；
- 前端**不得**本地预测最终 lastBidder；必须订阅合约事件刷新。

---

## §7. 拍卖频率规则

### 7.1 滚动 7 天

- 同一 KOL 在**任意滚动 7 天窗口内**最多 **1 场拍卖**（基于创建区块时间或结算完成区，取更严者）。
- 由合约或后端风控双写校验；前端在"创建拍卖"按钮点击时再次预检，不通过 toast 拦截。

### 7.2 履约闭环频率锁

- KOL 名下存在**任何未进入终态**的拍卖（非 COMPLETED / BREACHED）→ 禁止创建新拍卖。
- 前端创建表单在 `CreateAuctionModal.open()` 时**必须查询 openAuctions.length**，不为 0 直接 disable。

### 7.3 终态定义（仅二选一，无第三种）

```
COMPLETED  |  BREACHED
```

---

## §8. 拍卖结算规则

### 8.1 结算触发

1. 拍卖倒计时 **自然归零**（finalizeAuction 权限开放，或经 cooldown 后任何人可结算）；
2. Admin **紧急终止**（`emergencySettle`，仅多签，必须记录原因）。

### 8.2 结算前置

```
status == ACTIVE
&& !alreadySettled
&& block.number ≥ lastBidBlockNumber + SETTLEMENT_CONFIRMATIONS（建议 ≥12）
&& (hasPermission(caller) || block.timestamp ≥ lastCountdownEnd + 1h)
```

### 8.3 结算步骤（顺序锁定，不可重排）

```
1. lock() 防重入（使用 ReentrancyGuard 的状态机）
2. record endTime + endBlock
3. Snapshot：bidder → cumulative bid（§10.3 refund 分配依据）
4. Snapshot：所有符合条件的质押 NFT（tokenId → 权重 1 枚 = 1）
5. 计算 totalAuctionVolume = ΣcumulativeBid
6. 20% * totalAuctionVolume → 平台费池（已结算，Admin 可按流程提取）
7. 80% * totalAuctionVolume → 担保金池（锁定，需等 COMPLETED/BREACHED 终态才拆）
8. 设置 performanceDeadline = block.timestamp + 48 hours
9. auction.status ← SETTLED
```

### 8.4 结算后资金锁定

- KOL 的 80%：不立即可提 → 等待履约/违约终态；
- 质押分红：不立即 Claimable → 同上；
- 资金保持在 `guaranteePool + dividendReserve` 中锁定。

---

## §9. 履约与争议规则

### 9.1 履约窗口

结算后 **48 小时**（`performanceDeadline`）KOL 必须提交履约证据。

### 9.2 合格履约证据（Per-Category 证据表）

创建拍卖时从 `ITEM_CATEGORY` 选择，创建即固化证据 schema：

| 分类                                        | 必备字段                                                            |
| ------------------------------------------- | ------------------------------------------------------------------- |
| 推文类（Follow / Shoutout / Retweet / Pin） | tweet_url / publish_time / target_handle / content_match_hash       |
| AMA 类                                      | event_url / recording_url / attendance_proof_merkle_root            |
| 定制内容类                                  | original_content_url / platform / publish_time / content_match_hash |

### 9.3 完成进入条件（三选一）

1. **中标者主动确认**：Winner submitConfirm()
2. **Admin 审核确认**：Admin auditConfirm()（多签）
3. **到期自动确认**：中标者 72h 未拒 / 未争议 AND KOL 已提交**合格**证据 → `autoConfirm` 生效

### 9.4 自动确认前置

必须同时成立：

```
evidence.status == QUALIFIED
&& now() - performanceDeadline ≤ 72h
&& !winnerRefused && !disputeOpened
```

### 9.5 争议触发（四选一即开 DisputeOpen）

- 中标者认为未履约，提交争议 tx；
- Admin 审核认为 evidence 无效；
- evidence 与标的 hash mismatch / category mismatch；
- 结算后 48h 内 KOL **未提交任何证据**（系统自动开启违约争议）。

### 9.6 违约判定

以下任一 → BREACHED：

1. 结算 48h 内未提交有效证据；
2. 提交经 Admin 审核为不合格；
3. 证据与拍卖标的严重不符（严重不符定义：category/时间/target 三项中 ≥2 不匹配）；
4. 争议裁定最终结果为违约。

### 9.7 争议 SLA

| 动作               | 时限                                             |
| ------------------ | ------------------------------------------------ |
| 用户可发起争议窗口 | 48h（从 evidence.QUALIFIED 起算）                |
| 平台裁定完成       | 72h（从 DisputeOpened event 起算）               |
| 超时未裁定         | 升级到人工 Admin，写入 escalation flag，必须留痕 |

### 9.8 争议终态（二选一；无无限循环）

```
COMPLETED | BREACHED
```

任何争议裁定交易必须 emit 终态 event + 写入 `disputeRulingReason` 字段。

---

## §10. 资金处置规则

### 10.1 正常履约（COMPLETED）

- KOL 实得池（**扣除 R% 后**的剩余）自动转给 KOL；
- **质押分红池（R%）** 变为 Pull Claimable；
- 平台费池（20%）已在结算时到账。

> **R% 是 KOL × CATEGORY 治理参数表**，非硬编码。默认取值 15%，由治理提案修改。

### 10.2 违约（BREACHED）

- **担保金池（80% × totalVolume）全部转入退款池**；
- 若 KOL 被执行了罚没，罚没资金（现金 / NFT 拍卖所得折 MON）**也并入退款池**；
- 质押分红**不发放**；
- KOL 权限冻结。

### 10.3 退款公式

```
refund_i = refund_pool * (user_bid_i / total_bid)  向下取整
```

其中：

- `refund_pool = 80% * totalAuctionVolume + any_penalty_funds`
- `user_bid_i` = 该用户本场 **累计有效出价**
- `total_bid` = 本场 Σ有效出价

所有 **dust（round-down 余数）统一归平台国库**。

### 10.4 取整

- 链上以 **MON 最小单位（wei / u64）** 计算；
- 全部 floor（向下取整）。

---

## §11. 质押分红规则

### 11.1 分红来源（零通胀承诺）

- **仅从 KOL 80% 池中的 R% 提取**；
- **不出自出价者额外付**；
- **不增发自产 Token / 不铸造平台币**。

### 11.2 分红资格（三条件 AND）

拍卖结算快照时 NFT 同时满足：

1. 状态 `STAKE_ACTIVE`；
2. `stakeStartAt + 24h ≤ snapshotBlock.timestamp`（生效期已满）；
3. 未处于任何 unstake 流程中。

### 11.3 权重

```
1 枚合格 STAKE_ACTIVE NFT = 1 权重
同系列 NFT 权重完全一致（不按稀有度/代币序号加权）
```

### 11.4 领取

- **Pull Claim 模式**（用户主动）；
- Gas 用户出；
- **支持批量领取历史场次**（按 merkle 聚合 or 循环累加 claimer 余额两种均可，合约选择其一但必须前端展示 "一键领取 N 场"按钮）。

---

## §12. KOL NFT 铸造与销毁规则

### 12.1 铸造 / 销毁入口

- 每 KOL 独立合约；
- 用户**只能在该 KOL Profile 页面**完成（参见 §4.6）；
- 曲线参数部署时**固化**。

### 12.2 手续费（每次 Mint / Burn 即时结算，**不进入拍卖担保池**）

```
铸造 & 销毁费率 = 8%
  5%  → 直接转给 KOL 对应收款地址
  3%  → 直接转给平台 treasury 地址
```

手续费收取基数 = 实际成交沿曲线支付 / 回收的 MON 金额。

### 12.3 禁止规则

- 禁止 transfer / transferFrom（对非合约白名单 revert）
- 禁止二级市场挂单（合约层面通过 soulbound 直接禁止 transfer）
- 禁止租赁（链下无 API 暴露"代用 NFT 资格"路径）
- 禁止合约外变相转移权益（若发现外部借贷合约，Admin 可将该 NFT 集合标记为 SUSPENDED，且不影响 KOL 权益合法性审查）。

---

## §13. 积分（Points）规则

### 13.1 适用对象

所有用户：普通用户 / KOL / 邀请人 / 被邀请人均可拿。

### 13.2 赛季

- 按**赛季**统计（赛季编号 `SEASON_ID`）；
- 每赛季独立快照；
- **积分不衰减、不过期**（跨赛季累计进空投账户，但每赛季按赛季权重分开快照）。

### 13.3 积分用途（白名单唯一）

**Points 仅用于：空投权重计算。**

**严禁用于：治理 / 手续费折扣 / 竞拍优先权 / 分红 / 白名单自动准入。**

### 13.4 积分来源（仅三条）

1. **邀请普通用户实际参与拍卖** → 被邀请人 ≥1 笔有效出价后才结算邀请积分。
2. **参与竞拍** → 每笔有效出价计分；**按时间顺序前 20% 次的出价额外加成**。
3. **质押 NFT** → 按质押数量 × 有效质押天数计分（仅 STAKE_ACTIVE 天计入）。

### 13.5 竞拍积分时序规则

- 按 bidPlaced event 顺序编号 `bidSeq`；
- 结束后统一计算；
- **前 20% 次**：总次数 = N，加成次数 = `ceil(N * 0.2)`，**至少保留 1 次**（即使 N=1）。

### 13.6 参数隔离

```
所有倍率 / 权重 / 加成系数：
   → 由独立 points_params 配置表
   → 与 auction_params / nft_params / bond_params 相互隔离，分多签权限
   → 变更 emit PointsParamChanged(season, key, oldVal, newVal)
```

---

## §14. 空投规则

### 14.1 目的

- 激活用户活跃
- 拉新
- 提升平台参与度

### 14.2 对象

所有 §13.1 角色 + 质押者 + 活跃竞拍者（通过 Points 是否 ≥0 自动包含）。

### 14.3 权重计算

```
airdropWeight_user_in_season = Points_user_in_season
```

**不引入额外复杂规则**；仅保留"有积分即能参与空投权重"的原则。

### 14.4 不影响原则

空投绝不影响：拍卖 / 质押 / KOL 准入 / NFT 权益 / 分红资格。

---

## §15. 前端文档边界

### 15.1 本 SPEC 不包含

前端页面**布局 / 页面层级 / 交互稿 / 视觉规范 / 组件状态 / 文案提示 / 页面引导 / 移动端适配**。

### 15.2 归属文件

以上内容由**独立的 Frontend SPEC v2.4** 承担，其 ownship = 前端 Team Lead + 产品经理。

- **Frontend SPEC 与本 SPEC 的冲突**：以本 SPEC 为准（本 SPEC 是"业务规则权威"，Frontend 是"规则的呈现方式"）。
- 当前前端的**实现映射**见 §19 Codebase Map。

---

## §16. 合约安全要求

### 16.1 必须具备（Security Checklist）

- ✅ 重入保护（ReentrancyGuard 所有资金入口）
- ✅ 权限控制（RBAC / Ownable2Step / AccessControl DefaultAdminRole 隔离）
- ✅ 重复结算防护（`auction.settled` 单次门闩）
- ✅ 完整事件日志（§16.3 完整列表）
- ✅ 参数合法性校验：enum / range / zero / deadline / address(0)
- ✅ 紧急暂停机制（Pausable 按模块：Auction / Bond / Stake / Claim / Points）
- ✅ 多签管理员权限（DEFAULT_ADMIN_ROLE 必须 ≥2/3 multisig）
- ✅ 邀请关系不可篡改（`inviteBound` mapping，写入后 emit 且禁止 rewrite）
- ✅ 积分结算不可回滚重放（`pointsIssuedPerAccount[season]` 累加且 emit PointsIssued，不允许 sub）

### 16.2 必须避免

- ❌ 依赖前端判断资金状态
- ❌ 依赖 block.timestamp 为本地时间结算（必须是链上）
- ❌ 允许重复 claim（Pull Claim 门闩 `claimed[hash]`）
- ❌ 允许无状态机跳转（NFT / 拍卖都必须状态机）
- ❌ 允许管理员单点任意改结果（所有状态变更都必须落在 §9.8 终态）
- ❌ 邀请关系事后改绑（`InviteBound` emit 之后，任何 rewrite 均 revert）
- ❌ 积分手工随意改值（PointsIssued 之外无 setPoints 接口，除非治理升级超级权限且 require 2/3 multisig）

### 16.3 关键事件清单（必须全部 Emit，缺一审计不通过）

```
AuctionCreated(id, kol, bidFixedCost, category, block.timestamp)
BidPlaced(auctionId, bidder, amount, bidSeq, block.timestamp)
AuctionSettled(id, totalVolume, platformFee, guaranteePool, block.number)
EvidenceSubmitted(id, evidenceCategory, evidenceHash, submitter)
DisputeOpened(id, opener, reason, block.timestamp)
AuctionCompleted(id, winner, kolPayout, dividendReserve)
AuctionBreached(id, breachReason, refundPoolAmount)
RewardClaimed(user, kol, fromAuctionId, amount)
RefundClaimed(user, auctionId, amount)
BondStaked(kol, bondType, amount, startedAt, lockPeriod)
BondSlashed(kol, bondType, amount, reason)
InviteCodeCreated(inviter, code, createdAt)
InviteBound(invitee, inviter, code, boundAt)
PointsIssued(account, season, category, delta, total, ref)
AirdropSnapshotTaken(season, merkleRoot, totalWeight)
AirdropClaimed(account, season, amount)
```

---

## §17. 伪代码摘要（Solidity 风格，仅示意）

```solidity
/* ============ 出价 ============ */
function placeBid(uint256 auctionId) external payable {
    require(auctions[auctionId].status == ACTIVE);
    require(msg.value == auctions[auctionId].bidFixedCost);
    require(msg.value >= 100 MON);
    require(!auctions[auctionId].settled);
    require(hasFreeHoldNFT(msg.sender, auctions[auctionId].kolHandle));

    _recordBid(auctionId, msg.sender, msg.value);
    _updateLastBidder(auctionId, msg.sender);
    _resetCountdown(auctionId, 60 seconds);
    emit BidPlaced(...);
}

/* ============ 质押：四态流转 ============ */
function stakeNFT(uint256 tokenId, uint256 lockPeriod) external {
    require(lockPeriod == 7 days || lockPeriod == 30 days || lockPeriod == 90 days);
    require(nftState[tokenId] == FREE_HOLD);
    require(_isApprovedOrOwner(msg.sender, tokenId));

    nftState[tokenId] = STAKE_PENDING;
    stakeStartAt[tokenId] = block.timestamp;
    stakeLockPeriod[tokenId] = lockPeriod;
    emit NFTStakePending(tokenId, msg.sender, lockPeriod);
}

function activateStake(uint256 tokenId) external {
    require(nftState[tokenId] == STAKE_PENDING);
    require(block.timestamp >= stakeStartAt[tokenId] + 24 hours);
    nftState[tokenId] = STAKE_ACTIVE;
    emit NFTStakeActive(tokenId);
}

function requestUnstake(uint256 tokenId) external {
    require(nftState[tokenId] == STAKE_ACTIVE);
    require(block.timestamp >= stakeStartAt[tokenId] + stakeLockPeriod[tokenId]);
    nftState[tokenId] = UNSTAKE_PENDING;
    unstakeStartAt[tokenId] = block.timestamp;
    emit NFTUnstakePending(tokenId);
}

function finalizeUnstake(uint256 tokenId) external {
    require(nftState[tokenId] == UNSTAKE_PENDING);
    require(block.timestamp >= unstakeStartAt[tokenId] + 24 hours);
    nftState[tokenId] = FREE_HOLD;
    emit NFTFreeHoldRestored(tokenId);
}
```

---

## §18. 最终规则摘要（一张图看懂产品闭环）

| 核心权利结构（持有/质押 → 什么能做） |                |
| ------------------------------------ | -------------- |
| 持有 KOL NFT（FREE_HOLD）            | ➜ **竞拍资格** |
| 质押 KOL NFT（STAKE_ACTIVE）         | ➜ **分红资格** |
| 邀请用户实际参与拍卖                 | ➜ **积分资格** |
| 积分 Points ≥ 0                      | ➜ **空投资格** |

| 核心约束结构（"必须 / 必须间隔"）    |                                               |
| ------------------------------------ | --------------------------------------------- |
| KOL 准入担保二选一                   | 10,000 MON 现金 / KOL 专属 NFT 质押 30 天     |
| 质押 → 分红生效                      | 24 小时冷却                                   |
| 解押 → 恢复竞拍                      | 24 小时冷却                                   |
| 质押中 NFT 是否可竞拍                | ❌ 否（资格互斥）                             |
| 每个 KOL 拍卖频率                    | 滚动 7 天 ≤ 1 场                              |
| KOL 是否必须闭环才可开新             | ✅ 必须所有过往拍卖 COMPLETED 或 BREACHED     |
| v2.4 支持标的                        | ✅ 仅社交权益类                               |
| 前端视觉/交互/布局在本 SPEC 中定义？ | ❌ 不定义，由独立 **Frontend SPEC v2.4** 承担 |

> **一句话：nadbid.fun 是"专属 KOL NFT + 持有竞拍 + 质押分红 + 担保准入 + 积分空投 + 可扩展标的"的社交权益链上拍卖协议。**

---

# 落地延伸章节（工程团队使用）

## §19. 当前 Codebase ↔ SPEC 映射表（v2.4 · 已实现 / TODO）

> 读者：合约 Engineer / 后端 Engineer / 前端 Engineer / QA。
> 目标：快速定位"这条 SPEC 对应代码在哪 / 还没做什么"。

| SPEC 章节                                    | 规则条目                                                             | 代码路径（Monorepo 根 = /Users/ricky/AICode/nadbid）                                                            | 状态                                                                    | 备注                                                                                                   |
| -------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| §4.6 / §12.1                                 | 仅在 KOL Profile 页执行 Mint/Burn/Stake/Unstake                      | `src/pages/KolProfile.tsx` · `src/components/kol-profile/MintBurnPanel.tsx`                                     | ✅ 已实现（前端）                                                       | 对接链上合约接口 **TODO**；目前为 mock + store optimistic                                              |
| §4.4 / §5                                    | NFT 四态：FREE_HOLD / STAKE_PENDING / STAKE_ACTIVE / UNSTAKE_PENDING | `src/types/index.ts`（已加 `stakedTickets`, `liquid = userTicketBalance - staked` 计算于 MintBurnPanel）        | 🟡 部分                                                                 | 枚举型 `NftState = FREE_HOLD\|…` 尚未在 types 中硬编码；**TODO**：types 层加枚举 + 每 tokenId 粒度状态 |
| §12.2                                        | Mint/Burn 手续费 8%（5% KOL + 3% Platform）                          | MintBurnPanel 中 Toast 文案当前未显示手续费拆分                                                                 | ❌ TODO                                                                 | Toast/Mint cost 显示 **Est. cost = Total(含8%手续费) + 拆分明细 5% / 3%**；合约侧按 §12.2 即时结算     |
| §11 / §13                                    | Pending / Claimed 分红 + Your snapshot                               | `src/components/kol-profile/ProfileHeaderCard.tsx` "Your snapshot" + MintBurnPanel "Pending / Lifetime claimed" | ✅ 已实现（前端展示）                                                   | Pull Claim 批量领取按钮 & ClaimAll 合约交互 **TODO**                                                   |
| §5.1 质押档位三选一 7/30/90d                 | MintBurnPanel `Stake tickets` 输入                                   | 🟡 仅任意数量 TKT 输入，未引入锁定期选择 UI                                                                     | ❌ TODO                                                                 | 加入 lockPeriod Pill（7d / 30d / 90d）+ 预计释放日期计算 + boost 文案                                  |
| §3 / §7.2 准入担保 / 频率限制 / 闭环要求     | 后端 / Admin 面                                                      | ❌ TODO                                                                                                         | 当前前端无 KOL 开拍卖入口（下一阶段开 CreateAuctionModal + 担保金展示） |
| §6.1 出价资格（FREE_HOLD ≥ 1）               | AuctionDetail 出价入口                                               | `src/pages/AuctionDetail.tsx` + `src/components/auction-detail/BidBoard.tsx`                                    | 🟡 展示出价板但资格校验未引入 **hasFreeHoldNFT** 查询                   | 出价按钮 disable 时需明确 Toast 提示"你还没有 @xxx 的 NFT，请先 Mint"                                  |
| §6.3 单次出价 X ≥ 100 MON + X 固定           | queries / 合约                                                       | `src/api/auctions/queries.ts` auction `bidPrice` 字段当前展示价                                                 | ❌ TODO                                                                 | 出价时 require msg.value == bidFixedCost && ≥ 100 MON                                                  |
| §8 结算顺序锁 + §9 履约证据 + §10 退款池公式 | 合约 + 后端结算服务                                                  | ❌ TODO                                                                                                         |                                                                         |
| §13 积分 / §14 空投                          | Points + Airdrop 合约 / 后端 / 前端积分页                            | ❌ TODO                                                                                                         | 目前无 Points 页面 / Airdrop 页面，需新路由                             |
| §16.3 关键事件                               | 合约 / 后端 indexer / 前端订阅                                       | ❌ TODO                                                                                                         | 所有事件必 Emit + 前端用 Wagmi useWatchContractEvent 重渲染             |
| §2.1/2.2 拍卖标的分类                        | OngoingAuction / UpcomingAuction model                               | `type AuctionKol` → 需扩展 `itemCategory`                                                                       | 🟡 模型未引入                                                           | **TODO**：types 中加 `ItemCategory` 枚举                                                               |
| §15 前端边界 / Frontend SPEC                 | Pages + Components 本身                                              | 前端已交付：Home / AuctionDetail / KOLs / KolProfile + 4 个 kol-profile 子组件                                  | ✅ 已实现                                                               | 需独立写 Frontend SPEC v2.4 记录视觉/布局/交互/移动端适配                                              |

---

## §20. 测试矩阵（v2.4 Acceptance Criteria Test Grid）

| 编号 | 类别                      | 用例                                                                                                                                            | 通过标准                                                                              | 覆盖的 SPEC 条款 |
| ---- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------- |
| T-01 | NFT MINT                  | 用户 mint 3 张 KOL NFT，看余额变化                                                                                                              | balanceMon ↓= 3×unit_price×(1+8%), userTicketBalance += 3, Toast 显示拆分手续费 5%/3% | §12.1 / §12.2    |
| T-02 | NFT BURN                  | 用户 burn 2 张（需先 unstake，如果是质押中）                                                                                                    | liquidTickets ≥ 2, burn 成功, balanceMon ↑≈2×unit_price×(1-8%)                        | §12.2 / §5.4     |
| T-03 | 质押档位三选一 + 四态流转 | stake(30d) → 24h block.timestamp mock → activateStake → requestUnstake → finalizeUnstake                                                        | 状态机严格按 FREE→PEND→ACT→UNST→FREE；非法跳转 revert                                 | §5               |
| T-04 | 竞拍资格互斥              | staking 2 张时，出价 should revert；解押 24h pending 时 should revert                                                                           | require(hasFreeHoldNFT) 在 placeBid 前触发                                            | §6.2             |
| T-05 | X≥100 MON 出价门槛        | 传 msg.value=99 → revert；100 → success                                                                                                         | §6.3                                                                                  |
| T-06 | 频率限制 7d 1 场          | KOL 在 T 日创建成功 → T+5d 再次 create → should revert；T+7d 成功                                                                               | §7.1                                                                                  |
| T-07 | 未闭环不可再开            | KOL 有 1 场 ACTIVE → create → revert；COMPLETED → 成功                                                                                          | §7.2 / §7.3                                                                           |
| T-08 | 结算顺序锁                | 强制乱序结算步骤 → 重入 → 全部 revert                                                                                                           | §8.3                                                                                  |
| T-09 | 48h 未提交证据 → 违约     | settlement 后快进 block.timestamp > performanceDeadline + 48h → 裁定 BREACHED → 退款池 = 80% Volume + Penalty（若有）→ user_i refund 与公式相等 | §9.6 / §10.2 / §10.3                                                                  |
| T-10 | 72h 自动确认              | 合格证据提交后 winner 72h 无操作 → auction status → COMPLETED → KOL 可提 + Dividend Claimable                                                   | §9.3 / §9.4 / §10.1                                                                   |
| T-11 | 分红 Pull Claim           | 批量 claim 10 场 → 总金额正确；重复 claim → revert                                                                                              | §11.4                                                                                 |
| T-12 | 积分来源三条 + 前20%加成  | 实际竞价 N=5（ceil(0.2×5)=1）→ 1st bidder 得加成 ×(multiplier)；邀请积分仅在 ≥1 笔有效出价后才增加                                              | §13.4 / §13.5                                                                         |
| T-13 | 空投仅依据 Points         | Points = 0 的地址不在 merkle；claim 传错 proof revert；正确的 tokenId × amount 可领取                                                           | §14.3                                                                                 |
| T-14 | Security / §16            | 所有关键事件都 Emit；Admin 不能改终态；邀请关系已绑定后 rewrite → revert；积分无 setPoints 接口（call）→ revert                                 | §16.1 / §16.2 / §16.3                                                                 |

---

## §21. 参数表索引（治理 / 部署参考）

> 所有数值都不硬编码在本规范中；按表治理，修改必须多签 + emit event + 更新 CI 校验。

| 参数组                 | Key                                              | 默认推荐值      | 单位 / 类型      | 变更必须通过                           | 相关 Event              |
| ---------------------- | ------------------------------------------------ | --------------- | ---------------- | -------------------------------------- | ----------------------- |
| **bond_params**        | cash_bond_amount                                 | 10,000          | MON              | Admin 多签                             | BondParamChanged        |
| **bond_params**        | nft_bond_min_lock                                | 30              | days             | Admin 多签                             | BondParamChanged        |
| **nft_params**         | mint_burn_fee_total / kol_share / treasury_share | 8% / 5% / 3%    | BPS（10_000 基） | KOL 合约部署时固化 + 治理升级          | MintFeeChanged          |
| **stake_params**       | lock_periods[]                                   | [7, 30, 90]     | days             | 治理多签                               | StakeParamChanged       |
| **stake_params**       | pending_period                                   | 24              | hours            | 治理多签                               | StakeParamChanged       |
| **auction_params**     | min_bid_fixed_cost                               | 100             | MON              | Admin 多签（KOL 无法私自降低）         | AuctionParamChanged     |
| **auction_params**     | countdown_reset_on_bid                           | 60              | seconds          | Admin 多签                             | AuctionParamChanged     |
| **auction_params**     | max_auctions_per_kol_per_7d                      | 1               | count            | Admin 多签                             | AuctionParamChanged     |
| **auction_params**     | platform_fee_pct                                 | 20%             | BPS              | 治理多签                               | FeeParamChanged         |
| **auction_params**     | kol_dividend_R_pct                               | 15%（建议默认） | BPS × CATEGORY   | 治理多签（按分类 × KOL 等级 override） | FeeParamChanged         |
| **performance_params** | performance_deadline                             | 48              | hours            | Admin 多签                             | PerformanceParamChanged |
| **performance_params** | winner_confirm_window                            | 72              | hours            | Admin 多签                             | PerformanceParamChanged |
| **performance_params** | dispute_ruling_sla                               | 72              | hours            | Admin 多签                             | PerformanceParamChanged |
| **settlement_params**  | settlement_block_confirms                        | 12              | blocks           | 合约部署时固化                         | —                       |
| **points_params**      | invite_bonus                                     | —               | _独立表_         | 积分多签（与资金权限隔离）             | PointsParamChanged      |
| **points_params**      | bid_bonus_front_pct                              | 20%             | percent          | 积分多签                               | PointsParamChanged      |
| **points_params**      | stake_day_weight                                 | —               | _独立表_         | 积分多签                               | PointsParamChanged      |
| **airdrop_params**     | season_interval                                  | —               | _独立表_         | 空投多签（建议 ≥ 与 points 同）        | AirdropParamChanged     |

---

## §22. 状态机总图（双状态机）

### 22.1 KOL NFT 状态机

```
                     stake(lockPeriod ∈ {7,30,90}d)
FREE_HOLD ────────────────────────────────────────────► STAKE_PENDING
   ▲                                                       │
   │                                                       │  block.timestamp ≥
   │                                                       │  stakeStartAt + 24h
   │                                                       │  activateStake()
   │                                                       ▼
   │                                                   STAKE_ACTIVE
   │                                                       │
   │                                                       │  block.timestamp ≥
   │                                                       │  stakeStartAt + lockPeriod
   │                                                       │  requestUnstake()
   │                                                       ▼
   └──────── finalizeUnstake() ◄────────────────── UNSTAKE_PENDING
        (after unstakeStartAt + 24h)
```

**非法跳转（均必须 revert）**：FREE → STAKE_ACTIVE；STAKE_PENDING → FREE（除非通过 unstake 路径）；STAKE_ACTIVE → FREE（跳过 UNSTAKE_PENDING）。

### 22.2 拍卖状态机

```
KOL createAuction(担保有效 + 7d ≤1场 + 全部终态)
          │
          ▼
        ACTIVE ◄── placeBid() 时 resetCountdown(60s) ──┐
          │                                             │
          │  (countdown end OR admin emergency)         │
          ▼                                             │
       SETTLED ─────────────────────────────────────────┘
          │
          │  evidence.submit() 合格
          │  + 48h window
          ▼
     EVIDENCE_PENDING (隐含在 SETTLED 后)
          │
    ┌─────┴──────────────────┐
    │ winner confirms        │ winner disputes / admin invalidates
    │  or 72h auto-confirm   │ or 48h no evidence
    ▼                        ▼
 COMPLETED                BREACHED
 (2终态之一)              (2终态之一)
  → KOL payout            → 80% + Penalty → Refund pool
  → Dividend claimable    → No dividend
```

**非法终态**：拍卖状态不得出现除 COMPLETED/BREACHED 以外的其它终态。

---

## Doc Lifecycle Sign-Off（签字区）

> 仅在第一次发布、每次大版修订、以及每次 90 天 cadence verify 时更新此表。

| 签字角色              | 签字人 | 日期       | 当前验证的最后一个 Git Commit SHA | Last verified | 备注          |
| --------------------- | ------ | ---------- | --------------------------------- | ------------- | ------------- |
| SPEC 作者（本版执笔） | [待填] | 2026-08-26 | [待填]                            | 2026-08-26    | v2.4 初版发布 |
| 合约 Owner            | [待填] |            |                                   |               |               |
| 后端 Owner            | [待填] |            |                                   |               |               |
| 前端 Owner            | [待填] |            |                                   |               |               |
| 积分/空投 Owner       | [待填] |            |                                   |               |               |
| 治理多签代表          | [待填] |            |                                   |               |               |

> **Archival 规则**：当新 SPEC v2.5 发布，本文件迁移为 `spec/archive/nadbid-SPEC-v2.4.md`，并在 spec/ 根目录放 LATEST symlink 指向最新版。
