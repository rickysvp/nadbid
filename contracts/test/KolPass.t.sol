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

    // 回归测试：mint 1 再 burn 1，不得套利（旧逻辑 supplyAfterBurn=0 触发 curvePriceAt(0)=basePrice）
    function test_Burn_NoMintBurnArbitrage() public {
        vm.deal(buyer, 100 ether);
        uint256 mintCost = pass.curvePriceAt(1) * 108 / 100;  // 首枚成本（含 8% 费）
        vm.prank(buyer);
        uint256[] memory ids = pass.mint{value: mintCost}(1);

        // burn 该 token，返还应为 curvePriceAt(1)（镜像 mint），而非 basePrice
        uint256 before = buyer.balance;
        uint256[] memory burnIds = new uint256[](1);
        burnIds[0] = ids[0];
        vm.prank(buyer);
        pass.burn(burnIds);

        uint256 netRefund = buyer.balance - before;
        uint256 expectedRefund = pass.curvePriceAt(1) * 92 / 100;  // 扣 8% 手续费
        // 断言：返还显著小于 basePrice 的 92%（避免 basePrice 套利）
        assertLt(netRefund, pass.curvePriceAt(1) * 92 / 100 + 1, "burn refund must not reach basePrice tier");
        // 断言：返还与镜像 mint 价格一致（curvePriceAt(1) 扣费）
        assertEq(netRefund, expectedRefund);
        // 断言：净返还 < mint 成本（无套利）
        assertLt(netRefund, mintCost);
    }

    // 回归测试：批量 burn 多个 token，价格与 mint 严格镜像，无套利
    function test_Burn_BatchMirrorsMintNoArbitrage() public {
        vm.deal(buyer, 1000 ether);
        uint256 qty = 5;
        // mint 5 个
        uint256 mintCost = 0;
        for (uint256 i = 0; i < qty; i++) {
            mintCost += pass.curvePriceAt(i + 1);
        }
        mintCost = mintCost * 108 / 100;
        vm.prank(buyer);
        uint256[] memory ids = pass.mint{value: mintCost}(qty);

        // 全量 burn
        uint256 before = buyer.balance;
        vm.prank(buyer);
        pass.burn(ids);
        uint256 netRefund = buyer.balance - before;

        // burn 5 个返还 = curvePriceAt(5)+curvePriceAt(4)+...+curvePriceAt(1) 扣 8%
        uint256 expected = 0;
        for (uint256 i = 0; i < qty; i++) {
            expected += pass.curvePriceAt(qty - i);
        }
        expected = expected * 92 / 100;
        assertEq(netRefund, expected);
        // 无套利：净返还 < 总成本
        assertLt(netRefund, mintCost);
        assertEq(pass.totalSupply(), 0);
        assertEq(pass.balanceOf(buyer), 0);
    }
}
