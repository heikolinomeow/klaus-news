## V-2
Status: PROPOSED
Risk: 2/10

### Goal
Store username and password in environment variables. Credentials never hardcoded. AUTH_PASSWORD has no default value to enforce explicit configuration.

### Files (verified + to create)
#### Existing (verified)
- backend/app/config.py
- .env.example

### Patch Operations

#### OP-4 — Add AUTH_USERNAME to Settings
- File: `backend/app/config.py`
- Operation: INSERT AFTER

- Target location (required for non-CREATE ops)
  - Anchor snippet:
    - `teams_channels: str = "[]"  # JSON array of {name, webhookUrl} objects`

- Change:
  - Insert this exact text:
    - ```

    # Authentication (V-2, V-11)
    auth_username: str = "admin"
    auth_password: str  # Required, no default (V-11)
    auth_jwt_secret: str  # Required, no default (V-11)
    auth_session_expiry_hours: int = 24
```

- Why (1 sentence, must map to specs):
  - Adds AUTH_USERNAME (default "admin"), AUTH_PASSWORD, AUTH_JWT_SECRET (required), and AUTH_SESSION_EXPIRY_HOURS (default 24) to Settings (V-2, V-11).

#### OP-5 — Add AUTH variables to .env.example
- File: `.env.example`
- Operation: INSERT AFTER

- Target location (required for non-CREATE ops)
  - Anchor snippet:
    - `DEBUG=true`

- Change:
  - Insert this exact text:
    - ```

# ============================================================================
# Authentication (V-2, V-11)
# ============================================================================
# AUTH_USERNAME: Login username (default: admin)
AUTH_USERNAME=admin

# AUTH_PASSWORD: Login password (REQUIRED - app will not start without this)
# Set a strong password for your deployment
AUTH_PASSWORD=

# AUTH_JWT_SECRET: Secret key for signing JWT tokens (REQUIRED)
# Generate a strong random string, e.g.: openssl rand -hex 32
AUTH_JWT_SECRET=

# AUTH_SESSION_EXPIRY_HOURS: JWT session duration in hours (default: 24)
AUTH_SESSION_EXPIRY_HOURS=24
```

- Why (1 sentence, must map to specs):
  - Documents AUTH_USERNAME, AUTH_PASSWORD, AUTH_JWT_SECRET, AUTH_SESSION_EXPIRY_HOURS environment variables (V-2, V-11).

---

## V-3
Status: PROPOSED
Risk: 3/10

### Goal
Create POST /auth/login endpoint (accepts username/password, returns JWT), POST /auth/logout endpoint (optional, JWT is stateless), GET /auth/me endpoint (returns authentication status).

### Files (verified + to create)
#### Existing (verified)
- backend/app/api/auth.py (created in V-1 OP-3)
- backend/app/main.py

### Patch Operations

Note: OP-3 (V-1) already creates the auth.py router with all three endpoints. No additional patches needed.

### NO-OP Proof (required if Status=NO-OP)
N/A — Covered by V-1 OP-3.

---

## V-4
Status: PROPOSED
Risk: 4/10

### Goal
Issue JWT token on successful login with 24-hour expiry (configurable via AUTH_SESSION_EXPIRY_HOURS). JWT secret stored in AUTH_JWT_SECRET environment variable.

### Files (verified + to create)
#### Existing (verified)
- backend/app/config.py (modified in V-2 OP-4)
- backend/app/api/auth.py (created in V-1 OP-3)
- backend/requirements.txt
- .env.example (modified in V-2 OP-5)

### Patch Operations

#### OP-6 — Add PyJWT dependency
- File: `backend/requirements.txt`
- Operation: INSERT AFTER

- Target location (required for non-CREATE ops)
  - Anchor snippet:
    - `bleach==6.1.0`

- Change:
  - Insert this exact text:
    - `PyJWT==2.8.0`

- Why (1 sentence, must map to specs):
  - Adds PyJWT library for JWT token encoding/decoding (V-4).

