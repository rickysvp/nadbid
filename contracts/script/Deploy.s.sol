// contracts/script/Deploy.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {NadbidRegistry} from "../src/NadbidRegistry.sol";
import {NadbidFactory} from "../src/NadbidFactory.sol";

contract Deploy is Script {
    function run() external {
        address platformTreasury = vm.envAddress("PLATFORM_TREASURY");
        uint256 minFollowers = vm.envUint("MIN_FOLLOWERS"); // 测试网 1000，主网正式值
        address platformSigner = vm.envAddress("PLATFORM_SIGNER"); // registerKol 注册签名验签公钥
        address platformArbitrator = vm.envOr("PLATFORM_ARBITRATOR", platformSigner); // 争议仲裁角色（缺省=平台签名者）
        vm.startBroadcast();
        NadbidRegistry registry = new NadbidRegistry(minFollowers);
        NadbidFactory factory = new NadbidFactory(address(registry), platformTreasury, vm.envOr("FIXED_BID_AMOUNT", uint256(0.1 ether)));
        registry.setFactory(address(factory));
        registry.setPlatformSigner(platformSigner);
        registry.setArbitrator(platformArbitrator);
        vm.stopBroadcast();
        console2.log("Registry:", address(registry));
        console2.log("Factory:", address(factory));
        console2.log("PlatformSigner:", platformSigner);
        console2.log("Arbitrator:", platformArbitrator);
        console2.log("MIN_FOLLOWERS:", minFollowers);
    }
}
