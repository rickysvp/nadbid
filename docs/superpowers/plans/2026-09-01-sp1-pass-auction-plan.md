# SP-1: KOL PASS + 便士拍卖 链上闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 编写并部署 4 个 Solidity 合约（NadbidRegistry/NadbidFactory/KolPass/KolAuction）到 Monad 测试网，并把前端 KOL 入驻 + PASS mint/burn + 拍卖出价/结算从 mock 切换为链上真实数据。

**Architecture:** Foundry 合约工程（TDD）+ 前端 wagmi v2 hooks 接入。合约按依赖序开发：Registry → Factory → KolPass → KolAuction → 集成测试 → 部署 → 前端切换。设计文档：`docs/superpowers/specs/2026-09-01-sp1-pass-auction-design.md`。

**Tech Stack:** Solidity ^0.8 · Foundry (forge 1.5.1) · Monad 测试网 (chainId 10143) · wagmi v2 + viem · React 19

---

## 文件结构

```
contracts/                        # Foundry 工程根（新建）
├── foundry.toml
├── src/
│   ├── NadbidRegistry.sol        # KOL 注册 + 10 MON 担保
│   ├── NadbidFactory.sol         # 创建 PASS/拍卖合约工厂
│   ├── KolPass.sol               # 债券曲线 PASS（soulbound）
│   └── KolAuction.sol            # 便士拍卖
├── script/
│   └── Deploy.s.sol              # 部署脚本
└── test/
    ├── KolPass.t.sol
    ├── KolAuction.t.sol
    ├── NadbidRegistry.t.sol
    ├── NadbidFactory.t.sol
    └── Integration.t.sol

src/web3/                         # 前端（修改）
├── config.ts                     # 新增 monadTestnet + 合约地址配置
├── contracts.ts                  # 重写：真实 ABI（从 artifacts 导入）
└── hooks/
    ├── useKolPass.ts             # 新建：mint/burn/曲线价/持仓
    ├── useAuction.ts             # 新建：placeBid/结算/事件订阅
    └── useRegistry.ts            # 新建：KOL 状态/担保/创建
src/pages/
├── KolOnboardingPage.tsx         # 新建：KOL 入驻页
├── AuctionDetailPage.tsx         # 修改：真实数据
├── KolProfilePage.tsx            # 修改：真实 mint/burn
└── AuctionsPage.tsx              # 修改：真实拍卖列表
server/                           # 后端（新建）
└── verify-twitter.ts             # X API 粉丝验证路由
```

---

## Task 1: 初始化 Foundry 工程

**Files:**
- Create: `contracts/foundry.toml`
- Create: `contracts/src/`（占位）
- Create: `contracts/test/`（占位）

- [ ] **Step 1: 初始化 Foundry 工程**

```bash
cd /Users/ricky/AICode/nadbid
mkdir -p contracts/src contracts/test contracts/script
cd contracts
forge init --force --no-git . 2>/dev/null || true
rm -f src/Counter.sol test/Counter.t.sol script/Counter.s.sol 2>/dev/null
```

- [ ] **Step 2: 写 foundry.toml**

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.28"
evm_version = "paris"

[rpc_endpoints]
monad_testnet = "https://testnet-rpc.monad.xyz"

[etherscan]
monad_testnet = { key = "${ETHERSCAN_KEY}", url = "https://testnet.monadexplorer.com/api" }
```

- [ ] **Step 3: 安装 forge-std + OpenZeppelin 依赖（提前安装，Task 4 KolPass 依赖 OZ）**

```bash
cd /Users/ricky/AICode/nadbid/contracts
# forge-std 通常随 forge init 自带；如缺失则安装
forge install foundry-rs/forge-std --no-commit 2>/dev/null || true
# OpenZeppelin ERC721（Task 4 KolPass 使用，必须先装，否则 forge test 编译失败）
forge install OpenZeppelin/openzeppelin-contracts@v5.3.0 --no-commit
forge remappings > remappings.txt
cat remappings.txt   # 确认含 @openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/
```

- [ ] **Step 4: 验证编译**

Run: `cd /Users/ricky/AICode/nadbid/contracts && forge build`
Expected: 编译通过，无合约文件（空工程）

- [ ] **Step 5: Commit**

```bash
cd /Users/ricky/AICode/nadbid
git add contracts/
git commit -m "feat(contracts): init Foundry project with forge-std + OpenZeppelin deps"
```

---

## Task 2: NadbidRegistry 合约（TDD）

**Files:**
- Create: `contracts/test/NadbidRegistry.t.sol`
- Create: `contracts/src/NadbidRegistry.sol`

**规则（设计文档 §4）：**
- `registerKol(handle, followers)`：require 未注册 / handle 非空 / followers >= 10000
- `depositBond()`：require msg.value == 10 ether / 已入驻 / 未质押
- `requestBondRedeem()`：require 已质押 / 名下无未结算拍卖 / 未在等待期 → 进入 48h
- `finalizeBondRedeem()`：require 已申请 / 满 48h → 返还 10 MON
- 查询：`isKolRegistered` / `getKol` / `hasBond` / `isKolBanned`

- [ ] **Step 1: 写失败测试**

```solidity
// contracts/test/NadbidRegistry.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {NadbidRegistry} from "../src/NadbidRegistry.sol";

