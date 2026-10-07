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
} from '../lib/registry';

function shortAddress(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
}

function evidenceStatus(agent) {
  if (agent.credit) return { label: 'Scored by AgentCredit', tone: 'verified' };
  if (agent.feedbackCount === 0) return { label: 'No feedback yet', tone: 'low' };
  if (!agent.scaleValid) return { label: 'Off-scale feedback', tone: 'low' };
  if (!agent.enoughEvidence) return { label: 'Too little evidence', tone: 'low' };
  return { label: 'Ready to analyze', tone: 'verified' };
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

function AgentCard({ agent }) {
  const status = evidenceStatus(agent);
  const title = agent.name || `Agent #${agent.id}`;

  const summaryText =
    agent.summary === null
      ? 'n/a'
      : agent.scaleValid
        ? String(Math.round(agent.summary * 100) / 100)
        : `${Math.round(agent.summary * 100) / 100} (off-scale)`;

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
            <span>Registry summary</span>
            <strong>{summaryText}</strong>
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
