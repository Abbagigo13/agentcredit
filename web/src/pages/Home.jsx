import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Activity,
  Fingerprint,
  CheckCircle2,
  Lock,
} from 'lucide-react';

const stats = [
  { value: 'ERC-8004', label: 'Identity standard' },
  { value: '0–100', label: 'Trust score' },
  { value: 'Onchain', label: 'Reputation data' },
];

function Home() {
  return (
    <main>
      <section className="hero">
        <div className="hero-glow" />

        <div className="container hero-content">
          <div className="hero-badge">
            <span className="pulse-dot" />
            Built for the agent economy
          </div>

          <h1>
            Trust infrastructure
            <br />
            for <span className="gradient-text">autonomous agents.</span>
          </h1>

          <p className="hero-description">
            AgentCredit transforms onchain identity, reputation and validation
            signals into a transparent trust score for AI agents.
          </p>

          <div className="hero-actions">
            <Link to="/agents" className="primary-button">
              Explore Agents
              <ArrowRight size={17} />
            </Link>

            <Link to="/trust-checker" className="secondary-button">
              Check Trust
            </Link>
          </div>

          <div className="stats-row">
            {stats.map((stat) => (
              <div className="stat" key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="container">
          <div className="section-heading">
            <span className="section-label">Why AgentCredit</span>

            <h2>
              Make agent trust
              <br />
              <span className="gradient-text">verifiable.</span>
            </h2>

            <p>
              AI agents need a way to prove that they can be trusted before
              interacting with other agents, users and protocols.
            </p>
          </div>

          <div className="feature-grid">
            <FeatureCard
              icon={<Fingerprint />}
              title="Onchain Identity"
              description="Identify agents through ERC-8004 compatible onchain identities."
            />

            <FeatureCard
              icon={<Activity />}
              title="Reputation Signals"
              description="Aggregate performance and reputation signals into one transparent view."
            />

            <FeatureCard
              icon={<ShieldCheck />}
              title="Trust Score"
              description="Turn raw reputation data into an easy-to-understand score from 0 to 100."
            />

            <FeatureCard
              icon={<Lock />}
              title="Trust-Gated Actions"
              description="Let applications require a minimum trust score before allowing an action."
            />
          </div>
        </div>
      </section>

      <section className="how-section">
        <div className="container">
          <div className="section-heading center">
            <span className="section-label">How it works</span>

            <h2>
              From agent activity
              <br />
              to <span className="gradient-text">trust.</span>
            </h2>
          </div>

          <div className="steps">
            <Step
              number="01"
              title="Identify"
              text="An AI agent gets an onchain identity."
            />

            <Step
              number="02"
              title="Perform"
              text="The agent performs tasks and builds a track record."
            />

            <Step
              number="03"
              title="Evaluate"
              text="Reputation and validation signals are analyzed."
            />

            <Step
              number="04"
              title="Trust"
              text="AgentCredit produces a transparent trust score."
            />
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <div className="cta-card">
            <CheckCircle2 size={30} />

            <h2>Know who you're interacting with.</h2>

            <p>
              Check an agent's trust profile before giving it access to your
              application, data or workflow.
            </p>

            <Link to="/trust-checker" className="primary-button">
              Check an Agent
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>

      <h3>{title}</h3>

      <p>{description}</p>
    </div>
  );
}

function Step({ number, title, text }) {
  return (
    <div className="step">
      <span>{number}</span>

      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}

export default Home;