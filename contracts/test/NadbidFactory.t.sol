// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {NadbidRegistry} from "../src/NadbidRegistry.sol";
import {NadbidFactory} from "../src/NadbidFactory.sol";
import {KolAuction} from "../src/KolAuction.sol";
import {KolPass} from "../src/KolPass.sol";

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
        factory = new NadbidFactory(address(registry), address(0xCAFE), 99 ether);  // registry + treasury + fixedBid
        registry.setFactory(address(factory));
    }

    /// 生成平台对 (wallet, handle, followers) 的注册签名
    function _signRegistration(address wallet, string memory handle, uint256 followers)
        internal view returns (bytes memory)
    {
        bytes32 hash = keccak256(abi.encodePacked(wallet, handle, followers, block.timestamp + 1 hours));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerSk, hash);
        return abi.encodePacked(r, s, v);
    }

    function test_CreateKolPass_RequiresBond() public {
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000, block.timestamp + 1 hours, _signRegistration(kol, "elonmusk", 150000000));
        vm.expectRevert();
        factory.createKolPass(13.39 ether);  // 未质押
        vm.stopPrank();
    }

    function test_CreateKolPass_AfterBond() public {
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000, block.timestamp + 1 hours, _signRegistration(kol, "elonmusk", 150000000));
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
        registry.registerKol("elonmusk", 150000000, block.timestamp + 1 hours, _signRegistration(kol, "elonmusk", 150000000));
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
        registry.registerKol("elonmusk", 150000000, block.timestamp + 1 hours, _signRegistration(kol, "elonmusk", 150000000));
        vm.deal(kol, 1 ether);
        registry.depositBond{value: 1 ether}();
        vm.expectRevert("NOT_FACTORY_PASS");
        factory.createKolAuction(address(fake), 99 ether, 120, "fake content");
        vm.stopPrank();
    }

    // 业务规则：KOL 同时只能进行一场拍卖——上一场未结算时创建新拍卖必须被拒
    function test_CreateKolAuction_BlockedWhileActive() public {
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000, block.timestamp + 1 hours, _signRegistration(kol, "elonmusk", 150000000));
        vm.deal(kol, 1 ether);
        registry.depositBond{value: 1 ether}();
        address pass = factory.createKolPass(13.39 ether);
        factory.createKolAuction(pass, 99 ether, 120, "1v1 live chat 30min");  // 第 1 场，未 settle
        // 上一场未结算 → 拒绝创建第 2 场
        vm.expectRevert("ACTIVE_AUCTION_EXISTS");
        factory.createKolAuction(pass, 99 ether, 120, "second auction");
        vm.stopPrank();
    }

    // 业务规则（SP-2 P0 修复）：settle 后拍卖进入履约流程，计数/押金闸门未释放——
    // KOL 不得在完成履约前创建下一场拍卖；仅 COMPLETED / REFUNDED 终态才可开启下一场。
    function test_CreateKolAuction_BlockedUntilCompleted() public {
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000, block.timestamp + 1 hours, _signRegistration(kol, "elonmusk", 150000000));
        vm.deal(kol, 1 ether);
        registry.depositBond{value: 1 ether}();
        address pass = factory.createKolPass(13.39 ether);
        address a1 = factory.createKolAuction(pass, 99 ether, 120, "1v1 live chat 30min");
        vm.stopPrank();
        // winner 出价（有出价 → settle 进入 SETTLED 履约流程，计数保持锁定）
        address winner = address(0x1234);
        vm.deal(winner, 1000 ether);
        vm.startPrank(winner);
        KolPass(pass).mint{value: 13.39 ether * 108 / 100}(1);
        KolAuction(payable(a1)).placeBid{value: 99 ether}();
        vm.stopPrank();
        vm.warp(block.timestamp + 200);
        vm.prank(kol);
        KolAuction(payable(a1)).settle();
        assertEq(uint256(KolAuction(payable(a1)).getAuction().status), uint256(KolAuction.AuctionStatus.SETTLED));
        assertEq(registry.openAuctionCount(kol), 1);
        // settle 后计数未释放 → 创建第 2 场必须被拒
        vm.prank(kol);
        vm.expectRevert("ACTIVE_AUCTION_EXISTS");
        factory.createKolAuction(pass, 99 ether, 120, "second auction");
        // 完成履约（KOL 提交 + winner 确认）→ COMPLETED 终态 → 可创建第 2 场
        vm.prank(kol);
        KolAuction(payable(a1)).submitFulfillment(bytes32(uint256(0xABC)));
        vm.prank(winner);
        KolAuction(payable(a1)).confirmFulfillment();
        assertEq(uint256(KolAuction(payable(a1)).getAuction().status), uint256(KolAuction.AuctionStatus.COMPLETED));
        assertEq(registry.openAuctionCount(kol), 0);
        vm.prank(kol);
        address a2 = factory.createKolAuction(pass, 99 ether, 120, "second auction");
        assertTrue(a2 != address(0));
        assertEq(registry.getKol(kol).auctionContracts.length, 2);
    }

    // 业务规则对偶：违约退款（REFUNDED）终态释放计数闸门；但违约 KOL 被罚没+封禁，
    // 需 owner 解封并重新质押后才能创建下一场（防违约者立即再开新拍卖）
    function test_CreateKolAuction_BlockedAfterBreach_UntilUnbanned() public {
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000, block.timestamp + 1 hours, _signRegistration(kol, "elonmusk", 150000000));
        vm.deal(kol, 1 ether);
        registry.depositBond{value: 1 ether}();
        address pass = factory.createKolPass(13.39 ether);
        address a1 = factory.createKolAuction(pass, 99 ether, 120, "1v1 live chat 30min");
        vm.stopPrank();
        address winner = address(0x1234);
        vm.deal(winner, 1000 ether);
        vm.startPrank(winner);
        KolPass(pass).mint{value: 13.39 ether * 108 / 100}(1);
        KolAuction(payable(a1)).placeBid{value: 99 ether}();
        vm.stopPrank();
        vm.warp(block.timestamp + 200);
        vm.prank(kol);
        KolAuction(payable(a1)).settle();
        // KOL 超时未履约 → 竞拍者触发违约结算（REFUNDED）
        vm.warp(block.timestamp + 48 hours + 1);
        vm.prank(winner);
        KolAuction(payable(a1)).claimRefund();
        assertEq(uint256(KolAuction(payable(a1)).getAuction().status), uint256(KolAuction.AuctionStatus.REFUNDED));
        assertEq(registry.openAuctionCount(kol), 0);   // 计数闸门已释放
        assertFalse(registry.canCreate(kol));            // 但违约 KOL 已被封禁冻结
        vm.prank(kol);
        vm.expectRevert("!CAN_CREATE");
        factory.createKolAuction(pass, 99 ether, 120, "second auction");
        // owner 解封 + 重新质押后可创建下一场
        registry.setBanned(kol, false);
        vm.startPrank(kol);
        vm.deal(kol, 1 ether);
        registry.depositBond{value: 1 ether}();
        address a2 = factory.createKolAuction(pass, 99 ether, 120, "second auction");
        assertTrue(a2 != address(0));
        vm.stopPrank();
    }

    // 审计回归（D6）：Factory 构造拒绝零 registry / 零 treasury
    function test_Constructor_RejectsBadArgs() public {
        vm.expectRevert(bytes("ZERO_REGISTRY"));
        new NadbidFactory(address(0), address(0xCAFE), 99 ether);
        vm.expectRevert(bytes("ZERO_TREASURY"));
        new NadbidFactory(address(registry), address(0), 99 ether);
    }
}

// 模拟攻击者伪造的 PASS：kol() 返回攻击者，但 factory() 不是本 NadbidFactory
contract FakePass {
    address public kol;
    address public factory = address(0xDEAD);
    constructor(address _kol) { kol = _kol; }
}