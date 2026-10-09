import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ShieldCheck,
  ArrowUpRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  FEATURED_IDS,
  MIN_FEEDBACK,
  MIN_CLIENTS,
  getScoredAgentIds,
  loadAgent,
  loadAgents,
  checkGate,
} from '../lib/registry';

function shortAddress(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
}

function evidenceStatus(agent) {
  if (agent.credit) return { label: 'Scored by AgentCredit', tone: 'verified' };
  if (agent.feedbackCount === 0) return { label: 'No feedback yet', tone: 'low' };
  if (agent.usable) return { label: 'Ready to analyze', tone: 'verified' };

  const b = agent.breakdown;
  if (!b.success && !b.validation && !b.rating && b.offScaleEntries > 0) {
    return { label: 'Off-scale feedback', tone: 'low' };
  }

  return { label: 'Too little evidence', tone: 'low' };
}

function describeStat(agent) {
  const b = agent.breakdown;

  if (b.success) {
    return { label: 'Win rate', value: `${b.success.rate}% (${b.success.positive}/${b.success.total})` };
  }
  if (b.validation) {
    return { label: 'Check pass rate', value: `${b.validation.rate}% (${b.validation.positive}/${b.validation.total})` };
  }
  if (b.rating) {
    return { label: 'Average rating', value: String(b.rating.avg) };
  }
  if (b.offScaleEntries > 0) {
    return { label: 'Feedback type', value: 'Elo-style, not scored' };
  }
  return { label: 'Feedback', value: 'none yet' };
}

