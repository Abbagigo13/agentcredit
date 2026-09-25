import { useMemo } from "react";

const demoAgents = [
  {
    id: "agent-alpha",
    name: "Agent Alpha",
    description: "General-purpose autonomous task agent",
    score: 91,
    successfulTasks: 9,
    totalTasks: 10,
    verified: true,
  },
  {
    id: "agent-nova",
    name: "Agent Nova",
    description: "DeFi research and execution agent",
    score: 84,
    successfulTasks: 22,
    totalTasks: 25,
    verified: true,
  },
  {
    id: "agent-orbit",
    name: "Agent Orbit",
    description: "Cross-chain automation agent",
    score: 76,
    successfulTasks: 15,
    totalTasks: 18,
    verified: true,
  },
  {
    id: "agent-rogue",
    name: "Agent Rogue",
    description: "Experimental autonomous agent",
    score: 38,
    successfulTasks: 3,
    totalTasks: 10,
    verified: false,
  },
];

export function useAgents() {
  return {
    agents: demoAgents,
    loading: false,
    error: null,
  };
}

export function useAgent(id) {
  const agent = useMemo(
    () => demoAgents.find((item) => item.id === id),
    [id]
  );

  return {
    agent: agent || null,
    loading: false,
    error: agent ? null : "Agent not found",
  };
}