- Safety check (required if risk > 3):
  - Verify `pip install -r requirements.txt` succeeds and `import jwt` works in Python.

---

## V-6
Status: PROPOSED
Risk: 2/10

### Goal
Create login page with username and password input fields. Form submits credentials to backend POST /auth/login.

### Files (verified + to create)
#### Existing (verified)
- frontend/src/App.tsx

#### New (to create)
- frontend/src/pages/Login.tsx (reason: required by specs for login page component)

### Patch Operations

#### OP-10 — Create Login.tsx page component
- File: `frontend/src/pages/Login.tsx`
- Operation: CREATE FILE

- Change:
  - Create file at: `frontend/src/pages/Login.tsx`
  - With EXACT contents:
    - ```tsx
/**
 * Login page component (V-6, V-10)
 */
import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // V-10: Redirect to app if already authenticated
  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch (err: any) {
      // V-1: Show "Invalid credentials" error
      setError(err.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2>Sign In</h2>
        <p className="login-subtitle">Enter your credentials to access The Klaus Daily News</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" disabled={loading} className="login-button">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
```

- Why (1 sentence, must map to specs):
  - Creates login page with username/password form that submits to backend (V-6).

#### OP-11 — Add /login route to App.tsx
- File: `frontend/src/App.tsx`
- Operation: INSERT AFTER

- Target location (required for non-CREATE ops)
  - Anchor snippet:
    - `import Pantry from './pages/Pantry'`

- Change:
  - Insert this exact text:
    - `import Login from './pages/Login'`

- Why (1 sentence, must map to specs):
  - Imports Login page component for routing (V-6).

#### OP-12 — Add login route in Routes
- File: `frontend/src/App.tsx`
- Operation: INSERT BEFORE

- Target location (required for non-CREATE ops)
  - Anchor snippet:
    - `<Route path="/" element={<Home />} />`

- Change:
  - Insert this exact text:
    - `            <Route path="/login" element={<Login />} />
`

- Why (1 sentence, must map to specs):
  - Adds /login route to app routing (V-6).

---

## V-10
Status: PROPOSED
Risk: 1/10

### Goal
If already logged in, redirect from login page to app.

### Files (verified + to create)
#### Existing (verified)
- frontend/src/pages/Login.tsx (created in V-6 OP-10, includes redirect logic)

### Patch Operations

Note: OP-10 (V-6) already includes the auto-redirect logic in Login.tsx:
```tsx
// V-10: Redirect to app if already authenticated
if (isAuthenticated) {
  navigate('/', { replace: true });
  return null;
}
```

### NO-OP Proof (required if Status=NO-OP)
N/A — Covered by V-6 OP-10.

---

## V-12
Status: NO-OP (already satisfied)
Risk: 1/10

### Goal
Credentials are never hardcoded. Configured via environment variables. .env file is gitignored.

### Files (verified + to create)
#### Existing (verified)
- .gitignore

### NO-OP Proof (required if Status=NO-OP)
- Evidence must include:
  - File path(s): `.gitignore`
  - Exact snippet(s) found (copy verbatim):
    - Line 2: `.env`
    - Line 3: `.env.local`
    - Line 4: `.env.*.local`
  - 1 sentence explaining why this proves the spec requirement is already satisfied:
    - The .gitignore file already includes `.env` on line 2, ensuring the .env file with credentials is never committed to version control (V-12).

---

## V-13
Status: NO-OP (already satisfied)
Risk: 2/10

### Goal
Password must be set via environment variable (never hardcoded). JWT secret must be strong and unique per environment. HTTPS in production (Railway provides). Rate limiting optional for internal tool.

### Files (verified + to create)
#### Existing (verified)
- backend/app/config.py (AUTH_PASSWORD has no default, enforcing env var)
- backend/app/main.py (startup validation ensures AUTH_PASSWORD and AUTH_JWT_SECRET are set)

