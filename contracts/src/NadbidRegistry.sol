// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract NadbidRegistry {
    uint256 public constant BOND_AMOUNT = 1 ether;           // 对 SPEC §3.1 的裁剪（10 MON → 1 MON 降门槛）
    uint256 public constant BOND_REDEEM_COOLDOWN = 48 hours;
    // 赎回前置检查只抽查最近 N 场拍卖：KOL 可创建任意多场拍卖（频率不限），
    // 全量遍历 auctionContracts 会让数组膨胀后 gas 耗尽，导致 1 MON 担保永远无法赎回。
    // 粉丝门槛：构造时注入（测试网 1000，主网正式值如 5000），便于多环境分别部署
    uint256 public immutable MIN_FOLLOWERS;

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
    // F2：按 KOL 统计进行中（未结算）拍卖数。Factory 创建拍卖时 +1（addAuctionContract），
    // KolAuction.settle() 回调 notifyAuctionSettled 时 -1。替代"抽查最近 N 场"——
    // 抽查窗口可被滚动绕过（第 0 场未结算被挤出窗口后照常赎回/创建），计数则精确闭合
    // "KOL 同时只能进行一场拍卖，必须完成履约后才能开启下一场"的业务约束，且无 gas 膨胀。
    mapping(address => uint256) public openAuctionCount;
    mapping(address => bool) private isAuction;          // Factory 登记的拍卖合约
    mapping(address => bool) private settlementNotified; // 防止同一拍卖重复回调减计数
    /// 登记的拍卖合约 → 所属 KOL（纵深防御：notifyAuctionSettled 必须由该拍卖
    /// 自己的 KOL 回调，防止误登记/升级后的恶意合约传他人 kol 误减计数）
    mapping(address => address) public auctionKol;

    event KolRegistered(address indexed kol, string twitterHandle, uint256 followers);
    event BondDeposited(address indexed kol, uint256 amount);
    event BondRedeemRequested(address indexed kol);
    event BondRedeemed(address indexed kol, uint256 amount);
    event KolBanned(address indexed kol, bool banned);

    modifier onlyRegistered() {
        require(kols[msg.sender].registered, "!REGISTERED");
        _;
    }

    /// 注册 KOL。链上无法直接验证 X 粉丝数，故要求携带平台签名（signature =
    /// 平台对 (msg.sender, twitterHandle, followers, expiry) 的 ECDSA 签名，由 server 在
    /// X OAuth 验证通过后签发；expiry 为秒级 Unix 时间戳，防止签名永久有效被重放）。
    /// 防止绕过前端直调合约伪造 followers 注册。
    function registerKol(string calldata twitterHandle, uint256 followers, uint256 expiry, bytes calldata signature) external {
        require(!kols[msg.sender].registered, "ALREADY_REGISTERED");
        require(bytes(twitterHandle).length > 0, "EMPTY_HANDLE");
        require(followers >= MIN_FOLLOWERS, "LOW_FOLLOWERS");
        require(platformSigner != address(0), "NO_SIGNER");
        require(block.timestamp <= expiry, "SIG_EXPIRED");
        bytes32 hash = keccak256(abi.encodePacked(msg.sender, twitterHandle, followers, expiry));
        require(ECDSA.recover(hash, signature) == platformSigner, "BAD_SIGNATURE");
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
        // F2：名下无未结算拍卖（openAuctionCount 精确计数，替代抽查窗口——
        // 抽查可被滚动绕过；计数无 gas 膨胀风险）
        require(openAuctionCount[msg.sender] == 0, "OPEN_AUCTIONS");
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
        isAuction[auctionContract] = true;   // F2：登记为可信拍卖合约
        auctionKol[auctionContract] = kol;   // 记录拍卖所属 KOL（结算回调绑定校验）
        openAuctionCount[kol]++;             // F2：进行中拍卖 +1
    }

    /// F2：KolAuction.settle() 回调——标记该拍卖已结算，对应 KOL 的进行中拍卖 -1。
    /// 仅 Factory 登记的拍卖合约可调（isAuction）、每合约仅一次（settlementNotified）、
    /// 且必须由拍卖所属 KOL 回调（auctionKol 绑定，防误登记/升级后传他人 kol 误减计数）。
    function notifyAuctionSettled(address kol) external {
        require(isAuction[msg.sender], "!AUCTION");
        require(auctionKol[msg.sender] == kol, "KOL_MISMATCH");
        require(!settlementNotified[msg.sender], "DUP_NOTIFY");
        settlementNotified[msg.sender] = true;
        require(openAuctionCount[kol] > 0, "ZERO_COUNT");
        openAuctionCount[kol]--;
    }

    address public factory;
    address public owner;
    address public platformSigner;  // 平台签名公钥：注册 KOL 时的 followers 验证签名者
    modifier onlyOwner() { require(msg.sender == owner, "!OWNER"); _; }
    constructor(uint256 minFollowers) {
        // 审计修复（D6）：粉丝门槛必须 > 0，防止误部署 0 门槛注册签名校验形同虚设
        require(minFollowers > 0, "ZERO_MIN_FOLLOWERS");
        owner = msg.sender;
        MIN_FOLLOWERS = minFollowers;
    }
    /// 设置平台签名者（onlyOwner；server 侧持有对应私钥，在 X 验证通过后签发注册签名）
    function setPlatformSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "ZERO_SIGNER");
        platformSigner = _signer;
        emit PlatformSignerUpdated(_signer);
    }
    event PlatformSignerUpdated(address indexed signer);
    /// 设置 / 更新工厂合约（onlyOwner）。允许重复设置以便无痛升级 Factory（无需清空 KOL 数据）。
    function setFactory(address _factory) external onlyOwner {
        require(_factory != address(0), "ZERO_FACTORY");
        address oldFactory = factory;
        factory = _factory;
        emit FactoryUpdated(oldFactory, _factory);
    }
    event FactoryUpdated(address indexed oldFactory, address indexed newFactory);

    /// 封禁 / 解封 KOL（onlyOwner）。封禁后：
    /// - canCreate 返回 false（不能创建新 PASS / 拍卖）
    /// - KolAuction.placeBid 中的 BANNED 检查会拦截该 KOL 名下所有拍卖的出价
    ///   （检查对象为拍卖所属 a.kol；封禁后既有拍卖停止收款，普通竞拍者不受影响）
    /// 审计修复（D4）：同步写 kols[kol].banned 结构体字段——否则 getKol() 返回的
    /// banned 恒为 false，与 mapping 权限判定不一致（前端展示错误封禁状态）。
    function setBanned(address kol, bool bannedFlag) external onlyOwner {
        banned[kol] = bannedFlag;
        if (kols[kol].registered) {
            kols[kol].banned = bannedFlag;
        }
        emit KolBanned(kol, bannedFlag);
    }

    function canCreate(address kol) external view returns (bool) {
        Kol storage k = kols[kol];
        return k.registered && k.bonded && !k.bondRedeemPending && !banned[kol];
    }
}

// 供 Registry 查询 KolAuction 结算状态（避免双向 import）
interface IAuction {
    function settled() external view returns (bool);
}
