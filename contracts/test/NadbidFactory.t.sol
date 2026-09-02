// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {NadbidRegistry} from "../src/NadbidRegistry.sol";
import {NadbidFactory} from "../src/NadbidFactory.sol";

contract NadbidFactoryTest is Test {
    NadbidRegistry registry;
    NadbidFactory factory;
    address kol = address(0xBEEF);

    function setUp() public {
        registry = new NadbidRegistry(1000);
        factory = new NadbidFactory(address(registry), address(0xCAFE));  // registry + platformTreasury 两参
        registry.setFactory(address(factory));
    }

    function test_CreateKolPass_RequiresBond() public {
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000);
        vm.expectRevert();
        factory.createKolPass(13.39 ether);  // 未质押
        vm.stopPrank();
    }

    function test_CreateKolPass_AfterBond() public {
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000);
        vm.deal(kol, 10 ether);
        registry.depositBond{value: 10 ether}();
        address pass = factory.createKolPass(13.39 ether);
        assertTrue(pass != address(0));
        assertEq(registry.getKol(kol).passContracts.length, 1);
        vm.stopPrank();
    }

    function test_CreateKolAuction() public {
        // 先建 PASS，再建拍卖
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000);
        vm.deal(kol, 10 ether);
        registry.depositBond{value: 10 ether}();
        address pass = factory.createKolPass(13.39 ether);
        address auction = factory.createKolAuction(pass, 99 ether, 120, "1v1 live chat 30min");
        assertTrue(auction != address(0));
        assertEq(registry.getKol(kol).auctionContracts.length, 1);
        vm.stopPrank();
    }
}
