# AgentCredit Architecture

## Overview

AgentCredit is a trust layer built on top of ERC-8004.

```text
AI Agent
   |
   v
ERC-8004 Identity
   |
   v
Agent performs tasks
   |
   v
ERC-8004 Reputation / Validation
   |
   v
AgentCredit Scoring Engine
   |
   v
Trust Score 0-100
   |
   +------> Human Dashboard
   |
   +------> Trust Checker
   |
   +------> Other Agents