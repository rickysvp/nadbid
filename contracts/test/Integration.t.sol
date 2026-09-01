// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {NadbidRegistry} from "../src/NadbidRegistry.sol";
import {NadbidFactory} from "../src/NadbidFactory.sol";
import {KolPass} from "../src/KolPass.sol";
import {KolAuction} from "../src/KolAuction.sol";

contract IntegrationTest is Test {
    NadbidRegistry registry;
    NadbidFactory factory;
    address kol = address(0xBEEF);
    address buyer = address(0x1234);
    address platform = address(0xCAFE);

    function setUp() public {
        registry = new NadbidRegistry();
        factory = new NadbidFactory(address(registry), platform);
        registry.setFactory(address(factory));
    }

    function test_FullFlow_OnboardMintBidSettle() public {
        // 1. KOL 入驻 + 质押
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000);
        vm.deal(kol, 10 ether);
        registry.depositBond{value: 10 ether}();
        // 2. 创建 PASS + 拍卖
        address passAddr = factory.createKolPass(13.39 ether);
        address auctionAddr = factory.createKolAuction(passAddr, 99 ether, 120, "1v1 live");
        vm.stopPrank();

        // 3. 用户 mint PASS
        vm.deal(buyer, 1000 ether);
        vm.prank(buyer);
        KolPass(passAddr).mint{value: 13.39 ether * 108 / 100}(1);
        assertEq(KolPass(passAddr).balanceOf(buyer), 1);

        // 4. 出价
        vm.prank(buyer);
        KolAuction(auctionAddr).placeBid{value: 99 ether}();
        assertEq(KolAuction(auctionAddr).lastBidder(), buyer);

        // 5. 结算
        vm.warp(block.timestamp + 1000);
        vm.prank(kol);
        KolAuction(auctionAddr).settle();
        assertTrue(KolAuction(auctionAddr).settled());
    }
}