contract NadbidRegistryTest is Test {
    NadbidRegistry registry;
    address kol = address(0xBEEF);

    function setUp() public {
        registry = new NadbidRegistry();
    }

    function test_RegisterKol() public {
        vm.prank(kol);
        registry.registerKol("elonmusk", 150000000);
        assertTrue(registry.isKolRegistered(kol));
    }

    function test_RegisterKol_RejectsLowFollowers() public {
        vm.prank(kol);
        vm.expectRevert();
        registry.registerKol("small", 9999);
    }

    function test_DepositBond_RequiresExactAmount() public {
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000);
        vm.deal(kol, 20 ether);
        vm.expectRevert();
        registry.depositBond{value: 9 ether}();
        vm.stopPrank();
    }

    function test_BondRedeem_48hCooldown() public {
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000);
        vm.deal(kol, 10 ether);
        registry.depositBond{value: 10 ether}();
        registry.requestBondRedeem();
        vm.expectRevert();
        registry.finalizeBondRedeem();  // 未满 48h
        vm.warp(block.timestamp + 48 hours + 1);
        registry.finalizeBondRedeem();
        assertEq(kol.balance, 10 ether);
        vm.stopPrank();
    }
}
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd /Users/ricky/AICode/nadbid/contracts && forge test --match-contract NadbidRegistryTest`
Expected: FAIL（合约不存在）

- [ ] **Step 3: 实现 NadbidRegistry.sol**

```solidity
// contracts/src/NadbidRegistry.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract NadbidRegistry {
    uint256 public constant BOND_AMOUNT = 10 ether;          // 对 SPEC §3.1 的裁剪
    uint256 public constant BOND_REDEEM_COOLDOWN = 48 hours;
    uint256 public constant MIN_FOLLOWERS = 10_000;

    struct Kol {
        address wallet;
        string twitterHandle;
        uint256 followers;
        bool registered;
        bool bonded;
        uint256 bondAmount;
        uint256 bondTimestamp;
        uint256 bondRedeemRequestedAt;
        bool bondRedeemPending;
        bool banned;
        address[] passContracts;
        address[] auctionContracts;
    }

    mapping(address => Kol) private kols;
    mapping(address => bool) private banned;
    address[] public kolList;

    event KolRegistered(address indexed kol, string twitterHandle, uint256 followers);
    event BondDeposited(address indexed kol, uint256 amount);
    event BondRedeemRequested(address indexed kol);
    event BondRedeemed(address indexed kol, uint256 amount);

    modifier onlyRegistered() {
        require(kols[msg.sender].registered, "!REGISTERED");
        _;
    }

    function registerKol(string calldata twitterHandle, uint256 followers) external {
        require(!kols[msg.sender].registered, "ALREADY_REGISTERED");
        require(bytes(twitterHandle).length > 0, "EMPTY_HANDLE");
        require(followers >= MIN_FOLLOWERS, "LOW_FOLLOWERS");
        kols[msg.sender] = Kol({wallet: msg.sender, twitterHandle: twitterHandle, followers: followers, registered: true, bonded: false, bondAmount: 0, bondTimestamp: 0, bondRedeemRequestedAt: 0, bondRedeemPending: false, banned: false, passContracts: new address[](0), auctionContracts: new address[](0)});
        kolList.push(msg.sender);
        emit KolRegistered(msg.sender, twitterHandle, followers);
    }

    function depositBond() external payable onlyRegistered {
        require(!kols[msg.sender].bonded, "ALREADY_BONDED");
        require(!kols[msg.sender].bondRedeemPending, "REDEEM_PENDING");
        require(msg.value == BOND_AMOUNT, "WRONG_AMOUNT");
        kols[msg.sender].bonded = true;
        kols[msg.sender].bondAmount = msg.value;
        kols[msg.sender].bondTimestamp = block.timestamp;
        emit BondDeposited(msg.sender, msg.value);
    }

    function requestBondRedeem() external onlyRegistered {
        require(kols[msg.sender].bonded, "NOT_BONDED");
        require(!kols[msg.sender].bondRedeemPending, "ALREADY_PENDING");
        // 名下无未结算拍卖（设计 §4.2：遍历 auctionContracts 查各 KolAuction.settled）
        for (uint256 i = 0; i < kols[msg.sender].auctionContracts.length; i++) {
            require(IAuction(kols[msg.sender].auctionContracts[i]).settled(), "UNSETTLED_AUCTION");
        }
        kols[msg.sender].bondRedeemPending = true;
        kols[msg.sender].bondRedeemRequestedAt = block.timestamp;
        emit BondRedeemRequested(msg.sender);
    }

    function finalizeBondRedeem() external onlyRegistered {
        require(kols[msg.sender].bondRedeemPending, "NOT_PENDING");
        require(block.timestamp >= kols[msg.sender].bondRedeemRequestedAt + BOND_REDEEM_COOLDOWN, "COOLDOWN");
        uint256 amount = kols[msg.sender].bondAmount;
        kols[msg.sender].bonded = false;
        kols[msg.sender].bondAmount = 0;
        kols[msg.sender].bondRedeemPending = false;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "SEND_FAILED");
        emit BondRedeemed(msg.sender, amount);
    }

    function isKolRegistered(address wallet) external view returns (bool) { return kols[wallet].registered; }
    function hasBond(address wallet) external view returns (bool) { return kols[wallet].bonded; }
    function isKolBanned(address wallet) external view returns (bool) { return banned[wallet]; }
    function getKol(address wallet) external view returns (Kol memory) { return kols[wallet]; }

    // 供 Factory 调用：写入创建的合约索引
    function addPassContract(address kol, address passContract) external {
        require(msg.sender == factory, "!FACTORY");
        kols[kol].passContracts.push(passContract);
    }
    function addAuctionContract(address kol, address auctionContract) external {
        require(msg.sender == factory, "!FACTORY");
        kols[kol].auctionContracts.push(auctionContract);
    }

    address public factory;
    address public owner;
    modifier onlyOwner() { require(msg.sender == owner, "!OWNER"); _; }
    constructor() { owner = msg.sender; }
    function setFactory(address _factory) external onlyOwner { require(factory == address(0), "SET"); factory = _factory; }
    function canCreate(address kol) external view returns (bool) {
        Kol storage k = kols[kol];
        return k.registered && k.bonded && !k.bondRedeemPending && !banned[kol];
    }
}

// 供 Registry 查询 KolAuction 结算状态（避免双向 import）
interface IAuction {
    function settled() external view returns (bool);
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd /Users/ricky/AICode/nadbid/contracts && forge test --match-contract NadbidRegistryTest`
Expected: PASS（所有 test_ 通过）

- [ ] **Step 5: Commit**

```bash
cd /Users/ricky/AICode/nadbid
git add contracts/
git commit -m "feat(contracts): add NadbidRegistry with KOL onboarding + 10 MON bond"
```

---

## Task 3: NadbidFactory 合约（TDD）

**Files:**
- Create: `contracts/test/NadbidFactory.t.sol`
- Create: `contracts/src/NadbidFactory.sol`

**规则（设计文档 §5）：**
- `createKolPass(mintPrice)`：require canCreate / 部署 KolPass / 写 Registry 索引
- `createKolAuction(passContract, fixedBidAmount, duration, content)`：require passContract 属于调用者 / canCreate / 部署 KolAuction
- SP-1 不加频率限制（SPEC §7.1/§7.2 裁剪）

- [ ] **Step 1: 写失败测试**

```solidity
// contracts/test/NadbidFactory.t.sol
contract NadbidFactoryTest is Test {
    NadbidRegistry registry;
    NadbidFactory factory;
    address kol = address(0xBEEF);

    function setUp() public {
        registry = new NadbidRegistry();
        factory = new NadbidFactory(address(registry), address(0xCAFE));  // registry + platformTreasury 两参
        registry.setFactory(address(factory));
    }

    function test_CreateKolPass_RequiresBond() public {
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000);
        vm.expectRevert();
        factory.createKolPass(13.39 ether);  // 未质押
        vm.stopPrank();
    }