### NO-OP Proof (required if Status=NO-OP)
- Evidence must include:
  - File path(s): `backend/app/config.py` (via V-2 OP-4)
  - Exact snippet(s) found (copy verbatim, from proposed patch):
    - `auth_password: str  # Required, no default (V-11)`
    - `auth_jwt_secret: str  # Required, no default (V-11)`
  - 1 sentence explaining why this proves the spec requirement is already satisfied:
    - The config fields have no default values and pydantic-settings requires them from environment variables, ensuring password and JWT secret are never hardcoded (V-13). HTTPS is provided by Railway. Rate limiting is explicitly optional per spec.

---

## V-1
Status: PROPOSED
Risk: 4/10

### Goal
Implement full authentication flow: unauthenticated users see login screen, login form with username/password, backend verifies credentials against env vars, invalid credentials show error "Invalid credentials", valid credentials create JWT session token and redirect to app, session expires after 24 hours (configurable), logout ends session early.

### Files (verified + to create)
#### Existing (verified)
- backend/app/main.py

#### New (to create)
- backend/app/api/auth.py (reason: required by specs for V-1, V-3 — auth endpoints)

### Patch Operations

#### OP-1 — Add auth router import in main.py
- File: `backend/app/main.py`
- Operation: INSERT AFTER

- Target location (required for non-CREATE ops)
  - Anchor snippet (EXACT from repo line 216):
    - `from app.api import teams`

- Change:
  - Insert this exact text:
    - `from app.api import auth`

- Why (1 sentence, must map to specs):
  - Imports the auth router module to enable authentication endpoints (V-1, V-3).

#### OP-2 — Include auth router at /auth prefix
- File: `backend/app/main.py`
- Operation: INSERT AFTER

- Target location (required for non-CREATE ops)
  - Anchor snippet (EXACT from repo line 217):
    - `app.include_router(teams.router, prefix="/api/teams", tags=["teams"])`

- Change:
  - Insert this exact text:
    - ```
app.include_router(auth.router, prefix="/auth", tags=["auth"])
```

- Why (1 sentence, must map to specs):
  - Mounts auth router at /auth prefix for login/logout/me endpoints (V-3).

- Safety check (required if risk > 3):
  - Verify /auth/login, /auth/logout, /auth/me endpoints respond correctly.

#### OP-3 — Create auth.py router
- File: `backend/app/api/auth.py`
- Operation: CREATE FILE

- Change:
  - Create file at: `backend/app/api/auth.py`
  - With EXACT contents:
    - ```python
"""Authentication API endpoints (V-1, V-3, V-4, V-5)"""
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
import jwt

from app.config import settings

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    expires_at: str


class AuthStatusResponse(BaseModel):
    authenticated: bool
    username: str | None = None


def create_jwt_token(username: str) -> tuple[str, datetime]:
    """Create JWT token with configurable expiry (V-4)"""
    expires_at = datetime.utcnow() + timedelta(hours=settings.auth_session_expiry_hours)
    payload = {
        "sub": username,
        "exp": expires_at,
        "iat": datetime.utcnow()
    }
    token = jwt.encode(payload, settings.auth_jwt_secret, algorithm="HS256")
    return token, expires_at


def verify_jwt_token(token: str) -> dict | None:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, settings.auth_jwt_secret, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_token_from_request(request: Request) -> str | None:
    """Extract JWT token from Authorization header"""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    POST /auth/login - Authenticate user and return JWT (V-1, V-3)

    Accepts username/password, verifies against environment variables,
    returns JWT token on success.
    """
    # Verify credentials against environment variables (V-1, V-2)
    if request.username != settings.auth_username or request.password != settings.auth_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Create JWT token (V-4)
    token, expires_at = create_jwt_token(request.username)

    return LoginResponse(
        token=token,
        expires_at=expires_at.isoformat()
    )


@router.post("/logout")
async def logout():
    """
    POST /auth/logout - Optional endpoint, JWT is stateless (V-3)

    Since JWT is stateless, this endpoint is a no-op.
    Client should discard the token.
    """
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=AuthStatusResponse)
async def get_auth_status(request: Request):
    """
    GET /auth/me - Returns authentication status (V-3)
    """
    token = get_token_from_request(request)
    if not token:
        return AuthStatusResponse(authenticated=False)

    payload = verify_jwt_token(token)
    if not payload:
        return AuthStatusResponse(authenticated=False)

    return AuthStatusResponse(
        authenticated=True,
        username=payload.get("sub")
    )
```

