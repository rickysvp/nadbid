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

    /// 生成平台对 (wallet, handle, followers) 的注册签名（与合约 registerKol 验签一致）
    function _signRegistration(address wallet, string memory handle, uint256 followers)
        internal view returns (bytes memory)
    {
        bytes32 hash = keccak256(abi.encodePacked(wallet, handle, followers));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerSk, hash);
        return abi.encodePacked(r, s, v);
    }

    function test_RegisterKol() public {
        vm.prank(kol);
        registry.registerKol("elonmusk", 150000000, _signRegistration(kol, "elonmusk", 150000000));
        assertTrue(registry.isKolRegistered(kol));
    }

    function test_RegisterKol_RejectsBadSignature() public {
        // 无签名/错误签名 → 拒绝（防绕过前端伪造粉丝数）
        vm.prank(kol);
        vm.expectRevert();
        registry.registerKol("elonmusk", 150000000, hex"00");
    }

    function test_RegisterKol_RejectsLowFollowers() public {
        vm.prank(kol);
        vm.expectRevert();
        registry.registerKol("small", 999, _signRegistration(kol, "small", 999));
    }

    function test_DepositBond_RequiresExactAmount() public {
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000, _signRegistration(kol, "elonmusk", 150000000));
        vm.deal(kol, 20 ether);
        vm.expectRevert();
        registry.depositBond{value: 9 ether}();
        vm.stopPrank();
    }

    function test_BondRedeem_48hCooldown() public {
        vm.startPrank(kol);
        registry.registerKol("elonmusk", 150000000, _signRegistration(kol, "elonmusk", 150000000));
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
}
