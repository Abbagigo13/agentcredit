import { useState } from 'react';
import {
  Search,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react';

const demoAgents = {
  'agent-alpha': {
    name: 'Agent Alpha',
    score: 91,
  },
  'agent-nova': {
    name: 'Agent Nova',
    score: 84,
  },
  'agent-orbit': {
    name: 'Agent Orbit',
    score: 76,
  },
  'agent-rogue': {
    name: 'Agent Rogue',
    score: 38,
  },
};

function TrustChecker() {
  const [agentId, setAgentId] = useState('');
  const [threshold, setThreshold] = useState('70');
  const [result, setResult] = useState(null);

  function checkTrust() {
    const agent = demoAgents[agentId.toLowerCase().trim()];

    if (!agent) {
      setResult({
        type: 'not-found',
        message: 'Agent not found.',
      });

      return;
    }

    const score = agent.score;
    const required = Number(threshold);

    setResult({
      type: score >= required ? 'approved' : 'rejected',
      agent,
      score,
      required,
    });
  }

  return (
    <main className="page">
      <div className="container checker-container">
        <div className="checker-heading">
          <span className="section-label">Trust Checker</span>

          <h1>
            Should you <span className="gradient-text">trust</span> this
            agent?
          </h1>

          <p>
            Check an agent's trust score against the minimum requirement
            for your application.
          </p>
        </div>

        <div className="checker-card glass">
          <div className="input-group">
            <label>Agent ID</label>

            <div className="input-wrapper">
              <Search size={18} />

              <input
                value={agentId}
                onChange={(event) => setAgentId(event.target.value)}
                placeholder="Try: agent-alpha"
              />
            </div>

            <span className="input-hint">
              Demo agents: agent-alpha, agent-nova, agent-orbit,
              agent-rogue
            </span>
          </div>

          <div className="input-group">
            <label>Minimum Trust Score</label>

            <div className="threshold-input">
              <input
                type="number"
                min="0"
                max="100"
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
              />

              <span>/ 100</span>
            </div>
          </div>

          <button className="check-button" onClick={checkTrust}>
            Check Trust
            <ArrowRight size={17} />
          </button>
        </div>

        {result && (
          <Result result={result} />
        )}
      </div>
    </main>
  );
}

function Result({ result }) {
  if (result.type === 'not-found') {
    return (
      <div className="result-card rejected">
        <XCircle size={28} />

        <div>
          <h2>Agent not found</h2>
          <p>
            No matching agent was found in the current registry.
          </p>
        </div>
      </div>
    );
  }

  const approved = result.type === 'approved';

  return (
    <div className={`result-card ${approved ? 'approved' : 'rejected'}`}>
      <div className="result-icon">
        {approved ? (
          <CheckCircle2 size={32} />
        ) : (
          <XCircle size={32} />
        )}
      </div>

      <div className="result-content">
        <span className="result-label">
          {approved ? 'ACCESS APPROVED' : 'ACCESS REJECTED'}
        </span>

        <h2>{result.agent.name}</h2>

        <p>
          Trust score:{' '}
          <strong>{result.score}/100</strong>
          {' · '}
          Required:{' '}
          <strong>{result.required}/100</strong>
        </p>

        <div className="result-score">
          <ShieldCheck size={16} />
          {approved
            ? 'Agent meets the required trust threshold.'
            : 'Agent does not meet the required trust threshold.'}
        </div>
      </div>
    </div>
  );
}

export default TrustChecker;