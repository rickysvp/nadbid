// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {NadbidRegistry} from "../src/NadbidRegistry.sol";

contract NadbidRegistryTest is Test {
    NadbidRegistry registry;
    address kol = address(0xBEEF);

    function setUp() public {
        registry = new NadbidRegistry(1000);
    }

    function test_RegisterKol() public {
        vm.prank(kol);
        registry.registerKol("elonmusk", 150000000);
        assertTrue(registry.isKolRegistered(kol));
    }

    function test_RegisterKol_RejectsLowFollowers() public {
        vm.prank(kol);
        vm.expectRevert();
        registry.registerKol("small", 999);
    }

    function test_DepositBond_RequiresExactAmount() public {
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000);
        vm.deal(kol, 20 ether);
        vm.expectRevert();
        registry.depositBond{value: 9 ether}();
        vm.stopPrank();
    }

    function test_BondRedeem_48hCooldown() public {
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000);
        vm.deal(kol, 10 ether);
        registry.depositBond{value: 10 ether}();
        registry.requestBondRedeem();
        vm.expectRevert();
        registry.finalizeBondRedeem();  // 未满 48h
        vm.warp(block.timestamp + 48 hours + 1);
        registry.finalizeBondRedeem();
        assertEq(kol.balance, 10 ether);
        vm.stopPrank();
    }
}
