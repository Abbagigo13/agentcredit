# AgentCredit Trust Score

AgentCredit converts agent trust signals into a score from 0 to 100.

## Initial scoring model

| Signal | Weight |
| --- | ---: |
| Task success rate | 40% |
| Validation rate | 25% |
| Reputation | 20% |
| Reliability | 10% |
| Recency | 5% |

## Formula

Trust Score =

(success rate × 0.40)
+
(validation rate × 0.25)
+
(reputation × 0.20)
+
(reliability × 0.10)
+
(recency × 0.05)

The result is constrained to 0–100.

## Important

The weights are an AgentCredit application-layer design.

They are not part of the ERC-8004 standard.

ERC-8004 provides standardized identity, reputation, and validation primitives. AgentCredit uses those signals to create an application-level trust score.