    function test_CreateKolPass_AfterBond() public {
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000);
        vm.deal(kol, 10 ether);
        registry.depositBond{value: 10 ether}();
        address pass = factory.createKolPass(13.39 ether);
        assertTrue(pass != address(0));
        assertEq(registry.getKol(kol).passContracts.length, 1);
        vm.stopPrank();
    }

    function test_CreateKolAuction() public {
        // 先建 PASS，再建拍卖
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000);
        vm.deal(kol, 10 ether);
        registry.depositBond{value: 10 ether}();
        address pass = factory.createKolPass(13.39 ether);
        address auction = factory.createKolAuction(pass, 99 ether, 120, "1v1 live chat 30min");
        assertTrue(auction != address(0));
        assertEq(registry.getKol(kol).auctionContracts.length, 1);
        vm.stopPrank();
    }
}
```

- [ ] **Step 2: 运行测试验证失败**

Run: `forge test --match-contract NadbidFactoryTest`
Expected: FAIL（合约不存在）

- [ ] **Step 3: 实现 NadbidFactory.sol**

```solidity
// contracts/src/NadbidFactory.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {NadbidRegistry} from "./NadbidRegistry.sol";
import {KolPass} from "./KolPass.sol";
import {KolAuction} from "./KolAuction.sol";

