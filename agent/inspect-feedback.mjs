import { createPublicClient, http, parseAbi } from "viem";

const RPC = "https://testnet-rpc.monad.xyz";
const REPUTATION = "0x8004B663056A597Dffe9eCcC1965A193B7388713";

const client = createPublicClient({
  chain: {
    id: 10143,
    name: "Monad Testnet",
    nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
    rpcUrls: { default: { http: [RPC] } },
  },
  transport: http(RPC, { retryCount: 4, retryDelay: 800 }),
});

const abi = parseAbi([
  "function getClients(uint256 agentId) view returns (address[])",
  "function readAllFeedback(uint256 agentId, address[] clientAddresses, string tag1, string tag2, bool includeRevoked) view returns (address[] clients, uint64[] feedbackIndexes, int128[] values, uint8[] valueDecimals, string[] tag1s, string[] tag2s, bool[] revokedStatuses)",
]);

const ids = process.argv.slice(2).map(Number);

for (const id of ids) {
  const clients = await client.readContract({
    address: REPUTATION, abi, functionName: "getClients", args: [BigInt(id)],
  });

  const res = await client.readContract({
    address: REPUTATION, abi, functionName: "readAllFeedback",
    args: [BigInt(id), clients, "", "", false],
  });

  const values = res[2];
  const decimals = res[3];
  const tag1s = res[4];
  const tag2s = res[5];

  const byTag = {};
  values.forEach((v, i) => {
    const key = `${tag1s[i] || "(none)"} / ${tag2s[i] || "-"}`;
    (byTag[key] ||= []).push(Number(v) / 10 ** Number(decimals[i]));
  });

  console.log(`Agent #${id}: ${values.length} feedback entries from ${clients.length} clients`);

  console.table(
    Object.entries(byTag).map(([tag, list]) => ({
      tag,
      count: list.length,
      min: Math.min(...list),
      max: Math.max(...list),
      avg: Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 100) / 100,
    }))
  );
}
