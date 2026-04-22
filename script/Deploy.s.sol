// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/lottery.sol";

contract DeployLottery is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("OWNER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        Lottery lottery = new Lottery(0.00000001 ether); // ticket price
        console.log("Lottery deployed at:", address(lottery));

        vm.stopBroadcast();
    }
}