contract NadbidFactory {
    NadbidRegistry public registry;
    address public platformTreasury;

    event KolPassCreated(address indexed kol, address passContract, uint256 mintPrice);
    event KolAuctionCreated(address indexed kol, address auctionContract, address passContract, uint256 fixedBidAmount);

    constructor(address _registry, address _platformTreasury) {
        registry = NadbidRegistry(_registry);
        platformTreasury = _platformTreasury;
    }

    function createKolPass(uint256 mintPrice) external returns (address) {
        require(registry.canCreate(msg.sender), "!CAN_CREATE");
        require(mintPrice > 0, "ZERO_PRICE");
        KolPass pass = new KolPass(msg.sender, mintPrice, platformTreasury);
        registry.addPassContract(msg.sender, address(pass));
        emit KolPassCreated(msg.sender, address(pass), mintPrice);
        return address(pass);
    }

    function createKolAuction(
        address passContract,
        uint256 fixedBidAmount,
        uint256 duration,
        string calldata content
    ) external returns (address) {
        require(registry.canCreate(msg.sender), "!CAN_CREATE");
        require(KolPass(passContract).kol() == msg.sender, "NOT_OWN_PASS");
        require(fixedBidAmount > 0, "ZERO_BID");
        require(duration > 0, "ZERO_DURATION");
        KolAuction auction = new KolAuction(msg.sender, passContract, fixedBidAmount, duration, content, platformTreasury, address(registry));
        registry.addAuctionContract(msg.sender, address(auction));
        emit KolAuctionCreated(msg.sender, address(auction), passContract, fixedBidAmount);
        return address(auction);
    }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `forge test --match-contract NadbidFactoryTest`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add contracts/
git commit -m "feat(contracts): add NadbidFactory creating KolPass/KolAuction"
```

---

## Task 4: KolPass 合约（TDD）

**Files:**
- Create: `contracts/test/KolPass.t.sol`
- Create: `contracts/src/KolPass.sol`

**规则（设计文档 §6）：**
- `mint(quantity)`：payable，cost = Σ curvePriceAt × (1+8%)，5% KOL + 3% 平台即时结算
- `burn(tokenIds)`：按当前曲线价回收（扣 8%）
- Soulbound：override transferFrom/safeTransferFrom revert
- 查询：balanceOf/curvePrice/totalSupply/getCurveConfig

**曲线：** `price(supply) = basePrice × (supply / baseSupply)^2`，baseSupply=1000，exponent=2

- [ ] **Step 1: 写失败测试**

```solidity
// contracts/test/KolPass.t.sol
contract KolPassTest is Test {
    KolPass pass;
    address kol = address(0xBEEF);
    address platform = address(0xCAFE);
    address buyer = address(0x1234);
    uint256 mintPrice = 13.39 ether;
    uint256 baseSupply = 1000;

    function setUp() public {
        pass = new KolPass(kol, mintPrice, platform);
    }

    function test_CurvePrice_AtBaseSupply() public view {
        assertEq(pass.curvePrice(), mintPrice);  // supply=1000 → price=basePrice
    }

    function test_Mint_CostsWithFee() public {
        vm.deal(buyer, 100 ether);
        uint256 supply = pass.totalSupply();
        uint256 unit = pass.curvePriceAt(1);  // 第一枚的实际曲线价（supply 0→1）
        uint256 cost = unit * 108 / 100;      // +8% 手续费
        vm.prank(buyer);
        pass.mint{value: cost}(1);
        assertEq(pass.balanceOf(buyer), 1);
        assertEq(pass.totalSupply(), supply + 1);
    }

    function test_Mint_SplitsFee() public {
        vm.deal(buyer, 100 ether);
        uint256 unit = pass.curvePriceAt(1);  // 第一枚实际曲线价（注意：非 curvePrice()）
        uint256 cost = unit * 108 / 100;
        uint256 beforeKol = kol.balance;
        uint256 beforePlatform = platform.balance;
        vm.prank(buyer);
        pass.mint{value: cost}(1);
        // 5% KOL + 3% 平台 = 8%（基数 = 实际曲线成交额 unit，非 basePrice）
        assertEq(kol.balance - beforeKol, unit * 5 / 100);
        assertEq(platform.balance - beforePlatform, unit * 3 / 100);
    }

    function test_Transfer_IsSoulbound() public {
        vm.deal(buyer, 100 ether);
        uint256 cost = pass.curvePriceAt(1) * 108 / 100;
        vm.prank(buyer);
        uint256[] memory ids = pass.mint{value: cost}(1);
        vm.prank(buyer);
        vm.expectRevert();
        pass.transferFrom(buyer, address(0x999), ids[0]);
    }
}
```

- [ ] **Step 2: 运行测试验证失败**

Run: `forge test --match-contract KolPassTest`
Expected: FAIL

- [ ] **Step 3: 实现 KolPass.sol**

```solidity
// contracts/src/KolPass.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract KolPass is ERC721 {
    address public kol;
    address public platformTreasury;
    uint256 public baseSupply = 1000;
    uint256 public exponent = 2;
    uint256 public basePrice;
    uint256 public totalMinted;
    uint256 public feeKOL = 5;       // 5%
    uint256 public feePlatform = 3;  // 3%
    uint256 public constant FEE_DENOM = 100;

    mapping(uint256 => uint256) public curveSupplyCache; // 预留（如需要）

    constructor(address _kol, uint256 _basePrice, address _platformTreasury)
        ERC721(string.concat("Nadbid-", _toString(address(this))), "NPASS")
    {
        kol = _kol;
        basePrice = _basePrice;
        platformTreasury = _platformTreasury;
    }

    // price(supply) = basePrice * (supply / baseSupply)^2
    function curvePrice() public view returns (uint256) {
        uint256 supply = totalMinted;
        if (supply == 0) return basePrice;
        return basePrice * supply * supply / (baseSupply * baseSupply);
    }

    function curvePriceAt(uint256 nextSupply) public view returns (uint256) {
        if (nextSupply == 0) return basePrice;
        return basePrice * nextSupply * nextSupply / (baseSupply * baseSupply);
    }

    function mint(uint256 quantity) external payable returns (uint256[] memory tokenIds) {
        require(quantity > 0, "ZERO_QTY");
        tokenIds = new uint256[](quantity);
        uint256 totalCost = 0;
        for (uint256 i = 0; i < quantity; i++) {
            uint256 nextSupply = totalMinted + i + 1;
            totalCost += curvePriceAt(nextSupply);
        }
        uint256 fee = totalCost * (feeKOL + feePlatform) / FEE_DENOM;
        uint256 pay = totalCost + fee;
        require(msg.value >= pay, "INSUFFICIENT");
        // 拆分手续费
        uint256 kolFee = totalCost * feeKOL / FEE_DENOM;
        uint256 platformFee = totalCost * feePlatform / FEE_DENOM;
        (bool ok1, ) = payable(kol).call{value: kolFee}("");
        require(ok1, "KOL_FEE_FAIL");
        (bool ok2, ) = payable(platformTreasury).call{value: platformFee}("");
        require(ok2, "PLATFORM_FEE_FAIL");
        // 退多余
        if (msg.value > pay) {
            (bool ok3, ) = payable(msg.sender).call{value: msg.value - pay}("");
            require(ok3, "REFUND_FAIL");
        }
        for (uint256 i = 0; i < quantity; i++) {
            totalMinted++;
            _safeMint(msg.sender, totalMinted);
            tokenIds[i] = totalMinted;
        }
        return tokenIds;
    }

    function burn(uint256[] calldata tokenIds) external {
        uint256 refund = 0;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(_ownerOf(tokenIds[i]) == msg.sender, "NOT_OWNER");
            uint256 supplyAfterBurn = totalMinted - i - 1;
            refund += curvePriceAt(supplyAfterBurn);
            _burn(tokenIds[i]);
        }
        // 扣 8% 手续费后返还
        uint256 fee = refund * (feeKOL + feePlatform) / FEE_DENOM;
        uint256 net = refund - fee;
        uint256 kolFee = refund * feeKOL / FEE_DENOM;
        uint256 platformFee = refund * feePlatform / FEE_DENOM;
        (bool ok1, ) = payable(kol).call{value: kolFee}("");
        require(ok1, "KOL_FEE_FAIL");
        (bool ok2, ) = payable(platformTreasury).call{value: platformFee}("");
        require(ok2, "PLATFORM_FEE_FAIL");
        (bool ok3, ) = payable(msg.sender).call{value: net}("");
        require(ok3, "REFUND_FAIL");
        totalMinted = totalMinted - tokenIds.length;
    }

    // ===== Soulbound =====
    function transferFrom(address, address, uint256) public override { revert("SOULBOUND"); }
    function safeTransferFrom(address, address, uint256) public override { revert("SOULBOUND"); }
    function safeTransferFrom(address, address, uint256, bytes memory) public override { revert("SOULBOUND"); }

    function getCurveConfig() external view returns (uint256, uint256, uint256) {
        return (basePrice, baseSupply, exponent);
    }

    function _toString(address a) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint256 i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint160(a) >> (8 * (19 - i))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) % 16);
            s[2 * i] = char(hi);
            s[2 * i + 1] = char(lo);
        }
        return string(s);
    }
    function char(bytes1 b) internal pure returns (bytes1) {
        return bytes1(b < 10 ? uint8(b) + 48 : uint8(b) + 87);
    }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `forge test --match-contract KolPassTest`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add contracts/
