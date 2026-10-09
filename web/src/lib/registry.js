import { parseAbi } from "viem";
import { getPublicClient } from "./erc8004";
import { ERC8004, AGENTCREDIT_CONTRACT } from "./config";

export const MIN_FEEDBACK = 3;
export const MIN_CLIENTS = 2;

// Agents with real activity, found by scanning the registry. Their data is read live.
export const FEATURED_IDS = [1, 9, 10, 13, 16, 18, 19, 20];

const identityAbi = parseAbi([
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
]);

const reputationAbi = parseAbi([
  "function getClients(uint256 agentId) view returns (address[])",
  "function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)",
]);

const creditAbi = parseAbi([
  "function getTrustRecord(uint256 agentId) view returns ((uint256 score, uint256 updatedAt, bool exists, uint256 coverage, address attester, bytes32 evidenceHash, uint256 updateCount))",
  "function getScoredAgents(uint256 offset, uint256 limit) view returns (uint256[])",
]);

const feedbackAbi = parseAbi([
  "function readAllFeedback(uint256 agentId, address[] clientAddresses, string tag1, string tag2, bool includeRevoked) view returns (address[] clients, uint64[] feedbackIndexes, int128[] values, uint8[] valueDecimals, string[] tag1s, string[] tag2s, bool[] revokedStatuses)",
]);

const POSITIVE = ["win", "pass", "passed", "success", "succeeded", "ok"];
const NEGATIVE = ["loss", "lose", "fail", "failed", "failure", "error"];
const VALIDATION_HINTS = ["check", "valid", "verif", "audit"];

function toRate(bucket) {
  const total = bucket.positive + bucket.negative;
  if (total === 0) return null;

  return {
    total,
    positive: bucket.positive,
    negative: bucket.negative,
    rate: Math.round((bucket.positive / total) * 1000) / 10,
  };
}

function summarizeFeedback(res) {
  const values = res[2];
  const decimals = res[3];
  const tag1s = res[4];
  const tag2s = res[5];

  const success = { positive: 0, negative: 0 };
  const validation = { positive: 0, negative: 0 };
  const ratings = [];
  let offScale = 0;

  values.forEach((raw, i) => {
    const value = Number(raw) / 10 ** Number(decimals[i]);
    const t1 = String(tag1s[i] || "").toLowerCase();
    const t2 = String(tag2s[i] || "").toLowerCase();
    const label = [t2, t1].find((t) => POSITIVE.includes(t) || NEGATIVE.includes(t));

    if (label) {
      const bucket = VALIDATION_HINTS.some((h) => t1.includes(h)) ? validation : success;
      if (POSITIVE.includes(label)) bucket.positive += 1;
      else bucket.negative += 1;
      return;
    }

    if (value >= 0 && value <= 100) {
      ratings.push(value);
      return;
    }

    offScale += 1;
  });

  return {
    success: toRate(success),
    validation: toRate(validation),
    rating: ratings.length
      ? {
          count: ratings.length,
          avg: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10,
        }
      : null,
    offScaleEntries: offScale,
  };
}

function decodeRegistration(uri) {
  const prefix = "data:application/json;base64,";
  if (!uri.startsWith(prefix)) return null;

  try {
    const bytes = Uint8Array.from(atob(uri.slice(prefix.length)), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function isMissingToken(err) {
  const text = `${err?.shortMessage || ""} ${err?.message || ""}`;
  return /revert|nonexistent|invalid token|ERC721/i.test(text);
}

export async function getScoredAgentIds() {
  try {
    const ids = await getPublicClient().readContract({
      address: AGENTCREDIT_CONTRACT,
      abi: creditAbi,
      functionName: "getScoredAgents",
      args: [0n, 50n],
    });
    return ids.map(Number);
  } catch {
    return [];
  }
}

export async function loadAgent(id) {
  const client = getPublicClient();
  const agentId = BigInt(id);

  let owner;
  let uri;

  try {
    [owner, uri] = await Promise.all([
      client.readContract({ address: ERC8004.identityRegistry, abi: identityAbi, functionName: "ownerOf", args: [agentId] }),
      client.readContract({ address: ERC8004.identityRegistry, abi: identityAbi, functionName: "tokenURI", args: [agentId] }),
    ]);
  } catch (err) {
    if (isMissingToken(err)) return { id: Number(id), exists: false };
    throw err;
  }

  const registration = decodeRegistration(uri);

    const clients = await client.readContract({
    address: ERC8004.reputationRegistry,
    abi: reputationAbi,
    functionName: "getClients",
    args: [agentId],
  });

  const clientCount = clients.length;
  let feedbackCount = 0;
  let breakdown = { success: null, validation: null, rating: null, offScaleEntries: 0 };

  if (clientCount > 0) {
    const res = await client.readContract({
      address: ERC8004.reputationRegistry,
      abi: feedbackAbi,
      functionName: "readAllFeedback",
      args: [agentId, clients, "", "", false],
    });

    feedbackCount = res[2].length;
    breakdown = summarizeFeedback(res);
  }

  const usable =
    clientCount >= MIN_CLIENTS &&
    ((breakdown.success && breakdown.success.total >= MIN_FEEDBACK) ||
      (breakdown.validation && breakdown.validation.total >= MIN_FEEDBACK) ||
      (breakdown.rating && breakdown.rating.count >= MIN_FEEDBACK));

  let record;
  try {
    record = await client.readContract({
      address: AGENTCREDIT_CONTRACT,
      abi: creditAbi,
      functionName: "getTrustRecord",
      args: [agentId],
    });
  } catch {
    // Ignore read failures for legacy or missing trust records.
  }

  return {
    id: Number(id),
    exists: true,
    owner,
    name: registration?.name ?? null,
    description: registration?.description ?? null,
    active: registration?.active ?? null,
    services: (registration?.services ?? []).map((s) => s.name),
    registrationReadable: Boolean(registration),
        feedbackCount,
    clientCount,
    breakdown,
    usable: Boolean(usable),
    credit: record?.exists
      ? {
          score: Number(record.score),
          coverage: Number(record.coverage),
          updatedAt: Number(record.updatedAt),
          evidenceHash: record.evidenceHash,
          updateCount: Number(record.updateCount),
          attester: record.attester,
        }
      : null,
  };
}

async function loadWithRetry(id, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await loadAgent(id);
    } catch (err) {
      if (attempt === attempts) {
        console.warn(
          `Agent #${id} failed after ${attempts} attempts:`,
          err?.shortMessage || err?.message || err
        );
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
    }
  }
}

export async function loadAgents(ids, onAgent, shouldStop) {
  for (const id of ids) {
    if (shouldStop && shouldStop()) return;

    try {
      onAgent(await loadWithRetry(id));
    } catch {
      onAgent({ id, error: true });
    }
  }
}

const gateAbi = parseAbi([
  "function isTrusted(uint256 agentId, uint256 minScore, uint256 maxAge, uint256 minCoverage) view returns (bool)",
]);

export async function checkGate(agentId, minScore, maxAgeDays, minCoverage) {
  return getPublicClient().readContract({
    address: AGENTCREDIT_CONTRACT,
    abi: gateAbi,
    functionName: "isTrusted",
    args: [
      BigInt(agentId),
      BigInt(minScore),
      BigInt(Math.round(maxAgeDays * 86400)),
      BigInt(minCoverage),
    ],
  });
}