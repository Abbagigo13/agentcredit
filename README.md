# AgentCredit

> Trust infrastructure for autonomous agents.

AgentCredit is an onchain trust and reputation layer for AI agents, built on top of **ERC-8004** and deployed for the **Monad ecosystem**.

It turns agent identity, reputation, validation, and task-performance signals into a transparent **Agent Trust Score from 0 to 100**.

---

## The Problem

As autonomous AI agents become capable of executing tasks, interacting with protocols, and acting on behalf of users, one important question remains:

> **How do you know which agent to trust?**

Traditional applications often rely on centralized ratings or opaque reputation systems. AgentCredit explores a blockchain-native alternative.

---

## The Solution

AgentCredit uses ERC-8004 as the foundation for agent identity and reputation, and adds an application-level trust layer that:

1. Identifies an agent.
2. Collects reputation and validation signals.
3. Evaluates task performance.
4. Calculates a transparent Trust Score.
5. Lets users and other agents verify whether an agent meets a required trust threshold.

```text
Agent
  │
  ▼
ERC-8004 Identity
  │
  ▼
Agent Activity
  │
  ▼
Reputation / Validation Signals
  │
  ▼
AgentCredit Scoring Engine
  │
  ▼
Trust Score (0-100)
  │
  ├── Human Dashboard
  ├── Trust Checker
  └── Other Agents
```

---

## Core Features

### Agent Explorer

Discover AI agents and inspect their trust information.

### Agent Profiles

View an individual agent's identity, task performance, reputation signals, and Trust Score.

### Trust Checker

Check whether an agent satisfies a minimum trust requirement.

Example:

```text
Agent:          Agent Alpha
Trust Score:    91
Required Score: 70
Result:         APPROVED
```

---

## Trust Score

AgentCredit currently uses an experimental scoring model:

| Signal            | Weight |
| ----------------- | -----: |
| Task success rate |    40% |
| Validation rate   |    25% |
| Reputation        |    20% |
| Reliability       |    10% |
| Recency           |     5% |

The score is normalized to a range of 0-100.

| Score  | Trust level    |
| ------ | -------------- |
| 80-100 | Highly Trusted |
| 70-79  | Trusted        |
| 50-69  | Moderate       |
| 30-49  | Low Trust      |
| 0-29   | Untrusted      |

> **Important:** these scoring weights belong to the AgentCredit application layer. They are **not** part of the ERC-8004 standard. ERC-8004 provides the identity, reputation, and validation primitives; AgentCredit builds a transparent scoring layer on top of them.

---

## ERC-8004

AgentCredit is designed to build on top of ERC-8004, not replace it.

ERC-8004 provides standardized infrastructure for:

- Agent Identity
- Agent Discovery
- Reputation
- Validation

AgentCredit uses those primitives as inputs for its Trust Score.

```
ERC-8004    = Identity + Reputation + Validation
AgentCredit = Trust interpretation + Scoring + Verification
```

---

## Monad

AgentCredit is being developed for the Monad ecosystem.

| Setting  | Value          |
| -------- | -------------- |
| Network  | Monad Testnet  |
| Chain ID | 10143          |

The ERC-8004 registry addresses used by the application are maintained in `web/src/lib/config.js`.

---

## Project Structure

```text
agentcredit/
├── web/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── AgentCard.jsx
│   │   │   ├── TrustScore.jsx
│   │   │   └── Button.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Agents.jsx
│   │   │   ├── AgentProfile.jsx
│   │   │   └── TrustChecker.jsx
│   │   ├── hooks/
│   │   │   ├── useAgent.js
│   │   │   └── useTrustScore.js
│   │   ├── lib/
│   │   │   ├── config.js
│   │   │   ├── erc8004.js
│   │   │   └── scoring.js
│   │   └── abi/
│   │       ├── IdentityRegistry.json
│   │       └── ReputationRegistry.json
│   └── public/
├── agent/
│   └── src/
│       ├── agent.js
│       ├── tasks.js
│       └── reputation.js
├── contracts/
│   ├── src/
│   │   └── AgentCredit.sol
│   ├── test/
│   │   └── AgentCredit.t.sol
│   ├── script/
│   │   └── Deploy.s.sol
│   └── foundry.toml
├── docs/
│   ├── architecture.md
│   └── scoring.md
├── .env.example
├── .gitignore
└── README.md
```

---

## Technology Stack

| Layer            | Tools                                                     |
| ---------------- | --------------------------------------------------------- |
| Frontend         | React, Vite, React Router, viem, Lucide React, Framer Motion |
| Smart contracts  | Solidity, Foundry                                         |
| Blockchain       | Monad, ERC-8004                                           |
| Agent            | Node.js, JavaScript                                       |

---

## Local Development

Clone the repo together with its submodules (the contracts use `forge-std`):

```bash
git clone --recurse-submodules https://github.com/Abbagigo13/agentcredit.git
cd agentcredit
```

If you already cloned without submodules, run `git submodule update --init --recursive`.

### Frontend

```bash
cd web
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

### Smart Contracts

Requires [Foundry](https://book.getfoundry.sh/). On Windows, install it from **Git Bash** or WSL, because the installer script does not run in PowerShell.

```bash
cd contracts
forge build
forge test
```

### Agent

```bash
cd agent
npm install
npm start
```

---

## Environment Variables

Copy `.env.example` to a new file named `.env` and fill in your own values.

```
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
PRIVATE_KEY=
AGENT_ID=
AGENTCREDIT_CONTRACT=
```

> Never commit private keys or other secrets.

---

## Current MVP

- [x] AgentCredit landing page
- [x] Agent Explorer
- [x] Agent profiles
- [x] Trust Checker
- [x] Demo Trust Scores
- [x] Trust Score calculation engine
- [x] Threshold verification
- [x] Agent simulation
- [x] AgentCredit Solidity contract
- [x] Foundry tests
- [ ] Real ERC-8004 identity integration
- [ ] Real ERC-8004 reputation integration
- [ ] Monad testnet deployment
- [ ] Wallet connection
- [ ] Onchain Trust Score verification
- [ ] Live agent data

---

## Roadmap

**Phase 1: Foundation**

- Build the AgentCredit interface
- Implement the Trust Score engine
- Create the smart contract
- Add test coverage

**Phase 2: ERC-8004 Integration**

- Connect the Identity Registry
- Read agent identities
- Connect the Reputation Registry
- Read and process reputation signals

### Phase 3: Monad

- Deploy AgentCredit contracts
- Connect Monad Testnet
- Add wallet interaction
- Display transaction proofs

### Phase 4: Agent Economy

- Let agents query other agents' trust
- Enable trust-gated interactions
- Build reusable trust verification APIs
- Explore machine-readable trust signals

---

## Status

Active hackathon development. AgentCredit is an experimental MVP, and the scoring model may change as the ERC-8004 and Monad integrations are implemented.

## License

MIT
