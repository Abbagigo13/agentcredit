import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Activity,
  Fingerprint,
} from 'lucide-react';

const agentData = {
  'agent-alpha': {
    name: 'Agent Alpha',
    description: 'General-purpose autonomous task agent',
    score: 91,
    tasks: 10,
    successful: 9,
    failed: 1,
    validation: 94,
    reputation: 92,
    reliability: 89,
    identity: '0x8f2...a421',
  },
  'agent-nova': {
    name: 'Agent Nova',
    description: 'DeFi research and execution agent',
    score: 84,
    tasks: 25,
    successful: 22,
    failed: 3,
    validation: 87,
    reputation: 85,
    reliability: 82,
    identity: '0x42c...91ef',
  },
  'agent-orbit': {
    name: 'Agent Orbit',
    description: 'Cross-chain automation agent',
    score: 76,
    tasks: 18,
    successful: 15,
    failed: 3,
    validation: 79,
    reputation: 77,
    reliability: 74,
    identity: '0xa91...4bc2',
  },
  'agent-rogue': {
    name: 'Agent Rogue',
    description: 'Experimental autonomous agent',
    score: 38,
    tasks: 10,
    successful: 3,
    failed: 7,
    validation: 41,
    reputation: 35,
    reliability: 39,
    identity: '0x713...c8a1',
  },
};

function AgentProfile() {
  const { agentId } = useParams();

  const agent = agentData[agentId] || agentData['agent-alpha'];

  const trusted = agent.score >= 70;

  return (
    <main className="page">
      <div className="container">
        <Link to="/agents" className="back-link">
          <ArrowLeft size={16} />
          Back to agents
        </Link>

        <div className="profile-header">
          <div className="profile-identity">
            <div className="profile-avatar">
              <ShieldCheck size={32} />
            </div>

            <div>
              <div className="profile-name-row">
                <h1>{agent.name}</h1>

                {trusted && (
                  <span className="verified-badge">
                    <CheckCircle2 size={14} />
                    Verified
                  </span>
                )}
              </div>

              <p>{agent.description}</p>

              <span className="identity">
                <Fingerprint size={14} />
                {agent.identity}
              </span>
            </div>
          </div>

          <a
            href="#"
            className="explorer-button"
            onClick={(event) => event.preventDefault()}
          >
            View on explorer
            <ExternalLink size={15} />
          </a>
        </div>

        <div className="profile-grid">
          <section className="score-panel glass">
            <span className="panel-label">Agent Trust Score</span>

            <div className="big-score">
              <strong>{agent.score}</strong>
              <span>/100</span>
            </div>

            <div className="large-score-bar">
              <div style={{ width: `${agent.score}%` }} />
            </div>

            <div className={`trust-result ${trusted ? 'trusted' : 'risky'}`}>
              <ShieldCheck size={18} />

              {trusted
                ? 'This agent meets the recommended trust threshold.'
                : 'This agent is below the recommended trust threshold.'}
            </div>
          </section>

          <section className="signals-panel glass">
            <div className="panel-heading">
              <div>
                <span className="panel-label">Trust signals</span>
                <h2>Reputation breakdown</h2>
              </div>
            </div>

            <Signal label="Task Performance" value={agent.score} />
            <Signal label="Validation" value={agent.validation} />
            <Signal label="Reputation" value={agent.reputation} />
            <Signal label="Reliability" value={agent.reliability} />
          </section>
        </div>

        <section className="activity-panel glass">
          <div className="panel-heading">
            <div>
              <span className="panel-label">Activity</span>
              <h2>Agent performance</h2>
            </div>

            <Activity size={20} />
          </div>

          <div className="activity-stats">
            <ActivityStat
              label="Total Tasks"
              value={agent.tasks}
            />

            <ActivityStat
              label="Successful"
              value={agent.successful}
            />

            <ActivityStat
              label="Failed"
              value={agent.failed}
            />

            <ActivityStat
              label="Success Rate"
              value={`${Math.round(
                (agent.successful / agent.tasks) * 100
              )}%`}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function Signal({ label, value }) {
  return (
    <div className="signal">
      <div className="signal-header">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

      <div className="signal-bar">
        <div style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ActivityStat({ label, value }) {
  return (
    <div className="activity-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default AgentProfile;