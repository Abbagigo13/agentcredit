import { getAgentIdentity, getReputation } from "./chain.js";
import { getTrustLevel, meetsTrustThreshold } from "../../web/src/lib/scoring.js";

const WEIGHTS = {
  successRate: 0.4,
  validationRate: 0.25,
  reputationScore: 0.2,
  reliability: 0.1,
  recency: 0.05,
};

export function scoreFromSignals(signals) {
  let weighted = 0;
  let coverage = 0;
  const missing = [];

  for (const [key, weight] of Object.entries(WEIGHTS)) {
    const value = signals[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      weighted += Math.max(0, Math.min(100, value)) * weight;
      coverage += weight;
    } else {
      missing.push(key);
    }
  }

  if (coverage === 0) {
    return { score: null, level: "Unknown", coverage: 0, missing };
  }

  const score = Math.round(weighted / coverage);
  return {
    score,
    level: getTrustLevel(score),
    coverage: Math.round(coverage * 100) / 100,
    missing,
  };
}

export const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "get_agent_identity",
      description: "Read an agent's ERC-8004 identity from the Monad testnet Identity Registry: owner, name, services and whether it exists.",
      parameters: {
        type: "object",
        properties: { agent_id: { type: "integer", description: "The numeric ERC-8004 agentId" } },
        required: ["agent_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_reputation",
      description: "Read an agent's onchain reputation from the ERC-8004 Reputation Registry: feedback count, number of distinct clients, and the summary value (0-100).",
      parameters: {
        type: "object",
        properties: { agent_id: { type: "integer" } },
        required: ["agent_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compute_trust_score",
      description: "Compute the AgentCredit trust score (0-100) from the signals you have evidence for. Pass ONLY signals backed by tool results and never invent values. Missing signals are reported back with a coverage figure.",
      parameters: {
        type: "object",
        properties: {
          success_rate: { type: "number", description: "0-100, only if evidenced" },
          validation_rate: { type: "number", description: "0-100, only if evidenced" },
          reputation_score: { type: "number", description: "0-100, e.g. the onchain summary value" },
          reliability: { type: "number", description: "0-100, only if evidenced" },
          recency: { type: "number", description: "0-100, only if evidenced" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_threshold",
      description: "Check whether a trust score meets a minimum required threshold.",
      parameters: {
        type: "object",
        properties: {
          score: { type: "number" },
          threshold: { type: "number", description: "Minimum required score, 0-100" },
        },
        required: ["score", "threshold"],
      },
    },
  },
];

export async function runTool(name, args = {}) {
  try {
    switch (name) {
      case "get_agent_identity":
        return await getAgentIdentity(args.agent_id);
      case "get_reputation":
        return await getReputation(args.agent_id);
      case "compute_trust_score":
        return scoreFromSignals({
          successRate: args.success_rate,
          validationRate: args.validation_rate,
          reputationScore: args.reputation_score,
          reliability: args.reliability,
          recency: args.recency,
        });
      case "check_threshold":
        return {
          score: args.score,
          threshold: args.threshold,
          meetsThreshold: meetsTrustThreshold(args.score, args.threshold),
        };
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { error: err.message };
  }
}
