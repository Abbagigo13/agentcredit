// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentCredit.sol";

contract MockRegistry {
    mapping(uint256 => address) private owners;

    function register(uint256 id, address who) external {
        owners[id] = who;
    }

    function ownerOf(uint256 id) external view returns (address) {
        address who = owners[id];
        require(who != address(0), "nonexistent token");
        return who;
    }
}

contract AgentCreditFullTest is Test {
    AgentCredit credit;
    MockRegistry registry;
    address stranger = address(0xBAD);
    address newOwner = address(0xB0B);

    function setUp() public {
        credit = new AgentCredit();
        registry = new MockRegistry();
    }

    function testRecordAnalysisStoresEverything() public {
        bytes32 h = keccak256("evidence");
        credit.recordAnalysis(7, 52, 20, h);

        AgentCredit.TrustRecord memory r = credit.getTrustRecord(7);
        assertEq(r.score, 52);
        assertEq(r.coverage, 20);
        assertEq(r.attester, address(this));
        assertEq(r.evidenceHash, h);
        assertEq(r.updateCount, 1);
        assertTrue(r.exists);

        credit.recordAnalysis(7, 60, 40, h);
        assertEq(credit.getTrustRecord(7).updateCount, 2);
    }

    function testCoverageAbove100Reverts() public {
        vm.expectRevert(bytes("Coverage must be 0-100"));
        credit.recordAnalysis(1, 50, 101, bytes32(0));
    }

    function testRegistryBlocksUnregisteredAgents() public {
        credit.setIdentityRegistry(address(registry));

        vm.expectRevert(bytes("Agent not registered"));
        credit.setTrustScore(5, 60);

        registry.register(5, address(0x1234));
        credit.setTrustScore(5, 60);

        (, , bool exists) = credit.getTrustScore(5);
        assertTrue(exists);
    }

    function testRegistryMustBeContract() public {
        vm.expectRevert(bytes("Registry is not a contract"));
        credit.setIdentityRegistry(address(0x1234));
    }

        function testMeetsThresholdFalseForUnknownAgent() public view {
        assertFalse(credit.meetsThreshold(99, 0));
    }

    function testIsTrustedChecksScoreCoverageAndAge() public {
        credit.recordAnalysis(1, 80, 60, bytes32(0));

        assertTrue(credit.isTrusted(1, 70, 0, 50));
        assertFalse(credit.isTrusted(1, 90, 0, 0));
        assertFalse(credit.isTrusted(1, 70, 0, 70));

        vm.warp(block.timestamp + 2 days);
        assertFalse(credit.isTrusted(1, 70, 1 days, 0));
        assertTrue(credit.isTrusted(1, 70, 3 days, 0));

        assertFalse(credit.isTrusted(2, 0, 0, 0));
    }

    function testTrustLevels() public {
        credit.setTrustScore(1, 90);
        credit.setTrustScore(2, 75);
        credit.setTrustScore(3, 60);
        credit.setTrustScore(4, 40);
        credit.setTrustScore(5, 10);

        assertEq(credit.getTrustLevel(1), "Highly Trusted");
        assertEq(credit.getTrustLevel(2), "Trusted");
        assertEq(credit.getTrustLevel(3), "Moderate");
        assertEq(credit.getTrustLevel(4), "Low Trust");
        assertEq(credit.getTrustLevel(5), "Untrusted");
        assertEq(credit.getTrustLevel(6), "Unknown");
    }

    function testPauseBlocksWritesButNotReads() public {
        credit.setTrustScore(1, 50);
        credit.pause();

        vm.expectRevert(bytes("Paused"));
        credit.setTrustScore(2, 50);

        (uint256 score, , ) = credit.getTrustScore(1);
        assertEq(score, 50);

        credit.unpause();
        credit.setTrustScore(2, 50);
    }

    function testRemoveRecordKeepsEnumerationConsistent() public {
        credit.setTrustScore(10, 50);
        credit.setTrustScore(20, 60);
        credit.setTrustScore(30, 70);

        credit.removeTrustRecord(10);

        assertEq(credit.scoredAgentCount(), 2);
        uint256[] memory ids = credit.getScoredAgents(0, 10);
        assertEq(ids.length, 2);
        assertEq(ids[0], 30);
        assertEq(ids[1], 20);

        (, , bool exists) = credit.getTrustScore(10);
        assertFalse(exists);
    }

    function testBatchSetsScoresAndChecksLengths() public {
        uint256[] memory ids = new uint256[](3);
        uint256[] memory scores = new uint256[](3);
        ids[0] = 1; ids[1] = 2; ids[2] = 3;
        scores[0] = 50; scores[1] = 60; scores[2] = 70;

        credit.setTrustScoresBatch(ids, scores);
        assertEq(credit.scoredAgentCount(), 3);

        uint256[] memory shortScores = new uint256[](2);
        vm.expectRevert(bytes("Length mismatch"));
        credit.setTrustScoresBatch(ids, shortScores);
    }

    function testTwoStepOwnershipTransfer() public {
        credit.transferOwnership(newOwner);
        assertEq(credit.owner(), address(this));

        vm.prank(stranger);
        vm.expectRevert(bytes("Not pending owner"));
        credit.acceptOwnership();

        vm.prank(newOwner);
        credit.acceptOwnership();

        assertEq(credit.owner(), newOwner);
        assertEq(credit.pendingOwner(), address(0));
    }

    function testOnlyOwnerAdminFunctions() public {
        credit.setTrustScore(1, 50);

        vm.prank(stranger);
        vm.expectRevert(bytes("Not owner"));
        credit.removeTrustRecord(1);

        vm.prank(stranger);
        vm.expectRevert(bytes("Not owner"));
        credit.pause();
    }
}
