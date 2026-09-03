// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract NadbidRegistry {
    uint256 public constant BOND_AMOUNT = 10 ether;          // 对 SPEC §3.1 的裁剪
    uint256 public constant BOND_REDEEM_COOLDOWN = 48 hours;
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

    event KolRegistered(address indexed kol, string twitterHandle, uint256 followers);
    event BondDeposited(address indexed kol, uint256 amount);
    event BondRedeemRequested(address indexed kol);
    event BondRedeemed(address indexed kol, uint256 amount);
    event KolBanned(address indexed kol, bool banned);

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
    constructor(uint256 minFollowers) {
        owner = msg.sender;
        MIN_FOLLOWERS = minFollowers;
    }
    function setFactory(address _factory) external onlyOwner { require(factory == address(0), "SET"); factory = _factory; }

    /// 封禁 / 解封 KOL（onlyOwner）。封禁后：
    /// - canCreate 返回 false（不能创建新 PASS / 拍卖）
    /// - KolAuction.placeBid 中的 BANNED 检查会拦截该地址的出价
    function setBanned(address kol, bool bannedFlag) external onlyOwner {
        banned[kol] = bannedFlag;
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
