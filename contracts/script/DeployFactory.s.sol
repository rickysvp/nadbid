// contracts/script/DeployFactory.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {NadbidRegistry} from "../src/NadbidRegistry.sol";
import {NadbidFactory} from "../src/NadbidFactory.sol";

/// @notice 仅替换 NadbidFactory（保留现有 Registry 数据）：
/// 部署新 Factory → registry.setFactory(newFactory)（需 registry.owner 调用）。
/// 用于合约升级（如新增 createKolAuctionScheduled）而不清空 KOL 注册/质押数据。
contract DeployFactory is Script {
    function run() external {
        address registryAddr = vm.envAddress("REGISTRY_ADDRESS");
        address platformTreasury = vm.envAddress("PLATFORM_TREASURY");
        vm.startBroadcast();
        NadbidFactory factory = new NadbidFactory(registryAddr, platformTreasury);
        NadbidRegistry(registryAddr).setFactory(address(factory));
        vm.stopBroadcast();
        console2.log("Registry (unchanged):", registryAddr);
        console2.log("Factory (new):", address(factory));
    }
}
