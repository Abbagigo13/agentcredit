// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IIdentityRegistry {
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract AgentCredit {
    struct TrustRecord {
        uint256 score;
        uint256 updatedAt;
        bool exists;
        uint256 coverage; // % of the scoring model backed by evidence (0 = not reported)
        address attester;
        bytes32 evidenceHash;
        uint256 updateCount;
    }

    uint256 public constant MAX_BATCH = 50;

    mapping(uint256 => TrustRecord) private trustRecords;
    mapping(address => bool) public attesters;

    address public owner;
    address public pendingOwner;
    bool public paused;
    address public identityRegistry;

    uint256[] private scoredAgents;
    mapping(uint256 => uint256) private scoredIndex; // position + 1

    event TrustScoreUpdated(uint256 indexed agentId, uint256 score, uint256 timestamp);
    event AnalysisRecorded(
        uint256 indexed agentId,
        address indexed attester,
        uint256 coverage,
        bytes32 evidenceHash
    );
    event TrustRecordRemoved(uint256 indexed agentId);
    event AttesterUpdated(address indexed attester, bool allowed);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PausedStateChanged(bool paused);
    event IdentityRegistryUpdated(address indexed registry);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAttester() {
        require(attesters[msg.sender], "Not an attester");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }

    constructor() {
        owner = msg.sender;
        attesters[msg.sender] = true;
        emit AttesterUpdated(msg.sender, true);
    }

    // ---------------------------------------------------------------
    // Writing scores
    // ---------------------------------------------------------------

    function setTrustScore(uint256 agentId, uint256 score)
        external
        onlyAttester
        whenNotPaused
    {
        _record(agentId, score, 0, bytes32(0));
    }

    function recordAnalysis(
        uint256 agentId,
        uint256 score,
        uint256 coverage,
        bytes32 evidenceHash
    ) external onlyAttester whenNotPaused {
        require(coverage <= 100, "Coverage must be 0-100");
        _record(agentId, score, coverage, evidenceHash);
        emit AnalysisRecorded(agentId, msg.sender, coverage, evidenceHash);
    }

    function setTrustScoresBatch(
        uint256[] calldata agentIds,
        uint256[] calldata scores
    ) external onlyAttester whenNotPaused {
        require(agentIds.length == scores.length, "Length mismatch");
        require(agentIds.length > 0 && agentIds.length <= MAX_BATCH, "Bad batch size");

        for (uint256 i = 0; i < agentIds.length; i++) {
            _record(agentIds[i], scores[i], 0, bytes32(0));
        }
    }

    function removeTrustRecord(uint256 agentId) external onlyOwner {
        require(trustRecords[agentId].exists, "No record");

        uint256 position = scoredIndex[agentId]; // 1-based
        uint256 lastPosition = scoredAgents.length;

        if (position != lastPosition) {
            uint256 lastAgentId = scoredAgents[lastPosition - 1];
            scoredAgents[position - 1] = lastAgentId;
            scoredIndex[lastAgentId] = position;
        }

        scoredAgents.pop();
        delete scoredIndex[agentId];
        delete trustRecords[agentId];

        emit TrustRecordRemoved(agentId);
    }

    // ---------------------------------------------------------------
    // Reading
    // ---------------------------------------------------------------

    function getTrustScore(uint256 agentId)
        external
        view
        returns (uint256 score, uint256 updatedAt, bool exists)
    {
        TrustRecord memory record = trustRecords[agentId];
        return (record.score, record.updatedAt, record.exists);
    }

    function getTrustRecord(uint256 agentId)
        external
        view
        returns (TrustRecord memory)
    {
        return trustRecords[agentId];
    }

    function getTrustLevel(uint256 agentId) external view returns (string memory) {
        TrustRecord storage record = trustRecords[agentId];

        if (!record.exists) return "Unknown";
        if (record.score >= 80) return "Highly Trusted";
        if (record.score >= 70) return "Trusted";
        if (record.score >= 50) return "Moderate";
        if (record.score >= 30) return "Low Trust";
        return "Untrusted";
    }

    function meetsThreshold(uint256 agentId, uint256 threshold)
        external
        view
        returns (bool)
    {
        require(threshold <= 100, "Threshold must be 0-100");

        TrustRecord storage record = trustRecords[agentId];
        return record.exists && record.score >= threshold;
    }

    // Single check other contracts can use to gate an action.
    // maxAge = 0 means no freshness requirement.
    function isTrusted(
        uint256 agentId,
        uint256 minScore,
        uint256 maxAge,
        uint256 minCoverage
    ) external view returns (bool) {
        require(minScore <= 100, "Threshold must be 0-100");
        require(minCoverage <= 100, "Coverage must be 0-100");

        TrustRecord storage record = trustRecords[agentId];

        if (!record.exists) return false;
        if (record.score < minScore) return false;
        if (record.coverage < minCoverage) return false;
        if (maxAge != 0 && block.timestamp - record.updatedAt > maxAge) return false;

        return true;
    }

    function scoredAgentCount() external view returns (uint256) {
        return scoredAgents.length;
    }

    function getScoredAgents(uint256 offset, uint256 limit)
        external
        view
        returns (uint256[] memory)
    {
        uint256 total = scoredAgents.length;
        if (offset >= total) return new uint256[](0);

        if (limit > total - offset) limit = total - offset;

        uint256[] memory page = new uint256[](limit);
        for (uint256 i = 0; i < limit; i++) {
            page[i] = scoredAgents[offset + i];
        }
        return page;
    }

    // ---------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------

    function setAttester(address attester, bool allowed) external onlyOwner {
        require(attester != address(0), "Zero address");
        attesters[attester] = allowed;
        emit AttesterUpdated(attester, allowed);
    }

    function setIdentityRegistry(address registry) external onlyOwner {
        require(
            registry == address(0) || registry.code.length > 0,
            "Registry is not a contract"
        );
        identityRegistry = registry;
        emit IdentityRegistryUpdated(registry);
    }

    function pause() external onlyOwner {
        require(!paused, "Already paused");
        paused = true;
        emit PausedStateChanged(true);
    }

    function unpause() external onlyOwner {
        require(paused, "Not paused");
        paused = false;
        emit PausedStateChanged(false);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "Not pending owner");
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }

    // ---------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------

    function _record(
        uint256 agentId,
        uint256 score,
        uint256 coverage,
        bytes32 evidenceHash
    ) internal {
        require(score <= 100, "Score must be 0-100");
        _requireRegisteredAgent(agentId);

        TrustRecord storage record = trustRecords[agentId];

        if (!record.exists) {
            scoredAgents.push(agentId);
            scoredIndex[agentId] = scoredAgents.length;
        }

        record.score = score;
        record.updatedAt = block.timestamp;
        record.exists = true;
        record.coverage = coverage;
        record.attester = msg.sender;
        record.evidenceHash = evidenceHash;
        record.updateCount += 1;

        emit TrustScoreUpdated(agentId, score, block.timestamp);
    }

    function _requireRegisteredAgent(uint256 agentId) internal view {
        if (identityRegistry == address(0)) return;

        try IIdentityRegistry(identityRegistry).ownerOf(agentId) returns (address) {
            // agent exists
        } catch {
            revert("Agent not registered");
        }
    }
}