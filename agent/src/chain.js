import { createPublicClient, http, parseAbi } from "viem";

const RPC_URL = "https://testnet-rpc.monad.xyz";
const IDENTITY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
const REPUTATION = "0x8004B663056A597Dffe9eCcC1965A193B7388713";

const identityAbi = parseAbi([
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
]);

const reputationAbi = parseAbi([
  "function getClients(uint256 agentId) view returns (address[])",
  "function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)",
]);

const client = createPublicClient({
  chain: {
    id: 10143,
    name: "Monad Testnet",
    nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
    rpcUrls: { default: { http: [RPC_URL] } },
  },
  transport: http(RPC_URL),
});

export async function getAgentIdentity(agentId) {
  const id = BigInt(agentId);

  try {
    const [owner, uri] = await Promise.all([
      client.readContract({ address: IDENTITY, abi: identityAbi, functionName: "ownerOf", args: [id] }),
      client.readContract({ address: IDENTITY, abi: identityAbi, functionName: "tokenURI", args: [id] }),
    ]);

    let registration = null;
    const prefix = "data:application/json;base64,";
    if (uri.startsWith(prefix)) {
      registration = JSON.parse(Buffer.from(uri.slice(prefix.length), "base64").toString("utf8"));
    }

    return {
      agentId: Number(agentId),
      exists: true,
      owner,
      name: registration?.name ?? null,
      description: registration?.description ?? null,
      active: registration?.active ?? null,
      services: (registration?.services ?? []).map((s) => s.name),
      supportedTrust: registration?.supportedTrust ?? [],
      registrationFile: registration ? "readable" : "not readable (non-inline URI)",
    };
  } catch {
    return { agentId: Number(agentId), exists: false };
  }
}

export async function getReputation(agentId) {
  const id = BigInt(agentId);

  const clients = await client.readContract({
    address: REPUTATION, abi: reputationAbi, functionName: "getClients", args: [id],
  });

  if (clients.length === 0) {
    return { agentId: Number(agentId), feedbackCount: 0, clientCount: 0, summaryValue: null };
  }

  const [count, value, decimals] = await client.readContract({
    address: REPUTATION, abi: reputationAbi, functionName: "getSummary", args: [id, clients, "", ""],
  });

  return {
    agentId: Number(agentId),
    feedbackCount: Number(count),
    clientCount: clients.length,
    summaryValue: Number(value) / 10 ** Number(decimals),
  };
}