- Why (1 sentence, must map to specs):
  - Creates POST /auth/login, POST /auth/logout, GET /auth/me endpoints as specified (V-3).

---

## V-7
Status: PROPOSED
Risk: 4/10

### Goal
Store JWT in memory or localStorage on frontend. Handle token expiry by redirecting to login. Add JWT to API requests via Authorization header.

### Files (verified + to create)
#### Existing (verified)
- frontend/src/services/api.ts
- frontend/src/App.tsx

#### New (to create)
- frontend/src/contexts/AuthContext.tsx (reason: required for auth state management)

### Patch Operations

#### OP-13 — Create AuthContext.tsx
- File: `frontend/src/contexts/AuthContext.tsx`
- Operation: CREATE FILE

- Change:
  - Create file at: `frontend/src/contexts/AuthContext.tsx`
  - With EXACT contents:
    - ```tsx
/**
 * Auth Context Provider (V-7, V-9)
 *
 * Manages JWT authentication state across the application.
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'klaus_news_token';
const TOKEN_EXPIRY_KEY = 'klaus_news_token_expiry';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

    if (storedToken && storedExpiry) {
      const expiryDate = new Date(storedExpiry);
      if (expiryDate > new Date()) {
        setToken(storedToken);
        // Verify token with backend
        verifyToken(storedToken);
      } else {
        // Token expired, clear storage
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await apiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${tokenToVerify}` }
      });
      if (response.data.authenticated) {
        setToken(tokenToVerify);
        setUsername(response.data.username);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        setToken(null);
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (usernameInput: string, password: string) => {
    const response = await apiClient.post('/auth/login', {
      username: usernameInput,
      password
    });

    const { token: newToken, expires_at } = response.data;

    // Store in localStorage (V-7)
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expires_at);

    setToken(newToken);
    setUsername(usernameInput);
  };

  const logout = () => {
    // V-9: Clear session
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    setToken(null);
    setUsername(null);
    // Redirect handled by ProtectedRoute
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        username,
        token,
        loading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

- Why (1 sentence, must map to specs):
  - Creates auth context for JWT state management with login/logout functions (V-7, V-9).

- Safety check (required if risk > 3):
  - Verify token is stored in localStorage after login and removed after logout.

#### OP-14 — Add JWT interceptor to api.ts (FIXED ANCHOR - single line)
- File: `frontend/src/services/api.ts`
- Operation: INSERT BEFORE

- Target location (required for non-CREATE ops)
  - Anchor snippet (EXACT from repo line 16):
    - `// Posts API (V-11: selectPost removed - selection is at group level now)`

- Change:
  - Insert this exact text:
    - ```

// JWT Authorization header interceptor (V-7)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('klaus_news_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses - redirect to login (V-7)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear stored token
      localStorage.removeItem('klaus_news_token');
      localStorage.removeItem('klaus_news_token_expiry');
      // Redirect to login (if not already there)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

```

- Why (1 sentence, must map to specs):
  - Adds JWT to all API requests and handles token expiry by redirecting to login (V-7).

#### OP-15 — Import AuthProvider in App.tsx
- File: `frontend/src/App.tsx`
- Operation: INSERT AFTER

- Target location (required for non-CREATE ops)
  - Anchor snippet (EXACT from repo line 8):
    - `import { SettingsProvider } from './contexts/SettingsContext'`

- Change:
  - Insert this exact text:
    - `import { AuthProvider } from './contexts/AuthContext'`

- Why (1 sentence, must map to specs):
  - Imports AuthProvider for wrapping app with auth context (V-7).

#### OP-16 — Wrap app with AuthProvider (FIXED ANCHOR - function signature)
- File: `frontend/src/App.tsx`
- Operation: REPLACE

- Target location (required for non-CREATE ops)
  - Anchor snippet (EXACT from repo lines 57-64):
    - ```
function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </SettingsProvider>
  )
}
```

- Change:
  - Replace with this exact text:
    - ```
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
```

- Why (1 sentence, must map to specs):
  - Wraps app with AuthProvider to provide auth context to all components (V-7).

---

## V-8
Status: PROPOSED
Risk: 3/10

### Goal
Redirect unauthenticated users to login page. All routes except login require authentication.

### Files (verified + to create)
#### Existing (verified)
- frontend/src/App.tsx

#### New (to create)
- frontend/src/components/ProtectedRoute.tsx (reason: required for route guard component)

### Patch Operations

#### OP-17 — Create ProtectedRoute.tsx component
- File: `frontend/src/components/ProtectedRoute.tsx`
- Operation: CREATE FILE

- Change:
  - Create file at: `frontend/src/components/ProtectedRoute.tsx`
  - With EXACT contents:
    - ```tsx
/**
 * Protected Route component (V-8)
 *
 * Redirects unauthenticated users to login page.
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading-auth">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
```

- Why (1 sentence, must map to specs):
  - Creates route guard that redirects unauthenticated users to /login (V-8).

#### OP-18 — Import ProtectedRoute in App.tsx (FIXED ANCHOR - uses existing line)
- File: `frontend/src/App.tsx`
- Operation: INSERT AFTER

- Target location (required for non-CREATE ops)
  - Anchor snippet (EXACT from repo line 9):
    - `import './App.css'`

- Change:
  - Insert this exact text:
    - `import ProtectedRoute from './components/ProtectedRoute'`

- Why (1 sentence, must map to specs):
  - Imports ProtectedRoute component for wrapping protected routes (V-8).

#### OP-19 — Wrap Home route with ProtectedRoute
- File: `frontend/src/App.tsx`
- Operation: REPLACE

- Target location (required for non-CREATE ops)
  - Anchor snippet (EXACT from repo line 43):
    - `            <Route path="/" element={<Home />} />`

- Change:
  - Replace with this exact text:
    - `            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />`

- Why (1 sentence, must map to specs):
  - Wraps Home route with ProtectedRoute to require authentication (V-8).

#### OP-20 — Wrap cooking route with ProtectedRoute
- File: `frontend/src/App.tsx`
- Operation: REPLACE

- Target location (required for non-CREATE ops)
  - Anchor snippet (EXACT from repo line 44):
    - `            <Route path="/cooking" element={<Cooking />} />`

- Change:
  - Replace with this exact text:
    - `            <Route path="/cooking" element={<ProtectedRoute><Cooking /></ProtectedRoute>} />`

- Why (1 sentence, must map to specs):
  - Wraps Cooking route with ProtectedRoute to require authentication (V-8).

#### OP-21 — Wrap serving route with ProtectedRoute
- File: `frontend/src/App.tsx`
- Operation: REPLACE

- Target location (required for non-CREATE ops)
  - Anchor snippet (EXACT from repo line 45):
    - `            <Route path="/serving" element={<Serving />} />`

- Change:
  - Replace with this exact text:
    - `            <Route path="/serving" element={<ProtectedRoute><Serving /></ProtectedRoute>} />`

- Why (1 sentence, must map to specs):
  - Wraps Serving route with ProtectedRoute to require authentication (V-8).

#### OP-22 — Wrap pantry route with ProtectedRoute
- File: `frontend/src/App.tsx`
- Operation: REPLACE

- Target location (required for non-CREATE ops)
  - Anchor snippet (EXACT from repo line 46):
    - `            <Route path="/pantry" element={<Pantry />} />`

- Change:
  - Replace with this exact text:
    - `            <Route path="/pantry" element={<ProtectedRoute><Pantry /></ProtectedRoute>} />`

- Why (1 sentence, must map to specs):
  - Wraps Pantry route with ProtectedRoute to require authentication (V-8).

#### OP-23 — Wrap settings route with ProtectedRoute
- File: `frontend/src/App.tsx`
- Operation: REPLACE

- Target location (required for non-CREATE ops)
  - Anchor snippet (EXACT from repo line 47):
    - `            <Route path="/kitchen/system" element={<Settings />} />`

- Change:
  - Replace with this exact text:
    - `            <Route path="/kitchen/system" element={<ProtectedRoute><Settings /></ProtectedRoute>} />`

- Why (1 sentence, must map to specs):
  - Wraps Settings route with ProtectedRoute to require authentication (V-8).

#### OP-23b — Wrap legacy settings route with ProtectedRoute
- File: `frontend/src/App.tsx`
- Operation: REPLACE

- Target location (required for non-CREATE ops)
  - Anchor snippet (EXACT from repo line 49):
    - `            <Route path="/settings/system" element={<Settings />} />`

- Change:
  - Replace with this exact text:
    - `            <Route path="/settings/system" element={<ProtectedRoute><Settings /></ProtectedRoute>} />`

- Why (1 sentence, must map to specs):
  - Wraps legacy Settings route with ProtectedRoute to require authentication (V-8).

---

## V-9
Status: PROPOSED
Risk: 2/10

### Goal
Add logout button that clears session and redirects to login page.

### Files (verified + to create)
#### Existing (verified)
- frontend/src/App.tsx
- frontend/src/contexts/AuthContext.tsx (created in V-7 OP-13, includes logout function)

### Patch Operations

#### OP-24 — Add logout handler to AppContent (FIXED ANCHOR - single line)
- File: `frontend/src/App.tsx`
- Operation: INSERT AFTER

- Target location (required for non-CREATE ops)
  - Anchor snippet (EXACT from repo line 12):
    - `  const location = useLocation();`

- Change:
  - Insert this exact text:
    - ```
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
```

- Why (1 sentence, must map to specs):
  - Adds logout handler that clears session and redirects to login (V-9).

#### OP-25 — Add useAuth import and useNavigate
- File: `frontend/src/App.tsx`
- Operation: REPLACE

- Target location (required for non-CREATE ops)
  - Anchor snippet (EXACT from repo line 1):
    - `import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'`

- Change:
  - Replace with this exact text:
    - ```
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
```

- Why (1 sentence, must map to specs):
  - Imports useNavigate and useAuth for logout functionality (V-9).

#### OP-26 — Add logout button to nav (FIXED ANCHOR - exact whitespace)
- File: `frontend/src/App.tsx`
- Operation: REPLACE

- Target location (required for non-CREATE ops)
  - Anchor snippet (EXACT from repo line 38):
    - `          <Link to="/pantry" className={location.pathname === '/pantry' ? 'active' : ''}>Pantry</Link>`

- Change:
  - Replace with this exact text:
    - ```
          <Link to="/pantry" className={location.pathname === '/pantry' ? 'active' : ''}>Pantry</Link>
          {isAuthenticated && (
            <button onClick={handleLogout} className="logout-button">Logout</button>
          )}
```

- Why (1 sentence, must map to specs):
  - Adds logout button to navigation that clears session and redirects to login (V-9).

---

## V-11
Status: PROPOSED
Risk: 3/10

### Goal
Define AUTH_USERNAME (default "admin"), AUTH_PASSWORD (required, no default), AUTH_JWT_SECRET (required, no default), AUTH_SESSION_EXPIRY_HOURS (default 24). App refuses to start if AUTH_PASSWORD or AUTH_JWT_SECRET are not set.

### Files (verified + to create)
#### Existing (verified)
- backend/app/main.py

### Patch Operations

Note: V-2 OP-4 adds the config fields. Startup validation is handled below.
Note: DEPENDENCY - V-2 must be applied before V-11 (V-2 adds settings.auth_password and settings.auth_jwt_secret).

#### OP-27 — Add startup validation for required auth vars (FIXED ANCHOR - single line)
- File: `backend/app/main.py`
- Operation: INSERT AFTER

- Target location (required for non-CREATE ops)
  - Anchor snippet (EXACT from repo line 144):
    - `async def startup_event():`

- Change:
  - Insert this exact text:
    - ```
    # V-11: Validate required auth environment variables
    if not settings.auth_password:
        raise RuntimeError("AUTH_PASSWORD environment variable is required but not set")
    if not settings.auth_jwt_secret:
        raise RuntimeError("AUTH_JWT_SECRET environment variable is required but not set")
```

- Why (1 sentence, must map to specs):
  - App refuses to start if AUTH_PASSWORD or AUTH_JWT_SECRET are not set (V-11).

## V-5
Status: PROPOSED
Risk: 5/10

### Goal
Protect all API routes with authentication middleware, except /health and /auth/login. Unauthenticated requests to protected routes return 401 Unauthorized.

### Files (verified + to create)
#### Existing (verified)
- backend/app/main.py

### Patch Operations

#### OP-7 — Add auth middleware imports
- File: `backend/app/main.py`
- Operation: INSERT AFTER

- Target location (required for non-CREATE ops)
  - Anchor snippet (EXACT from repo line 141):
    - `from app.services.logging_config import setup_logging`

- Change:
  - Insert this exact text:
    - ```
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import jwt
```

- Why (1 sentence, must map to specs):
  - Imports required for auth middleware implementation (V-5).

#### OP-8 — Define auth middleware class (FIXED: OPTIONS bypass for CORS preflight)
- File: `backend/app/main.py`
- Operation: INSERT BEFORE

- Target location (required for non-CREATE ops)
  - Anchor snippet (EXACT from repo line 158):
    - `# CORS configuration - allow both local dev and production`

- Change:
  - Insert this exact text:
    - ```

class AuthMiddleware(BaseHTTPMiddleware):
    """JWT authentication middleware (V-5)"""

    # Paths that don't require authentication
    PUBLIC_PATHS = [
        "/health",
        "/auth/login",
        "/docs",
        "/openapi.json",
        "/redoc",
        "/"
    ]

    async def dispatch(self, request, call_next):
        # CORS preflight bypass - OPTIONS requests must pass through
        # (AuthMiddleware runs before CORSMiddleware in request flow)
        if request.method == "OPTIONS":
            return await call_next(request)

        # Skip auth for public paths
        path = request.url.path
        if any(path == p or path.startswith(p + "/") for p in self.PUBLIC_PATHS if p != "/"):
            return await call_next(request)
        if path == "/":
            return await call_next(request)

        # Check for Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"detail": "Not authenticated"}
            )

        # Verify JWT token
        token = auth_header[7:]
        try:
            jwt.decode(token, settings.auth_jwt_secret, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return JSONResponse(
                status_code=401,
                content={"detail": "Token expired"}
            )
        except jwt.InvalidTokenError:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid token"}
            )

        return await call_next(request)

```

- Why (1 sentence, must map to specs):
  - Defines middleware that protects all routes except /health and /auth/login, with CORS preflight bypass (V-5).

- Safety check (required if risk > 3):
  - Verify /health returns 200 without token, and /api/posts returns 401 without token.
  - Verify OPTIONS requests to any protected route return CORS headers (not 401).

#### OP-9 — Add middleware to FastAPI app
- File: `backend/app/main.py`
- Operation: INSERT BEFORE

- Target location (required for non-CREATE ops)
  - Anchor snippet (EXACT from repo line 179):
    - `# Include routers`

- Change:
  - Insert this exact text:
    - ```
# Authentication middleware (V-5) - must be added after CORS
app.add_middleware(AuthMiddleware)

```

- Why (1 sentence, must map to specs):
  - Registers auth middleware to protect API routes (V-5).

---
