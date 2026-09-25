# AgentCredit

> Trust infrastructure for autonomous agents.

AgentCredit is an onchain trust and reputation layer for AI agents, built on top of **ERC-8004** and deployed for the **Monad ecosystem**.

It transforms agent identity, reputation, validation, and task-performance signals into a transparent **Agent Trust Score from 0–100**.

---

## The Problem

As autonomous AI agents become capable of executing tasks, interacting with protocols, and acting on behalf of users, one important question remains:

> **How do you know which agent to trust?**

Traditional applications often rely on centralized ratings or opaque reputation systems.

AgentCredit explores a blockchain-native alternative.

---

## The Solution

AgentCredit uses ERC-8004 as the foundation for agent identity and reputation.

It adds an application-level trust layer that:

1. Identifies an agent.
2. Collects reputation and validation signals.
3. Evaluates task performance.
4. Calculates a transparent Trust Score.
5. Allows users and other agents to verify whether an agent meets a required trust threshold.

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
Trust Score (0–100)
  │
  ├── Human Dashboard
  │
  ├── Trust Checker
  │
  └── Other Agents

  Core Features
Agent Explorer

Discover AI agents and inspect their trust information.

Agent Profiles

View an individual agent's identity, task performance, reputation signals, and Trust Score.

Trust Checker

Check whether an agent satisfies a minimum trust requirement.

Example:
Core Features
Agent Explorer

Discover AI agents and inspect their trust information.

Agent Profiles

View an individual agent's identity, task performance, reputation signals, and Trust Score.

Trust Checker

Check whether an agent satisfies a minimum trust requirement.

Example:
Agent Alpha
Trust Score: 91

Required Score: 70

Result: APPROVED

Trust Score

AgentCredit currently uses an experimental scoring model:

| Signal            | Weight |
| ----------------- | -----: |
| Task success rate |    40% |
| Validation rate   |    25% |
| Reputation        |    20% |
| Reliability       |    10% |
| Recency           |     5% |


he score is normalized to:

0–100

Example trust levels:

80–100  Highly Trusted
70–79   Trusted
50–69   Moderate
30–49   Low Trust
0–29    Untrusted

Important

These scoring weights are part of the AgentCredit application layer.

They are not part of the ERC-8004 standard.

ERC-8004 provides the identity, reputation, and validation primitives. AgentCredit builds a transparent scoring layer on top of those primitives.

ERC-8004

AgentCredit is designed to build on top of ERC-8004 rather than replace it.

ERC-8004 provides standardized infrastructure for:

Agent Identity
Agent Discovery
Reputation
Validation

AgentCredit uses those primitives as inputs for its Trust Score.


Monad

AgentCredit is being developed for the Monad ecosystem.

Target network:

Monad Testnet
Chain ID: 10143

ERC-8004 registry addresses used by the application are maintained in:

web/src/lib/config.js

Project Structure

agentcredit/
│
├── web/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── AgentCard.jsx
│   │   │   ├── TrustScore.jsx
│   │   │   └── Button.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Agents.jsx
│   │   │   ├── AgentProfile.jsx
│   │   │   └── TrustChecker.jsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAgent.js
│   │   │   └── useTrustScore.js
│   │   │
│   │   ├── lib/
│   │   │   ├── config.js
│   │   │   ├── erc8004.js
│   │   │   └── scoring.js
│   │   │
│   │   └── abi/
│   │       ├── IdentityRegistry.json
│   │       └── ReputationRegistry.json
│   │
│   └── public/
│
├── agent/
│   └── src/
│       ├── agent.js
│       ├── tasks.js
│       └── reputation.js
│
├── contracts/
│   ├── src/
│   │   └── AgentCredit.sol
│   ├── test/
│   │   └── AgentCredit.t.sol
│   ├── script/
│   │   └── Deploy.s.sol
│   └── foundry.toml
│
├── docs/
│   ├── architecture.md
│   └── scoring.md
│
├── .env.example
├── .gitignore
└── README.md

Technology Stack
Frontend
React
Vite
React Router
viem
Lucide React
Framer Motion
Smart Contracts
Solidity
Foundry
Blockchain
Monad
ERC-8004
Agent
Node.js
JavaScript
Local Development

Local Development
Frontend

cd web
npm install
npm run dev

Build the frontend:

npm run build
Smart Contracts
cd contracts
forge build

Run tests:

forge test

Agent
cd agent
npm install
npm start
Environment Variables

Copy:

.env.example

and create your local environment file.

Never commit private keys or other secrets.

Example:

MONAD_RPC_URL=https://testnet-rpc.monad.xyz

PRIVATE_KEY=

AGENT_ID=

AGENTCREDIT_CONTRACT=

Current MVP

The current MVP includes:

 AgentCredit landing page
 Agent Explorer
 Agent profiles
 Trust Checker
 Demo Trust Scores
 Trust Score calculation engine
 Threshold verification
 Agent simulation
 AgentCredit Solidity contract
 Foundry tests
 Real ERC-8004 identity integration
 Real ERC-8004 reputation integration
 Monad testnet deployment
 Wallet connection
 Onchain Trust Score verification
 Live agent data

 Roadmap
Phase 1 — Foundation
Build the AgentCredit interface
Implement Trust Score engine
Create smart contract
Add test coverage
Phase 2 — ERC-8004 Integration
Connect Identity Registry
Read agent identities
Connect Reputation Registry
Read reputation signals
Process reputation data
Phase 3 — Monad
Deploy AgentCredit contracts
Connect Monad Testnet
Add wallet interaction
Display transaction proofs
Phase 4 — Agent Economy
Allow agents to query other agents' trust
Enable trust-gated interactions
Build reusable trust verification APIs
Explore machine-readable trust signals

Design Principle

AgentCredit does not attempt to replace ERC-8004.

Instead:

ERC-8004
= Identity + Reputation + Validation

AgentCredit
= Trust interpretation + Scoring + Verification

The goal is to make onchain agent reputation easier for humans and autonomous systems to understand and use.

Status

🚧 Active hackathon development

AgentCredit is currently an experimental MVP and the scoring model may evolve as the ERC-8004 and Monad integrations are implemented.

License

MIt
