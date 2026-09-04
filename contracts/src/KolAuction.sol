// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {KolPass} from "./KolPass.sol";

/// @title KolAuction — KOL 便士拍卖 + 履约状态机（SP-2）
/// 资金路径：
///   ACTIVE(出价) → settle() → SETTLED（winner 固化，80% 锁定在合约）
///     → KOL submitFulfillment() → AWAITING_CONFIRMATION
///         → winner confirmFulfillment() / 48h 超时 autoConfirm() → COMPLETED（80% → pendingKol）
///         → winner dispute() → DISPUTED → 平台 arbitrator resolveDispute()
///             → kolWon=true → COMPLETED；kolWon=false → REFUNDED
///     → KOL 超时未履约 → claimRefund() 触发违约结算 → REFUNDED（80% + 押金罚没按比例退竞拍者）
///   COMPLETED 后 KOL 才可 claimKol()（修复"settle 后立即可提 80%"的 P0）
contract KolAuction {
    enum AuctionStatus { ACTIVE, SETTLED, AWAITING_CONFIRMATION, COMPLETED, DISPUTED, REFUNDED }

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
        AuctionStatus status;    // 状态机：见合约头注释
        bool settled;            // 兼容保留（settled() getter 供 Registry 赎回检查）
        // ---- SP-2 履约字段 ----
        address winner;                    // 结算时固化的中标者（= 最后出价者）
        uint256 winnerTotalSpent;          // 中标者累计花费
        uint256 fulfillmentDeadline;       // KOL 提交履约的截止（settle + FULFILLMENT_DEADLINE）
        uint256 fulfillmentTime;           // KOL 实际提交时间（0 = 未提交）
        uint256 autoConfirmDeadline;       // winner 确认/争议截止（submit + AUTO_CONFIRM_WINDOW）
        bytes32 evidenceHash;              // 履约/争议证据哈希
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
    uint256 public pendingPlatform;   // 20% 平台费：settle 后即可领
    uint256 public pendingKol;        // 80% KOL 收入：仅 COMPLETED 后可领（SP-2 锁定）

    // ---- SP-2 退款池 ----
    uint256 public refundPool;        // 固化后的退款池总额（80% 锁定资金 + KOL 押金罚没）
    uint256 public slashedBond;       // 实际罚没并转入本合约的押金金额
    mapping(address => bool) public refundClaimed;  // 防重复领取

    address public platformTreasury;
    address public registry;  // 供 banned / arbitrator 查询 + 结算/罚没回调
    /// 是否预约拍卖（startTime 晚于部署时刻）。预约拍卖的 duration 应完整保留，
    /// 不能被 40s 重置机制压缩（否则 24h 预约拍卖首出价后只剩 40s 即结束）。
    bool public immutable isScheduled;
    uint256 public constant BID_EXTEND_SECONDS = 40;  // 对 SPEC §6.4 原 60s 的裁剪
    uint256 public constant PLATFORM_SETTLE_PCT = 20;
    uint256 public constant KOL_SETTLE_PCT = 80;
    uint256 public constant PCT_DENOM = 100;
    // ---- SP-2 窗口（可部署前按产品规则调整）----
    uint256 public constant FULFILLMENT_DEADLINE = 48 hours; // KOL 提交履约期限
    uint256 public constant AUTO_CONFIRM_WINDOW = 48 hours;  // winner 确认/争议窗口（超时自动确认）
    uint256 private seq;

    /// 接收押金罚没转账（Registry.slashKolBond → 本合约退款池）与任何误转资金。
    /// 无 receive 会导致 slash 的 call 失败 → 违约退款整体 revert（测试捕获的 SEND_FAILED）。
    receive() external payable {}

    event BidPlaced(uint256 auctionId, uint256 bidSeq, address indexed bidder, uint256 amount, uint256 timestamp);
    event AuctionSettled(uint256 auctionId, address lastBidder, uint256 totalVolume, uint256 platformFee, uint256 guaranteePool, uint256 blockNumber);
    event FulfillmentSubmitted(uint256 auctionId, address indexed winner, bytes32 evidenceHash, uint256 timestamp);
    event FulfillmentConfirmed(uint256 auctionId, address indexed winner, uint256 timestamp);
    event DisputeRaised(uint256 auctionId, address indexed winner, bytes32 evidenceHash, uint256 timestamp);
    event DisputeResolved(uint256 auctionId, bool kolWon, uint256 timestamp);
    event AuctionRefunded(uint256 auctionId, uint256 lockedAmount, uint256 slashedBond, uint256 timestamp);
    event RefundClaimed(address indexed bidder, uint256 amount);

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
            settled: false,
            winner: address(0),
            winnerTotalSpent: 0,
            fulfillmentDeadline: 0,
            fulfillmentTime: 0,
            autoConfirmDeadline: 0,
            evidenceHash: bytes32(0)
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

    /// 拍卖结束 → 结算。SP-2：固化 winner，80% 锁定在合约（不进入 pendingKol），
    /// KOL 必须在 fulfillmentDeadline 内提交履约，经确认/仲裁后才能提取。
    function settle() external {
        Auction storage a = auction;
        require(a.status == AuctionStatus.ACTIVE, "!ACTIVE");
        require(!a.settled, "SETTLED");
        require(block.timestamp >= a.endTime, "NOT_ENDED");
        a.settled = true;
        uint256 platformFee = a.totalVolume * PLATFORM_SETTLE_PCT / PCT_DENOM;
        pendingPlatform += platformFee;
        if (a.totalBids == 0) {
            // 无出价：无资金、无履约需求，直接终态（无需履约流程）
            a.status = AuctionStatus.COMPLETED;
            IRegistry(registry).notifyAuctionSettled(a.kol);
            emit AuctionSettled(a.id, a.lastBidder, a.totalVolume, platformFee, 0, block.number);
            return;
        }
        // 固化中标者 + 锁定 80% + 开启履约窗口
        a.winner = a.lastBidder;
        a.winnerTotalSpent = cumulativeBid[a.lastBidder];
        a.fulfillmentDeadline = block.timestamp + FULFILLMENT_DEADLINE;
        a.status = AuctionStatus.SETTLED;
        // F2：通知 Registry 本拍卖已结算（openAuctionCount -1，释放创建/赎回闸门）。
        // notify 失败则整体 revert，结算状态与计数保持一致。
        IRegistry(registry).notifyAuctionSettled(a.kol);
        emit AuctionSettled(a.id, a.winner, a.totalVolume, platformFee, a.totalVolume - platformFee, block.number);
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

    /// KOL 领取 80% 拍卖收入——SP-2：仅 COMPLETED（履约经确认/仲裁通过）后可领，
    /// 修复原"settle 后立即可提 80%"的 P0 资金风险。
    function claimKol() external {
        require(msg.sender == auction.kol, "!KOL");
        require(auction.status == AuctionStatus.COMPLETED, "!COMPLETED");
        uint256 amount = pendingKol;
        require(amount > 0, "NO_BALANCE");
        pendingKol = 0;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "CLAIM_FAIL");
    }

    /// SP-2：KOL 提交履约证据（evidenceHash 为履约内容/链接的哈希）。仅 KOL、
    /// 仅 SETTLED、须在 fulfillmentDeadline 内。
    function submitFulfillment(bytes32 evidenceHash) external {
        Auction storage a = auction;
        require(msg.sender == a.kol, "!KOL");
        require(a.status == AuctionStatus.SETTLED, "!SETTLED");
        require(block.timestamp <= a.fulfillmentDeadline, "TOO_LATE");
        a.fulfillmentTime = block.timestamp;
        a.autoConfirmDeadline = block.timestamp + AUTO_CONFIRM_WINDOW;
        a.evidenceHash = evidenceHash;
        a.status = AuctionStatus.AWAITING_CONFIRMATION;
        emit FulfillmentSubmitted(a.id, a.winner, evidenceHash, block.timestamp);
    }

    /// SP-2：中标者确认已履约 → COMPLETED（80% 释放为 KOL 待领）
    function confirmFulfillment() external {
        Auction storage a = auction;
        require(msg.sender == a.winner, "!WINNER");
        require(a.status == AuctionStatus.AWAITING_CONFIRMATION, "!AWAITING");
        require(block.timestamp <= a.autoConfirmDeadline, "TOO_LATE");
        _releaseToKol();
    }

    /// SP-2：中标者超时未确认/未争议 → 任何人可触发自动确认（KOL 视为履约完成）
    function autoConfirm() external {
        Auction storage a = auction;
        require(a.status == AuctionStatus.AWAITING_CONFIRMATION, "!AWAITING");
        require(block.timestamp >= a.autoConfirmDeadline, "NOT_READY");
        _releaseToKol();
    }

    /// SP-2：中标者在确认窗口内发起争议（证据哈希上链），资金保持锁定等待仲裁
    function dispute(bytes32 evidenceHash) external {
        Auction storage a = auction;
        require(msg.sender == a.winner, "!WINNER");
        require(a.status == AuctionStatus.AWAITING_CONFIRMATION, "!AWAITING");
        require(block.timestamp <= a.autoConfirmDeadline, "TOO_LATE");
        a.evidenceHash = evidenceHash;
        a.status = AuctionStatus.DISPUTED;
        emit DisputeRaised(a.id, a.winner, evidenceHash, block.timestamp);
    }

    /// SP-2：平台仲裁。kolWon=true → 放款给 KOL；false → 退款（80% + KOL 押金罚没）
    function resolveDispute(bool kolWon) external {
        require(msg.sender == IRegistry(registry).arbitrator(), "!ARBITRATOR");
        Auction storage a = auction;
        require(a.status == AuctionStatus.DISPUTED, "!DISPUTED");
        if (kolWon) {
            _releaseToKol();
        } else {
            _initiateRefund();
        }
        emit DisputeResolved(a.id, kolWon, block.timestamp);
    }

    /// SP-2：竞拍者领取违约退款（按出价金额占总额比例）。
    /// 首次调用触发违约结算（KOL 超时未履约）：罚没押金 + 固化退款池 + 进入 REFUNDED。
    function claimRefund() external {
        Auction storage a = auction;
        if (a.status == AuctionStatus.SETTLED && a.fulfillmentTime == 0 && block.timestamp > a.fulfillmentDeadline) {
            _initiateRefund();
        }
        require(a.status == AuctionStatus.REFUNDED, "!REFUNDED");
        require(!refundClaimed[msg.sender], "CLAIMED");
        uint256 share = cumulativeBid[msg.sender] * refundPool / a.totalVolume;
        require(share > 0, "NO_REFUND");
        refundClaimed[msg.sender] = true;
        (bool ok, ) = payable(msg.sender).call{value: share}("");
        require(ok, "CLAIM_FAIL");
        emit RefundClaimed(msg.sender, share);
    }

    /// 内部：将锁定的 80% 释放为 KOL 待领，状态 → COMPLETED
    function _releaseToKol() internal {
        Auction storage a = auction;
        uint256 locked = a.totalVolume * KOL_SETTLE_PCT / PCT_DENOM;
        pendingKol += locked;
        a.status = AuctionStatus.COMPLETED;
        emit FulfillmentConfirmed(a.id, a.winner, block.timestamp);
    }

    /// 内部：违约结算——罚没 KOL 押金（Registry.slashKolBond 转入本合约）、
    /// 固化退款池（80% 锁定资金 + 罚没押金）、状态 → REFUNDED。仅可触发一次。
    function _initiateRefund() internal {
        Auction storage a = auction;
        require(a.status == AuctionStatus.SETTLED || a.status == AuctionStatus.DISPUTED, "!REFUNDABLE");
        uint256 locked = a.totalVolume * KOL_SETTLE_PCT / PCT_DENOM;
        slashedBond = IRegistry(registry).slashKolBond(a.kol);
        refundPool = locked + slashedBond;
        a.status = AuctionStatus.REFUNDED;
        emit AuctionRefunded(a.id, locked, slashedBond, block.timestamp);
    }

    function getAuction() external view returns (Auction memory) { return auction; }
    function settled() external view returns (bool) { return auction.settled; }  // 供 Registry 赎回检查
    function getCumulativeBid(address bidder) external view returns (uint256) { return cumulativeBid[bidder]; }
    function getBidCount(address bidder) external view returns (uint256) { return bidCount[bidder]; }
    /// 该竞拍者当前可领的退款额（0 = 不可领或已领）。供前端展示。
    /// 违约已触发（REFUNDED）时用固化 refundPool；尚未触发（SETTLED 且超时）时
    /// 按 80% 锁定资金 + 预估押金罚没（BOND_AMOUNT，若 KOL 有押金）估算——
    /// 与实际 claimRefund 触发后的结果一致（slash 恒罚没全额 bondAmount）。
    function refundable(address bidder) external view returns (uint256) {
        Auction storage a = auction;
        bool refundableNow = a.status == AuctionStatus.REFUNDED
            || (a.status == AuctionStatus.SETTLED && a.fulfillmentTime == 0 && block.timestamp > a.fulfillmentDeadline);
        if (!refundableNow || refundClaimed[bidder]) return 0;
        uint256 pool = refundPool;
        if (pool == 0) {
            pool = a.totalVolume * KOL_SETTLE_PCT / PCT_DENOM;
            if (IRegistry(registry).hasBond(a.kol)) {
                pool += IRegistry(registry).BOND_AMOUNT();
            }
        }
        return cumulativeBid[bidder] * pool / a.totalVolume;
    }
    /// 前端状态辅助：KOL 是否已违约（超时未提交履约）
    function kolBreached() external view returns (bool) {
        Auction storage a = auction;
        return a.status == AuctionStatus.SETTLED && a.fulfillmentTime == 0 && block.timestamp > a.fulfillmentDeadline;
    }

    // 测试/查询所需的 view getter
    function endTime() external view returns (uint256) { return auction.endTime; }
    function totalBids() external view returns (uint256) { return auction.totalBids; }
    function lastBidder() external view returns (address) { return auction.lastBidder; }
}

// 供 KolAuction 查询 banned / arbitrator + 结算/罚没回调（避免双向 import）
interface IRegistry {
    function isKolBanned(address wallet) external view returns (bool);
    function factory() external view returns (address);
    function notifyAuctionSettled(address kol) external;
    function slashKolBond(address kol) external returns (uint256);
    function arbitrator() external view returns (address);
    function hasBond(address wallet) external view returns (bool);
    function BOND_AMOUNT() external view returns (uint256);
}
