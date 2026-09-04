// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {NadbidRegistry} from "./NadbidRegistry.sol";
import {KolPass} from "./KolPass.sol";
import {KolAuction} from "./KolAuction.sol";

contract NadbidFactory {
    NadbidRegistry public registry;
    address public platformTreasury;
    /// F1：固定出价金额（产品定稿 99 MON；测试网部署传小额如 0.1 MON 便于测试）。
    /// 构造注入 immutable——所有经本 Factory 创建的拍卖强制同一出价金额，
    /// 防止 KOL 自行填写任意价破坏"固定出价"规则。
    uint256 public immutable FIXED_BID_AMOUNT;

    // 内容与时长上限（防止链上存储膨胀 / 永不结束的拍卖）
    uint256 public constant MAX_CONTENT_LENGTH = 200;
    uint256 public constant MAX_DURATION = 24 hours;
    // 预约开始的最大提前量（防止把拍卖排到遥不可及的未来）
    uint256 public constant MAX_START_DELAY = 30 days;

    event KolPassCreated(address indexed kol, address passContract, uint256 mintPrice);
    event KolAuctionCreated(address indexed kol, address auctionContract, address passContract, uint256 fixedBidAmount);

    constructor(address _registry, address _platformTreasury, uint256 _fixedBidAmount) {
        // 审计修复（D6）：构造零地址校验——registry/treasury 为 0 会静默产生不可用合约
        require(_registry != address(0), "ZERO_REGISTRY");
        require(_platformTreasury != address(0), "ZERO_TREASURY");
        require(_fixedBidAmount > 0, "ZERO_FIXED_BID");
        registry = NadbidRegistry(_registry);
        platformTreasury = _platformTreasury;
        FIXED_BID_AMOUNT = _fixedBidAmount;
    }

    /// 业务规则：KOL 同时只能进行一场拍卖——Registry.openAuctionCount 精确计数
    /// （Factory 创建 +1，KolAuction.settle 回调 -1），为 0 才允许创建新拍卖，
    /// 必须完成履约后才能开启下一场。无遍历、无 gas 膨胀、不可被抽查窗口绕过。
    function _assertNoActiveAuction(address kol) internal view {
        require(registry.openAuctionCount(kol) == 0, "ACTIVE_AUCTION_EXISTS");
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
        require(fixedBidAmount == FIXED_BID_AMOUNT, "WRONG_FIXED_BID");
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
        require(fixedBidAmount == FIXED_BID_AMOUNT, "WRONG_FIXED_BID");
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
