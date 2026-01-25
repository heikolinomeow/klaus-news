import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Settings from './pages/Settings'
import Prompts from './pages/Prompts'
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
            <Link to="/">Home</Link>
            <Link to="/settings/system">Settings</Link>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/settings/system" element={<Settings />} />
            <Route path="/prompts" element={<Prompts />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
    </SettingsProvider>
  )
}

export default App
