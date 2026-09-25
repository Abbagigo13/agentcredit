export const MONAD_TESTNET = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrl: "https://testnet-rpc.monad.xyz",
  blockExplorer: "https://testnet.monadexplorer.com",
};

export const ERC8004 = {
  identityRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
  reputationRegistry: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
};

export const AGENT_REGISTRY_NAMESPACE =
  `eip155:${MONAD_TESTNET.id}:${ERC8004.identityRegistry}`;