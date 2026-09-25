import { Link } from "react-router-dom";
import { ShieldCheck, ArrowUpRight } from "lucide-react";
import TrustScore from "./TrustScore";

export default function AgentCard({ agent }) {
  return (
    <Link to={`/agents/${agent.id}`} className="agent-card">
      <div className="agent-card-top">
        <div className="agent-avatar">
          <ShieldCheck size={24} />
        </div>

        <span className={`status ${agent.score >= 50 ? "verified" : "low"}`}>
          <span className="status-dot" />

          {agent.score >= 50 ? "Verified" : "Low Trust"}
        </span>
      </div>

      <h3>{agent.name}</h3>

      <p>{agent.description}</p>

      <TrustScore score={agent.score} />

      <div className="agent-card-footer">
        <span>
          {agent.successfulTasks}/{agent.totalTasks} successful tasks
        </span>

        <ArrowUpRight size={18} />
      </div>
    </Link>
  );
}