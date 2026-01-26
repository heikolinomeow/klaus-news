import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Settings from './pages/Settings'
import Architecture from './pages/Architecture'
import Cooking from './pages/Cooking'
import { SettingsProvider } from './contexts/SettingsContext'
import './App.css'

function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
      <div className="App">
        <header className="App-header">
          <h1>Klaus News</h1>
          <nav>
            <Link to="/">New</Link>
            <Link to="/cooking">Cooking</Link>
            <Link to="/settings/system">Settings</Link>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/cooking" element={<Cooking />} />
            <Route path="/settings/system" element={<Settings />} />
            <Route path="/architecture" element={<Architecture />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
    </SettingsProvider>
  )
}

export default App