git commit -m "feat(contracts): add KolPass with bonding curve mint/burn + soulbound"
```

---

## Task 5: KolAuction 合约（TDD）

**Files:**
- Create: `contracts/test/KolAuction.t.sol`
- Create: `contracts/src/KolAuction.sol`

**规则（设计文档 §7）：**
- `placeBid()`：payable，require 顺序 = ACTIVE / msg.value==fixedBidAmount / 未结束 / 持 PASS / 未封禁；倒计时重置 40s；emit BidPlaced(auctionId, bidSeq, bidder, amount, ts)
- `settle()`：require 未结算 / 时间到；20% 平台 / 80% KOL；emit AuctionSettled(..., platformFee, guaranteePool, block.number)

- [ ] **Step 1: 写失败测试**

```solidity
// contracts/test/KolAuction.t.sol
contract KolAuctionTest is Test {
    KolPass pass;
    KolAuction auction;
    address kol = address(0xBEEF);
    address platform = address(0xCAFE);
    address bidder = address(0x1234);
    uint256 fixedBid = 99 ether;
    uint256 duration = 120;

    function setUp() public {
        pass = new KolPass(kol, 13.39 ether, platform);
        // KolAuction 需传 registry（供 banned 检查）；测试用独立 registry 实例
        NadbidRegistry reg = new NadbidRegistry();
        auction = new KolAuction(kol, address(pass), fixedBid, duration, "1v1 live chat", platform, address(reg));
        // bidder 持有 PASS
        vm.deal(bidder, 1000 ether);
        vm.prank(bidder);
        pass.mint{value: 13.39 ether * 108 / 100}(1);
    }

    function test_PlaceBid_Success() public {
        vm.prank(bidder);
        auction.placeBid{value: fixedBid}();
        assertEq(auction.totalBids(), 1);
        assertEq(auction.lastBidder(), bidder);
        assertEq(auction.cumulativeBid(bidder), fixedBid);
    }

    function test_PlaceBid_WrongAmount() public {
        vm.prank(bidder);
        vm.expectRevert();
        auction.placeBid{value: fixedBid - 1}();
    }

    function test_PlaceBid_RequiresPass() public {
        address noPass = address(0x9999);
        vm.deal(noPass, 100 ether);
        vm.prank(noPass);
        vm.expectRevert();
        auction.placeBid{value: fixedBid}();
    }

    function test_PlaceBid_ResetsCountdown() public {
        // 出价后 endTime 重置为 block.timestamp + 40（不是简单延长）
        vm.warp(block.timestamp + 100);  // 先让剩余时间从 120s 降到 20s（< 40s 触发重置生效）
        uint256 before = auction.endTime();  // 此时 = T+20
        vm.prank(bidder);
        auction.placeBid{value: fixedBid}();
        assertEq(auction.endTime(), block.timestamp + 40);  // 重置为 now+40
        assertGt(auction.endTime(), before);                 // now+40 > T+20
    }

    function test_Settle_AfterEnd() public {
        vm.prank(bidder);
        auction.placeBid{value: fixedBid}();
        vm.warp(block.timestamp + 1000);  // 超过 40s
        vm.prank(kol);
        auction.settle();
        assertTrue(auction.settled());
    }

    function test_Settle_TooEarly() public {
        vm.prank(bidder);
        auction.placeBid{value: fixedBid}();
        vm.expectRevert();
        auction.settle();  // 还没到 endTime
    }
}
```

- [ ] **Step 2: 运行测试验证失败**

Run: `forge test --match-contract KolAuctionTest`
Expected: FAIL

- [ ] **Step 3: 实现 KolAuction.sol**

```solidity
// contracts/src/KolAuction.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {KolPass} from "./KolPass.sol";

contract KolAuction {
    enum AuctionStatus { ACTIVE, SETTLED }

    struct Auction {
        uint256 id;
        address kol;
        address passContract;
        uint256 fixedBidAmount;
        string content;
        uint8 itemCategory;      // 预留（SP-1 固定 SOCIAL=1）
        uint256 startTime;
        uint256 endTime;
        address lastBidder;
        uint256 totalBids;
        uint256 totalVolume;
        AuctionStatus status;
        bool settled;
    }

    Auction public auction;
    mapping(address => uint256) public cumulativeBid;
    mapping(address => uint256) public bidCount;

    address public platformTreasury;
    address public registry;  // 供 banned 检查
    uint256 public constant BID_EXTEND_SECONDS = 40;  // 对 SPEC §6.4 原 60s 的裁剪
    uint256 public constant PLATFORM_SETTLE_PCT = 20;
    uint256 public constant KOL_SETTLE_PCT = 80;
    uint256 public constant PCT_DENOM = 100;
    uint256 private seq;

    event BidPlaced(uint256 auctionId, uint256 bidSeq, address indexed bidder, uint256 amount, uint256 timestamp);
    event AuctionSettled(uint256 auctionId, address lastBidder, uint256 totalVolume, uint256 platformFee, uint256 guaranteePool, uint256 blockNumber);

    constructor(address _kol, address _passContract, uint256 _fixedBidAmount, uint256 _duration, string memory _content, address _platformTreasury, address _registry) {
        auction = Auction({
            id: 1,
            kol: _kol,
            passContract: _passContract,
            fixedBidAmount: _fixedBidAmount,
            content: _content,
            itemCategory: 1,
            startTime: block.timestamp,
            endTime: block.timestamp + _duration,
            lastBidder: address(0),
            totalBids: 0,
            totalVolume: 0,
            status: AuctionStatus.ACTIVE,
            settled: false
        });
        platformTreasury = _platformTreasury;
        registry = _registry;
    }

    function placeBid() external payable returns (bool) {
        Auction storage a = auction;
        require(a.status == AuctionStatus.ACTIVE, "!ACTIVE");
        require(msg.value == a.fixedBidAmount, "!FIXED");     // 固定价
        require(block.timestamp < a.endTime, "ENDED");
        require(KolPass(a.passContract).balanceOf(msg.sender) > 0, "!HOLDER");
        require(!IRegistry(registry).isKolBanned(msg.sender), "BANNED");
        // 累计
        seq++;
        cumulativeBid[msg.sender] += msg.value;
        bidCount[msg.sender]++;
        a.lastBidder = msg.sender;
        a.totalBids++;
        a.totalVolume += msg.value;
        // 倒计时重置 40s
        a.endTime = block.timestamp + BID_EXTEND_SECONDS;
        emit BidPlaced(a.id, seq, msg.sender, msg.value, block.timestamp);
        return true;
    }

    function settle() external {
        Auction storage a = auction;
        require(a.status == AuctionStatus.ACTIVE, "!ACTIVE");
        require(!a.settled, "SETTLED");
        require(block.timestamp >= a.endTime, "NOT_ENDED");
        a.status = AuctionStatus.SETTLED;
        a.settled = true;
        uint256 platformFee = a.totalVolume * PLATFORM_SETTLE_PCT / PCT_DENOM;
        uint256 guaranteePool = a.totalVolume - platformFee;
        // 20% 平台
        (bool ok1, ) = payable(platformTreasury).call{value: platformFee}("");
        require(ok1, "PLATFORM_FAIL");
        // 80% KOL（MVP 结算即解锁）
        (bool ok2, ) = payable(a.kol).call{value: guaranteePool}("");
        require(ok2, "KOL_FAIL");
        emit AuctionSettled(a.id, a.lastBidder, a.totalVolume, platformFee, guaranteePool, block.number);
    }

    function getAuction() external view returns (Auction memory) { return auction; }
    function getCumulativeBid(address bidder) external view returns (uint256) { return cumulativeBid[bidder]; }
    function getBidCount(address bidder) external view returns (uint256) { return bidCount[bidder]; }
}

