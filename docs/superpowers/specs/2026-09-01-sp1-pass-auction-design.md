# SP-1: KOL PASS + 便士拍卖 链上闭环 — 设计文档

> **日期**：2026-09-01
> **状态**：已获用户批准（逐节确认）
> **目标链**：Monad 测试网（chainId 10143）
> **工具链**：Solidity ^0.8 + Foundry
> **对应 SPEC**：`spec/nadbid-SPEC-v2.4.md`

---

## 1. 背景与目标

nadbid.fun 是去中心化 KOL PASS 便士拍卖应用。前端已完成 mock 阶段（5 大交易功能全部 mock），但**链上合约完全不存在**（无 .sol 源码、无部署、无地址）。

本子项目（SP-1）的目标：**编写并部署最小闭环合约，让 KOL 入驻 + PASS mint/burn + 拍卖出价/结算 跑通真实链上数据**，替换现有 mock。

**SP-1 明确不在范围内**（保留 mock，后续 SP 处理）：
- 质押（Staking）合约与页面 → SP-2
- 领取（Claim/分红）→ SP-2
- 结算履约 48h 锁定、争议仲裁 → SP-3
- 积分（Points）系统 → 后续

---

## 2. 已确认的关键决策（用户批准）

| 决策点 | 结论 |
|---|---|
| 工具链 | **Foundry**（forge 编译/测试/部署） |
| SP-1 范围 | **最小闭环**：KOL 入驻 + PASS + 拍卖 |
| 合约架构 | **方案 A**：NadbidRegistry + NadbidFactory + KolPass + KolAuction |
| KOL 入驻 | 只"连接钱包 → 绑定推特（X API 验证粉丝>1万）" |
| 质押时机 | **创建 PASS/拍卖合约时**才要求质押 10 MON（一次性质押解锁创建资格） |
| 担保金额 | 10 MON（可赎回，48h 履约确认窗口）；RealNads NFT 通道测试网预留（主网地址 `0xe20c4f8cacdb1854151f3e12144bdc919e608b9b`） |
| PASS 创建 | KOL 只填**铸造价格**（曲线基础价） |
| 拍卖创建 | KOL 填**固定出价** + **拍卖内容**（无"起拍价"概念） |
| 出价机制 | 便士拍卖固定价（如 99 MON/次），无价格上涨机制 |
| 拍卖时长 | KOL 创建时填初始时长；出价后重置 40s（沿用前端 `BID_EXTEND_SECONDS=40`） |
| 结算资金 | 结算即解锁（20% 平台 / 80% KOL），**不引入 48h 履约锁定**（留 SP-3） |
| RealNads NFT | 测试网 MVP 只开放"质押 10 MON"通道；NFT 质押代码预留地址留空 |
| 前端范围 | 切 KOL 入驻 + PASS + 拍卖；Staking/Claim/仲裁 保留 mock |

---

## 3. 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     前端（React + wagmi）                     │
│   KOL 入驻页 / KOL Profile / 拍卖详情页 / 首页拍卖列表        │
└──────────────┬──────────────────────────┬────────────────────┘
               │ read/write               │ read/write
               ▼                          ▼
┌──────────────────────┐   ┌───────────────────────────────────┐
│   NadbidRegistry     │   │   NadbidFactory                   │
│  · KOL 入驻(钱包↔推特) │   │  · createKolPass(铸造价)         │
│  · 10 MON 担保质押/赎回│──▶│  · createKolAuction(固定出价+内容)│
│  · KOL→合约索引        │   └───────────────────────────────────┘
└──────────────────────┘           │ new 部署
                                   ▼
              ┌───────────────────────────────────┐
              │  KolPass（每 KOL 一个）            │
              │  · 债券曲线 mint/burn（8% 手续费） │
              │  · soulbound 禁转账                │
              └───────────────────────────────────┘
              ┌───────────────────────────────────┐
              │  KolAuction（每 KOL 一个）         │
              │  · placeBid 固定价 + 倒计时重置    │
              │  · settle 结算（20%平台/80%KOL）   │
              └───────────────────────────────────┘
