// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AgentCredit {
    struct TrustRecord {
        uint256 score;
        uint256 updatedAt;
        bool exists;
    }

    mapping(uint256 => TrustRecord) private trustRecords;

    event TrustScoreUpdated(
        uint256 indexed agentId,
        uint256 score,
        uint256 timestamp
    );

    function setTrustScore(
        uint256 agentId,
        uint256 score
    ) external {
        require(score <= 100, "Score must be 0-100");

        trustRecords[agentId] = TrustRecord({
            score: score,
            updatedAt: block.timestamp,
            exists: true
        });

        emit TrustScoreUpdated(
            agentId,
            score,
            block.timestamp
        );
    }

    function getTrustScore(
        uint256 agentId
    )
        external
        view
        returns (
            uint256 score,
            uint256 updatedAt,
            bool exists
        )
    {
        TrustRecord memory record = trustRecords[agentId];

        return (
            record.score,
            record.updatedAt,
            record.exists
        );
    }

    function meetsThreshold(
        uint256 agentId,
        uint256 threshold
    ) external view returns (bool) {
        require(threshold <= 100, "Threshold must be 0-100");

        return trustRecords[agentId].score >= threshold;
    }
}