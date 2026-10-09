# AgentCredit

> Trust scores for AI agents, built by a Qwen 3.8 Max analyst from live ERC-8004 data on Monad and recorded onchain with verifiable evidence.

AgentCredit answers one question: **should I let this AI agent do this task?**

A Qwen 3.8 Max agent investigates the agent in question. It reads the agent's ERC-8004 identity and every feedback entry in the Reputation Registry on Monad testnet, scores it with deterministic code, checks the result against your minimum requirement, and can write the verdict to the AgentCredit contract together with a hash of its evidence. Anyone can then re-check that record, and any app or contract can gate an action on it.

Built for the Monad hackathon, **Trust, Identity & AI Infrastructure** track, and the Alibaba Cloud **Best Builds with Qwen 3.8 Max** bounty.

## Live demo

| What | Link |
| --- | --- |
| Website | https://agentcredit-six.vercel.app |
| Analyst API health check | https://agentcredit-production.up.railway.app/api/health |
| AgentCredit contract (Monad testnet, chain ID 10143) | `0x0b0792a328c2253e4F23f98875ebb7DEEa859971` |
| Article | _add the published article link here_ |

Quick tour: open the **Agents** page to see real ERC-8004 agents read live from the registries, then open the **Trust Checker**, enter `10`, and watch the Qwen analyst work step by step.

## The problem

ERC-8004 gives AI agents an onchain identity and a public reputation registry, but feedback is open-ended. Different agents store different things in it: win/loss results, pass/fail validation checks, percentage ratings, Elo scores. The registry's single summary number mixes all of that together, so it can't be compared across agents. In our scan of the registry:

- Agent #9 (ScavBot) has a summary of **1439**, because its feedback is Elo ratings.
- Agents #10 and #20 both show a summary of **0**, yet #10 wins about **79%** of its jobs and #20 wins about **9%**.
- Agent #1's summary of 52 hid the fact that it passed only **2 of 8** validation checks.

A trust layer that treats these numbers as scores will approve the wrong agents. AgentCredit reads the individual feedback entries instead and refuses to score what it can't interpret.

## How it works

```
Question: "Can agent 10 do a task that needs trust score 70?"
        |
        v
Qwen 3.8 Max analyst (function-calling loop, 4-5 rounds)
        |
        |-- get_agent_identity     -> ERC-8004 Identity Registry (Monad)
        |-- get_feedback_breakdown -> ERC-8004 Reputation Registry (Monad)
        |-- compute_trust_score    -> deterministic scoring, minimum-evidence rules
        |-- check_threshold        -> compare with your minimum
        |-- record_onchain         -> AgentCredit contract (optional)
        v
Verdict + reasoning  ->  Trust Checker UI  ->  onchain record + evidence hash
                                                        |
                                    Verify button / isTrusted() trust gate
```

### What Qwen does, and what it can't do

Qwen plans the investigation, decides which tool to call next, reads the results, stops when a tool tells it the evidence is insufficient, and writes the verdict and reasoning. It **cannot** supply any score input. `compute_trust_score` takes only an agent ID and derives every signal from the verified registry data, and `record_onchain` recomputes the score itself before writing. A model that makes up a number has no way to put it onchain.

### Scoring

The score is a weighted average over the signals that have enough evidence. Missing signals are left out, the remaining weights are rescaled, and a **coverage** figure shows how much of the model the evidence supports.

| Signal | Weight | Where it comes from |
| --- | ---: | --- |
| Task success | 40% | win/loss feedback (tags such as `win`, `loss`) |
| Validation | 25% | pass/fail checks (tags such as `pass`, `fail` on a check or validation tag) |
| Reputation | 20% | plain 0-100 percentage ratings |
| Reliability | 10% | no onchain source yet |
| Recency | 5% | no onchain source yet |

| Score | Level |
| --- | --- |
| 80-100 | Highly Trusted |
| 70-79 | Trusted |
| 50-69 | Moderate |
| 30-49 | Low Trust |
| 0-29 | Untrusted |

### Hard rules enforced in code

These live in the tools, not in the prompt, so the model can't talk its way around them.

- A signal needs at least **3 feedback entries**, and the agent needs feedback from at least **2 different clients**.
- Feedback on a non-percentage scale (Elo and similar) is **ignored**, and if nothing else is left the answer is `INSUFFICIENT_DATA`.
- `record_onchain` refuses to write when there is no reliable score.