```

**职责划分**：
- `NadbidRegistry`：KOL 身份入驻、10 MON 担保、KOL→合约索引
- `NadbidFactory`：KOL 自己发起创建 PASS / 拍卖合约的唯一入口
- `KolPass`：单 KOL 债券曲线 PASS（mint/burn/soulbound/手续费）
- `KolAuction`：单 KOL 便士拍卖（placeBid/settle）

---

## 4. NadbidRegistry 合约

### 4.1 状态

```solidity
struct Kol {
    address wallet;               // KOL 钱包地址
    string twitterHandle;         // 推特账号
    uint256 followers;            // 粉丝数（X API 验证后写入）
    bool registered;              // 是否完成入驻
    bool bonded;                  // 10 MON 担保是否已质押
    uint256 bondAmount;           // 质押金额（10 MON = 10e18）
    uint256 bondTimestamp;        // 质押时间
    uint256 bondRedeemRequestedAt; // 赎回申请时间（48h 窗口起点）
    bool bondRedeemPending;       // 是否在赎回等待期
    bool banned;                  // 封禁标记
    address[] passContracts;      // 该 KOL 创建的 PASS 合约列表
    address[] auctionContracts;   // 该 KOL 创建的拍卖合约列表
}
```

常量：
- `BOND_AMOUNT = 10 ether`（10 MON）
- `BOND_REDEEM_COOLDOWN = 48 hours`
- `MIN_FOLLOWERS = 10_000`

### 4.2 核心函数

```solidity
// ===== KOL 入驻 =====
function registerKol(string calldata twitterHandle, uint256 followers) external;
// require: 未注册 / handle 非空 / followers >= MIN_FOLLOWERS(10000)
// 前端先调 X API 验证粉丝>1万，把 handle + followers 上链

// ===== 10 MON 担保 =====
function depositBond() external payable;
// require: msg.value == BOND_AMOUNT / 已入驻 / 未质押
// 一次性质押 10 MON，解锁创建资格

function requestBondRedeem() external;
// require: 已质押 / 名下无未结算拍卖 / 未在等待期
// 进入 48h 等待期

function finalizeBondRedeem() external;
// require: 已申请赎回 / block.timestamp >= bondRedeemRequestedAt + 48h
// 返还 10 MON

// ===== 查询 =====
function isKolRegistered(address wallet) external view returns (bool);
function getKol(address wallet) external view returns (Kol memory);
function hasBond(address wallet) external view returns (bool);
function isKolBanned(address wallet) external view returns (bool);
```

### 4.3 规则要点

1. 入驻 = 钱包连接 + 推特绑定 + 粉丝>1万（粉丝数由后端 X API 验证后写入，合约仅校验 `>= 10000`）
2. 质押 = 一次性 10 MON，解锁"创建 PASS/拍卖"资格
3. 赎回 = 申请后 48h 履约确认窗口，到期可领回；**赎回等待期间不能创建新合约**
4. 封禁 = `banned` 标记，封禁后不能创建/出价（Admin 功能，MVP 留接口）

---

## 5. NadbidFactory 合约

### 5.1 核心函数

```solidity
// ===== 创建 PASS =====
function createKolPass(uint256 mintPrice) external returns (address passContract);
// require: KOL 已入驻 / 已质押 10 MON / 未在赎回等待期
// 部署 KolPass，债券曲线参数按 mintPrice 生成并链上固化

// ===== 创建拍卖 =====
function createKolAuction(
    address passContract,      // 关联的 PASS 合约
    uint256 fixedBidAmount,    // 固定出价金额
    uint256 duration,          // 拍卖初始时长（秒）
    string calldata content    // 拍卖内容
) external returns (address auctionContract);
// require: passContract 属于调用者 / 已质押担保 / 未在赎回等待期
// 部署 KolAuction，关联到 passContract

// ===== 事件 =====
event KolPassCreated(address indexed kol, address passContract, uint256 mintPrice);
event KolAuctionCreated(address indexed kol, address auctionContract, address passContract, uint256 fixedBidAmount);
```

### 5.2 规则要点

1. 创建前提：已入驻（registered）+ 已质押 10 MON（bonded）+ 非赎回等待期
2. PASS 创建：只填 `mintPrice`（曲线基础价），曲线指数（2）、基础供应量（1000）由合约固化
3. 拍卖创建：填固定出价 + 内容（`content` string 直接存链上）
4. Factory 内部记录 KOL → 各合约地址，同时写入 Registry 的索引列表
5. 拍卖初始时长由 KOL 填；出价后重置为 `BID_EXTEND_SECONDS`（40s）

---

## 6. KolPass 合约

### 6.1 状态

```solidity
struct CurveConfig {
    uint256 basePrice;    // 铸造价格（Factory 传入）
    uint256 baseSupply;   // 基础供应量（固化 = 1000）
    uint256 exponent;     // 曲线指数（固化 = 2）
}
// price(supply) = basePrice * (supply / baseSupply) ^ exponent
```

手续费常量：
- `PLATFORM_FEE = 3%`
- `KOL_FEE = 5%`
- 合计 8%（与 SPEC §12.2 一致）

### 6.2 核心函数

```solidity
// ===== 铸造 =====
function mint(uint256 quantity) external payable returns (uint256[] memory tokenIds);
// cost = Σ curvePriceAt(supply + i) × (1 + 8%)
// 8% 手续费即时拆分：5% → KOL 收款地址，3% → 平台 treasury
// 铸出的 NFT 记录在用户地址

