export function calculateTrustScore({
  successRate = 0,
  validationRate = 0,
  reputationScore = 0,
  reliability = 0,
  recency = 0,
}) {
  const score =
    successRate * 0.4 +
    validationRate * 0.25 +
    reputationScore * 0.2 +
    reliability * 0.1 +
    recency * 0.05;

  return Math.round(Math.max(0, Math.min(100, score)));
}

export function getTrustLevel(score) {
  if (score >= 80) return "Highly Trusted";
  if (score >= 70) return "Trusted";
  if (score >= 50) return "Moderate";
  if (score >= 30) return "Low Trust";

  return "Untrusted";
}

export function meetsTrustThreshold(score, threshold = 70) {
  return score >= threshold;
}