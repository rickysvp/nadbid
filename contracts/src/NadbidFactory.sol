// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {NadbidRegistry} from "./NadbidRegistry.sol";
import {KolPass} from "./KolPass.sol";
import {KolAuction} from "./KolAuction.sol";

contract NadbidFactory {
    NadbidRegistry public registry;
    address public platformTreasury;

    event KolPassCreated(address indexed kol, address passContract, uint256 mintPrice);
    event KolAuctionCreated(address indexed kol, address auctionContract, address passContract, uint256 fixedBidAmount);

    constructor(address _registry, address _platformTreasury) {
        registry = NadbidRegistry(_registry);
        platformTreasury = _platformTreasury;
    }

    function createKolPass(uint256 mintPrice) external returns (address) {
        require(registry.canCreate(msg.sender), "!CAN_CREATE");
        require(mintPrice > 0, "ZERO_PRICE");
        KolPass pass = new KolPass(msg.sender, mintPrice, platformTreasury, address(this));
        registry.addPassContract(msg.sender, address(pass));
        emit KolPassCreated(msg.sender, address(pass), mintPrice);
        return address(pass);
    }

    function createKolAuction(
        address passContract,
        uint256 fixedBidAmount,
        uint256 duration,
        string calldata content
    ) external returns (address) {
        require(registry.canCreate(msg.sender), "!CAN_CREATE");
        // 只允许使用本 Factory 签发的 PASS 合约（防伪造 passContract 绕过持 PASS 门槛）
        require(KolPass(passContract).factory() == address(this), "NOT_FACTORY_PASS");
        require(KolPass(passContract).kol() == msg.sender, "NOT_OWN_PASS");
        require(fixedBidAmount > 0, "ZERO_BID");
        require(duration > 0, "ZERO_DURATION");
        KolAuction auction = new KolAuction(msg.sender, passContract, fixedBidAmount, duration, content, platformTreasury, address(registry));
        registry.addAuctionContract(msg.sender, address(auction));
        emit KolAuctionCreated(msg.sender, address(auction), passContract, fixedBidAmount);
        return address(auction);
    }
}
