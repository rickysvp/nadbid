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

        // KOL 领取 80%（kol 在 setUp mint 时已收到 5% 手续费，按增量断言）
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

        // KOL 份额留存合约（拒收地址无法领取，但结算与担保赎回不受影响）
        assertEq(rejAuction.pendingKol(), fixedBid - platformFee);
    }
}

// 拒收原生代币的合约（无 receive/fallback 收款路径 → call 失败）
contract RejectingKol {
    fallback() external payable { revert("REJECT"); }
    receive() external payable { revert("REJECT"); }
}
