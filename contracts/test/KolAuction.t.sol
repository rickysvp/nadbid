// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {KolPass} from "../src/KolPass.sol";
import {KolAuction} from "../src/KolAuction.sol";
import {NadbidRegistry} from "../src/NadbidRegistry.sol";

contract KolAuctionTest is Test {
    KolPass pass;
    KolAuction auction;
    address kol = address(0xBEEF);
    address platform = address(0xCAFE);
    address bidder = address(0x1234);
    uint256 fixedBid = 99 ether;
    uint256 duration = 120;

    function setUp() public {
        pass = new KolPass(kol, 13.39 ether, platform);
        // KolAuction 需传 registry（供 banned 检查）；测试用独立 registry 实例
        NadbidRegistry reg = new NadbidRegistry(1000);
        auction = new KolAuction(kol, address(pass), fixedBid, duration, "1v1 live chat", platform, address(reg));
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
}
