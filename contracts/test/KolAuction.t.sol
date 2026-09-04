// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {KolPass} from "../src/KolPass.sol";
import {KolAuction} from "../src/KolAuction.sol";
import {NadbidRegistry} from "../src/NadbidRegistry.sol";

contract KolAuctionTest is Test {
    KolPass pass;
    KolAuction auction;
    NadbidRegistry reg;
    address kol = address(0xBEEF);
    address platform = address(0xCAFE);
    address bidder = address(0x1234);
    uint256 fixedBid = 99 ether;
    uint256 duration = 120;

    function setUp() public {
        pass = new KolPass(kol, 13.39 ether, platform, address(0xAAAA));
        // KolAuction 需传 registry（供 banned/factory 检查）；测试用独立 registry 实例
        reg = new NadbidRegistry(1000);
        // F6：KolAuction 构造要求 msg.sender == Registry.factory()；测试合约即 owner，
        // 把自己设为 factory 后直接 new（msg.sender = 测试合约）通过白名单校验
        reg.setFactory(address(this));
        auction = new KolAuction(kol, address(pass), fixedBid, duration, "1v1 live chat", platform, address(reg), block.timestamp);
        // F2：登记为可信拍卖（settle 回调 registry.notifyAuctionSettled 需要 isAuction）
        reg.addAuctionContract(kol, address(auction));
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

    function test_LastBidder_CumulativeTracksLeader() public {
        // bidder 出价 2 次 → lastBidder 累计 = 2×99
        vm.startPrank(bidder);
        auction.placeBid{value: fixedBid}();
        auction.placeBid{value: fixedBid}();
        vm.stopPrank();
        assertEq(auction.lastBidder(), bidder);
        assertEq(auction.lastBidderBidCount(), 2);
        assertEq(auction.lastBidderCumulative(), fixedBid * 2);

        // 新 bidder2 出价 1 次 → 领先者切换，lastBidder 累计反映新领先者
        address bidder2 = address(0x5678);
        vm.deal(bidder2, 1000 ether);
        vm.prank(bidder2);
        pass.mint{value: 13.39 ether * 108 / 100}(1);
        vm.prank(bidder2);
        auction.placeBid{value: fixedBid}();
        assertEq(auction.lastBidder(), bidder2);
        assertEq(auction.lastBidderBidCount(), 1);
        assertEq(auction.lastBidderCumulative(), fixedBid);
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

    // 预约拍卖：开始时间未到不可出价，到点后正常出价
    function test_PlaceBid_NotStartedBeforeStartTime() public {
        NadbidRegistry reg = new NadbidRegistry(1000);
        reg.setFactory(address(this)); // F6 白名单
        uint256 start = block.timestamp + 1000;
        KolAuction sched = new KolAuction(kol, address(pass), fixedBid, duration, "scheduled", platform, address(reg), start);
        // 未到开始时间：出价必须 revert
        vm.prank(bidder);
        vm.expectRevert();
        sched.placeBid{value: fixedBid}();
        // 初始 endTime = start + duration（预约开始推迟了结束时间）
        assertEq(sched.endTime(), start + duration);
        // 到开始时间后：正常出价
        vm.warp(start);
        vm.prank(bidder);
        sched.placeBid{value: fixedBid}();
        assertEq(sched.totalBids(), 1);
        // 预约拍卖出价后：endTime 不被 40s 重置压缩（保持完整 duration，只延长不提前）
        assertEq(sched.endTime(), start + duration);
    }

    // F6 回归：非官方 Factory 直接 new KolAuction 必须 revert（否则可绕过"同时一场拍卖"软约束）
    function test_Constructor_RejectsNonFactory() public {
        NadbidRegistry reg = new NadbidRegistry(1000);
        // 未 setFactory（factory = 0）→ 白名单校验失败，构造 revert
        vm.expectRevert(bytes("NOT_FACTORY"));
        new KolAuction(kol, address(pass), fixedBid, duration, "bad factory", platform, address(reg), block.timestamp);
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

    // Codex 审计 P1 回归：封禁对象 = 拍卖所属 KOL（a.kol），而非出价者。
    // 封禁 KOL 后其名下拍卖必须停止收款（出价 revert）；封禁普通竞拍者不应影响其出价。
    function test_PlaceBid_BannedKol_BlocksBids() public {
        reg.setBanned(kol, true);
        vm.prank(bidder);
        vm.expectRevert(bytes("BANNED"));
        auction.placeBid{value: fixedBid}();
    }

    // Codex 审计 P1 对偶：封禁普通竞拍者（非 KOL）不得影响其出价（检查对象不是 msg.sender）
    function test_PlaceBid_BanBidder_NotBlocked() public {
        reg.setBanned(bidder, true); // 竞拍者被封禁（与业务无关），不得拦截
        vm.prank(bidder);
        auction.placeBid{value: fixedBid}();
        assertEq(auction.totalBids(), 1);
    }

    // Pull 模式：settle 后平台/KOL 分别 claim 各自份额（20% / 80%）
    function test_Settle_PullMode_ClaimWorks() public {
        vm.prank(bidder);
        auction.placeBid{value: fixedBid}();
        vm.warp(block.timestamp + 1000);
        vm.prank(kol);
        auction.settle();

        uint256 platformFee = fixedBid * 20 / 100;
        uint256 kolShare = fixedBid - platformFee;

        // 平台领取 20%（platform 在 setUp mint 时已收到 3% 手续费，按增量断言）
        uint256 platformBefore = platform.balance;
        vm.prank(platform);
        auction.claimPlatform();
        assertEq(auction.pendingPlatform(), 0);
        assertEq(platform.balance - platformBefore, platformFee);

        // SP-2：settle 后 80% 锁定，KOL 不能立即领取
        assertEq(auction.pendingKol(), 0);
        vm.prank(kol);
        vm.expectRevert(bytes("!COMPLETED"));
        auction.claimKol();

        // KOL 提交履约 → 中标者确认 → COMPLETED 后可领取
        vm.prank(kol);
        auction.submitFulfillment(bytes32(uint256(0xABC)));
        vm.prank(bidder);
        auction.confirmFulfillment();
        uint256 kolBefore = kol.balance;
        vm.prank(kol);
        auction.claimKol();
        assertEq(auction.pendingKol(), 0);
        assertEq(kol.balance - kolBefore, kolShare);
    }

    // Pull 模式：KOL 为拒收合约时 settle 不阻塞，平台仍可领取（资金不卡死）
    function test_Settle_RejectingKol_DoesNotBlock() public {
        RejectingKol rejectKol = new RejectingKol();
        NadbidRegistry reg = new NadbidRegistry(1000);
        reg.setFactory(address(this)); // F6 白名单
        // 用拒收 KOL 重建拍卖（复用同一 pass，bidder 已持有）
        KolAuction rejAuction = new KolAuction(address(rejectKol), address(pass), fixedBid, duration, "reject test", platform, address(reg), block.timestamp);
        // F2：登记为可信拍卖（settle 回调需要）
        reg.addAuctionContract(address(rejectKol), address(rejAuction));
        vm.prank(bidder);
        rejAuction.placeBid{value: fixedBid}();
        vm.warp(block.timestamp + 1000);

        // settle 不因 KOL 拒收而 revert
        vm.prank(address(rejectKol));
        rejAuction.settle();
        assertTrue(rejAuction.settled());

        // 平台仍可领取 20%（platform 在 setUp mint 时已收到 3% 手续费，按增量断言）
        uint256 platformFee = fixedBid * 20 / 100;
        uint256 platformBefore = platform.balance;
        vm.prank(platform);
        rejAuction.claimPlatform();
        assertEq(rejAuction.pendingPlatform(), 0);
        assertEq(platform.balance - platformBefore, platformFee);

        // SP-2：80% 锁定在合约余额（不进入 pendingKol），拒收 KOL 无法在履约前领取；
        // 提交履约 + 自动确认后释放为待领（claimKol 仍会因拒收失败，但状态不阻塞）
        assertEq(rejAuction.pendingKol(), 0);
        assertEq(address(rejAuction).balance, fixedBid - platformFee);
        vm.prank(address(rejectKol));
        rejAuction.submitFulfillment(bytes32(uint256(0xDEF)));
        vm.warp(block.timestamp + 48 hours + 1);
        rejAuction.autoConfirm();
        assertEq(rejAuction.pendingKol(), fixedBid - platformFee);
    }

    // ================= SP-2 履约状态机 =================

    function _settleWithBid() internal {
        vm.prank(bidder);
        auction.placeBid{value: fixedBid}();
        vm.warp(block.timestamp + 1000);
        vm.prank(kol);
        auction.settle();
    }

    /// 注册 KOL 并质押 1 MON 押金（退款/罚没测试的前置）
    function _bondKol() internal {
        // setPlatformSigner 为 onlyOwner：以测试合约（reg 的 owner）身份调用
        reg.setPlatformSigner(vm.addr(0xA11CE));
        vm.startPrank(kol);
        bytes32 hash = keccak256(abi.encodePacked(kol, "handle", uint256(150000), block.timestamp + 1 hours));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xA11CE, hash);
        reg.registerKol("handle", 150000, block.timestamp + 1 hours, abi.encodePacked(r, s, v));
        vm.deal(kol, 1 ether);
        reg.depositBond{value: 1 ether}();
        vm.stopPrank();
    }

    function test_Settle_FreezesWinnerAndLocks() public {
        _settleWithBid();
        // winner 固化
        assertEq(auction.getAuction().winner, bidder);
        assertEq(auction.getAuction().winnerTotalSpent, fixedBid);
        // 80% 锁定：pendingKol 为 0，资金留在合约
        assertEq(auction.pendingKol(), 0);
        // settle 后全部资金仍在合约（20% 平台待领 + 80% 锁定）
        assertEq(address(auction).balance, fixedBid);
        assertEq(auction.getAuction().fulfillmentDeadline, block.timestamp + 48 hours);
    }

    function test_ClaimKol_BeforeCompleted_Reverts() public {
        _settleWithBid();
        vm.prank(kol);
        vm.expectRevert(bytes("!COMPLETED"));
        auction.claimKol();
    }

    function test_Fulfillment_OnlyKol() public {
        _settleWithBid();
        vm.prank(bidder);
        vm.expectRevert(bytes("!KOL"));
        auction.submitFulfillment(bytes32(uint256(1)));
    }

    function test_Fulfillment_ConfirmByWinner() public {
        _settleWithBid();
        vm.prank(kol);
        auction.submitFulfillment(bytes32(uint256(0xABC)));
        assertEq(uint256(auction.getAuction().status), uint256(KolAuction.AuctionStatus.AWAITING_CONFIRMATION));
        assertEq(auction.getAuction().autoConfirmDeadline, block.timestamp + 48 hours);
        // 非中标者不能确认
        address other = address(0x7777);
        vm.deal(other, 100 ether);
        vm.prank(other);
        vm.expectRevert(bytes("!WINNER"));
        auction.confirmFulfillment();
        // 中标者确认 → COMPLETED
        vm.prank(bidder);
        auction.confirmFulfillment();
        assertEq(uint256(auction.getAuction().status), uint256(KolAuction.AuctionStatus.COMPLETED));
        assertEq(auction.pendingKol(), fixedBid * 80 / 100);
    }

    function test_Fulfillment_AutoConfirm() public {
        _settleWithBid();
        vm.prank(kol);
        auction.submitFulfillment(bytes32(uint256(2)));
        // 未到窗口：不可自动确认
        vm.warp(block.timestamp + 48 hours - 1);
        vm.expectRevert(bytes("NOT_READY"));
        auction.autoConfirm();
        // 窗口结束：任何人可自动确认
        vm.warp(block.timestamp + 2);
        auction.autoConfirm();
        assertEq(uint256(auction.getAuction().status), uint256(KolAuction.AuctionStatus.COMPLETED));
        assertEq(auction.pendingKol(), fixedBid * 80 / 100);
    }

    function test_Dispute_OnlyWinner() public {
        _settleWithBid();
        vm.prank(kol);
        auction.submitFulfillment(bytes32(uint256(3)));
        vm.prank(address(0x7777));
        vm.expectRevert(bytes("!WINNER"));
        auction.dispute(bytes32(uint256(9)));
    }

    function test_Dispute_AndResolve_KolWon() public {
        _settleWithBid();
        vm.prank(kol);
        auction.submitFulfillment(bytes32(uint256(4)));
        vm.prank(bidder);
        auction.dispute(bytes32(uint256(9)));
        assertEq(uint256(auction.getAuction().status), uint256(KolAuction.AuctionStatus.DISPUTED));
        // 非仲裁者不可裁定
        vm.prank(address(0x7777));
        vm.expectRevert(bytes("!ARBITRATOR"));
        auction.resolveDispute(true);
        // 仲裁判 KOL 胜 → 放款
        reg.setArbitrator(address(this));
        auction.resolveDispute(true);
        assertEq(uint256(auction.getAuction().status), uint256(KolAuction.AuctionStatus.COMPLETED));
        assertEq(auction.pendingKol(), fixedBid * 80 / 100);
    }

    function test_Dispute_AndResolve_KolLost_FullRefund() public {
        _bondKol();
        _settleWithBid();
        vm.prank(kol);
        auction.submitFulfillment(bytes32(uint256(5)));
        vm.prank(bidder);
        auction.dispute(bytes32(uint256(9)));
        reg.setArbitrator(address(this));
        auction.resolveDispute(false);
        assertEq(uint256(auction.getAuction().status), uint256(KolAuction.AuctionStatus.REFUNDED));
        // 退款池 = 80% + 押金罚没（bidder 全部出价应全额退回，押金归平台/无人认领则留存）
        uint256 kolShare = fixedBid * 80 / 100;
        assertEq(auction.refundPool(), kolShare + 1 ether);
        // bidder 领取 80% + 押金罚没份额（单一出价者 = 全额 80% + 1 MON 押金）
        uint256 before = bidder.balance;
        vm.prank(bidder);
        auction.claimRefund();
        assertEq(bidder.balance - before, fixedBid * 80 / 100 + 1 ether);
        // 防重复领取
        vm.prank(bidder);
        vm.expectRevert(bytes("CLAIMED"));
        auction.claimRefund();
    }

    function test_Refund_WhenKolBreaches() public {
        _bondKol();
        _settleWithBid();
        // KOL 未在 48h 内提交履约 → 竞拍者触发违约结算
        vm.warp(block.timestamp + 48 hours + 1);
        uint256 before = bidder.balance;
        vm.prank(bidder);
        auction.claimRefund();
        assertEq(uint256(auction.getAuction().status), uint256(KolAuction.AuctionStatus.REFUNDED));
        assertEq(bidder.balance - before, fixedBid * 80 / 100 + 1 ether); // 80% + 押金罚没
        // KOL 押金被罚没（KolAuction 测试中 kol 未质押，slash 在 Registry 侧断言）
    }

    function test_Refund_Proportional_TwoBidders() public {
        _bondKol();
        address bidder2 = address(0x5678);
        vm.deal(bidder2, 1000 ether);
        vm.prank(bidder2);
        pass.mint{value: 13.39 ether * 108 / 100}(1);
        vm.startPrank(bidder);
        auction.placeBid{value: fixedBid}();
        auction.placeBid{value: fixedBid}();
        vm.stopPrank();
        vm.prank(bidder2);
        auction.placeBid{value: fixedBid}();
        vm.warp(block.timestamp + 1000);
        vm.prank(kol);
        auction.settle();
        vm.warp(block.timestamp + 48 hours + 1);
        // 违约退款按出价金额比例：bidder 2/3、bidder2 1/3（增量断言，与合约公式同构）
        uint256 pool = 3 * fixedBid * 80 / 100 + 1 ether;
        uint256 before = bidder.balance;
        vm.prank(bidder);
        auction.claimRefund();
        uint256 got1 = bidder.balance - before;
        uint256 before2 = bidder2.balance;
        vm.prank(bidder2);
        auction.claimRefund();
        uint256 got2 = bidder2.balance - before2;
        assertEq(got1, 2 * fixedBid * pool / (3 * fixedBid));
        assertEq(got2, fixedBid * pool / (3 * fixedBid));
        assertLe(pool - (got1 + got2), 1); // 整除截断 ≤1 wei
    }

    function test_Refundable_Getter() public {
        _bondKol();
        _settleWithBid();
        assertEq(auction.refundable(bidder), 0); // 未违约
        vm.warp(block.timestamp + 48 hours + 1);
        // 违约可退：80% 锁定资金 + 押金罚没（单一出价者拿全部份额）
        assertEq(auction.refundable(bidder), fixedBid * 80 / 100 + 1 ether);
        vm.prank(bidder);
        auction.claimRefund();
        assertEq(auction.refundable(bidder), 0); // 已领
    }

    function test_Settle_NoBids_Completes() public {
        vm.warp(block.timestamp + 1000);
        vm.prank(kol);
        auction.settle();
        assertEq(uint256(auction.getAuction().status), uint256(KolAuction.AuctionStatus.COMPLETED));
        assertTrue(auction.settled());
        assertEq(auction.getAuction().winner, address(0));
        assertEq(auction.pendingKol(), 0);
    }


// 拒收原生代币的合约（无 receive/fallback 收款路径 → call 失败）
}

contract RejectingKol {
    fallback() external payable { revert("REJECT"); }
    receive() external payable { revert("REJECT"); }

}

