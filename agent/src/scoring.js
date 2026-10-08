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
