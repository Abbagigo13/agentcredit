import { Link, NavLink } from 'react-router-dom';
import { ShieldCheck, Search } from 'lucide-react';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-inner">
        <Link to="/" className="logo">
          <div className="logo-icon">
            <ShieldCheck size={19} />
          </div>

          <span>
            Agent<span>Credit</span>
          </span>
        </Link>

        <div className="nav-links">
          <NavLink
            to="/"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Home
          </NavLink>

          <NavLink
            to="/agents"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Agents
          </NavLink>

          <NavLink
            to="/trust-checker"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Trust Checker
          </NavLink>
        </div>

        <Link to="/trust-checker" className="nav-button">
          <Search size={16} />
          Check Agent
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;