// ===== 销毁 =====
function burn(uint256[] calldata tokenIds) external;
// 按当前曲线价回收（扣 8% 手续费）
// require: 用户拥有这些 tokenId

// ===== Soulbound 禁转账 =====
function transferFrom(...) external override { revert("soulbound"); }
function safeTransferFrom(...) external override { revert("soulbound"); }
// 只有 mint/burn 能改变所有权，禁止任何转账

// ===== 查询 =====
function balanceOf(address owner) external view returns (uint256);
function curvePrice() external view returns (uint256);
function totalSupply() external view returns (uint256);
function getCurveConfig() external view returns (CurveConfig memory);
```

### 6.3 规则要点

1. 债券曲线：`price = basePrice × (supply/baseSupply)²`，与前端 `bondingCurve.ts` 完全一致
2. 手续费：每次 mint/burn 即时结算 8%（5% KOL + 3% 平台），不进入拍卖池
3. Soulbound：override `transferFrom`/`safeTransferFrom` 直接 revert
4. 持有 FREE_HOLD PASS = 有资格参与该 KOL 拍卖出价（合约层面由拍卖合约校验 balanceOf）

---

## 7. KolAuction 合约

### 7.1 状态

```solidity
struct Auction {
    uint256 id;                 // 拍卖 ID
    address kol;                // KOL 钱包
    address passContract;       // 关联 PASS 合约
    uint256 fixedBidAmount;     // 固定出价
    string content;             // 拍卖内容
    uint256 startTime;          // 开拍时间
    uint256 endTime;            // 当前倒计时截止
    address lastBidder;         // 最后出价者（中标者）
    uint256 totalBids;          // 总出价次数
    uint256 totalVolume;        // 累计出价金额
    AuctionStatus status;       // ACTIVE / SETTLED
    bool settled;               // 是否已结算
}

mapping(address => uint256) public cumulativeBid;  // 每地址累计出价金额
```

常量：
- `BID_EXTEND_SECONDS = 40`（出价后倒计时重置）
- `PLATFORM_SETTLE_PCT = 20%`、`KOL_SETTLE_PCT = 80%`

### 7.2 核心函数

```solidity
// ===== 出价 =====
function placeBid() external payable returns (bool);
// require 顺序（SPEC §6.1）：
//   1. status == ACTIVE
//   2. msg.value == fixedBidAmount
//   3. block.timestamp < endTime
//   4. passContract.balanceOf(msg.sender) > 0  （持有该 KOL FREE_HOLD PASS）
//   5. 未封禁
// 处理链（SPEC §6.4）：
//   recordBidder → cumulativeBid[msg.sender] += fixedBidAmount
//   → lastBidder = msg.sender → totalBids++ → totalVolume += fixedBidAmount
//   → resetCountdown：endTime = block.timestamp + BID_EXTEND_SECONDS
//   → emit BidPlaced(auctionId, bidder, fixedBidAmount, block.timestamp)

// ===== 结算 =====
function settle() external;
// require: status == ACTIVE / 未结算 / block.timestamp >= endTime
// 步骤（SPEC §8.3）：
//   1. status ← SETTLED
//   2. totalVolume 已累计
//   3. 20% → 平台 treasury（可提取）
//   4. 80% → KOL（MVP：结算即解锁）
//   5. emit AuctionSettled(auctionId, lastBidder, totalVolume)

// ===== 查询 =====
function getAuction() external view returns (Auction memory);
function getCumulativeBid(address bidder) external view returns (uint256);
```

### 7.3 规则要点

1. 出价资格：必须持有该 KOL 的 PASS（`balanceOf > 0`）——与 SPEC §6.2 一致
2. 固定出价：`msg.value == fixedBidAmount` 严格校验
3. 倒计时重置：每次出价 `endTime = now + 40s`
4. 中标者：结算时 `lastBidder` 即中标者，`cumulativeBid[lastBidder]` 是其累计金额
5. 资金拆分：20% 平台 / 80% KOL（MVP 结算即解锁，不引入 48h 履约锁定）

---

## 8. 后端 X API 粉丝验证

KOL 绑定推特需要后端服务验证粉丝数。项目现有 Express + dotenv，扩展一个 server 路由：

```
POST /api/kol/verify-twitter
  body: { wallet, twitterHandle, oauthToken }
  → 调用 X API v2: users/by/username/{handle}?user.fields=public_metrics
  → 检查 followers_count >= 10000
  → 返回 { verified: true, followers: 12345 }
  → 前端拿到后调 Registry.registerKol(handle, followers)
