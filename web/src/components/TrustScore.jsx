import { ShieldCheck } from "lucide-react";

export default function TrustScore({ score = 0, size = "normal" }) {
  const safeScore = Math.max(0, Math.min(100, Number(score)));

  return (
    <div className={`trust-score ${size}`}>
      <div className="trust-score-header">
        <span>Trust Score</span>
        <strong>
          <ShieldCheck size={16} />
          {safeScore}
        </strong>
      </div>

      <div className="score-bar">
        <div
          className="score-bar-fill"
          style={{ width: `${safeScore}%` }}
        />
      </div>
    </div>
  );
}