// 供 KolAuction 查询 banned（避免双向 import）
interface IRegistry {
    function isKolBanned(address wallet) external view returns (bool);
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `forge test --match-contract KolAuctionTest`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add contracts/
git commit -m "feat(contracts): add KolAuction penny auction with fixed bid + countdown reset + settle"
```

---

## Task 6: 集成测试 + OpenZeppelin 依赖

**Files:**
- Create: `contracts/test/Integration.t.sol`
- Modify: `contracts/foundry.toml`（remappings）

**依赖：** KolPass 用 OpenZeppelin ERC721，**已在 Task 1 安装**。本任务仅确认并跑集成测试。

- [ ] **Step 1: 确认依赖已装**

```bash
cd /Users/ricky/AICode/nadbid/contracts
forge remappings > remappings.txt
cat remappings.txt   # 应含 @openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/ 和 forge-std/
```

- [ ] **Step 2: 配置 remappings（如缺失）**

```bash
forge remappings > remappings.txt
# 确认 @openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/
```

- [ ] **Step 3: 写集成测试（全流程）**

```solidity
// contracts/test/Integration.t.sol
contract IntegrationTest is Test {
    NadbidRegistry registry;
    NadbidFactory factory;
    address kol = address(0xBEEF);
    address buyer = address(0x1234);
    address platform = address(0xCAFE);

    function setUp() public {
        registry = new NadbidRegistry();
        factory = new NadbidFactory(address(registry), platform);
        registry.setFactory(address(factory));
    }

    function test_FullFlow_OnboardMintBidSettle() public {
        // 1. KOL 入驻 + 质押
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000);
        vm.deal(kol, 10 ether);
        registry.depositBond{value: 10 ether}();
        // 2. 创建 PASS + 拍卖
        address passAddr = factory.createKolPass(13.39 ether);
        address auctionAddr = factory.createKolAuction(passAddr, 99 ether, 120, "1v1 live");
        vm.stopPrank();

        // 3. 用户 mint PASS
        vm.deal(buyer, 1000 ether);
        vm.prank(buyer);
        KolPass(passAddr).mint{value: 13.39 ether * 108 / 100}(1);
        assertEq(KolPass(passAddr).balanceOf(buyer), 1);

        // 4. 出价
        vm.prank(buyer);
        KolAuction(auctionAddr).placeBid{value: 99 ether}();
        assertEq(KolAuction(auctionAddr).lastBidder(), buyer);

        // 5. 结算
        vm.warp(block.timestamp + 1000);
        vm.prank(kol);
        KolAuction(auctionAddr).settle();
        assertTrue(KolAuction(auctionAddr).settled());
    }
}
```

- [ ] **Step 4: 运行全部测试**

Run: `cd /Users/ricky/AICode/nadbid/contracts && forge test`
Expected: 全部 PASS（Registry/Factory/KolPass/KolAuction/Integration）

- [ ] **Step 5: Commit**

```bash
cd /Users/ricky/AICode/nadbid
git add contracts/ foundry.toml 2>/dev/null
git commit -m "feat(contracts): add integration test + OpenZeppelin deps"
```

---

## Task 7: 部署脚本 + 部署到 Monad 测试网

**Files:**
- Create: `contracts/script/Deploy.s.sol`
- Modify: `/Users/ricky/AICode/nadbid/.env.example`（新增合约地址）

**前置条件**：部署钱包已有测试网 MON（水龙头领取）。

- [ ] **Step 1: 写部署脚本**

```solidity
// contracts/script/Deploy.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {NadbidRegistry} from "../src/NadbidRegistry.sol";
import {NadbidFactory} from "../src/NadbidFactory.sol";

contract Deploy is Script {
    function run() external {
        address platformTreasury = vm.envAddress("PLATFORM_TREASURY");
        vm.startBroadcast();
        NadbidRegistry registry = new NadbidRegistry();
        NadbidFactory factory = new NadbidFactory(address(registry), platformTreasury);
        registry.setFactory(address(factory));
        vm.stopBroadcast();
        console2.log("Registry:", address(registry));
        console2.log("Factory:", address(factory));
    }
}
```

- [ ] **Step 2: 准备部署环境（建议写入 contracts/.env，forge script 会自动加载，避免跨 shell 丢失）**

```bash
cd /Users/ricky/AICode/nadbid/contracts
cat >> .env <<'EOF'
# 部署私钥（测试网专用，勿用主网私钥；.env 需加入 .gitignore）
PRIVATE_KEY=0x...
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz
PLATFORM_TREASURY=0x...
EOF
```

- [ ] **Step 3: 部署到测试网**

```bash
cd /Users/ricky/AICode/nadbid/contracts
forge script script/Deploy.s.sol --env .env --broadcast
```

Expected: 输出 Registry/Factory 合约地址，交易入块。Registry→Factory→setFactory 三笔在**同一次 broadcast** 内按序发送，setFactory 由部署者（registry.owner）调用，无前置风险。

- [ ] **Step 4: 更新 .env.example + .env**

```bash
# .env.example 追加
VITE_CONTRACT_REGISTRY=0x...(部署地址)
VITE_CONTRACT_FACTORY=0x...(部署地址)
```

```bash
# 项目根 .env（本地开发用，已被 gitignore）
VITE_CONTRACT_REGISTRY=0x...
VITE_CONTRACT_FACTORY=0x...
```

- [ ] **Step 5: 验证部署（cast 读链上）**

Run: `cast call <REGISTRY_ADDR> "isKolRegistered(address)(bool)" 0x... --rpc-url $MONAD_TESTNET_RPC`
Expected: 返回 false（未注册，说明合约可读）

- [ ] **Step 6: 可选 — 链上验证合约源码**

```bash
forge script script/Deploy.s.sol --env .env --broadcast --verify --etherscan-api-key $ETHERSCAN_KEY
# 或部署后单独验证
forge verify-contract <ADDR> NadbidRegistry --chain monad_testnet --etherscan-api-key $ETHERSCAN_KEY
```

- [ ] **Step 7: Commit**

```bash
cd /Users/ricky/AICode/nadbid
git add .env.example contracts/script/Deploy.s.sol
git commit -m "feat(contracts): deploy SP-1 contracts to Monad testnet"
```

---

## Task 8: 前端 web3 层改造（config + ABI + hooks）

**Files:**
- Modify: `src/web3/config.ts`
- Rewrite: `src/web3/contracts.ts`
- Create: `src/web3/hooks/useKolPass.ts`
- Create: `src/web3/hooks/useAuction.ts`
- Create: `src/web3/hooks/useRegistry.ts`
- Modify: `src/web3/hooks/index.ts`
- Modify: `src/web3/index.ts`

- [ ] **Step 1: 更新 config.ts 合约地址**

```ts
// src/web3/config.ts 追加
import { contractAddresses } from './contracts';

