// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentCredit.sol";

contract DeployAgentCredit is Script {
    // ERC-8004 Identity Registry on Monad testnet
    address constant IDENTITY_REGISTRY = 0x8004A818BFB912233c491871b3d84c89A494BD9e;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerKey);

        AgentCredit credit = new AgentCredit();
        credit.setIdentityRegistry(IDENTITY_REGISTRY);

        vm.stopBroadcast();

        console.log("AgentCredit deployed at:", address(credit));
        console.log("Owner:", credit.owner());
    }
}
