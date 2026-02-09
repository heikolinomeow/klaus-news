import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Home from './pages/Home'
import Settings from './pages/Settings'
import Architecture from './pages/Architecture'
import Cooking from './pages/Cooking'
import Serving from './pages/Serving'
import Pantry from './pages/Pantry'
import Login from './pages/Login'
import { SettingsProvider } from './contexts/SettingsContext'
import { AuthProvider } from './contexts/AuthContext'
import './App.css'
import ProtectedRoute from './components/ProtectedRoute'

function AppContent() {
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
          {isAuthenticated && (
            <button onClick={handleLogout} className="logout-button">Logout</button>
          )}
        </nav>
      </header>
        <main>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/cooking" element={<ProtectedRoute><Cooking /></ProtectedRoute>} />
            <Route path="/serving" element={<ProtectedRoute><Serving /></ProtectedRoute>} />
            <Route path="/pantry" element={<ProtectedRoute><Pantry /></ProtectedRoute>} />
            <Route path="/kitchen/system" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            {/* Legacy redirect for old settings path */}
            <Route path="/settings/system" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/architecture" element={<Architecture />} />
          </Routes>
        </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  )
}

export default App