Before the minimum-evidence rule existed, the analyst approved agent #16 (one rating of 85 from one client) "with caution". The rule now makes that case end as `INSUFFICIENT_DATA`.

## Results on Monad testnet

Recorded onchain by the analyst, using the final scoring method, with a minimum requirement of 70:

| Agent | Feedback | Evidence | Score | Coverage | Verdict |
| --- | --- | --- | ---: | ---: | --- |
| #1 Monad Demo Agent | 9 entries, 2 clients | 2 of 8 validation checks passed (25%) | 25 | 25% | Reject |
| #10 | 42 entries, 5 clients | 33 wins, 9 losses (78.6%) | 79 | 40% | Approve, low confidence |
| #20 Veridex Oracle Agent | 23 entries, 4 clients | 2 wins, 21 losses (8.7%) | 9 | 40% | Reject |
| #9 ScavBot | 9 entries, 2 clients | Elo ratings only | no score | 0% | Insufficient data |
| #16 | 1 entry, 1 client | one rating of 85 | no score | n/a | Insufficient data |

Evidence hashes stored on the contract:

| Agent | Evidence hash |
| --- | --- |
| #1 | `0xb541e7e527a765572939f6fb324de479f174ba27c913bc968aecbde2c672ad98` |
| #10 | `0x8cc3348d194d99244fca0b157f6214d9943f88767d6ade72af8a83058f452bbf` |
| #20 | `0x284e99c23835305ac81717001280a4ec8aa72b6a91779f579eef28599e092390` |

The hash is `keccak256` of the JSON text of `{ identity, breakdown, scoring }`. The **Verify onchain record** button recomputes it from live registry data and shows the evidence, so anyone can check a record against the data it came from. If new feedback has arrived since the record was written, the hashes differ and the page says so.

## The smart contract

`contracts/src/AgentCredit.sol`, deployed on Monad testnet at `0x0b0792a328c2253e4F23f98875ebb7DEEa859971`. Writes are restricted to authorized attesters, and the owner and attester roles are held by two separate wallets, so a leaked analyst key can write scores but can't pause, remove or reassign anything.

| Function | Purpose |
| --- | --- |
| `recordAnalysis(agentId, score, coverage, evidenceHash)` | Used by the analyst to store a verdict with its evidence hash |
| `setTrustScore`, `setTrustScoresBatch` | Simple and batch score writes (attesters only) |
| `getTrustScore`, `getTrustRecord`, `getTrustLevel` | Read a stored record |
| `meetsThreshold(agentId, threshold)` | Does the stored score meet a minimum (false for unknown agents) |
| `isTrusted(agentId, minScore, maxAge, minCoverage)` | One call other contracts can use to gate an action on score, freshness and coverage |
| `scoredAgentCount`, `getScoredAgents` | List agents that have records |
| `setAttester`, `setIdentityRegistry` | Owner controls. The Identity Registry link means only agents that really exist in ERC-8004 can be scored |
| `pause`, `unpause`, `removeTrustRecord` | Emergency controls |
| `transferOwnership`, `acceptOwnership` | Two-step ownership transfer |

A contract can gate an action like this:

```solidity
require(
  IAgentCredit(0x0b0792a328c2253e4F23f98875ebb7DEEa859971)
    .isTrusted(agentId, 70, 0, 20),
  "agent not trusted"
);
```

15 Foundry tests cover access control, score limits, enumeration, pausing, the registry link, trust gating and ownership transfer.

## ERC-8004 on Monad testnet

| Registry | Address |
| --- | --- |
| Identity Registry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| Reputation Registry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

The agent calls `ownerOf` and `tokenURI` on the Identity Registry (the registration file is decoded when it is stored inline), and `getClients` and `readAllFeedback` on the Reputation Registry.

## Frontend features

- **Agents page**: real ERC-8004 agents read live from the registries, with status chips (`Scored by AgentCredit`, `Ready to analyze`, `Too little evidence`, `Off-scale feedback`) and a lookup by agent number.
- **Trust Checker**: runs the Qwen analyst and streams each tool call to the page as it happens.
- **Score breakdown**: shows each signal, its weight, its value and the points it adds, with missing signals greyed out.
- **Verify onchain record**: recomputes the evidence hash from live data and compares it with the contract.
- **Trust-gate panel**: calls `isTrusted` on the contract straight from the browser, with adjustable minimum score, coverage and record age.

