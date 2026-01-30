import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Settings from './pages/Settings'
import Architecture from './pages/Architecture'
import Cooking from './pages/Cooking'
import Serving from './pages/Serving'
import Pantry from './pages/Pantry'
import { SettingsProvider } from './contexts/SettingsContext'
import './App.css'

function AppContent() {
  const location = useLocation();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="App">
      <header className="App-header">
        <div className="masthead">
          <h1>The Klaus Daily News</h1>
          <div className="masthead-ornament">
            <span className="masthead-dot"></span>
          </div>
          <div className="masthead-meta">
            <span>{today}</span>
            <span>Digital Edition</span>
          </div>
        </div>
        <nav>
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Link>
          <Link to="/cooking" className={location.pathname === '/cooking' ? 'active' : ''}>Cooking</Link>
          <Link to="/serving" className={location.pathname === '/serving' ? 'active' : ''}>Serving</Link>
          <Link to="/pantry" className={location.pathname === '/pantry' ? 'active' : ''}>Pantry</Link>
        </nav>
      </header>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/cooking" element={<Cooking />} />
            <Route path="/serving" element={<Serving />} />
            <Route path="/pantry" element={<Pantry />} />
            <Route path="/kitchen/system" element={<Settings />} />
            {/* Legacy redirect for old settings path */}
            <Route path="/settings/system" element={<Settings />} />
            <Route path="/architecture" element={<Architecture />} />
          </Routes>
        </main>
    </div>
  )
}

function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </SettingsProvider>
  )
}

export default App
