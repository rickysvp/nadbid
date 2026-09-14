// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/// @title NADBIDTestNFT — Monad 测试网测试 NFT
/// @notice owner 可任意 mint 给指定地址，用于跑通 NADBID 拍卖流程。
contract NADBIDTestNFT is ERC721 {
    uint256 public nextId = 1;

    constructor() ERC721("NADBID Test NFT", "NADBIDNFT") {}

    /// @notice mint 一枚给 to，返回 tokenId
    function mintTo(address to) external returns (uint256) {
        uint256 id = nextId++;
        _mint(to, id);
        return id;
    }
}

/// @title NADBIDTestWBTC — Monad 测试网测试 ERC-20（6 位小数，模拟 WBTC）
contract NADBIDTestWBTC is ERC20 {
    uint8 public constant DECIMALS = 6;

    constructor() ERC20("NADBID Test WBTC", "tWBTC") {}

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /// @notice mint 指定数量（6 位小数，amount 为最小单位）给 to
    function mintTo(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
