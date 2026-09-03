// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {NadbidRegistry} from "./NadbidRegistry.sol";
import {KolPass} from "./KolPass.sol";
import {KolAuction} from "./KolAuction.sol";

contract NadbidFactory {
    NadbidRegistry public registry;
    address public platformTreasury;

    // 内容与时长上限（防止链上存储膨胀 / 永不结束的拍卖）
    uint256 public constant MAX_CONTENT_LENGTH = 200;
    uint256 public constant MAX_DURATION = 24 hours;
    // 预约开始的最大提前量（防止把拍卖排到遥不可及的未来）
    uint256 public constant MAX_START_DELAY = 30 days;
    // 创建拍卖时"名下无进行中拍卖"检查的抽查场数：
    // KOL 必须完成上一场履约（settle）才能开下一场，串行约束下最近 MAX 场全部
    // settled 即等价于全部历史拍卖已结算；抽查避免数组无限膨胀导致 gas 耗尽。
    uint256 public constant MAX_ACTIVE_AUCTION_CHECK = 8;

    event KolPassCreated(address indexed kol, address passContract, uint256 mintPrice);
    event KolAuctionCreated(address indexed kol, address auctionContract, address passContract, uint256 fixedBidAmount);

    constructor(address _registry, address _platformTreasury) {
        registry = NadbidRegistry(_registry);
        platformTreasury = _platformTreasury;
    }

    /// 业务规则：KOL 同时只能进行一场拍卖——名下任一已创建拍卖未结算（settled）
    /// 即拒绝创建新拍卖，必须完成履约后才能开启下一场。检查最近 MAX_ACTIVE_AUCTION_CHECK 场。
    function _assertNoActiveAuction(address kol) internal view {
        NadbidRegistry.Kol memory k = registry.getKol(kol);
        uint256 len = k.auctionContracts.length;
        if (len == 0) return;
        uint256 start = len > MAX_ACTIVE_AUCTION_CHECK ? len - MAX_ACTIVE_AUCTION_CHECK : 0;
        for (uint256 i = start; i < len; i++) {
            require(IAuction(k.auctionContracts[i]).settled(), "ACTIVE_AUCTION_EXISTS");
        }
    }

    function createKolPass(uint256 mintPrice) external returns (address) {
        require(registry.canCreate(msg.sender), "!CAN_CREATE");
        require(mintPrice > 0, "ZERO_PRICE");
        // 每 KOL 仅一个 PASS（防止 passContracts 无限膨胀 / 同名集合重复发行）
        require(registry.getKol(msg.sender).passContracts.length == 0, "ALREADY_HAS_PASS");
        KolPass pass = new KolPass(msg.sender, mintPrice, platformTreasury, address(this));
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
        // 同时只能进行一场拍卖：未结算上一场前禁止创建新拍卖
        _assertNoActiveAuction(msg.sender);
        // 只允许使用本 Factory 签发的 PASS 合约（防伪造 passContract 绕过持 PASS 门槛）
        require(KolPass(passContract).factory() == address(this), "NOT_FACTORY_PASS");
        require(KolPass(passContract).kol() == msg.sender, "NOT_OWN_PASS");
        require(fixedBidAmount > 0, "ZERO_BID");
        require(duration > 0, "ZERO_DURATION");
        require(duration <= MAX_DURATION, "DURATION_TOO_LONG");
        require(bytes(content).length > 0, "EMPTY_CONTENT");
        require(bytes(content).length <= MAX_CONTENT_LENGTH, "CONTENT_TOO_LONG");
        KolAuction auction = new KolAuction(msg.sender, passContract, fixedBidAmount, duration, content, platformTreasury, address(registry), block.timestamp);
        registry.addAuctionContract(msg.sender, address(auction));
        emit KolAuctionCreated(msg.sender, address(auction), passContract, fixedBidAmount);
        return address(auction);
    }

    /// 预约式创建拍卖：startTime 为拍卖开始时间（秒级 Unix 时间戳），未到时间不可出价。
    /// 与 createKolAuction 的校验完全一致，仅多出 startTime 前置（>= now 且 <= now + MAX_START_DELAY）。
    function createKolAuctionScheduled(
        address passContract,
        uint256 fixedBidAmount,
        uint256 duration,
        string calldata content,
        uint256 startTime
    ) external returns (address) {
        require(startTime >= block.timestamp, "START_PAST");
        require(startTime - block.timestamp <= MAX_START_DELAY, "START_TOO_FAR");
        require(registry.canCreate(msg.sender), "!CAN_CREATE");
        // 同时只能进行一场拍卖：未结算上一场前禁止创建新拍卖
        _assertNoActiveAuction(msg.sender);
        require(KolPass(passContract).factory() == address(this), "NOT_FACTORY_PASS");
        require(KolPass(passContract).kol() == msg.sender, "NOT_OWN_PASS");
        require(fixedBidAmount > 0, "ZERO_BID");
        require(duration > 0, "ZERO_DURATION");
        require(duration <= MAX_DURATION, "DURATION_TOO_LONG");
        require(bytes(content).length > 0, "EMPTY_CONTENT");
        require(bytes(content).length <= MAX_CONTENT_LENGTH, "CONTENT_TOO_LONG");
        KolAuction auction = new KolAuction(msg.sender, passContract, fixedBidAmount, duration, content, platformTreasury, address(registry), startTime);
        registry.addAuctionContract(msg.sender, address(auction));
        emit KolAuctionCreated(msg.sender, address(auction), passContract, fixedBidAmount);
        return address(auction);
    }
}

// 供 Factory 查询 KolAuction 结算状态（避免双向 import，与 NadbidRegistry 同款）
interface IAuction {
    function settled() external view returns (bool);
}
