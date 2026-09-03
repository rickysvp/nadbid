// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {NadbidRegistry} from "../src/NadbidRegistry.sol";
import {NadbidFactory} from "../src/NadbidFactory.sol";
import {KolAuction} from "../src/KolAuction.sol";

contract NadbidFactoryTest is Test {
    NadbidRegistry registry;
    NadbidFactory factory;
    address kol = address(0xBEEF);
    uint256 signerSk = 0xA11CE;
    address signer;

    function setUp() public {
        registry = new NadbidRegistry(1000);
        signer = vm.addr(signerSk);
        registry.setPlatformSigner(signer);
        factory = new NadbidFactory(address(registry), address(0xCAFE));  // registry + platformTreasury 两参
        registry.setFactory(address(factory));
    }

    /// 生成平台对 (wallet, handle, followers) 的注册签名
    function _signRegistration(address wallet, string memory handle, uint256 followers)
        internal view returns (bytes memory)
    {
        bytes32 hash = keccak256(abi.encodePacked(wallet, handle, followers));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerSk, hash);
        return abi.encodePacked(r, s, v);
    }

    function test_CreateKolPass_RequiresBond() public {
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000, _signRegistration(kol, "elonmusk", 150000000));
        vm.expectRevert();
        factory.createKolPass(13.39 ether);  // 未质押
        vm.stopPrank();
    }

    function test_CreateKolPass_AfterBond() public {
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000, _signRegistration(kol, "elonmusk", 150000000));
        vm.deal(kol, 1 ether);
        registry.depositBond{value: 1 ether}();
        address pass = factory.createKolPass(13.39 ether);
        assertTrue(pass != address(0));
        assertEq(registry.getKol(kol).passContracts.length, 1);
        vm.stopPrank();
    }

    function test_CreateKolAuction() public {
        // 先建 PASS，再建拍卖
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000, _signRegistration(kol, "elonmusk", 150000000));
        vm.deal(kol, 1 ether);
        registry.depositBond{value: 1 ether}();
        address pass = factory.createKolPass(13.39 ether);
        address auction = factory.createKolAuction(pass, 99 ether, 120, "1v1 live chat 30min");
        assertTrue(auction != address(0));
        assertEq(registry.getKol(kol).auctionContracts.length, 1);
        vm.stopPrank();
    }

    // 回归测试：伪造 passContract（kol() 返回攻击者但非本 Factory 签发）必须被拒
    function test_CreateKolAuction_RejectsFakePass() public {
        FakePass fake = new FakePass(kol);
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000, _signRegistration(kol, "elonmusk", 150000000));
        vm.deal(kol, 1 ether);
        registry.depositBond{value: 1 ether}();
        vm.expectRevert("NOT_FACTORY_PASS");
        factory.createKolAuction(address(fake), 99 ether, 120, "fake content");
        vm.stopPrank();
    }

    // 业务规则：KOL 同时只能进行一场拍卖——上一场未结算时创建新拍卖必须被拒
    function test_CreateKolAuction_BlockedWhileActive() public {
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000, _signRegistration(kol, "elonmusk", 150000000));
        vm.deal(kol, 1 ether);
        registry.depositBond{value: 1 ether}();
        address pass = factory.createKolPass(13.39 ether);
        factory.createKolAuction(pass, 99 ether, 120, "1v1 live chat 30min");  // 第 1 场，未 settle
        // 上一场未结算 → 拒绝创建第 2 场
        vm.expectRevert("ACTIVE_AUCTION_EXISTS");
        factory.createKolAuction(pass, 99 ether, 120, "second auction");
        vm.stopPrank();
    }

    // 业务规则：完成履约（settle）后可开启下一场拍卖
    function test_CreateKolAuction_AllowedAfterSettle() public {
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000, _signRegistration(kol, "elonmusk", 150000000));
        vm.deal(kol, 1 ether);
        registry.depositBond{value: 1 ether}();
        address pass = factory.createKolPass(13.39 ether);
        address a1 = factory.createKolAuction(pass, 99 ether, 120, "1v1 live chat 30min");
        // 时间到 → settle 第 1 场
        vm.warp(block.timestamp + 200);
        KolAuction(a1).settle();
        // 履约完成后可创建第 2 场
        address a2 = factory.createKolAuction(pass, 99 ether, 120, "second auction");
        assertTrue(a2 != address(0));
        assertEq(registry.getKol(kol).auctionContracts.length, 2);
        vm.stopPrank();
    }
}

// 模拟攻击者伪造的 PASS：kol() 返回攻击者，但 factory() 不是本 NadbidFactory
contract FakePass {
    address public kol;
    address public factory = address(0xDEAD);
    constructor(address _kol) { kol = _kol; }
}
