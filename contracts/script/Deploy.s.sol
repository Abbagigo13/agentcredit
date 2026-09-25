// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentCredit.sol";

contract Deploy is Script {
    function run() external returns (AgentCredit) {
        vm.startBroadcast();

        AgentCredit agentCredit = new AgentCredit();

        vm.stopBroadcast();

        return agentCredit;
    }
}