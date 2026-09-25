import { useMemo } from "react";
import { calculateTrustScore, getTrustLevel } from "../lib/scoring";

export function useTrustScore(signals) {
  return useMemo(() => {
    if (!signals) {
      return {
        score: 0,
        level: "Untrusted",
      };
    }

    const score = calculateTrustScore(signals);

    return {
      score,
      level: getTrustLevel(score),
    };
  }, [signals]);
}