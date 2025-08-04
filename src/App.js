import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';

import { DataProvider } from './contexts/DataContext';
import Dashboard from './components/Dashboard';
import ClientManagement from './components/ClientManagement';
import Invoicing from './components/Invoicing';
import RouteOptimization from './components/RouteOptimization';
import DailySchedule from './components/DailySchedule';
import BusinessSettings from './components/BusinessSettings';

function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '🏠' },
    { path: '/schedule', label: 'Schedule', icon: '📅' },
    { path: '/clients', label: 'Clients', icon: '👥' },
    { path: '/invoicing', label: 'Invoicing', icon: '💰' },
    { path: '/routes', label: 'Routes', icon: '🗺️' },
    { path: '/settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <span className="brand-icon">🌳</span>
          <span className="brand-text">Trusting & Affordable Tree Service</span>
        </div>
        
        <button 
          className={`nav-toggle ${isMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle navigation"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <DataProvider>
      <Router>
        <div className="app">
          <Navigation />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/schedule" element={<DailySchedule />} />
              <Route path="/clients/*" element={<ClientManagement />} />
              <Route path="/invoicing/*" element={<Invoicing />} />
              <Route path="/routes" element={<RouteOptimization />} />
              <Route path="/settings" element={<BusinessSettings />} />
            </Routes>
          </main>
        </div>
      </Router>
    </DataProvider>
  );
}

export default App;