// 供 wagmi useRead/useWrite 使用
export const registryConfig = {
  address: contractAddresses.registry,
  abi: registryAbi,
} as const;
```

- [ ] **Step 2: 重写 contracts.ts 为真实 ABI**

从 `contracts/out/*.sol/*.json` 的 ABI 复制真实 ABI，替换现有最小骨架。结构：

```ts
export const contractAddresses = {
  registry: import.meta.env.VITE_CONTRACT_REGISTRY as `0x${string}` | undefined,
  factory: import.meta.env.VITE_CONTRACT_FACTORY as `0x${string}` | undefined,
  // KolPass/KolAuction 按 KOL 动态获取，不在静态配置
} as const;

export const registryAbi = [...] as const satisfies Abi;
export const factoryAbi = [...] as const satisfies Abi;
export const kolPassAbi = [...] as const satisfies Abi;
export const kolAuctionAbi = [...] as const satisfies Abi;
```

- [ ] **Step 3: 写 useKolPass hook**

```ts
// src/web3/hooks/useKolPass.ts
// useReadContract: curvePrice / totalSupply / balanceOf
// useWriteContractTx: mint(payable) / burn
export function useKolPass(passAddress: `0x${string}` | undefined) { ... }
```

- [ ] **Step 4: 写 useAuction hook**

```ts
// src/web3/hooks/useAuction.ts
// useReadContract: getAuction / getCumulativeBid / getBidCount
// useWriteContractTx: placeBid(payable, value=fixedBidAmount) / settle
// 事件订阅: watchContractEvent BidPlaced → 刷新
export function useAuction(auctionAddress: `0x${string}` | undefined) { ... }
```

- [ ] **Step 5: 写 useRegistry hook**

```ts
// src/web3/hooks/useRegistry.ts
// useReadContract: isKolRegistered / getKol / hasBond / canCreate
// useWriteContractTx: registerKol / depositBond / requestBondRedeem / finalizeBondRedeem
export function useRegistry() { ... }
```

- [ ] **Step 6: 写 useFactory hook**

```ts
// src/web3/hooks/useFactory.ts
// useWriteContractTx: createKolPass(mintPrice) / createKolAuction(pass, fixedBid, duration, content)
// 创建成功后 refetch 对应 KOL 的 Registry 索引
export function useFactory() { ... }
```

- [ ] **Step 7: 验证 tsc**

Run: `cd /Users/ricky/AICode/nadbid && npx tsc --noEmit`
Expected: 新增/修改文件 0 错误

- [ ] **Step 8: Commit**

```bash
git add src/web3/
git commit -m "feat(web3): add real contract config, ABIs, and KolPass/Auction/Registry/Factory hooks"
```

---

## Task 9: 后端 X API 粉丝验证

**Files:**
- Create: `server/verify-twitter.ts`
- Modify: `server.js` 或新建入口
- Modify: `.env.example`（X_API_BEARER_TOKEN）

- [ ] **Step 1: 写 verify-twitter 路由**

```ts
// server/verify-twitter.ts
// POST /api/kol/verify-twitter { wallet, twitterHandle }
// → 调 X API v2: GET users/by/username/{handle}?user.fields=public_metrics
// → 返回 { verified: followers >= 10000, followers }
import express from 'express';
const router = express.Router();
const X_API_BEARER = process.env.X_API_BEARER_TOKEN;

router.post('/verify-twitter', async (req, res) => {
  const { twitterHandle } = req.body;
  if (!twitterHandle) return res.status(400).json({ error: 'missing handle' });
  try {
    const r = await fetch(
      `https://api.twitter.com/2/users/by/username/${twitterHandle}?user.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${X_API_BEARER}` } }
    );
    const data = await r.json();
    const followers = data?.data?.public_metrics?.followers_count ?? 0;
    res.json({ verified: followers >= 10000, followers });
  } catch (e) {
    res.status(500).json({ error: 'twitter api failed' });
  }
});
export default router;
```

- [ ] **Step 2: 接入 Express 入口**

```ts
// server.js 或 index 追加
app.use('/api/kol', verifyTwitterRouter);
```

- [ ] **Step 3: 本地验证接口**

Run: `curl -X POST http://localhost:3000/api/kol/verify-twitter -H "Content-Type: application/json" -d '{"twitterHandle":"elonmusk"}'`
Expected: `{"verified":true,"followers":<大数>}`

- [ ] **Step 4: Commit**

```bash
git add server/ .env.example
git commit -m "feat(server): add X API twitter follower verification"
```

---

## Task 10: 前端 KOL 入驻页（新建）

**Files:**
- Create: `src/pages/KolOnboardingPage.tsx`
- Create: `src/components/kol/KolOnboardingCard.tsx`
- Modify: `src/routes/` 或 App 路由

**流程：** 连接钱包 → 输入推特 handle → 调后端验证粉丝 → 注册 Kol → 质押 10 MON → 创建 PASS（填铸造价）→ 创建拍卖（填固定出价+内容）

- [ ] **Step 1: 写页面组件（连接 + 入驻表单）**

```tsx
// KolOnboardingPage.tsx
// 步骤条：Connect → Verify Twitter → Bond 10 MON → Create PASS → Create Auction
// 每步用 useRegistry / useFactory hooks
```

- [ ] **Step 2: 接入路由（路由定义在 src/config/routes.ts + src/App.tsx）**

```tsx
// src/config/routes.ts 追加路由配置
{ path: '/kol/onboarding', element: <KolOnboardingPage /> },
```

```tsx
// src/App.tsx 确认路由已挂载（import KolOnboardingPage）
```

- [ ] **Step 3: 验证页面渲染**

Run: `npm run dev`，访问 `/kol/onboarding`
Expected: 步骤条渲染，连接钱包后可操作

- [ ] **Step 4: Commit**

```bash
git add src/pages/KolOnboardingPage.tsx src/components/kol/ src/config/routes.ts src/App.tsx
git commit -m "feat(ui): add KOL onboarding page"
```

---

## Task 11: 前端拍卖详情页切换真实数据

**Files:**
- Modify: `src/pages/AuctionDetailPage.tsx`
- Modify: `src/components/auction-detail/`（相关子组件）

**改动：**
- 数据源：mock → useAuction（链上 getAuction / 事件订阅）
- 出价：mock executeMockTransaction → 真实 placeBid（value=fixedBidAmount）
- 倒计时：从链上 endTime 推算
- 移除 useSimulatedBids（真实事件驱动他人出价）
- 出价按钮：未连接引导 / 未持 PASS 提示

- [ ] **Step 1: 替换数据源**

```tsx
// AuctionDetailPage.tsx
const { auction, cumulativeBid, refetch } = useAuction(auctionAddress);
// auction.endTime 驱动倒计时，BidPlaced 事件触发 refetch
```

- [ ] **Step 2: 替换出价交易**

```tsx
// 未连接时引导现有 ConnectModal（项目用 ConnectModal 组件 + useWalletStore，无 useConnectModal）
const placeBidTx = useWriteContractTx();
const [connectOpen, setConnectOpen] = useState(false);
const handlePlaceBid = async () => {
  if (!isConnected) { setConnectOpen(true); return; }  // 打开 ConnectModal 引导
  if (!holdPass) { toast.error('需持有该 KOL 的 PASS'); return; }
  await placeBidTx.write({
    address: auctionAddress,
    abi: kolAuctionAbi,
    functionName: 'placeBid',
    value: fixedBidAmount,
  });
};
// 渲染 <ConnectModal open={connectOpen} onClose={...} onConnected={...} />
```

- [ ] **Step 3: 移除模拟出价**

删除 `useSimulatedBids` 调用和相关代码。

- [ ] **Step 4: 验证**

Run: `npm run dev`，访问 `/auctions/auc-001`（改链上数据）
Expected: 显示链上真实出价/倒计时，出价走真实交易

- [ ] **Step 5: Commit**

```bash
git add src/pages/AuctionDetailPage.tsx src/components/auction-detail/
git commit -m "feat(ui): switch auction detail to real on-chain data"
```

---

## Task 12: 前端 KolProfile + 首页列表切换

**Files:**
- Modify: `src/pages/KolProfilePage.tsx`
- Modify: `src/pages/AuctionsPage.tsx`
- Modify: `src/components/kol-profile/MintBurnPanel.tsx`

**改动：**
- MintBurnPanel：mock mint/burn → useKolPass 真实交易
- 曲线价/供应量：mock → 链上 curvePrice/totalSupply
- 首页列表：mockAuctions → Registry 索引 + 各 KolAuction 状态

- [ ] **Step 1: 切换 MintBurnPanel**

```tsx
// MintBurnPanel.tsx
const { curvePrice, totalSupply, mint, burn } = useKolPass(passAddress);
// mint(passAddress, { value: cost })
```

- [ ] **Step 2: 切换 KolProfile 数据**

```tsx
// KolProfilePage.tsx
// 用 useKolPass 的 chain 数据替代 bondingCurve mock
```

- [ ] **Step 3: 切换首页拍卖列表**

```tsx
// AuctionsPage.tsx
// 从 Registry kolList → 各 KOL 的 auctionContracts → 读各 Auction 状态
```

- [ ] **Step 4: 验证**

Run: `npm run dev`，访问 `/kols/...` 和首页
Expected: 真实链上数据，mint/burn 走真实交易

- [ ] **Step 5: Commit**

```bash
git add src/pages/ src/components/kol-profile/
git commit -m "feat(ui): switch KOL profile + auction list to real on-chain data"
```

---

## Task 13: 全量验证 + 文档更新

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `docs/wallet-integration.md`（如涉及）

- [ ] **Step 1: 运行全部前端检查**

```bash
cd /Users/ricky/AICode/nadbid
npx tsc --noEmit
npm run build
```

Expected: tsc 0 错误（新增/修改文件），build 成功

- [ ] **Step 2: 运行全部合约测试**

```bash
cd /Users/ricky/AICode/nadbid/contracts
forge test
```

Expected: 全部 PASS

- [ ] **Step 3: 浏览器端到端验证**

- KOL 入驻：连接 → 验证推特 → 质押 10 MON → 创建 PASS/拍卖
- PASS：mint/burn 真实交易 + 余额变化
- 拍卖：出价真实交易 + 倒计时 + 结算
- 无控制台错误

- [ ] **Step 4: 更新文档**

- CHANGELOG 加 SP-1 条目
- README 更新合约架构/环境变量

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md README.md docs/
git commit -m "docs: update SP-1 deployment and integration docs"
```

---

## 验收标准（对照设计文档 §13）

- [ ] 4 个合约编译通过，Foundry 测试全部通过
- [ ] 合约部署到 Monad 测试网，地址填 .env
- [ ] KOL 入驻闭环：连接钱包 → 绑定推特 → 质押 10 MON → 创建 PASS/拍卖
- [ ] 交易闭环：真实 mint/burn（曲线+8%手续费）、出价（固定价+倒计时重置）、结算（20/80）
- [ ] 前端 KOL 入驻/首页列表/拍卖详情/KOL Profile 用真实数据，mock 移除
- [ ] tsc 0 错误、build 成功、无控制台错误
