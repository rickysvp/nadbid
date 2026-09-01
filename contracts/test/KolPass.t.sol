// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {KolPass} from "../src/KolPass.sol";

contract KolPassTest is Test {
    KolPass pass;
    address kol = address(0xBEEF);
    address platform = address(0xCAFE);
    address buyer = address(0x1234);
    uint256 mintPrice = 13.39 ether;
    uint256 baseSupply = 1000;

    function setUp() public {
        pass = new KolPass(kol, mintPrice, platform);
    }

    function test_CurvePrice_AtBaseSupply() public view {
        assertEq(pass.curvePrice(), mintPrice);  // supply=1000 → price=basePrice
    }

    function test_Mint_CostsWithFee() public {
        vm.deal(buyer, 100 ether);
        uint256 supply = pass.totalSupply();
        uint256 unit = pass.curvePriceAt(1);  // 第一枚的实际曲线价（supply 0→1）
        uint256 cost = unit * 108 / 100;      // +8% 手续费
        vm.prank(buyer);
        pass.mint{value: cost}(1);
        assertEq(pass.balanceOf(buyer), 1);
        assertEq(pass.totalSupply(), supply + 1);
    }

    function test_Mint_SplitsFee() public {
        vm.deal(buyer, 100 ether);
        uint256 unit = pass.curvePriceAt(1);  // 第一枚实际曲线价（注意：非 curvePrice()）
        uint256 cost = unit * 108 / 100;
        uint256 beforeKol = kol.balance;
        uint256 beforePlatform = platform.balance;
        vm.prank(buyer);
        pass.mint{value: cost}(1);
        // 5% KOL + 3% 平台 = 8%（基数 = 实际曲线成交额 unit，非 basePrice）
        assertEq(kol.balance - beforeKol, unit * 5 / 100);
        assertEq(platform.balance - beforePlatform, unit * 3 / 100);
    }

    function test_Transfer_IsSoulbound() public {
        vm.deal(buyer, 100 ether);
        uint256 cost = pass.curvePriceAt(1) * 108 / 100;
        vm.prank(buyer);
        uint256[] memory ids = pass.mint{value: cost}(1);
        vm.prank(buyer);
        vm.expectRevert();
        pass.transferFrom(buyer, address(0x999), ids[0]);
    }
}