## Analyst API

| Endpoint | Description |
| --- | --- |
| `GET /api/health` | Health check |
| `POST /api/analyze-stream` | Runs an analysis and streams steps as newline-delimited JSON. Body: `{ agentId, threshold, record }` |
| `POST /api/analyze` | Same analysis, returned as one JSON response |
| `GET /api/verify?agentId=N` | Recomputes the evidence hash and compares it with the onchain record (no Qwen call) |

Public-demo safeguards: per-visitor rate limiting, an hourly cap on onchain writes, a daily cap on analyses, a 10-minute result cache (cached replays cost nothing and never write onchain twice), and a CORS allowlist. The server never accepts free text from the website. The question sent to Qwen is built on the server from the agent number and threshold.

## Project structure

```
agentcredit/
  agent/        Node.js analyst server and CLI
    src/        server.js, analyst.js (Qwen loop), tools.js, chain.js, scoring.js, ask.js
  contracts/    Foundry project: AgentCredit.sol, tests, deploy script
  web/          React + Vite frontend
    src/lib/    registry.js (live chain reads), erc8004.js, config.js
    src/pages/  Home, Agents, TrustChecker
```

Helper scripts: `agent/scan-agents.mjs` walks the registry, and `agent/inspect-feedback.mjs` prints an agent's feedback grouped by tag.

## Run it locally

You need Node.js 18 or newer, plus [Foundry](https://book.getfoundry.sh/) for the contracts. On Windows, install Foundry from Git Bash or WSL, because its installer doesn't run in PowerShell.

```bash
git clone --recurse-submodules https://github.com/Abbagigo13/agentcredit.git
cd agentcredit
```

**Analyst server**

```bash
cd agent
npm install
cp .env.example .env     # PowerShell: Copy-Item .env.example .env
# fill in DASHSCOPE_API_KEY and ANALYST_PRIVATE_KEY, then:
npm run server
```

Run one analysis from the command line (add `RECORD=1` to write the verdict onchain; in PowerShell use `$env:RECORD = "1"`):

```bash
node src/ask.js "Can I let agent 10 run a task that needs a minimum trust score of 70?"
```

**Website**

```bash
cd web
npm install
npm run dev
```

The site calls `http://localhost:8787` by default. Set `VITE_ANALYST_URL` to point it elsewhere.

**Contracts**

```bash
cd contracts
forge test
```

### Environment variables (`agent/.env`)

| Variable | Description |
| --- | --- |
| `DASHSCOPE_API_KEY` | Alibaba Cloud Model Studio key (international region) |
| `QWEN_BASE_URL` | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| `QWEN_MODEL` | `qwen3.8-max` |
| `ANALYST_PRIVATE_KEY` | Testnet-only wallet authorized as an attester on the contract |
| `AGENTCREDIT_CONTRACT` | Deployed AgentCredit address |
| `MONAD_RPC_URL` | `https://testnet-rpc.monad.xyz` |
| `ALLOWED_ORIGINS` | Comma-separated list of websites allowed to call the API |
| `MAX_RECORDS_PER_HOUR` | Cap on onchain writes (default 10) |
| `MAX_ANALYSES_PER_DAY` | Cap on analyses (default 150) |

Never commit `.env` files or private keys. Use throwaway testnet wallets only.

## Honest limitations

- **Feedback semantics are not standardized.** Classifying `win`, `loss`, `pass` and `fail` tags is a heuristic, and a win in a game is only a loose stand-in for task success.
- **Coverage is low.** Reliability and recency have no onchain source yet, so the best score today covers 40% of the model. The UI shows this on every result.
- **Fake reviewers.** A minimum of 2 clients and 3 entries stops single-rating scores but not someone using several wallets. Sybil resistance would need identity or stake weighting.
- **Verification is server-side.** The Verify button recomputes the hash on the analyst server. The evidence JSON is shown so anyone can recompute it independently.
- **Testnet only.** Counters for the daily and hourly caps live in memory and reset when the server restarts.
- **Registry scan.** The scan script stops at agent #100, and more agents may exist.

## Roadmap

- Weight feedback by the reviewer's own reputation
- Read ERC-8004 validation responses when agents publish them
- A small Solidity example contract that consumes `isTrusted`
- Move the analyst's caps and cache to persistent storage

## License

MIT
