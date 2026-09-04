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
        pass = new KolPass(kol, mintPrice, platform, address(0xAAAA));
    }

    function test_CurvePrice_AtBaseSupply() public view {
        // supply=0 时 curvePrice() 返回首枚实际成本 curvePriceAt(1)（非满额锚点 basePrice）
        assertEq(pass.curvePrice(), pass.curvePriceAt(1));
        // curvePriceAt(0) 返回 0（无供应时无成本，杜绝 basePrice 套利面）
        assertEq(pass.curvePriceAt(0), 0);
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
        uint256 beforePlatform = platform.balance;
        vm.prank(buyer);
        pass.mint{value: cost}(1);
        // F5 Pull：KOL 5% 记入 pendingKolFees（不再即时转账），平台 3% 仍即时到账
        assertEq(pass.pendingKolFees(kol), unit * 5 / 100);
        assertEq(platform.balance - beforePlatform, unit * 3 / 100);
    }

    // F5：KOL 领取累计手续费（Pull 模式）；重复领取 revert NO_FEES
    function test_ClaimKolFees() public {
        vm.deal(buyer, 100 ether);
        uint256 unit = pass.curvePriceAt(1);
        vm.prank(buyer);
        pass.mint{value: unit * 108 / 100}(1);
        uint256 expected = pass.pendingKolFees(kol);
        assertGt(expected, 0);
        uint256 beforeKol = kol.balance;
        vm.prank(kol);
        pass.claimKolFees();
        assertEq(kol.balance - beforeKol, expected);
        assertEq(pass.pendingKolFees(kol), 0);
        // 非 KOL 无余额可领
        vm.prank(buyer);
        vm.expectRevert();
        pass.claimKolFees();
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

// ===== 重入攻击测试合约 =====
// 持有 2 个 PASS，burn 第 1 个时在 receive 中重入 burn 第 2 个。
// 修复前（totalMinted 在外部调用后扣减）重入读到陈旧 supply，可多退；修复后 CEI 阻断。
contract ReentrantBurner {
    KolPass pass;
    uint256 public reentered;
    uint256 public lastBurnId;

    constructor(KolPass _pass) { pass = _pass; }

    // 允许 _safeMint 给本合约铸造 PASS
    function onERC721Received(address, address, uint256, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return this.onERC721Received.selector;
    }

    receive() external payable {
        if (reentered < 1 && lastBurnId > 0) {
            reentered++;
            // 重入 burn 另一个 token（比外层 id 大 1）
            uint256[] memory ids = new uint256[](1);
            ids[0] = lastBurnId + 1;
            pass.burn(ids);
        }
    }

    function attack(uint256[] calldata ids) external payable {
        lastBurnId = ids[0];
        pass.burn(ids);
    }
}

contract KolPassReentrancyTest is Test {
    KolPass pass;
    address kol = address(0xBEEF);
    address platform = address(0xCAFE);

    function setUp() public {
        pass = new KolPass(kol, 13.39 ether, platform, address(0xAAAA));
    }

    function test_Burn_Reentrancy_BlockedByCEI() public {
        ReentrantBurner burner = new ReentrantBurner(pass);
        vm.deal(address(burner), 1000 ether);
        // burner 自己 mint 2 个（msg.sender = burner）
        uint256 cost2 = pass.curvePriceAt(1) * 108 / 100 + pass.curvePriceAt(2) * 108 / 100;
        vm.prank(address(burner));
        uint256[] memory mintIds = pass.mint{value: cost2}(2);
        assertEq(pass.balanceOf(address(burner)), 2);

        // burn 1 个（id=1），触发 receive 重入 burn 另一个（id=2）
        // 期望重入路径按 CEI 后的新 supply 计价（token 2 按 curvePriceAt(1) 而非陈旧 curvePriceAt(2)）
        uint256[] memory ids = new uint256[](1);
        ids[0] = mintIds[0];
        uint256 before = address(burner).balance;
        vm.prank(address(burner));
        burner.attack(ids);
        uint256 netRefund = address(burner).balance - before;

        // 两个 token 都应已被 burn
        assertEq(pass.balanceOf(address(burner)), 0);
        assertEq(pass.totalSupply(), 0);
        // 验证重入确实发生（receive 被调用）
        assertGt(burner.reentered(), 0);
        // 关键断言：净退款 = (curvePriceAt(2) + curvePriceAt(1)) * 92%
        // 修复前（陈旧 supply 计价）会得到 curvePriceAt(2)*2 的多退，导致净退款显著偏高
        uint256 expected = (pass.curvePriceAt(2) + pass.curvePriceAt(1)) * 92 / 100;
        assertEq(netRefund, expected, "reentrant burn must price at updated supply (CEI)");
    }
}
