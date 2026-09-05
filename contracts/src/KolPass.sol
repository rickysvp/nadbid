// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract KolPass is ERC721Enumerable, ReentrancyGuard {
    address public kol;
    address public platformTreasury;
    address public factory;          // 签发本 PASS 的 NadbidFactory（createKolAuction 校验合法 passContract）
    uint256 public baseSupply = 1000;
    uint256 public exponent = 2;
    uint256 public basePrice;
    // 审计修复（D5）：单笔 mint 数量上限与总供应上限——防止超大 quantity 循环
    // gas 爆炸（用户损失 gas）以及供应量过大后价格乘法溢出 revert 导致 mint 永久失败。
    // 曲线定价 basePrice * supply² 在 supply <= MAX_SUPPLY 且 basePrice 有界时无溢出。
    uint256 public constant MAX_MINT_QUANTITY = 50;
    uint256 public constant MAX_SUPPLY = 100_000; // 100× baseSupply，远超单 KOL 实际 PASS 需求
    // 审计修复（D6）：basePrice 上限（1,000,000 MON），防误传巨大值导致曲线价溢出。
    uint256 public constant MAX_BASE_PRICE = 1_000_000 ether;
    /// tokenId 分配器：单调递增、永不回退（burn 后不递减）。
    /// 修复前用 totalMinted 同时表示"存活供应量"与"下一个 tokenId"，
    /// burn 后 totalMinted 回退会重新生成已存在 tokenId，导致后续 mint 永久 revert。
    /// 现在 tokenId 分配与曲线定价解耦：tokenId 由 nextTokenId 分配，
    /// 曲线按 ERC721Enumerable.totalSupply()（存活量）定价。
    uint256 public nextTokenId;
    uint256 public feeKOL = 5;       // 5%
    uint256 public feePlatform = 3;  // 3%
    uint256 public constant FEE_DENOM = 100;

    // Pull 模式手续费（F5）：mint/burn 只记账、不转账——KOL 收款地址不可控
    // （合约钱包/拒收地址）不再阻塞任何用户的 mint/burn；KOL 随时自行 claim。
    // 平台手续费仍 Push：platformTreasury 为平台自控地址，无拒收风险。
    mapping(address => uint256) public pendingKolFees;

    event KolFeesClaimed(address indexed kol, uint256 amount);

    struct CurveConfig { uint256 basePrice; uint256 baseSupply; uint256 exponent; }

    constructor(address _kol, uint256 _basePrice, address _platformTreasury, address _factory)
        ERC721(string.concat("Nadbid-", _toString(address(this))), "NPASS")
    {
        // 审计修复（D6）：构造零地址 / 参数范围校验——防部署出不可用或价格溢出的 PASS
        require(_kol != address(0), "ZERO_KOL");
        require(_basePrice > 0 && _basePrice <= MAX_BASE_PRICE, "BAD_BASE_PRICE");
        require(_platformTreasury != address(0), "ZERO_TREASURY");
        require(_factory != address(0), "ZERO_FACTORY");
        kol = _kol;
        basePrice = _basePrice;
        platformTreasury = _platformTreasury;
        factory = _factory;
    }

    // price(supply) = basePrice * (supply / baseSupply)^2
    // curvePrice() 返回「下一枚的实际成本」，即 curvePriceAt(totalSupply() + 1)。
    // 定价基于存活供应量（ERC721Enumerable.totalSupply()，burn 后自动递减）——
    // 联合曲线随存活量上下浮动，burn 回购套利语义正确。
    function curvePrice() public view returns (uint256) {
        return curvePriceAt(totalSupply() + 1);
    }

    function curvePriceAt(uint256 nextSupply) public view returns (uint256) {
        if (nextSupply == 0) return 0;
        return basePrice * nextSupply * nextSupply / (baseSupply * baseSupply);
    }

    // 审计修复（P1-1）：nonReentrant 阻断 _safeMint 接收回调重入 mint。
    // 修复前：恶意接收合约可在 onERC721Received 中重入 mint()，推进 nextTokenId，
    // 使外层 tokenIds 返回值与实际铸造 token 错位、快照计费与实际铸造序列不一致。
    function mint(uint256 quantity) external payable nonReentrant returns (uint256[] memory tokenIds) {
        require(quantity > 0, "ZERO_QTY");
        // 审计修复（D5）：单笔上限 + 总供应上限（gas 保护 / 溢出保护）
        require(quantity <= MAX_MINT_QUANTITY, "QTY_TOO_LARGE");
        require(totalSupply() + quantity <= MAX_SUPPLY, "SUPPLY_CAP");
        tokenIds = new uint256[](quantity);
        uint256 totalCost = 0;
        uint256 supply = totalSupply(); // 存活供应量（burn 后递减，曲线定价基准）
        for (uint256 i = 0; i < quantity; i++) {
            uint256 nextSupply = supply + i + 1;
            totalCost += curvePriceAt(nextSupply);
        }
        uint256 fee = totalCost * (feeKOL + feePlatform) / FEE_DENOM;
        uint256 pay = totalCost + fee;
        require(msg.value >= pay, "INSUFFICIENT");
        // CEI：先更新供应量（重入 mint 会读到新 supply，按新价格计费，防止陈旧价格套利）
        for (uint256 i = 0; i < quantity; i++) {
            nextTokenId++; // 单调递增，burn 后绝不回退（修复 burn 后 mint 永久失败的 P0）
            uint256 tid = nextTokenId; // 局部保存：回调返回后本次返回值不受任何重入影响
            _safeMint(msg.sender, tid);
            tokenIds[i] = tid;
        }
        // 手续费拆分（F5）：KOL 份额记账（Pull，claimKolFees 领取），平台份额即时转出（Push，地址自控）
        uint256 kolFee = totalCost * feeKOL / FEE_DENOM;
        uint256 platformFee = totalCost * feePlatform / FEE_DENOM;
        pendingKolFees[kol] += kolFee;
        (bool ok2, ) = payable(platformTreasury).call{value: platformFee}("");
        require(ok2, "PLATFORM_FEE_FAIL");
        // 退多余
        if (msg.value > pay) {
            (bool ok3, ) = payable(msg.sender).call{value: msg.value - pay}("");
            require(ok3, "REFUND_FAIL");
        }
        return tokenIds;
    }

    function burn(uint256[] calldata tokenIds) external {
        uint256 refund = 0;
        // 与 mint 严格镜像：mint 第 k 枚成本 = curvePriceAt(k)（k 从 1 起，存活供应从 0→N）
        // burn 第 k 枚返还 = curvePriceAt(N - k + 1)（k 从 1 起，存活供应从 N→0）
        // 即 supplyAfterBurn 从 N-1 递减到 0 时，对应返还 curvePriceAt(1) 而非 basePrice，
        // 因此内部供应索引 iSupply 从 totalSupply() 递减到 1，永不取 0（避免 curvePriceAt(0)=basePrice 套利）。
        uint256 total = totalSupply(); // 存活量；totalSupply() 由 ERC721Enumerable 维护，burn 后自动递减
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(_ownerOf(tokenIds[i]) == msg.sender, "NOT_OWNER");
            uint256 iSupply = total - i; // total..1，不会降到 0（tokenIds.length <= totalSupply 由 NOT_OWNER 保证）
            refund += curvePriceAt(iSupply);
            _burn(tokenIds[i]);
        }
        // CEI：_burn 已同步维护 ERC721Enumerable 内部记账（_allTokens/_ownedTokens），
        // 重入 burn 会读到已扣减的 totalSupply()，按最新 supply 计算返还，阻断陈旧价格多退。
        // 扣 8% 手续费后返还（F5：KOL 份额记账 Pull，平台份额 Push）
        uint256 fee = refund * (feeKOL + feePlatform) / FEE_DENOM;
        uint256 net = refund - fee;
        uint256 kolFee = refund * feeKOL / FEE_DENOM;
        uint256 platformFee = refund * feePlatform / FEE_DENOM;
        pendingKolFees[kol] += kolFee;
        (bool ok2, ) = payable(platformTreasury).call{value: platformFee}("");
        require(ok2, "PLATFORM_FEE_FAIL");
        (bool ok3, ) = payable(msg.sender).call{value: net}("");
        require(ok3, "REFUND_FAIL");
    }

    /// @notice KOL 领取累计手续费（Pull 模式，F5）。仅 KOL 地址有余额，映射天然隔离，无需 onlyKol。
    function claimKolFees() external {
        uint256 amount = pendingKolFees[msg.sender];
        require(amount > 0, "NO_FEES");
        // CEI：先清零再转（防重入重复领取）
        pendingKolFees[msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "CLAIM_FAIL");
        emit KolFeesClaimed(msg.sender, amount);
    }

    // ===== Soulbound =====
    // OZ 5.3.0: 3-arg safeTransferFrom 非 virtual 不可 override；其内部调用 4-arg virtual 版本，
    // 由下方 4-arg override 统一 revert，等价阻断所有 transferFrom/safeTransferFrom 调用。
    function transferFrom(address, address, uint256) public override(ERC721, IERC721) { revert("SOULBOUND"); }
    function safeTransferFrom(address, address, uint256, bytes memory) public override(ERC721, IERC721) { revert("SOULBOUND"); }

    // totalSupply / tokenOfOwnerByIndex / tokenByIndex 由 ERC721Enumerable 提供
    // （burn 为联合曲线核心需求，前端需通过 tokenOfOwnerByIndex 枚举持有 token 以供选择）

    function getCurveConfig() external view returns (CurveConfig memory) {
        return CurveConfig({ basePrice: basePrice, baseSupply: baseSupply, exponent: exponent });
    }

    function _toString(address a) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint256 i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint160(a) >> (8 * (19 - i))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) % 16);
            s[2 * i] = char(hi);
            s[2 * i + 1] = char(lo);
        }
        return string(s);
    }
    function char(bytes1 b) internal pure returns (bytes1) {
        return bytes1(uint8(b) < 10 ? uint8(b) + 48 : uint8(b) + 87);
    }
}
