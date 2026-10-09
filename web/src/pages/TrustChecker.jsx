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
      setResult({ type: 'streaming', agentId: id, steps: [] });
          setLoading(true);

      try {
        const response = await fetch(`${ANALYST_URL}/api/analyze-stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: Number(id), threshold: required, record }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setResult({ type: 'error', message: data.error || 'Analysis failed.' });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let steps = [];
        let finished = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line);

            if (event.type === 'tool_call') {
              steps = [...steps, { tool: event.name, args: event.args }];
              setResult({ type: 'streaming', agentId: id, steps });
            } else if (event.type === 'tool_result') {
              steps = steps.map((step, index) =>
                index === steps.length - 1 ? { ...step, result: event.result } : step
              );
              setResult({ type: 'streaming', agentId: id, steps });
            } else if (event.type === 'final') {
              finished = true;
              setResult({ type: 'live', data: event.data });
            } else if (event.type === 'error') {
              finished = true;
              setResult({ type: 'error', message: event.message });
            }
          }
        }

        if (!finished) {
          setResult({
            type: 'error',
            message: 'The connection closed before the analysis finished. Please try again.',
          });
        }
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
      if (!r.exists) return 'Agent is not registered';
      return r.name
        ? `Found "${r.name}", active: ${String(r.active)}`
        : 'Registered (registration file stored externally)';
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

const SIGNALS = [
  {
    key: 'successRate',
    label: 'Task success',
    note: 'win/loss outcomes',
    weight: 40,
    value: (b) => b?.success?.rate ?? null,
    detail: (b) =>
      b?.success ? `${b.success.positive} of ${b.success.total} positive` : '',
  },
  {
    key: 'validationRate',
    label: 'Validation',
    note: 'pass/fail checks',
    weight: 25,
    value: (b) => b?.validation?.rate ?? null,
    detail: (b) =>
      b?.validation ? `${b.validation.positive} of ${b.validation.total} passed` : '',
  },
  {
    key: 'reputationScore',
    label: 'Reputation',
    note: 'percentage ratings',
    weight: 20,
    value: (b) => b?.rating?.avg ?? null,
    detail: (b) =>
      b?.rating ? `${b.rating.count} rating(s), average ${b.rating.avg}` : '',
  },
  {
    key: 'reliability',
    label: 'Reliability',
    note: 'no onchain source yet',
    weight: 10,
    value: () => null,
    detail: () => '',
  },
  {
    key: 'recency',
    label: 'Recency',
    note: 'no onchain source yet',
    weight: 5,
    value: () => null,
    detail: () => '',
  },
];

function ScoreBreakdown({ trace }) {
  const breakdown = trace.find((t) => t.tool === 'get_feedback_breakdown')?.result;
  const scored = trace.find((t) => t.tool === 'compute_trust_score')?.result;

  if (!scored || scored.error) return null;

  const missing = scored.missing || [];
  const coverage = scored.coverage || 0;

  return (
    <div className="breakdown">
      <span className="trace-title">How the score was built</span>

      <p className="breakdown-sub">
        {scored.score === null
          ? 'No signal had enough evidence, so no score was produced.'
          : `Final score ${scored.score}/100. Evidence covers ${Math.round(
              coverage * 100
            )}% of the scoring model, and the score is weighted over the signals that have evidence.`}
      </p>

      {SIGNALS.map((signal) => {
        const used = !missing.includes(signal.key);
        const value = used ? signal.value(breakdown) : null;
        const points =
          used && value !== null && coverage > 0
            ? (value * signal.weight) / (coverage * 100)
            : null;

        return (
          <div className={`bd-row ${used && value !== null ? '' : 'bd-off'}`} key={signal.key}>
            <div className="bd-head">
              <span>
                {signal.label} <em>{signal.note}</em>
              </span>
              <span>weight {signal.weight}%</span>
            </div>

            {used && value !== null ? (
              <>
                <div className="bd-bar">
                  <div style={{ width: `${Math.min(100, value)}%` }} />
                </div>

                <div className="bd-foot">
                  <span>
                    {value}% - {signal.detail(breakdown)}
                  </span>
                  <span>+{points.toFixed(1)} pts</span>
                </div>
              </>
            ) : (
              <div className="bd-foot">
                <span>No usable evidence</span>
              </div>
            )}
          </div>
        );
      })}

      {(scored.notes || []).map((note, index) => (
        <p className="breakdown-note" key={index}>
          {note}
        </p>
      ))}
    </div>
  );
}

function VerifyRecord({ agentId }) {
  const [state, setState] = useState({ status: 'idle' });

  async function verify() {
    setState({ status: 'loading' });

    try {
      const response = await fetch(`${ANALYST_URL}/api/verify?agentId=${agentId}`);
      const data = await response.json();

      if (!response.ok) {
        setState({ status: 'error', message: data.error || 'Verification failed.' });
        return;
      }

      setState({ status: 'done', data });
    } catch {
      setState({ status: 'error', message: 'Could not reach the analyst server.' });
    }
  }

  const data = state.data;

  return (
    <div className="verify-box">
      <button
        className="verify-button"
        onClick={verify}
        disabled={state.status === 'loading'}
      >
        {state.status === 'loading' ? 'Verifying...' : 'Verify onchain record'}
      </button>

      {state.status === 'error' && <p className="verify-bad">{state.message}</p>}

      {data && !data.recorded && (
        <p className="verify-note">
          No AgentCredit record exists for agent #{data.agentId} yet. Tick
          "Record verdict onchain" and run the check to create one.
        </p>
      )}

      {data && data.recorded && data.hashMatches && (
        <p className="verify-good">
          Verified. The score stored onchain ({data.recorded.score}/100,
          coverage {data.recorded.coverage}%) was derived from exactly the
          registry data shown below. The evidence hash matches.
        </p>
      )}

      {data && data.recorded && !data.hashMatches && (
        <p className="verify-bad">
          The registry data has changed since this record was written
          (new feedback or an updated registration). The record says{' '}
          {data.recorded.score}/100; today's data would give{' '}
          {data.currentScore === null ? 'no score' : `${data.currentScore}/100`}.
        </p>
      )}

      {data && data.recorded && (
        <details className="verify-details">
          <summary>Show the evidence behind the hash</summary>

          <p className="verify-note">
            Stored hash: {data.recorded.evidenceHash}
            <br />
            Recomputed: {data.recomputedHash}
            <br />
            The hash is keccak256 of the JSON text of this object:
          </p>

          <pre className="analyst-answer">
            {JSON.stringify(data.evidence, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
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
                <ScoreBreakdown trace={data.trace} />
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
                <VerifyRecord agentId={data.agentId} />
        <pre className="analyst-answer">{data.answer}</pre>

        <span className="trace-meta">
          {data.rounds} model rounds - {(data.durationMs / 1000).toFixed(0)}s - live data from Monad testnet
                    {data.cached ? ' - served from cache' : ''}
        </span>
      </div>
    </div>
  );
}

function Result({ result }) {
    if (result.type === 'streaming') {
    return (
      <div className="result-card loading-card">
        <Loader2 size={28} className="spin" />

        <div className="result-content">
          <h2>Qwen is analyzing agent #{result.agentId}</h2>
          <p>
            Each step appears as the agent runs it. A full analysis takes
            around 30 seconds.
          </p>

          <div className="trace">
            {result.steps.map((step, index) => (
              <div className="trace-step" key={index}>
                <span className="trace-index">{index + 1}</span>

                <div>
                  <code>{step.tool}</code>
                  <p>{step.result ? summarizeStep(step) : 'Running...'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
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