```

- X API Bearer Token 存后端环境变量（不暴露前端）
- MVP 简化：OAuth 完整流程（发帖凭证双校验）后置，先做 handle + Bearer token 查粉丝数

---

## 9. 前端真实数据接入

### 9.1 新增 hooks

```
useKolPassRead/useKolPassWrite   — mint/burn、曲线价、持仓
useAuctionRead/useAuctionWrite   — placeBid、结算、倒计时、事件订阅
useRegistryRead                  — KOL 状态、担保
```

### 9.2 页面改造

| 页面 | 现在（mock） | 改为（真实） |
|---|---|---|
| KOL 入驻页（新建） | 无 | 连接钱包 → 绑定推特（X API 验证）→ 质押 10 MON → 创建 PASS/拍卖 |
| 首页拍卖列表 | `mockAuctions` | Factory/Registry 索引 + 各 KolAuction 状态 |
| 拍卖详情页 | mock + 模拟出价 | 链上 `placeBid` + `BidPlaced` 事件订阅 |
| KOL Profile | `bondingCurve.ts` + mock | 链上 `curvePrice()`/`totalSupply()` + 真实 mint/burn |
| Staking/Claim/仲裁 | mock | **保留 mock**（SP-2/3 接入） |

### 9.3 关键设计点

1. 事件驱动：拍卖详情页不再用 `useSimulatedBids`，改订阅 `BidPlaced` 事件实时刷新
2. 倒计时：链上 `endTime` 为权威，前端倒计时从 `endTime` 推算
3. 金额精度：链上用 `bigint`（wei），前端 `formatUnits` 展示，避免浮点误差
4. 网络状态：无合约地址/未连接时显示"合约未部署/请连接钱包"，不再 fallback mock

---

## 10. 错误处理

| 场景 | 处理 |
|---|---|
| 未连接钱包 | ConnectButton 引导连接 |
| 合约未部署（地址空） | 页面显示"合约未部署"提示，禁用交易按钮 |
| 粉丝 <1万 | 入驻表单红字提示"粉丝数需 ≥ 10,000" |
| 未质押 10 MON 就创建 | Registry 校验 revert，前端 toast "请先质押 10 MON" |
| 未持有 PASS 就出价 | 拍卖合约 revert，前端 toast "需持有该 KOL 的 PASS" |
| 出价金额 ≠ 固定价 | 前端用固定价填充，合约二次校验 |
| 用户拒绝签名 | 静默处理（沿用 web3Errors） |

---

## 11. 测试策略（Foundry）

```
test/
├── KolPass.t.sol        # 曲线价格、mint/burn、手续费拆分、soulbound revert
├── KolAuction.t.sol     # 出价资格、固定价校验、倒计时重置、结算拆分
├── NadbidRegistry.t.sol # 入驻、质押、48h 赎回、创建资格
├── NadbidFactory.t.sol  # 创建 PASS/拍卖、参数固化、权限校验
└── Integration.t.sol    # 全流程：入驻→质押→建 PASS→mint→建拍卖→出价→settle
```

每条 SPEC 约束对应一个 test case（require 顺序、倒计时重置、并发出价）。

---

## 12. 部署

```
forge script Deploy.s.sol --rpc-url $MONAD_TESTNET_RPC --broadcast
# 部署顺序：NadbidRegistry → NadbidFactory（→ 测试网 RealNads 可选）
# 部署后地址填 .env（VITE_CONTRACT_REGISTRY / FACTORY 等）
```

- Monad 测试网 RPC：`https://testnet-rpc.monad.xyz`
- 部署者需要测试网钱包 + 测试网 MON（水龙头领取）

---

## 13. 里程碑（验收标准）

1. **合约层**：4 个合约编译通过，Foundry 测试全部通过（每条 SPEC 约束有对应 test）
2. **部署层**：合约部署到 Monad 测试网，地址填 .env，前端能读到链上数据
3. **入驻闭环**：KOL 能连接钱包 → 绑定推特（粉丝>1万验证）→ 质押 10 MON → 创建 PASS/拍卖合约
4. **交易闭环**：用户能真实 mint/burn PASS（债券曲线+8%手续费）、拍卖出价（固定价+倒计时重置）、结算（20%/80% 拆分）
5. **前端切换**：KOL 入驻/首页拍卖列表/拍卖详情页/KOL Profile 使用真实链上数据，mock 移除
6. **质量**：tsc 0 错误、build 成功、无控制台错误

---

## 14. 后续 SP 衔接

- **SP-2**：质押合约（7d/30d/90d 状态机）+ 领取/分红 → 接 Staking/Claim 页面
- **SP-3**：结算 48h 履约锁定 + 争议仲裁 → 接 Arbitration 页面
- **SP-4**：积分系统（Points）
- RealNads NFT 质押通道在测试网部署后开放
