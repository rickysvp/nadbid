// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {ERC1155} from "openzeppelin-contracts/contracts/token/ERC1155/ERC1155.sol";
import {NADBIDAuction} from "../src/NADBIDAuction.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1_000_000_000e6);
    }
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract MockNFT is ERC721 {
    constructor() ERC721("Mock NFT", "MNFT") {}
    function mint(address to, uint256 id) external {
        _mint(to, id);
    }
}

contract Mock1155 is ERC1155 {
    constructor() ERC1155("") {}
    function mint(address to, uint256 id, uint256 amt) external {
        _mint(to, id, amt, "");
    }
}

contract NADBIDAuctionTest is Test {
    MockUSDC usdc;
    MockNFT nft;
    Mock1155 erc1155;
    NADBIDAuction auction;
    address treasury = makeAddr("treasury");

    address seller = makeAddr("seller");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");

    uint256 constant P0 = 10e6; // 起拍价 10 USDC（6 decimals）

    function setUp() public {
        usdc = new MockUSDC();
        nft = new MockNFT();
        erc1155 = new Mock1155();
        auction = new NADBIDAuction(address(usdc), treasury);

        address[4] memory users = [seller, alice, bob, carol];
        for (uint256 i = 0; i < users.length; i++) {
            usdc.transfer(users[i], 10_000_000e6);
            vm.prank(users[i]);
            usdc.approve(address(auction), type(uint256).max);
        }
    }

    // ---------- 状态读取 helper ----------
    function _status(uint256 id) internal view returns (NADBIDAuction.AuctionStatus) {
        return auction.auctionStatus(id);
    }

    function _lastPrice(uint256 id) internal view returns (uint256) {
        return auction.auctionLastPrice(id);
    }

    function _deadline(uint256 id) internal view returns (uint256) {
        return auction.auctionDeadline(id);
    }

    function _winner(uint256 id) internal view returns (address) {
        return auction.auctionWinner(id);
    }

    function _finalPrice(uint256 id) internal view returns (uint256) {
        return auction.auctionFinalPrice(id);
    }

    // ---------- helper ----------
    function _createERC20Auction(address seller_, uint256 amount, uint256 startPrice, uint256 incr, uint256 reserve)
        internal returns (uint256 id)
    {
        vm.prank(seller_);
        id = auction.createAuction(NADBIDAuction.AssetType.ERC20, address(usdc), 0, amount, startPrice, incr, reserve);
    }

    function _createERC20AuctionDefault() internal returns (uint256) {
        return _createERC20Auction(seller, 1000e6, P0, 100, 0);
    }

    function _nextPrice(uint256 p, uint256 incrBps) internal pure returns (uint256) {
        return (p * (10000 + incrBps) + 9999) / 10000;
    }

    // ============ 创建拍卖 ============

    function test_CreateAuction_ERC20_TokenEscrowed() public {
        uint256 id = _createERC20AuctionDefault();
        assertEq(auction.auctionCount(), 1);
        assertTrue(_status(id) == NADBIDAuction.AuctionStatus.LIVE);
        assertEq(usdc.balanceOf(address(auction)), 1000e6, "asset escrowed");
        assertEq(usdc.balanceOf(seller), 10_000_000e6 - 1000e6, "seller balance after escrow");
    }

    function test_CreateAuction_InvalidParams() public {
        vm.startPrank(seller);
        vm.expectRevert("ZERO_START");
        auction.createAuction(NADBIDAuction.AssetType.ERC20, address(usdc), 0, 100e6, 0, 100, 0);
        vm.expectRevert("BAD_INCR");
        auction.createAuction(NADBIDAuction.AssetType.ERC20, address(usdc), 0, 100e6, P0, 50, 0);
        vm.expectRevert("BAD_INCR");
        auction.createAuction(NADBIDAuction.AssetType.ERC20, address(usdc), 0, 100e6, P0, 6000, 0);
        vm.expectRevert("ZERO_ASSET");
        auction.createAuction(NADBIDAuction.AssetType.ERC20, address(0), 0, 100e6, P0, 100, 0);
        vm.stopPrank();
    }

    function test_CreateAuction_ERC721_And_1155() public {
        vm.startPrank(seller);
        nft.mint(seller, 1);
        nft.approve(address(auction), 1);
        auction.createAuction(NADBIDAuction.AssetType.ERC721, address(nft), 1, 0, P0, 100, 0);
        assertEq(nft.ownerOf(1), address(auction), "nft escrowed");

        erc1155.mint(seller, 7, 5);
        erc1155.setApprovalForAll(address(auction), true);
        uint256 id2 = auction.createAuction(NADBIDAuction.AssetType.ERC1155, address(erc1155), 7, 5, P0, 100, 0);
        assertEq(erc1155.balanceOf(address(auction), 7), 5, "1155 escrowed");
        assertTrue(_status(id2) == NADBIDAuction.AuctionStatus.LIVE);
        vm.stopPrank();
    }

    // ============ 出价 ============

    function test_PlaceBid_FirstIsStartPrice() public {
        uint256 id = _createERC20AuctionDefault();
        vm.prank(alice);
        auction.placeBid(id, P0);
        assertEq(_lastPrice(id), P0);
        assertEq(usdc.balanceOf(address(auction)), 1000e6 + P0 + P0 * 100 / 10000, "principal + fee");
        assertEq(auction.auctionBatchCount(id), 1, "first batch created");
    }

    function test_PlaceBid_WrongPrice_Reverts() public {
        uint256 id = _createERC20AuctionDefault();
        vm.prank(alice);
        auction.placeBid(id, P0);
        vm.roll(block.number + 1);
        vm.prank(alice);
        vm.expectRevert("BAD_PRICE");
        auction.placeBid(id, P0); // 新价格等级必须是 P0×1.01
    }

    function test_PlaceBid_SelfBid_Reverts() public {
        uint256 id = _createERC20AuctionDefault();
        vm.prank(seller);
        vm.expectRevert("SELF_BID");
        auction.placeBid(id, P0);
    }

    function test_PlaceBid_IncrementIsCeil() public {
        uint256 id = _createERC20AuctionDefault();
        vm.prank(alice);
        auction.placeBid(id, P0);
        vm.roll(block.number + 1);
        uint256 next = _nextPrice(P0, 100);
        vm.prank(bob);
        auction.placeBid(id, next);
        assertEq(_lastPrice(id), next, "increment uses ceil division");
    }

    function test_Deadline_ResetsOnBid() public {
        uint256 id = _createERC20AuctionDefault();
        assertEq(_deadline(id), block.timestamp + 120, "initial deadline");
        vm.warp(60);
        vm.prank(alice);
        auction.placeBid(id, P0);
        assertEq(_deadline(id), 180, "deadline reset after bid");
    }

    function test_SameBlock_MultipleCandidates_OneSelected_OthersRefund() public {
        uint256 id = _createERC20AuctionDefault();
        vm.roll(100);
        vm.prank(alice);
        auction.placeBid(id, P0);
        vm.prank(bob);
        auction.placeBid(id, P0);
        vm.prank(carol);
        auction.placeBid(id, P0);

        // 下一区块新价格触发上一批次解决；prevrandao=0 → 保留第一位候选 alice
        vm.prevrandao(bytes32(uint256(0)));
        vm.roll(101);
        vm.prank(alice);
        auction.placeBid(id, _nextPrice(P0, 100));

        uint256 batchId = auction.batchByBlock(id, 100);
        NADBIDAuction.BidBatch memory b = auction.getBatch(batchId);
        assertTrue(b.resolved, "batch resolved on next price level");
        assertEq(b.selectedBidder, alice, "prevrandao=0 keeps first candidate");
        assertEq(b.candidateCount, 3);

        // 落选者全额退款（含手续费）
        vm.prank(bob);
        auction.claimRefund(id, batchId);
        assertEq(usdc.balanceOf(bob), 10_000_000e6, "bob principal+fee refunded");
        vm.prank(carol);
        auction.claimRefund(id, batchId);
        assertEq(usdc.balanceOf(carol), 10_000_000e6, "carol principal+fee refunded");

        // 被保留者不能退
        vm.prank(alice);
        vm.expectRevert("SELECTED");
        auction.claimRefund(id, batchId);

        // 重复领取 revert
        vm.prank(bob);
        vm.expectRevert("CLAIMED");
        auction.claimRefund(id, batchId);
    }

    function test_SameBlock_DifferentPrice_Reverts() public {
        uint256 id = _createERC20AuctionDefault();
        vm.roll(100);
        vm.prank(alice);
        auction.placeBid(id, P0);
        vm.prank(bob);
        vm.expectRevert("BLOCK_PRICE_LOCKED");
        auction.placeBid(id, _nextPrice(P0, 100)); // 同区块跳价被锁
    }

    function test_DuplicateBid_AutoRefunded() public {
        uint256 id = _createERC20AuctionDefault();
        vm.roll(100);
        vm.prank(alice);
        auction.placeBid(id, P0);
        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        auction.placeBid(id, P0);
        assertEq(usdc.balanceOf(alice), balBefore, "duplicate bid refunded immediately");
    }

    function test_DuplicateBid_DoesNotResetDeadline() public {
        uint256 id = _createERC20AuctionDefault();
        vm.roll(100);
        vm.prank(alice);
        auction.placeBid(id, P0);
        uint256 d0 = _deadline(id);
        vm.warp(block.timestamp + 100);
        vm.prank(alice);
        auction.placeBid(id, P0); // 重复出价
        assertEq(_deadline(id), d0, "duplicate bid must not extend deadline");
    }

    // ============ 结算 ============

    function test_Finalize_BeforeEnd_Reverts() public {
        uint256 id = _createERC20AuctionDefault();
        vm.prank(alice);
        auction.placeBid(id, P0);
        vm.warp(block.timestamp + 119);
        vm.expectRevert("NOT_ENDED");
        auction.finalize(id);
    }

    function test_Finalize_NoBids_Cancelled_AssetReturned() public {
        uint256 id = _createERC20AuctionDefault();
        vm.warp(block.timestamp + 121);
        auction.finalize(id);
        assertTrue(_status(id) == NADBIDAuction.AuctionStatus.CANCELLED);
        assertEq(usdc.balanceOf(seller), 10_000_000e6, "asset returned to seller");
    }

    function test_Finalize_UnderReserve_Cancelled_FullRefund() public {
        uint256 id = _createERC20Auction(seller, 1000e6, P0, 100, 500e6); // 保留价 500 USDC
        vm.prank(alice);
        auction.placeBid(id, P0);
        vm.warp(block.timestamp + 121);
        vm.prevrandao(bytes32(uint256(0)));
        auction.finalize(id);
        assertTrue(_status(id) == NADBIDAuction.AuctionStatus.CANCELLED, "under reserve cancelled");

        // 流拍：候选可全额退款（含手续费）
        uint256 bs = auction.auctionBatchStartId(id);
        vm.prank(alice);
        auction.claimRefund(id, bs);
        assertEq(usdc.balanceOf(alice), 10_000_000e6, "candidate fully refunded on cancel");
        assertEq(usdc.balanceOf(seller), 10_000_000e6, "asset returned on cancel");
    }

    function test_Finalize_Normal_FullFlow() public {
        uint256 id = _createERC20AuctionDefault();
        // 区块 100：alice + carol 同价出 10；prevrandao=0 → 保留第一位 alice，carol 落选
        vm.roll(100);
        vm.prank(alice);
        auction.placeBid(id, P0);
        vm.prank(carol);
        auction.placeBid(id, P0);
        // 区块 101：bob 出 10.1（最后批次，唯一候选 → 保留）
        vm.prevrandao(bytes32(uint256(0)));
        vm.roll(101);
        uint256 p2 = _nextPrice(P0, 100);
        vm.prank(bob);
        auction.placeBid(id, p2);

        vm.warp(block.timestamp + 121);
        vm.prevrandao(bytes32(uint256(0)));
        auction.finalize(id);

        assertTrue(_status(id) == NADBIDAuction.AuctionStatus.SETTLED);
        assertEq(_winner(id), bob, "last batch winner");
        assertEq(_finalPrice(id), p2);

        // 资产 1000 USDC → 赢家 bob；但他出价支付了 p2+fee，已留在合约
        uint256 pay2 = p2 + p2 * 100 / 10000;
        assertEq(usdc.balanceOf(bob), 10_000_000e6 - pay2 + 1000e6, "asset delivered to winner net of bid");

        // carol 落选退款（区块 100 批次，含手续费全额）
        uint256 b100 = auction.batchByBlock(id, 100);
        vm.prank(carol);
        auction.claimRefund(id, b100);
        assertEq(usdc.balanceOf(carol), 10_000_000e6, "carol principal+fee refunded");

        // alice 被保留 → 有分红 = 0.1425 × P2（领取前后差额）
        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        auction.claimReward(id, b100);
        uint256 reward = usdc.balanceOf(alice) - balBefore;
        uint256 expected = p2 * 1500 / 10000 * 9500 / 10000;
        assertApproxEqAbs(reward, expected, 2, "alice dividend = 0.1425 * P2");

        // seller 领取 80.75% 池子
        vm.prank(seller);
        auction.claimSeller(id);
        uint256 pool = P0 + p2;
        uint256 sellerExpected = pool * 8500 / 10000 * 9500 / 10000;
        assertApproxEqAbs(usdc.balanceOf(seller), 10_000_000e6 - 1000e6 + sellerExpected, 2);
    }

    function test_Conservation_PlatformGetsResidual() public {
        uint256 id = _createERC20AuctionDefault();
        vm.roll(100);
        vm.prank(alice);
        auction.placeBid(id, P0);
        vm.prevrandao(bytes32(uint256(0)));
        vm.roll(101);
        uint256 p2 = _nextPrice(P0, 100);
        vm.prank(bob);
        auction.placeBid(id, p2);
        vm.warp(block.timestamp + 121);
        vm.prevrandao(bytes32(uint256(0)));
        uint256 tBefore = usdc.balanceOf(treasury);
        auction.finalize(id);

        // 平台收入 = 保留 fee(两笔) + 5% × 池子
        uint256 pool = P0 + p2;
        uint256 fee1 = P0 * 100 / 10000;
        uint256 fee2 = p2 * 100 / 10000;
        uint256 platformExpected = fee1 + fee2 + pool * 500 / 10000;
        assertApproxEqAbs(usdc.balanceOf(treasury) - tBefore, platformExpected, 2);
    }

    function test_Reward_MultipleLevels() public {
        // 三笔出价：P1=10(alice), P2=10.1(bob), P3=10.201(carol)
        uint256 id = _createERC20AuctionDefault();
        vm.roll(100);
        vm.prank(alice);
        auction.placeBid(id, P0);
        vm.prevrandao(bytes32(uint256(0)));
        vm.roll(101);
        uint256 p2 = _nextPrice(P0, 100);
        vm.prank(bob);
        auction.placeBid(id, p2);
        vm.prevrandao(bytes32(uint256(0)));
        vm.roll(102);
        uint256 p3 = _nextPrice(p2, 100);
        vm.prank(carol);
        auction.placeBid(id, p3);

        vm.warp(block.timestamp + 121);
        vm.prevrandao(bytes32(uint256(0)));
        auction.finalize(id);

        uint256 b100 = auction.batchByBlock(id, 100);
        uint256 b101 = auction.batchByBlock(id, 101);

        // alice：P1×(rpuFinal) 分红；bob：P2×(rpuFinal-rpu2)
        uint256 balBeforeAlice = usdc.balanceOf(alice);
        vm.prank(alice);
        auction.claimReward(id, b100);
        uint256 rAlice = usdc.balanceOf(alice) - balBeforeAlice;
        uint256 balBeforeBob = usdc.balanceOf(bob);
        vm.prank(bob);
        auction.claimReward(id, b101);
        uint256 rBob = usdc.balanceOf(bob) - balBeforeBob;

        // 理论值（6 decimals，整数计算，允许 dust）
        // rpu2 = 0.15×p2/P0；rpuFinal = rpu2 + 0.15×p3/(P0+p2)
        uint256 rpu2 = p2 * 1500 / 10000 * 1e18 / P0;
        uint256 rpuF = rpu2 + p3 * 1500 / 10000 * 1e18 / (P0 + p2);
        uint256 dAlice = P0 * rpuF / 1e18 * 9500 / 10000;
        uint256 dBob = p2 * (rpuF - rpu2) / 1e18 * 9500 / 10000;
        assertApproxEqAbs(rAlice, dAlice, 2);
        assertApproxEqAbs(rBob, dBob, 2);

        // 奖励守恒：发放 ≤ 池子 14.25%
        assertLe(rAlice + rBob, (P0 + p2 + p3) * 1500 / 10000 * 9500 / 10000 + 10);
    }

    function test_Reward_100xCap() public {
        // 构造 cap 场景：P1=10，P2 按增幅上限 50%
        uint256 id = _createERC20Auction(seller, 1000e6, P0, 5000, 0);
        vm.roll(200);
        vm.prank(alice);
        auction.placeBid(id, P0);
        vm.prevrandao(bytes32(uint256(0)));
        vm.roll(201);
        uint256 p2 = _nextPrice(P0, 5000); // 15 USDC
        vm.prank(bob);
        auction.placeBid(id, p2);
        vm.warp(block.timestamp + 121);
        vm.prevrandao(bytes32(uint256(0)));
        auction.finalize(id);

        uint256 b200 = auction.batchByBlock(id, 200);
        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        auction.claimReward(id, b200);
        uint256 reward = usdc.balanceOf(alice) - balBefore;
        assertLe(reward, P0 * 100, "reward capped at 100x principal");
        assertGt(reward, 0);
    }

    function test_RecoverExcess_CollectsStructuralResidual() public {
        // 单笔出价：winner 无后续 → 分红 0，奖励池 14.25%×P0 全部为结构性残余
        uint256 id = _createERC20AuctionDefault();
        vm.roll(100);
        vm.prank(alice);
        auction.placeBid(id, P0);
        vm.warp(block.timestamp + 121);
        vm.prevrandao(bytes32(uint256(0)));
        auction.finalize(id);

        uint256 tBefore = usdc.balanceOf(treasury);
        auction.recoverExcess(id);
        uint256 tAfter = usdc.balanceOf(treasury);
        assertApproxEqAbs(tAfter - tBefore, P0 * 1500 / 10000 * 9500 / 10000, 2);
    }

    function test_RecoverExcess_DoesNotTouchPayableRewards() public {
        // 两笔出价：alice 有分红（应发），recover 不应拿走她的钱
        uint256 id = _createERC20AuctionDefault();
        vm.roll(100);
        vm.prank(alice);
        auction.placeBid(id, P0);
        vm.prevrandao(bytes32(uint256(0)));
        vm.roll(101);
        uint256 p2 = _nextPrice(P0, 100);
        vm.prank(bob);
        auction.placeBid(id, p2);
        vm.warp(block.timestamp + 121);
        vm.prevrandao(bytes32(uint256(0)));
        auction.finalize(id);

        auction.recoverExcess(id);

        uint256 b100 = auction.batchByBlock(id, 100);
        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        auction.claimReward(id, b100);
        uint256 expected = p2 * 1500 / 10000 * 9500 / 10000;
        uint256 reward = usdc.balanceOf(alice) - balBefore;
        assertApproxEqAbs(reward, expected, 2, "recoverExcess must not affect payable rewards");
    }

    // ============ 权限与边界 ============

    function test_Owner_CanSetTreasury() public {
        address t2 = makeAddr("t2");
        auction.setTreasury(t2);
        assertEq(auction.treasury(), t2);
        vm.prank(alice);
        vm.expectRevert();
        auction.setTreasury(t2);
    }

    function test_Constants() public {
        assertEq(auction.MAX_BATCHES(), 500);
        assertEq(auction.DURATION(), 120);
        assertEq(auction.BID_FEE_BPS(), 100);
        assertEq(auction.SETTLE_FEE_BPS(), 500);
        assertEq(auction.SELLER_SHARE_BPS(), 8500);
        assertEq(auction.REWARD_SHARE_BPS(), 1500);
    }

    function test_ClaimRefund_AfterSettle_NonCandidate_Reverts() public {
        uint256 id = _createERC20AuctionDefault();
        vm.roll(100);
        vm.prank(alice);
        auction.placeBid(id, P0);
        vm.warp(block.timestamp + 121);
        vm.prevrandao(bytes32(uint256(0)));
        auction.finalize(id);
        uint256 b100 = auction.batchByBlock(id, 100);
        vm.prank(bob);
        vm.expectRevert("NOT_CANDIDATE");
        auction.claimRefund(id, b100);
    }

    function test_ClaimReward_WrongBidder_Reverts() public {
        uint256 id = _createERC20AuctionDefault();
        vm.roll(100);
        vm.prank(alice);
        auction.placeBid(id, P0);
        vm.warp(block.timestamp + 121);
        vm.prevrandao(bytes32(uint256(0)));
        auction.finalize(id);
        uint256 b100 = auction.batchByBlock(id, 100);
        vm.prank(bob);
        vm.expectRevert("NOT_SELECTED");
        auction.claimReward(id, b100);
    }

    function test_PlaceBid_OnFinalizedAuction_Reverts() public {
        uint256 id = _createERC20AuctionDefault();
        vm.roll(100);
        vm.prank(alice);
        auction.placeBid(id, P0);
        vm.warp(block.timestamp + 121);
        vm.prevrandao(bytes32(uint256(0)));
        auction.finalize(id);
        vm.roll(block.number + 1);
        vm.prank(bob);
        vm.expectRevert("NOT_LIVE");
        auction.placeBid(id, _nextPrice(P0, 100));
    }
}
