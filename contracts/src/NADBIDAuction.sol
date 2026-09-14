// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import {IERC1155} from "openzeppelin-contracts/contracts/token/ERC1155/IERC1155.sol";
import {ERC1155Holder} from "openzeppelin-contracts/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

/// @title NADBIDAuction — 低价捡漏拍卖协议（MVP v0.1）
/// @notice 产品规则（已拍板）：
///   - 出价不退还；被保留的有效出价全额进资金池
///   - 同区块同价多人出价 → 随机保留一笔，其余可领取全额退款（含手续费）
///   - 单区块单价格等级；价格 = ceil(prevPrice × (1 + incrementBps/10000))
///   - 120 秒倒计时，每次有效出价重置；无新有效出价即结束
///   - 资金池：85% 拍卖人 / 15% 奖励池（分红指数，结算时各方收益扣 5% 平台费）
///   - 出价手续费 1%（额外收）；流拍全额退款（含手续费）
///   - 分红：B 模式全员持续分红；100x 总收益硬顶（安全阀）
///   - 发起人禁止参与自己拍卖；可设保留价，未达标流拍
/// @dev 账本不变量（任意时刻）：
///   balance = sellerPending + rewardPending + refundPending + platformCollected
///   其中 refundPending = candidatesPool - totalPool - retainedFees - refunded
contract NADBIDAuction is Ownable, ReentrancyGuard, ERC1155Holder {
    using SafeERC20 for IERC20;

    // ---------------- 产品常量（已拍板） ----------------
    uint256 public constant DURATION = 120 seconds;          // 出价倒计时
    uint256 public constant BID_FEE_BPS = 100;               // 出价手续费 1%
    uint256 public constant SETTLE_FEE_BPS = 500;            // 结算费 5%（各方收益扣 5%）
    uint256 public constant SELLER_SHARE_BPS = 8500;         // 池子 85% → 拍卖人
    uint256 public constant REWARD_SHARE_BPS = 1500;         // 池子 15% → 奖励池
    uint256 public constant MIN_INCREMENT_BPS = 100;         // 增幅下限 1%
    uint256 public constant MAX_INCREMENT_BPS = 5000;        // 增幅上限 50%
    uint256 public constant MAX_BATCHES = 500;               // 单场最大价格批次
    uint256 public constant MAX_REWARD_MULTIPLIER = 100;     // 100x 硬顶

    // ---------------- 类型 ----------------
    enum AssetType { ERC20, ERC721, ERC1155 }
    enum AuctionStatus { LIVE, SETTLING, SETTLED, CANCELLED }

    struct Auction {
        AuctionStatus status;
        address seller;
        AssetType assetType;
        address assetAddr;
        uint256 assetTokenId;
        uint256 assetAmount;
        uint256 startPrice;
        uint256 incrementBps;
        uint256 reservePrice;       // 0 = 无保留价
        uint256 lastPrice;          // 最近成交价格（0 = 尚无出价）
        uint256 deadline;           // 最后有效出价 + DURATION
        uint256 lastBatchBlock;     // 最后批次所在区块
        uint256 lastBatchId;
        uint256 batchStartId;       // 首个批次 ID（用于 recoverExcess 遍历）
        uint256 batchCount;         // 已创建批次
        // 账本
        uint256 totalPool;          // 被保留出价本金累计（份额 S）
        uint256 candidatesPool;     // 所有候选支付（price+fee）累计
        uint256 retainedFees;       // 被保留出价的 fee 累计（平台收入）
        uint256 refunded;           // 已退款累计
        uint256 rpu;                // 分红指数（1e18）
        uint256 rpuFinal;           // 结算时冻结
        uint256 finalPrice;
        address winner;
    }

    struct BidBatch {
        uint256 price;
        uint256 blockNumber;
        uint256 candidateCount;
        address selectedBidder;
        uint256 snapshotRpu;
        bool resolved;
    }

    // ---------------- 存储 ----------------
    address public immutable bidToken;       // USDC
    address public treasury;                 // 平台国库

    uint256 public auctionCount;
    uint256 public batchCounter;
    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => BidBatch) public batches;
    mapping(uint256 => mapping(uint256 => uint256)) public batchByBlock;      // auctionId => block => batchId
    mapping(uint256 => address[]) public batchCandidates;                     // batchId => candidates
    mapping(uint256 => mapping(address => bool)) public isCandidate;          // batchId => bidder
    mapping(uint256 => mapping(address => bool)) public refundClaimed;        // batchId => bidder
    mapping(uint256 => mapping(address => bool)) public rewardClaimed;        // batchId => bidder
    mapping(uint256 => bool) public sellerAmtFinalized;

    // ---------------- 事件 ----------------
    event AuctionCreated(uint256 indexed auctionId, address indexed seller, AssetType assetType,
        address assetAddr, uint256 tokenId, uint256 amount, uint256 startPrice,
        uint256 incrementBps, uint256 reservePrice);
    event BidPlaced(uint256 indexed auctionId, uint256 indexed batchId, address indexed bidder,
        uint256 price, uint256 fee, uint256 deadline);
    event DuplicateBidRefunded(uint256 indexed auctionId, uint256 indexed batchId, address indexed bidder, uint256 amount);
    event BatchResolved(uint256 indexed auctionId, uint256 indexed batchId, address selectedBidder, uint256 candidates);
    event AuctionFinalized(uint256 indexed auctionId, address winner, uint256 finalPrice,
        uint256 pool, uint256 sellerAmount, uint256 rewardAmount, uint256 platformAmount);
    event AuctionCancelled(uint256 indexed auctionId, string reason);
    event RefundClaimed(uint256 indexed auctionId, uint256 indexed batchId, address indexed bidder, uint256 amount);
    event RewardClaimed(uint256 indexed auctionId, uint256 indexed batchId, address indexed bidder, uint256 amount);
    event SellerClaimed(uint256 indexed auctionId, address indexed seller, uint256 amount);
    event TreasuryUpdated(address indexed treasury);

    constructor(address _bidToken, address _treasury) Ownable(msg.sender) {
        require(_bidToken != address(0), "ZERO_BID_TOKEN");
        require(_treasury != address(0), "ZERO_TREASURY");
        bidToken = _bidToken;
        treasury = _treasury;
    }

    // ---------------- 拍卖创建 ----------------
    /// @notice 创建拍卖并立即托管资产（seller 需先 approve 资产给本合约）
    function createAuction(
        AssetType assetType,
        address assetAddr,
        uint256 tokenId,
        uint256 amount,
        uint256 startPrice,
        uint256 incrementBps,
        uint256 reservePrice
    ) external nonReentrant returns (uint256 auctionId) {
        require(startPrice > 0, "ZERO_START");
        require(incrementBps >= MIN_INCREMENT_BPS && incrementBps <= MAX_INCREMENT_BPS, "BAD_INCR");
        require(assetAddr != address(0), "ZERO_ASSET");

        if (assetType == AssetType.ERC20) {
            require(amount > 0, "ZERO_AMOUNT");
            IERC20(assetAddr).safeTransferFrom(msg.sender, address(this), amount);
        } else if (assetType == AssetType.ERC721) {
            require(amount == 0, "BAD_AMOUNT");
            IERC721(assetAddr).transferFrom(msg.sender, address(this), tokenId);
        } else {
            require(amount > 0, "ZERO_AMOUNT");
            IERC1155(assetAddr).safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
        }

        auctionId = ++auctionCount;
        auctions[auctionId] = Auction({
            status: AuctionStatus.LIVE,
            seller: msg.sender,
            assetType: assetType,
            assetAddr: assetAddr,
            assetTokenId: tokenId,
            assetAmount: amount,
            startPrice: startPrice,
            incrementBps: incrementBps,
            reservePrice: reservePrice,
            lastPrice: 0,
            deadline: block.timestamp + DURATION,
            lastBatchBlock: 0,
            lastBatchId: 0,
            batchStartId: 0,
            batchCount: 0,
            totalPool: 0,
            candidatesPool: 0,
            retainedFees: 0,
            refunded: 0,
            rpu: 0,
            rpuFinal: 0,
            finalPrice: 0,
            winner: address(0)
        });
        emit AuctionCreated(auctionId, msg.sender, assetType, assetAddr, tokenId, amount,
            startPrice, incrementBps, reservePrice);
    }

    // ---------------- 出价 ----------------
    /// @notice 出价。price 必须等于当前下一价格等级。
    /// 同区块只接受同一价格；同地址同批次重复出价 → 自动全额退款。
    function placeBid(uint256 auctionId, uint256 price) external nonReentrant {
        Auction storage a = auctions[auctionId];
        require(a.status == AuctionStatus.LIVE, "NOT_LIVE");
        require(msg.sender != a.seller, "SELF_BID");

        uint256 fee = price * BID_FEE_BPS / 10000;
        uint256 pay = price + fee;
        uint256 batchId;

        if (a.lastBatchBlock == block.number) {
            // 同区块：加入已开批次（必须同价格）
            batchId = batchByBlock[auctionId][block.number];
            require(batches[batchId].price == price, "BLOCK_PRICE_LOCKED");
            if (isCandidate[batchId][msg.sender]) {
                // 重复出价：收钱后立即全额退回（不增加资格、不重置倒计时）
                IERC20(bidToken).safeTransferFrom(msg.sender, address(this), pay);
                a.candidatesPool += pay;
                a.refunded += pay;
                IERC20(bidToken).safeTransfer(msg.sender, pay);
                emit DuplicateBidRefunded(auctionId, batchId, msg.sender, pay);
                return;
            }
            IERC20(bidToken).safeTransferFrom(msg.sender, address(this), pay);
            a.candidatesPool += pay;
            isCandidate[batchId][msg.sender] = true;
            batchCandidates[batchId].push(msg.sender);
            batches[batchId].candidateCount++;
            a.deadline = block.timestamp + DURATION;
        } else {
            // 新价格等级
            require(price == _nextPrice(a), "BAD_PRICE");
            require(a.batchCount < MAX_BATCHES, "MAX_BATCHES");
            // 先解决上一批次（用当前区块 prevrandao 作随机源）
            if (a.lastBatchId != 0 && !batches[a.lastBatchId].resolved) {
                _resolveBatch(auctionId, a, a.lastBatchId, uint256(block.prevrandao));
            }
            batchId = ++batchCounter;
            if (a.batchCount == 0) a.batchStartId = batchId;
            batchByBlock[auctionId][block.number] = batchId;
            a.lastBatchBlock = block.number;
            a.lastBatchId = batchId;
            a.batchCount++;
            a.lastPrice = price;

            IERC20(bidToken).safeTransferFrom(msg.sender, address(this), pay);
            a.candidatesPool += pay;
            batches[batchId] = BidBatch({
                price: price,
                blockNumber: block.number,
                candidateCount: 1,
                selectedBidder: address(0),
                snapshotRpu: 0,
                resolved: false
            });
            isCandidate[batchId][msg.sender] = true;
            batchCandidates[batchId].push(msg.sender);
            a.deadline = block.timestamp + DURATION;
        }
        emit BidPlaced(auctionId, batchId, msg.sender, price, fee, a.deadline);
    }

    // ---------------- 结算 ----------------
    /// @notice 拍卖结束后由任何人触发结算。CEI：先状态后转账。
    function finalize(uint256 auctionId) external nonReentrant {
        Auction storage a = auctions[auctionId];
        require(a.status == AuctionStatus.LIVE, "NOT_LIVE");
        require(block.timestamp >= a.deadline, "NOT_ENDED");
        a.status = AuctionStatus.SETTLING;

        // 解决最后批次（若未解）
        if (a.lastBatchId != 0 && !batches[a.lastBatchId].resolved) {
            _resolveBatch(auctionId, a, a.lastBatchId, uint256(block.prevrandao));
        }

        // 流拍：无人出价 或 未达保留价 → 全额退款，资产退回
        bool underReserve = a.reservePrice > 0 && a.lastPrice < a.reservePrice;
        if (a.batchCount == 0 || underReserve) {
            _transferAsset(a, a.seller);
            a.status = AuctionStatus.CANCELLED;
            emit AuctionCancelled(auctionId, underReserve ? "UNDER_RESERVE" : "NO_BIDS");
            return;
        }

        // 正常结算
        a.rpuFinal = a.rpu;
        a.finalPrice = a.lastPrice;
        address winner = batches[a.lastBatchId].selectedBidder;
        require(winner != address(0), "NO_WINNER");
        a.winner = winner;
        _transferAsset(a, winner);

        uint256 pool = a.totalPool;
        // 各方收益各扣 5% 结算费：seller = 85%×95% = 80.75%；reward = 15%×95% = 14.25%
        uint256 sellerAmount = pool * SELLER_SHARE_BPS * (10000 - SETTLE_FEE_BPS) / 10000 / 10000;
        uint256 rewardAmount = pool * REWARD_SHARE_BPS * (10000 - SETTLE_FEE_BPS) / 10000 / 10000;
        // 平台 = 保留 fee + 5% 池子；用余额倒推，天然闭合
        uint256 refundPending = a.candidatesPool - pool - a.retainedFees - a.refunded;
        uint256 platformAmount = IERC20(bidToken).balanceOf(address(this))
            - sellerAmount - rewardAmount - refundPending;

        a.status = AuctionStatus.SETTLED;
        if (platformAmount > 0) {
            IERC20(bidToken).safeTransfer(treasury, platformAmount);
        }
        emit AuctionFinalized(auctionId, winner, a.finalPrice, pool, sellerAmount, rewardAmount, platformAmount);
    }

    // ---------------- 领取 ----------------
    /// @notice 落选候选 / 流拍候选 领取退款（含 1% 手续费，全额）。
    /// 批次解决后（拍卖进行中或结束后）落选者立即可退；流拍全退。
    function claimRefund(uint256 auctionId, uint256 batchId) external nonReentrant {
        Auction storage a = auctions[auctionId];
        BidBatch storage b = batches[batchId];
        require(
            a.status == AuctionStatus.LIVE || a.status == AuctionStatus.SETTLED || a.status == AuctionStatus.CANCELLED,
            "NOT_FINAL"
        );
        if (a.status != AuctionStatus.CANCELLED) {
            require(b.resolved, "NOT_RESOLVED");
            require(b.selectedBidder != msg.sender, "SELECTED");
        }
        require(isCandidate[batchId][msg.sender], "NOT_CANDIDATE");
        require(!refundClaimed[batchId][msg.sender], "CLAIMED");

        uint256 pay = b.price + b.price * BID_FEE_BPS / 10000;
        refundClaimed[batchId][msg.sender] = true;
        a.refunded += pay;
        IERC20(bidToken).safeTransfer(msg.sender, pay);
        emit RefundClaimed(auctionId, batchId, msg.sender, pay);
    }

    /// @notice 被保留出价者的分红领取（按批次，多个批次可多次领取）
    function claimReward(uint256 auctionId, uint256 batchId) external nonReentrant {
        Auction storage a = auctions[auctionId];
        BidBatch storage b = batches[batchId];
        require(a.status == AuctionStatus.SETTLED, "NOT_SETTLED");
        require(b.resolved, "NOT_RESOLVED");
        require(b.selectedBidder == msg.sender, "NOT_SELECTED");
        require(!rewardClaimed[batchId][msg.sender], "CLAIMED");

        uint256 dividend = _dividend(a, b);
        rewardClaimed[batchId][msg.sender] = true;
        if (dividend > 0) {
            IERC20(bidToken).safeTransfer(msg.sender, dividend);
        }
        emit RewardClaimed(auctionId, batchId, msg.sender, dividend);
    }

    /// @notice 拍卖人领取池子收益
    function claimSeller(uint256 auctionId) external nonReentrant {
        Auction storage a = auctions[auctionId];
        require(a.status == AuctionStatus.SETTLED, "NOT_SETTLED");
        require(msg.sender == a.seller, "NOT_SELLER");
        require(!sellerAmtFinalized[auctionId], "CLAIMED");

        uint256 pool = a.totalPool;
        uint256 sellerAmount = pool * SELLER_SHARE_BPS * (10000 - SETTLE_FEE_BPS) / 10000 / 10000;
        sellerAmtFinalized[auctionId] = true;
        if (sellerAmount > 0) {
            IERC20(bidToken).safeTransfer(msg.sender, sellerAmount);
        }
        emit SellerClaimed(auctionId, msg.sender, sellerAmount);
    }

    /// @notice owner 回收奖励池残余（结构性残余 0.1425×首笔 + 硬顶截断 + 整除 dust）。
    /// 遍历批次精确计算"应发奖励"总额，只回收超出部分，不影响任何人的领取。
    function recoverExcess(uint256 auctionId) external onlyOwner nonReentrant {
        Auction storage a = auctions[auctionId];
        require(a.status == AuctionStatus.SETTLED, "NOT_SETTLED");
        uint256 pool = a.totalPool;
        uint256 sellerAmount = pool * SELLER_SHARE_BPS * (10000 - SETTLE_FEE_BPS) / 10000 / 10000;
        uint256 refundPending = a.candidatesPool - pool - a.retainedFees - a.refunded;
        uint256 sellerPending = sellerAmtFinalized[auctionId] ? 0 : sellerAmount;

        uint256 unclaimedRewards;
        for (uint256 i = a.batchStartId; i <= a.lastBatchId; i++) {
            BidBatch storage b = batches[i];
            if (!b.resolved) continue;
            if (b.selectedBidder == address(0)) continue;
            if (rewardClaimed[i][b.selectedBidder]) continue; // 已领取的扣除，只计算未领
            unclaimedRewards += _dividend(a, b);
        }

        uint256 balance = IERC20(bidToken).balanceOf(address(this));
        uint256 obligation = refundPending + sellerPending + unclaimedRewards;
        if (balance > obligation) {
            uint256 excess = balance - obligation;
            IERC20(bidToken).safeTransfer(treasury, excess);
        }
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "ZERO_TREASURY");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    // ---------------- 只读视图（服务前端，避免大元组解构） ----------------
    function auctionStatus(uint256 auctionId) external view returns (AuctionStatus) {
        return auctions[auctionId].status;
    }

    function auctionSeller(uint256 auctionId) external view returns (address) {
        return auctions[auctionId].seller;
    }

    function auctionLastPrice(uint256 auctionId) external view returns (uint256) {
        return auctions[auctionId].lastPrice;
    }

    function auctionDeadline(uint256 auctionId) external view returns (uint256) {
        return auctions[auctionId].deadline;
    }

    function auctionTotalPool(uint256 auctionId) external view returns (uint256) {
        return auctions[auctionId].totalPool;
    }

    function auctionBatchStartId(uint256 auctionId) external view returns (uint256) {
        return auctions[auctionId].batchStartId;
    }

    function auctionBatchCount(uint256 auctionId) external view returns (uint256) {
        return auctions[auctionId].batchCount;
    }

    function getBatch(uint256 batchId) external view returns (BidBatch memory) {
        return batches[batchId];
    }

    function auctionWinner(uint256 auctionId) external view returns (address) {
        return auctions[auctionId].winner;
    }

    function auctionFinalPrice(uint256 auctionId) external view returns (uint256) {
        return auctions[auctionId].finalPrice;
    }

    function nextPrice(uint256 auctionId) external view returns (uint256) {
        return _nextPrice(auctions[auctionId]);
    }

    // ---------------- 内部 ----------------
    function _nextPrice(Auction storage a) internal view returns (uint256) {
        if (a.lastPrice == 0) return a.startPrice;
        return (a.lastPrice * (10000 + a.incrementBps) + 9999) / 10000;
    }

    function _dividend(Auction storage a, BidBatch storage b) internal view returns (uint256) {
        uint256 d = b.price * (a.rpuFinal - b.snapshotRpu) / 1e18;
        d = d * (10000 - SETTLE_FEE_BPS) / 10000;           // 收益扣 5%
        uint256 cap = b.price * MAX_REWARD_MULTIPLIER;       // 100x 硬顶
        return d > cap ? cap : d;
    }

    /// @notice 解决批次：随机保留一笔，更新池子与分红指数
    function _resolveBatch(uint256 auctionId, Auction storage a, uint256 batchId, uint256 randomness) internal {
        BidBatch storage b = batches[batchId];
        if (b.resolved) return;
        address[] storage candidates = batchCandidates[batchId];
        uint256 idx = randomness % b.candidateCount;
        b.selectedBidder = candidates[idx];
        b.resolved = true;

        // 分红指数：先基于旧池子记账，再入池；snapshot 记录更新后的 rpu
        uint256 prevPool = a.totalPool;
        if (prevPool > 0) {
            a.rpu += (b.price * REWARD_SHARE_BPS / 10000) * 1e18 / prevPool;
        }
        a.totalPool += b.price;
        a.retainedFees += b.price * BID_FEE_BPS / 10000;
        b.snapshotRpu = a.rpu;
        emit BatchResolved(auctionId, batchId, b.selectedBidder, b.candidateCount);
    }

    function _transferAsset(Auction storage a, address to) internal {
        if (a.assetType == AssetType.ERC20) {
            IERC20(a.assetAddr).safeTransfer(to, a.assetAmount);
        } else if (a.assetType == AssetType.ERC721) {
            IERC721(a.assetAddr).transferFrom(address(this), to, a.assetTokenId);
        } else {
            IERC1155(a.assetAddr).safeTransferFrom(address(this), to, a.assetTokenId, a.assetAmount, "");
        }
    }
}
