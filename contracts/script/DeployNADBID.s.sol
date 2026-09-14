// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {NADBIDAuction} from "../src/NADBIDAuction.sol";

/// @notice Monad 测试网部署脚本
/// 用法：
///   forge script script/DeployNADBID.s.sol:DeployNADBID --rpc-url monad_testnet \
///     --private-key $PRIVATE_KEY --broadcast --disable-code-size-limit
/// @dev Monad 测试网 USDC（Circle 官方）：0x534b2f3A21130d7a60830c2Df862319e593943A3
contract DeployNADBID is Script {
    // 初始平台国库 = 部署者地址；部署后可用 setTreasury 更换
    address public constant MONAD_TESTNET_USDC = 0x534b2f3A21130d7a60830c2Df862319e593943A3;

    function run() external returns (NADBIDAuction auction) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        vm.startBroadcast(pk);
        auction = new NADBIDAuction(MONAD_TESTNET_USDC, deployer);
        vm.stopBroadcast();
        console2.log("NADBIDAuction deployed at:", address(auction));
        console2.log("bidToken (USDC testnet):", MONAD_TESTNET_USDC);
        console2.log("treasury (initial):", deployer);
    }
}
