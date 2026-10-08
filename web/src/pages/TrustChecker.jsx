import { useState } from 'react';
import {
  Search,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';

const ANALYST_URL = import.meta.env.VITE_ANALYST_URL || 'http://localhost:8787';

function TrustChecker() {
    const [agentId, setAgentId] = useState(
    new URLSearchParams(window.location.search).get('agent') || ''
  );
  const [threshold, setThreshold] = useState('70');
  const [result, setResult] = useState(null);
  const [record, setRecord] = useState(false);
  const [loading, setLoading] = useState(false);

  async function checkTrust() {
    const id = agentId.toLowerCase().trim();
    const required = Number(threshold);

    if (!id) return;

    if (/^\d+$/.test(id)) {
      setLoading(true);
      setResult({ type: 'loading', agentId: id });

      try {
        const response = await fetch(`${ANALYST_URL}/api/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ agentId: Number(id), threshold: required, record }),
        });
        const data = await response.json();

        if (!response.ok) {
          setResult({ type: 'error', message: data.error || 'Analysis failed.' });
          return;
        }

        setResult({ type: 'live', data });
      } catch {
        setResult({
          type: 'error',
          message: 'Could not reach the analyst server. Is it running?',
        });
      } finally {
        setLoading(false);
      }

      return;
    }

        setResult({
      type: 'not-found',
      message: 'Enter an agent number from the Agents page, for example 10.',
    });
  }

  return (
    <main className="page">
      <div className="container checker-container">
        <div className="checker-heading">
          <span className="section-label">Trust Checker</span>

          <h1>
            Should you <span className="gradient-text">trust</span> this agent?
          </h1>

          <p>
            Check an agent's trust score against the minimum requirement for your application.
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
                                placeholder="Try: 10"
              />
            </div>

            <span className="input-hint">
                            Enter an ERC-8004 agent number from the Agents page, for
              example 10 or 20.
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

          <label className="record-toggle">
            <input
              type="checkbox"
              checked={record}
              onChange={(event) => setRecord(event.target.checked)}
            />
            <span>
              Record verdict onchain (Monad testnet, live agent numbers only)
            </span>
          </label>

          <button
            className="check-button"
            onClick={checkTrust}
            disabled={loading}
          >
            {loading ? (
              <>
                Checking...
                <Loader2 size={17} className="animate-spin" />
              </>
            ) : (
              <>
                Check Trust
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </div>

        {result && <Result result={result} />}
      </div>
    </main>
  );
}

function summarizeStep(step) {
  const r = step.result;

  if (!r) return 'No result';
  if (r.error) return `Error: ${r.error}`;

  switch (step.tool) {
    case 'get_agent_identity':
      return r.exists
        ? `Found "${r.name || 'unnamed agent'}", active: ${String(r.active)}`
        : 'Agent is not registered';
    case 'get_reputation':
      return r.feedbackCount > 0
        ? `${r.feedbackCount} feedback entries from ${r.clientCount} clients, summary ${r.summaryValue}`
        : 'No reputation feedback found';
    case 'compute_trust_score':
      return r.score === null
        ? 'Not enough signals to score'
        : `Score ${r.score} (${r.level}), ${Math.round(r.coverage * 100)}% signal coverage`;
    case 'check_threshold':
      return r.meetsThreshold ? 'Meets the threshold' : 'Below the threshold';
          case 'record_onchain':
      return r.recorded
        ? `Recorded ${r.score}/100 onchain in block ${r.blockNumber}`
        : 'Not recorded';
            case 'get_feedback_breakdown':
      return `${r.entries} feedback entries from ${r.clientCount} clients`;
    default:
      return 'Done';
  }
}

function LiveResult({ data }) {
  const approved = data.verdict === 'APPROVE';
  const label = approved
    ? 'ACCESS APPROVED'
    : data.verdict === 'REJECT'
      ? 'ACCESS REJECTED'
      : 'INSUFFICIENT DATA';

  return (
    <div className={`result-card live-result ${approved ? 'approved' : 'rejected'}`}>
      <div className="result-icon">
        {approved ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
      </div>

      <div className="result-content">
        <span className="result-label">{label}</span>

        <h2>Agent #{data.agentId}</h2>

        <p>
          Trust score: <strong>{data.score ?? 'n/a'}/100</strong>
          {' - '}
          Required: <strong>{data.threshold}/100</strong>
        </p>

        <div className="trace">
          <span className="trace-title">Qwen 3.8 Max reasoning steps</span>

          {data.trace?.map((step, index) => (
            <div className="trace-step" key={index}>
              <span className="trace-index">{index + 1}</span>

              <div>
                <code>{step.tool}</code>
                <p>{summarizeStep(step)}</p>
              </div>
            </div>
          ))}
        </div>
                {data.onchain && (
          <div className="onchain-box">
            <span className="trace-title">Recorded onchain</span>

            <p>
              Score {data.onchain.score}/100 - coverage {data.onchain.coverage}%
            </p>

            <a
              href={`https://testnet.monadexplorer.com/tx/${data.onchain.txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              View transaction on Monad Explorer
            </a>

            <code className="hash">
              Evidence hash: {data.onchain.evidenceHash}
            </code>
          </div>
        )}
        <pre className="analyst-answer">{data.answer}</pre>

        <span className="trace-meta">
          {data.rounds} model rounds - {(data.durationMs / 1000).toFixed(0)}s - live data from Monad testnet
        </span>
      </div>
    </div>
  );
}

function Result({ result }) {
  if (result.type === 'loading') {
    return (
      <div className="result-card loading">
        <Loader2 size={28} className="animate-spin" />
        <div>
          <h2>Analyzing Agent #{result.agentId}...</h2>
          <p>Fetching onchain signals and calculating trust score.</p>
        </div>
      </div>
    );
  }

  if (result.type === 'error') {
    return (
      <div className="result-card rejected">
        <XCircle size={28} />
        <div>
          <h2>Error</h2>
          <p>{result.message}</p>
        </div>
      </div>
    );
  }

  if (result.type === 'not-found') {
    return (
      <div className="result-card rejected">
        <XCircle size={28} />
        <div>
          <h2>Agent not found</h2>
          <p>No matching agent was found in the current registry.</p>
        </div>
      </div>
    );
  }

  if (result.type === 'live') {
    return <LiveResult data={result.data} />;
  }

  const approved = result.type === 'approved';

  return (
    <div className={`result-card ${approved ? 'approved' : 'rejected'}`}>
      <div className="result-icon">
        {approved ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
      </div>

      <div className="result-content">
        <span className="result-label">
          {approved ? 'ACCESS APPROVED' : 'ACCESS REJECTED'}
        </span>

        <h2>{result.agent.name}</h2>

        <p>
          Trust score: <strong>{result.score}/100</strong>
          {' · '}
          Required: <strong>{result.required}/100</strong>
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