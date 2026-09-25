import { Link } from 'react-router-dom';
import {
  Search,
  ShieldCheck,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';

const agents = [
  {
    id: 'agent-alpha',
    name: 'Agent Alpha',
    description: 'General-purpose autonomous task agent',
    score: 91,
    tasks: 10,
    success: 9,
    status: 'Verified',
  },
  {
    id: 'agent-nova',
    name: 'Agent Nova',
    description: 'DeFi research and execution agent',
    score: 84,
    tasks: 25,
    success: 22,
    status: 'Verified',
  },
  {
    id: 'agent-orbit',
    name: 'Agent Orbit',
    description: 'Cross-chain automation agent',
    score: 76,
    tasks: 18,
    success: 15,
    status: 'Verified',
  },
  {
    id: 'agent-rogue',
    name: 'Agent Rogue',
    description: 'Experimental autonomous agent',
    score: 38,
    tasks: 10,
    success: 3,
    status: 'Low Trust',
  },
];

function Agents() {
  return (
    <main className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <span className="section-label">Agent Explorer</span>

            <h1>
              Discover <span className="gradient-text">agents.</span>
            </h1>

            <p>
              Explore AI agents and inspect their onchain trust signals.
            </p>
          </div>

          <div className="search-box">
            <Search size={17} />
            <input placeholder="Search agents..." />
          </div>
        </div>

        <div className="agent-grid">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </main>
  );
}

function AgentCard({ agent }) {
  const trusted = agent.score >= 70;

  return (
    <Link to={`/agents/${agent.id}`} className="agent-card">
      <div className="agent-card-top">
        <div className="agent-avatar">
          <ShieldCheck size={21} />
        </div>

        <div className={`status ${trusted ? 'verified' : 'low'}`}>
          <CheckCircle2 size={13} />
          {agent.status}
        </div>
      </div>

      <h3>{agent.name}</h3>

      <p>{agent.description}</p>

      <div className="agent-score-row">
        <div>
          <span>Trust Score</span>
          <strong>{agent.score}</strong>
        </div>

        <div className="score-bar">
          <div
            style={{
              width: `${agent.score}%`,
            }}
          />
        </div>
      </div>

      <div className="agent-card-footer">
        <span>
          {agent.success}/{agent.tasks} successful tasks
        </span>

        <ArrowUpRight size={17} />
      </div>
    </Link>
  );
}

export default Agents;