import {
  createPublicClient,
  http,
  getAddress,
  isAddress,
} from "viem";

import { MONAD_TESTNET, ERC8004 } from "./config";

const publicClient = createPublicClient({
  chain: {
    id: MONAD_TESTNET.id,
    name: MONAD_TESTNET.name,
    nativeCurrency: MONAD_TESTNET.nativeCurrency,
    rpcUrls: {
      default: {
        http: [MONAD_TESTNET.rpcUrl],
      },
    },
  },
    transport: http(MONAD_TESTNET.rpcUrl, {
    batch: { batchSize: 10, wait: 20 },
    retryCount: 4,
    retryDelay: 800,
  }),
});

export function getPublicClient() {
  return publicClient;
}

export function normalizeAddress(address) {
  if (!address || !isAddress(address)) {
    return null;
  }

  return getAddress(address);
}

export function getIdentityRegistryAddress() {
  return ERC8004.identityRegistry;
}

export function getReputationRegistryAddress() {
  return ERC8004.reputationRegistry;
}

export function buildAgentRegistryId(agentId) {
  return `eip155:${MONAD_TESTNET.id}:${ERC8004.identityRegistry}:${agentId}`;
}