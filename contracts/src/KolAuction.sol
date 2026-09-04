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

    // 最后出价人（当前领先者）的累计出价数据——便于前端无论是否本人都能展示
    // "最后出价人出价次数 / 累计金额"等高价值信息（placeBid 时同步更新）。
    uint256 public lastBidderCumulative;
    uint256 public lastBidderBidCount;

    // Pull 结算：settle 只记录待领金额，platformTreasury / kol 分别 claim。
    // 避免 settle 依赖外部转账成功——若某一方是拒收合约，另一方仍可正常领取，
    // 拍卖结算状态也不被阻塞（Registry 的担保赎回检查依赖 settled()）。
    uint256 public pendingPlatform;
    uint256 public pendingKol;

    address public platformTreasury;
    address public registry;  // 供 banned 检查
    /// 是否预约拍卖（startTime 晚于部署时刻）。预约拍卖的 duration 应完整保留，
    /// 不能被 40s 重置机制压缩（否则 24h 预约拍卖首出价后只剩 40s 即结束）。
    bool public immutable isScheduled;
    uint256 public constant BID_EXTEND_SECONDS = 40;  // 对 SPEC §6.4 原 60s 的裁剪
    uint256 public constant PLATFORM_SETTLE_PCT = 20;
    uint256 public constant KOL_SETTLE_PCT = 80;
    uint256 public constant PCT_DENOM = 100;
    uint256 private seq;

    event BidPlaced(uint256 auctionId, uint256 bidSeq, address indexed bidder, uint256 amount, uint256 timestamp);
    event AuctionSettled(uint256 auctionId, address lastBidder, uint256 totalVolume, uint256 platformFee, uint256 guaranteePool, uint256 blockNumber);

    /// @param _startTime 拍卖开始时间（秒级 Unix 时间戳；= block.timestamp 立即开始）
    constructor(address _kol, address _passContract, uint256 _fixedBidAmount, uint256 _duration, string memory _content, address _platformTreasury, address _registry, uint256 _startTime) {
        // F6：仅平台官方 Factory 可部署拍卖。Registry.factory() 由 onlyOwner 设定，
        // 攻击者无法改值；直接 new KolAuction 创建的"并行拍卖"被排除在业务外——
        // 否则可绕过"KOL 同时只能进行一场拍卖"的软约束（绕过产物不进 Registry 索引）。
        require(IRegistry(_registry).factory() == msg.sender, "NOT_FACTORY");
        require(_startTime >= block.timestamp, "START_PAST");
        isScheduled = _startTime > block.timestamp;
        auction = Auction({
            id: 1,
            kol: _kol,
            passContract: _passContract,
            fixedBidAmount: _fixedBidAmount,
            content: _content,
            itemCategory: 1,
            startTime: _startTime,
            endTime: _startTime + _duration,
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
        require(block.timestamp >= a.startTime, "NOT_STARTED"); // 预约拍卖未到开始时间不可出价
        require(block.timestamp < a.endTime, "ENDED");
        require(KolPass(a.passContract).balanceOf(msg.sender) > 0, "!HOLDER");
        // 封禁对象 = 拍卖所属 KOL（a.kol）而非出价者：封禁 KOL 后其既有拍卖停止收款。
        // 修复前误查 msg.sender——封禁 KOL 不影响其拍卖、反而会误伤被封禁的普通竞拍者。
        require(!IRegistry(registry).isKolBanned(a.kol), "BANNED");
        // 累计
        seq++;
        cumulativeBid[msg.sender] += msg.value;
        bidCount[msg.sender]++;
        a.lastBidder = msg.sender;
        a.totalBids++;
        a.totalVolume += msg.value;
        // 同步最后出价人（= 当前出价者）的累计数据，供前端展示高价值信息
        lastBidderCumulative = cumulativeBid[msg.sender];
        lastBidderBidCount = bidCount[msg.sender];
        // 倒计时：预约拍卖只延长不提前（保持 duration 完整）；立即开始拍卖重置 40s
        if (isScheduled) {
            if (a.endTime < block.timestamp + BID_EXTEND_SECONDS) {
                a.endTime = block.timestamp + BID_EXTEND_SECONDS;
            }
        } else {
            a.endTime = block.timestamp + BID_EXTEND_SECONDS;
        }
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
        // Pull 模式：仅记录待领金额，不直接转账（拒收地址不再阻塞结算/担保赎回）
        pendingPlatform += platformFee;
        pendingKol += guaranteePool;
        // F2：通知 Registry 本拍卖已结算（对应 KOL 的 openAuctionCount -1，
        // 释放"同时只能进行一场拍卖"的创建/赎回闸门）。notify 失败则整体 revert，
        // 结算状态与计数保持一致。
        IRegistry(registry).notifyAuctionSettled(a.kol);
        emit AuctionSettled(a.id, a.lastBidder, a.totalVolume, platformFee, guaranteePool, block.number);
    }

    /// 平台方领取 20% 结算手续费（settle 后由 platformTreasury 调用）
    function claimPlatform() external {
        require(msg.sender == platformTreasury, "!TREASURY");
        uint256 amount = pendingPlatform;
        require(amount > 0, "NO_BALANCE");
        pendingPlatform = 0;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "CLAIM_FAIL");
    }

    /// KOL 领取 80% 拍卖收入（settle 后由 kol 调用）
    function claimKol() external {
        require(msg.sender == auction.kol, "!KOL");
        uint256 amount = pendingKol;
        require(amount > 0, "NO_BALANCE");
        pendingKol = 0;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "CLAIM_FAIL");
    }

    function getAuction() external view returns (Auction memory) { return auction; }
    function settled() external view returns (bool) { return auction.settled; }  // 供 Registry 赎回检查
    function getCumulativeBid(address bidder) external view returns (uint256) { return cumulativeBid[bidder]; }
    function getBidCount(address bidder) external view returns (uint256) { return bidCount[bidder]; }

    // 测试/查询所需的 view getter
    function endTime() external view returns (uint256) { return auction.endTime; }
    function totalBids() external view returns (uint256) { return auction.totalBids; }
    function lastBidder() external view returns (address) { return auction.lastBidder; }
}

// 供 KolAuction 查询 banned + 结算回调（避免双向 import）
interface IRegistry {
    function isKolBanned(address wallet) external view returns (bool);
    function factory() external view returns (address);
    function notifyAuctionSettled(address kol) external;
}