function Agents() {
  const [agents, setAgents] = useState({});
  const [loading, setLoading] = useState(true);
  const [lookup, setLookup] = useState('');
  const [lookupError, setLookupError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const scored = await getScoredAgentIds();
      const ids = [...new Set([...scored, ...FEATURED_IDS])];

            await loadAgents(
        ids,
        (agent) => {
          if (!cancelled) {
            setAgents((previous) => ({ ...previous, [agent.id]: agent }));
          }
        },
        () => cancelled
      );

      if (!cancelled) setLoading(false);
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  const list = useMemo(
    () =>
      Object.values(agents)
        .filter((agent) => agent.exists)
        .sort((a, b) => {
          if (Boolean(b.credit) !== Boolean(a.credit)) {
            return Boolean(b.credit) - Boolean(a.credit);
          }
          return b.feedbackCount - a.feedbackCount;
        }),
    [agents]
  );

  const failed = Object.values(agents).filter((agent) => agent.error).length;

  async function handleLookup(event) {
    event.preventDefault();

    const id = lookup.trim();
    setLookupError('');

    if (!/^\d+$/.test(id)) {
      setLookupError('Enter an agent number, for example 20.');
      return;
    }

    try {
      const agent = await loadAgent(Number(id));

      if (!agent.exists) {
        setLookupError(`Agent #${id} is not registered.`);
        return;
      }

      setAgents((previous) => ({ ...previous, [agent.id]: agent }));
      setLookup('');
    } catch {
      setLookupError('Could not load that agent. Please try again.');
    }
  }

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
              Real ERC-8004 agents on Monad testnet, with their onchain trust
              signals.
            </p>
          </div>

          <form className="search-box" onSubmit={handleLookup}>
            <Search size={17} />
            <input
              placeholder="Look up agent number, e.g. 20"
              value={lookup}
              onChange={(event) => setLookup(event.target.value)}
            />
          </form>
        </div>

        <p className="live-note">
          Live data read from the ERC-8004 registries and the AgentCredit
          contract. Agents need at least {MIN_FEEDBACK} feedback entries from{' '}
          {MIN_CLIENTS} different clients before AgentCredit will score them.
        </p>

        {lookupError && <p className="lookup-error">{lookupError}</p>}
                <TrustGate scored={list.filter((agent) => agent.credit)} />

        {loading && list.length === 0 && (
          <div className="result-card loading-card">
            <Loader2 size={28} className="spin" />

            <div>
              <h2>Loading agents from Monad testnet</h2>
              <p>Reading the registries directly from the chain.</p>
            </div>
          </div>
        )}

        <div className="agent-grid">
          {list.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>

        {failed > 0 && (
          <p className="live-note">
            {failed} agent(s) could not be loaded right now. Refresh to retry.
          </p>
        )}
      </div>
    </main>
  );
}

function TrustGate({ scored }) {
  const [agentId, setAgentId] = useState('10');
  const [minScore, setMinScore] = useState(70);
  const [minCoverage, setMinCoverage] = useState(20);
  const [maxAgeDays, setMaxAgeDays] = useState(0);
  const [state, setState] = useState({ status: 'idle' });

  async function run() {
    if (!/^\d+$/.test(agentId)) {
      setState({ status: 'error', message: 'Enter an agent number.' });
      return;
    }

    setState({ status: 'loading' });

    try {
      const [open, agent] = await Promise.all([
        checkGate(Number(agentId), minScore, maxAgeDays, minCoverage),
        loadAgent(Number(agentId)),
      ]);

      setState({ status: 'done', open, credit: agent.credit, id: Number(agentId) });
    } catch {
      setState({ status: 'error', message: 'Could not read the contract. Please try again.' });
    }
  }

  function reasons() {
    const credit = state.credit;
    if (!credit) return ['No AgentCredit record exists for this agent yet.'];

    const list = [];
    const ageDays = state.ageDays ?? 0;

    if (credit.score < minScore) list.push(`score ${credit.score} is below ${minScore}`);
    if (credit.coverage < minCoverage) list.push(`coverage ${credit.coverage}% is below ${minCoverage}%`);
    if (maxAgeDays > 0 && ageDays > maxAgeDays) list.push('the record is older than the allowed age');

    return list;
  }

  return (
    <section className="gate-panel">
      <span className="section-label">Trust-gated actions</span>
      <h2>Would a protected action let this agent in?</h2>

      <p className="gate-sub">
        This calls <code>isTrusted</code> on the AgentCredit contract on Monad
        testnet. Any app or contract can gate an action on the same call.
      </p>

      <div className="gate-grid">
        <label>
          Agent number
          <input value={agentId} onChange={(event) => setAgentId(event.target.value)} />
        </label>

        <label>
          Minimum score: {minScore}
          <input
            type="range"
            min="0"
            max="100"
            value={minScore}
            onChange={(event) => setMinScore(Number(event.target.value))}
          />
        </label>

        <label>
          Minimum coverage: {minCoverage}%
          <input
            type="range"
            min="0"
            max="100"
            value={minCoverage}
            onChange={(event) => setMinCoverage(Number(event.target.value))}
          />
        </label>

        <label>
          Max record age in days (0 = any)
          <input
            type="number"
            min="0"
            value={maxAgeDays}
            onChange={(event) => setMaxAgeDays(Math.max(0, Number(event.target.value) || 0))}
          />
        </label>
      </div>

      {scored.length > 0 && (
        <div className="gate-picks">
          Agents with onchain records:
          {scored.map((agent) => (
            <button
              key={agent.id}
              className="gate-chip"
              onClick={() => setAgentId(String(agent.id))}
            >
              #{agent.id}
            </button>
          ))}
        </div>
      )}

      <button className="verify-button" onClick={run} disabled={state.status === 'loading'}>
        {state.status === 'loading' ? 'Asking the contract...' : 'Run the gate'}
      </button>

      {state.status === 'error' && <p className="verify-bad">{state.message}</p>}

      {state.status === 'done' && state.open && (
        <p className="verify-good">
          GATE OPEN. The contract returned true for agent #{state.id}
          {state.credit
            ? ` (score ${state.credit.score}, coverage ${state.credit.coverage}%).`
            : '.'}
        </p>
      )}

      {state.status === 'done' && !state.open && (
        <p className="verify-bad">
          GATE CLOSED. The contract returned false: {reasons().join('; ')}.
        </p>
      )}

      <pre className="gate-code">{`require(
  IAgentCredit(0x0b0792a328c2253e4F23f98875ebb7DEEa859971)
    .isTrusted(agentId, ${minScore}, ${Math.round(maxAgeDays * 86400)}, ${minCoverage}),
  "agent not trusted"
);`}</pre>
    </section>
  );
}

function AgentCard({ agent }) {
  const status = evidenceStatus(agent);
  const title = agent.name || `Agent #${agent.id}`;

    const stat = describeStat(agent);

  return (
    <Link to={`/trust-checker?agent=${agent.id}`} className="agent-card">
      <div className="agent-card-top">
        <div className="agent-avatar">
          <ShieldCheck size={21} />
        </div>

        <div className={`status ${status.tone}`}>
          <CheckCircle2 size={13} />
          {status.label}
        </div>
      </div>

      <h3>{title}</h3>

      <p>
        {agent.description ||
          (agent.registrationReadable
            ? 'No description provided.'
            : 'Registration file is stored externally.')}
      </p>

      <p className="agent-meta">
        Agent #{agent.id} - owner {shortAddress(agent.owner)}
      </p>

      {agent.credit ? (
        <div className="agent-score-row">
          <div>
            <span>AgentCredit score</span>
            <strong>{agent.credit.score}</strong>
          </div>

          <div className="score-bar">
            <div style={{ width: `${agent.credit.score}%` }} />
          </div>

          <p className="agent-meta">
            Coverage {agent.credit.coverage}% - recorded onchain
          </p>
        </div>
      ) : (
        <div className="agent-score-row">
          <div>
                        <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        </div>
      )}

      <div className="agent-card-footer">
        <span>
          {agent.feedbackCount} feedback from {agent.clientCount} clients
        </span>

        <ArrowUpRight size={17} />
      </div>
    </Link>
  );
}

export default Agents;
