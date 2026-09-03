// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract KolPass is ERC721 {
    address public kol;
    address public platformTreasury;
    uint256 public baseSupply = 1000;
    uint256 public exponent = 2;
    uint256 public basePrice;
    uint256 public totalMinted;
    uint256 public feeKOL = 5;       // 5%
    uint256 public feePlatform = 3;  // 3%
    uint256 public constant FEE_DENOM = 100;

    struct CurveConfig { uint256 basePrice; uint256 baseSupply; uint256 exponent; }

    mapping(uint256 => uint256) public curveSupplyCache; // 预留（如需要）

    constructor(address _kol, uint256 _basePrice, address _platformTreasury)
        ERC721(string.concat("Nadbid-", _toString(address(this))), "NPASS")
    {
        kol = _kol;
        basePrice = _basePrice;
        platformTreasury = _platformTreasury;
    }

    // price(supply) = basePrice * (supply / baseSupply)^2
    function curvePrice() public view returns (uint256) {
        uint256 supply = totalMinted;
        if (supply == 0) return basePrice;
        return basePrice * supply * supply / (baseSupply * baseSupply);
    }

    function curvePriceAt(uint256 nextSupply) public view returns (uint256) {
        if (nextSupply == 0) return basePrice;
        return basePrice * nextSupply * nextSupply / (baseSupply * baseSupply);
    }

    function mint(uint256 quantity) external payable returns (uint256[] memory tokenIds) {
        require(quantity > 0, "ZERO_QTY");
        tokenIds = new uint256[](quantity);
        uint256 totalCost = 0;
        for (uint256 i = 0; i < quantity; i++) {
            uint256 nextSupply = totalMinted + i + 1;
            totalCost += curvePriceAt(nextSupply);
        }
        uint256 fee = totalCost * (feeKOL + feePlatform) / FEE_DENOM;
        uint256 pay = totalCost + fee;
        require(msg.value >= pay, "INSUFFICIENT");
        // 拆分手续费
        uint256 kolFee = totalCost * feeKOL / FEE_DENOM;
        uint256 platformFee = totalCost * feePlatform / FEE_DENOM;
        (bool ok1, ) = payable(kol).call{value: kolFee}("");
        require(ok1, "KOL_FEE_FAIL");
        (bool ok2, ) = payable(platformTreasury).call{value: platformFee}("");
        require(ok2, "PLATFORM_FEE_FAIL");
        // 退多余
        if (msg.value > pay) {
            (bool ok3, ) = payable(msg.sender).call{value: msg.value - pay}("");
            require(ok3, "REFUND_FAIL");
        }
        for (uint256 i = 0; i < quantity; i++) {
            totalMinted++;
            _safeMint(msg.sender, totalMinted);
            tokenIds[i] = totalMinted;
        }
        return tokenIds;
    }

    function burn(uint256[] calldata tokenIds) external {
        uint256 refund = 0;
        // 与 mint 严格镜像：mint 第 k 枚成本 = curvePriceAt(k)（k 从 1 起，总供应从 0→N）
        // burn 第 k 枚返还 = curvePriceAt(N - k + 1)（k 从 1 起，总供应从 N→0）
        // 即 supplyAfterBurn 从 N-1 递减到 0 时，对应返还 curvePriceAt(1) 而非 basePrice，
        // 因此内部供应索引 iSupply 从 totalMinted 递减到 1，永不取 0（避免 curvePriceAt(0)=basePrice 套利）。
        uint256 total = totalMinted;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(_ownerOf(tokenIds[i]) == msg.sender, "NOT_OWNER");
            uint256 iSupply = total - i; // total..1，不会降到 0（tokenIds.length <= totalMinted 由 NOT_OWNER 保证）
            refund += curvePriceAt(iSupply);
            _burn(tokenIds[i]);
        }
        // 扣 8% 手续费后返还
        uint256 fee = refund * (feeKOL + feePlatform) / FEE_DENOM;
        uint256 net = refund - fee;
        uint256 kolFee = refund * feeKOL / FEE_DENOM;
        uint256 platformFee = refund * feePlatform / FEE_DENOM;
        (bool ok1, ) = payable(kol).call{value: kolFee}("");
        require(ok1, "KOL_FEE_FAIL");
        (bool ok2, ) = payable(platformTreasury).call{value: platformFee}("");
        require(ok2, "PLATFORM_FEE_FAIL");
        (bool ok3, ) = payable(msg.sender).call{value: net}("");
        require(ok3, "REFUND_FAIL");
        totalMinted = totalMinted - tokenIds.length;
    }

    // ===== Soulbound =====
    // OZ 5.3.0: 3-arg safeTransferFrom 非 virtual 不可 override；其内部调用 4-arg virtual 版本，
    // 由下方 4-arg override 统一 revert，等价阻断所有 transferFrom/safeTransferFrom 调用。
    function transferFrom(address, address, uint256) public override { revert("SOULBOUND"); }
    function safeTransferFrom(address, address, uint256, bytes memory) public override { revert("SOULBOUND"); }

    function totalSupply() public view returns (uint256) {
        return totalMinted;
    }

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
