import { getAgentIdentity, getFeedbackBreakdown, recordAnalysisOnchain, hashEvidence, getOnchainRecord } from "./chain.js";
import { getTrustLevel, meetsTrustThreshold } from "./scoring.js";

const WEIGHTS = {
  successRate: 0.4,
  validationRate: 0.25,
  reputationScore: 0.2,
  reliability: 0.1,
  recency: 0.05,
};

const MIN_FEEDBACK = 3;
const MIN_CLIENTS = 2;

function deriveSignals(breakdown) {
  const signals = {};
  const notes = [];

  if (!breakdown || breakdown.entries === 0) {
    return { signals, notes: ["The agent has no feedback entries."] };
  }

  if (breakdown.clientCount < MIN_CLIENTS) {
    return {
      signals,
      notes: [
        `Feedback comes from ${breakdown.clientCount} client(s); at least ${MIN_CLIENTS} different clients are required.`,
      ],
    };
  }

  if (breakdown.success) {
    if (breakdown.success.total >= MIN_FEEDBACK) {
      signals.successRate = breakdown.success.rate;
    } else {
      notes.push(
        `Only ${breakdown.success.total} win/loss outcomes; at least ${MIN_FEEDBACK} are required.`
      );
    }
  }

  if (breakdown.validation) {
    if (breakdown.validation.total >= MIN_FEEDBACK) {
      signals.validationRate = breakdown.validation.rate;
    } else {
      notes.push(
        `Only ${breakdown.validation.total} pass/fail checks; at least ${MIN_FEEDBACK} are required.`
      );
    }
  }

  if (breakdown.rating) {
    if (breakdown.rating.count >= MIN_FEEDBACK) {
      signals.reputationScore = breakdown.rating.avg;
    } else {
      notes.push(
        `Only ${breakdown.rating.count} percentage rating(s); at least ${MIN_FEEDBACK} are required.`
      );
    }
  }

  if (breakdown.offScaleEntries > 0) {
    notes.push(
      `${breakdown.offScaleEntries} feedback entries use a non-percentage scale (for example Elo) and were ignored.`
    );
  }

  return { signals, notes };
}

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
      description:
        "Read an agent's ERC-8004 identity from the Monad testnet Identity Registry: owner, name, services and whether it exists.",
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
      name: "get_feedback_breakdown",
      description:
        "Read every feedback entry for an agent from the ERC-8004 Reputation Registry and sort it by type: win/loss outcomes, pass/fail validation checks, percentage ratings, and off-scale values (such as Elo).",
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
      description:
        "Compute the AgentCredit trust score (0-100) for the agent. It takes only the agent id and derives the signals itself from the verified feedback breakdown, applying minimum-evidence rules. You cannot supply signal values.",
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

export const recordToolDefinition = {
  type: "function",
  function: {
    name: "record_onchain",
    description:
      "Write the trust score to the AgentCredit contract on Monad testnet as a permanent onchain record. Call this ONCE, after you have checked identity and reputation and decided your verdict. It takes only the agent id; the score, coverage and evidence hash are derived automatically from your registry reads.",
    parameters: {
      type: "object",
      properties: { agent_id: { type: "integer" } },
      required: ["agent_id"],
    },
  },
};

export async function runTool(name, args = {}, ctx = {}) {
  try {
    switch (name) {
      case "get_agent_identity": {
        const result = await getAgentIdentity(args.agent_id);
        ctx.identity = result;
        return result;
      }
      case "get_feedback_breakdown": {
        const result = await getFeedbackBreakdown(args.agent_id);
        ctx.breakdown = result;
        return result;
      }
      case "compute_trust_score": {
        if (!ctx.breakdown) {
          return { error: "Call get_feedback_breakdown first." };
        }

        const { signals, notes } = deriveSignals(ctx.breakdown);
        return { ...scoreFromSignals(signals), notes };
      }
      case "check_threshold":
        return {
          score: args.score,
          threshold: args.threshold,
          meetsThreshold: meetsTrustThreshold(args.score, args.threshold),
        };
      case "record_onchain": {
        if (!ctx.identity?.exists) {
          return { error: "Verify the agent identity with get_agent_identity first." };
        }
        if (Number(args.agent_id) !== ctx.identity.agentId) {
          return { error: "agent_id does not match the agent you analyzed." };
        }
        if (!ctx.breakdown) {
          return { error: "Call get_feedback_breakdown first." };
        }

        const { signals, notes } = deriveSignals(ctx.breakdown);
        const verified = scoreFromSignals(signals);

        if (verified.score === null) {
          return { error: `Nothing reliable to record. ${notes.join(" ")}` };
        }

        const coverage = Math.round(verified.coverage * 100);
        const evidenceHash = hashEvidence({
          identity: ctx.identity,
          breakdown: ctx.breakdown,
          scoring: verified,
        });

        const tx = await recordAnalysisOnchain({
          agentId: ctx.identity.agentId,
          score: verified.score,
          coverage,
          evidenceHash,
        });

        return { recorded: true, score: verified.score, coverage, evidenceHash, ...tx };
      }
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { error: err.message };
  }
}

export async function verifyRecord(agentId) {
    const [record, identity, breakdown] = await Promise.all([
    getOnchainRecord(agentId),
    getAgentIdentity(agentId),
    getFeedbackBreakdown(agentId),
  ]);

  const { signals } = deriveSignals(breakdown);
  const scoring = scoreFromSignals(signals);
  const recomputedHash = hashEvidence({ identity, breakdown, scoring });

  return {
    agentId: Number(agentId),
    recorded: record,
    currentScore: scoring.score,
    currentCoverage: Math.round(scoring.coverage * 100),
    recomputedHash,
    hashMatches: record
      ? record.evidenceHash.toLowerCase() === recomputedHash.toLowerCase()
      : null,
    evidence: { identity, breakdown, scoring },
  };
}