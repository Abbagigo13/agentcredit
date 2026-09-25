// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentCredit.sol";

contract AgentCreditTest is Test {
    AgentCredit agentCredit;

    function setUp() public {
        agentCredit = new AgentCredit();
    }

    function testSetAndGetTrustScore() public {
        agentCredit.setTrustScore(1, 91);

        (
            uint256 score,
            uint256 updatedAt,
            bool exists
        ) = agentCredit.getTrustScore(1);

        assertEq(score, 91);
        assertGt(updatedAt, 0);
        assertTrue(exists);
    }

    function testThreshold() public {
        agentCredit.setTrustScore(1, 91);

        assertTrue(agentCredit.meetsThreshold(1, 70));
        assertFalse(agentCredit.meetsThreshold(1, 95));
    }

    function testCannotSetScoreAbove100() public {
        vm.expectRevert("Score must be 0-100");

        agentCredit.setTrustScore(1, 101);
    }
}