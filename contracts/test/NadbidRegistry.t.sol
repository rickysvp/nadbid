// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {NadbidRegistry} from "../src/NadbidRegistry.sol";

contract NadbidRegistryTest is Test {
    NadbidRegistry registry;
    address kol = address(0xBEEF);
    // 平台签名者（server 持有对应私钥，在 X 验证通过后签发注册签名）
    uint256 signerSk = 0xA11CE;
    address signer;

    function setUp() public {
        registry = new NadbidRegistry(1000);
        signer = vm.addr(signerSk);
        registry.setPlatformSigner(signer);
    }

    /// 生成平台对 (wallet, handle, followers, expiry) 的注册签名（与合约 registerKol 验签一致）
    function _signRegistration(address wallet, string memory handle, uint256 followers)
        internal view returns (bytes memory)
    {
        bytes32 hash = keccak256(abi.encodePacked(wallet, handle, followers, block.timestamp + 1 hours));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerSk, hash);
        return abi.encodePacked(r, s, v);
    }

    function test_RegisterKol() public {
        vm.prank(kol);
        registry.registerKol("elonmusk", 150000000, block.timestamp + 1 hours, _signRegistration(kol, "elonmusk", 150000000));
        assertTrue(registry.isKolRegistered(kol));
    }

    function test_RegisterKol_RejectsBadSignature() public {
        // 无签名/错误签名 → 拒绝（防绕过前端伪造粉丝数）
        vm.prank(kol);
        vm.expectRevert();
        registry.registerKol("elonmusk", 150000000, block.timestamp + 1 hours, hex"00");
    }

    function test_RegisterKol_RejectsLowFollowers() public {
        vm.prank(kol);
        vm.expectRevert();
        registry.registerKol("small", 999, block.timestamp + 1 hours, _signRegistration(kol, "small", 999));
    }

    function test_RegisterKol_RejectsExpiredSig() public {
        vm.prank(kol);
        vm.expectRevert();
        // 签名带已过期的 expiry → 拒绝（防签名永久有效被重放）
        registry.registerKol("elonmusk", 150000000, block.timestamp - 1, _signRegistration(kol, "elonmusk", 150000000));
    }

    // Codex 审计（纵深防御）回归：notifyAuctionClosed 必须由拍卖所属 KOL 回调。
    // 用其他 KOL 地址回调必须 revert（KOL_MISMATCH），防止误登记/升级后恶意合约
    // 传他人 kol 把 openAuctionCount 误减成负数。
    function test_NotifySettled_KolMismatch() public {
        address kolB = address(0xCAFE);
        // 登记 kolA（=kol）与 kolB
        registry.setFactory(address(this));
        vm.startPrank(kol);
        registry.registerKol("kolA", 150000000, block.timestamp + 1 hours, _signRegistration(kol, "kolA", 150000000));
        vm.stopPrank();
        vm.startPrank(kolB);
        registry.registerKol("kolB", 150000000, block.timestamp + 1 hours, _signRegistration(kolB, "kolB", 150000000));
        vm.stopPrank();
        // 登记一场属于 kol 的拍卖（msg.sender 必须是 factory = 测试合约）
        address auction = address(0xA11CE);
        registry.addAuctionContract(kol, auction);
        assertEq(registry.openAuctionCount(kol), 1);
        // 用 kolB 回调同一拍卖 → 必须 revert
        vm.prank(auction);
        vm.expectRevert(bytes("KOL_MISMATCH"));
        registry.notifyAuctionClosed(kolB);
        // 正确 KOL 回调 → 计数减一
        vm.prank(auction);
        registry.notifyAuctionClosed(kol);
        assertEq(registry.openAuctionCount(kol), 0);
    }

    function test_DepositBond_RequiresExactAmount() public {
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000, block.timestamp + 1 hours, _signRegistration(kol, "elonmusk", 150000000));
        vm.deal(kol, 20 ether);
        vm.expectRevert();
        registry.depositBond{value: 9 ether}();
        vm.stopPrank();
    }

    function test_BondRedeem_48hCooldown() public {
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000, block.timestamp + 1 hours, _signRegistration(kol, "elonmusk", 150000000));
        vm.deal(kol, 1 ether);
        registry.depositBond{value: 1 ether}();
        registry.requestBondRedeem();
        vm.expectRevert();
        registry.finalizeBondRedeem();  // 未满 48h
        vm.warp(block.timestamp + 48 hours + 1);
        registry.finalizeBondRedeem();
        assertEq(kol.balance, 1 ether);
        vm.stopPrank();
    }

    // 审计回归（D4）：setBanned 必须同步写结构体 banned 字段（getKol().banned）
    function test_SetBanned_SyncsStructField() public {
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000, block.timestamp + 1 hours, _signRegistration(kol, "elonmusk", 150000000));
        vm.stopPrank();
        assertFalse(registry.getKol(kol).banned);
        registry.setBanned(kol, true);
        assertTrue(registry.getKol(kol).banned);
        assertTrue(registry.isKolBanned(kol));
        assertFalse(registry.canCreate(kol));
        registry.setBanned(kol, false);
        assertFalse(registry.getKol(kol).banned);
    }

    // 审计回归（D6）：构造拒绝 0 粉丝门槛
    function test_Constructor_RejectsZeroMinFollowers() public {
        vm.expectRevert(bytes("ZERO_MIN_FOLLOWERS"));
        new NadbidRegistry(0);
    }
}
