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
    function settled() external view returns (bool) { return auction.settled; }  // 供 Registry 赎回检查
    function getCumulativeBid(address bidder) external view returns (uint256) { return cumulativeBid[bidder]; }
    function getBidCount(address bidder) external view returns (uint256) { return bidCount[bidder]; }

    // 测试/查询所需的 view getter
    function endTime() external view returns (uint256) { return auction.endTime; }
    function totalBids() external view returns (uint256) { return auction.totalBids; }
    function lastBidder() external view returns (address) { return auction.lastBidder; }
}

// 供 KolAuction 查询 banned（避免双向 import）
interface IRegistry {
    function isKolBanned(address wallet) external view returns (bool);
}
