import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Navbar from './components/Navbar';
import Home from './pages/Home';
import Agents from './pages/Agents';
import AgentProfile from './pages/AgentProfile';
import TrustChecker from './pages/TrustChecker';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/agents/:agentId" element={<AgentProfile />} />
          <Route path="/trust-checker" element={<TrustChecker />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;