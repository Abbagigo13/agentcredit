import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from 'react-router-dom';

import Navbar from './components/Navbar';
import Home from './pages/Home';
import Agents from './pages/Agents';
import TrustChecker from './pages/TrustChecker';
 
function AgentRedirect() {
  const { agentId } = useParams();

  return (
    <Navigate
      to={`/trust-checker?agent=${encodeURIComponent(agentId)}`}
      replace
    />
  );
}
function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/agents" element={<Agents />} />
                    <Route path="/agents/:agentId" element={<AgentRedirect />} />
          <Route path="/trust-checker" element={<TrustChecker />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;