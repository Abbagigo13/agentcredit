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

  let feedbackCount = 0;
  let summary = null;

  if (clients.length > 0) {
    const [count, value, decimals] = await client.readContract({
      address: ERC8004.reputationRegistry,
      abi: reputationAbi,
      functionName: "getSummary",
      args: [agentId, clients, "", ""],
    });
    feedbackCount = Number(count);
    summary = Number(value) / 10 ** Number(decimals);
  }

  const clientCount = clients.length;

  let record = null;
  try {
    record = await client.readContract({
      address: AGENTCREDIT_CONTRACT,
      abi: creditAbi,
      functionName: "getTrustRecord",
      args: [agentId],
    });
  } catch {
    record = null;
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
    summary,
    scaleValid: summary !== null && summary >= 0 && summary <= 100,
    enoughEvidence: feedbackCount >= MIN_FEEDBACK && clientCount >= MIN_CLIENTS,
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