# Specs (from docs/brief.md)

## V-1
### Product Manager translation (max detail, unambiguous)
- User navigating to the app must see a login screen if not authenticated (Brief: V-1 — "User navigates to the app and sees a login screen")
- Login screen must have username and password input fields (Brief: V-1 — "User enters username and password")
- Backend must verify credentials against environment variables upon form submission (Brief: V-1 — "Backend verifies credentials against environment variables")
- Invalid credentials must display error message "Invalid credentials" (Brief: V-1 — "Invalid: Show error "Invalid credentials"")
- Valid credentials must result in JWT session token creation and redirect to app (Brief: V-1 — "Valid: Create JWT session token, redirect to app")
- Authenticated user gains access to all features (Brief: V-1 — "User is now authenticated and can use all features")
- Session must expire after 24 hours by default; expiry duration is configurable (Brief: V-1 — "Session expires after 24 hours (configurable)")
- User must be able to click "Logout" to end session early (Brief: V-1 — "User can click "Logout" to end session early")

### What must be changed (conceptual)
- Add new login page route that displays before any authenticated content (Brief: V-1 — "User navigates to the app and sees a login screen")
- Create credential verification logic comparing form input to environment variables (Brief: V-1 — "Backend verifies credentials against environment variables")
- Implement error state display showing "Invalid credentials" on failed login (Brief: V-1 — "Invalid: Show error "Invalid credentials"")
- Implement JWT token generation upon successful validation (Brief: V-1 — "Valid: Create JWT session token, redirect to app")
- Add redirect logic from login to main app after successful authentication (Brief: V-1 — "redirect to app")
- Implement logout functionality that ends session and returns to login (Brief: V-1 — "User can click "Logout" to end session early")

### Files touched
- frontend/src/App.tsx: Add login route and authentication gate logic (evidence: verified exists, contains BrowserRouter/Routes)
- frontend/src/pages/Login.tsx: TBD:new file — Create new login page component (evidence: pattern matches existing pages/*.tsx)
- backend/app/api/auth.py: TBD:new file — Create new auth router with login endpoint (evidence: pattern matches existing api/*.py)
- backend/app/main.py: Include auth router (evidence: verified exists, contains router includes)

### Risk assessment (0–10)
Risk: 5/10 — Core user-facing flow; requires frontend/backend coordination; JWT handling is security-critical

## V-2
### Product Manager translation (max detail, unambiguous)
- Username must be stored in environment variable (Brief: V-2 — "Username and password stored in environment variables")
- Password must be stored in environment variable (Brief: V-2 — "Username and password stored in environment variables")
- Credentials must never be hardcoded in the codebase (Brief: V-2 — "Credentials are never hardcoded in the codebase")
- Password must be set via environment variable only (Brief: V-2 — "Password must be set via environment variable (never hardcoded in code)")

### What must be changed (conceptual)
- Add AUTH_USERNAME and AUTH_PASSWORD fields to Settings class in config (Brief: V-2 — "Username and password stored in environment variables")
- Ensure config loading reads these from environment at startup (Brief: V-2 — "stored in environment variables")
- No default value for AUTH_PASSWORD to enforce explicit configuration (Brief: V-2 — "Password must be set via environment variable")

### Files touched
- backend/app/config.py: Add AUTH_USERNAME, AUTH_PASSWORD fields to Settings class (evidence: verified exists, contains Settings BaseSettings class)
- .env.example: Add AUTH_USERNAME, AUTH_PASSWORD documentation (evidence: verified exists, contains environment variable templates)

### Risk assessment (0–10)
Risk: 2/10 — Straightforward config addition; pydantic-settings handles environment loading

## V-3
### Product Manager translation (max detail, unambiguous)
- POST /auth/login endpoint must accept username/password and return JWT (Brief: V-3 — "POST /auth/login Accepts username/password, returns JWT")
- POST /auth/logout endpoint must be available; JWT is stateless so this is optional (Brief: V-3 — "/auth/logout POST Optional endpoint (JWT is stateless)")
- GET /auth/me endpoint must return current authentication status (Brief: V-3 — "/auth/me GET Returns authentication status")

### What must be changed (conceptual)
- Create POST /auth/login endpoint that validates credentials and returns JWT token (Brief: V-3 — "POST /auth/login Accepts username/password, returns JWT")
- Create POST /auth/logout endpoint; may be no-op since JWT is stateless (Brief: V-3 — "POST /auth/logout Optional endpoint (JWT is stateless)")
- Create GET /auth/me endpoint that returns auth status from token (Brief: V-3 — "GET /auth/me Returns authentication status")

### Files touched
- backend/app/api/auth.py: TBD:new file — Create auth router with /auth/login, /auth/logout, /auth/me endpoints (evidence: pattern matches existing api/posts.py, api/groups.py routers)
- backend/app/main.py: Include auth router at /auth prefix (evidence: verified exists, includes routers via app.include_router)

### Risk assessment (0–10)
Risk: 3/10 — Standard REST API pattern; follows existing router structure

## V-4
### Product Manager translation (max detail, unambiguous)
- JWT token must be issued on successful login (Brief: V-4 — "Issue JWT token on successful login with 24-hour expiry")
- JWT token must have 24-hour expiry by default (Brief: V-4 — "24-hour expiry")
- JWT expiry duration must be configurable via environment variable (Brief: V-4 — "JWT expires after 24 hours (configurable via environment variable)")
- JWT secret must be strong and unique per environment (Brief: V-4 — "JWT secret must be strong and unique per environment")

### What must be changed (conceptual)
- Implement JWT token generation with configurable expiry (Brief: V-4 — "Issue JWT token on successful login with 24-hour expiry")
- Add AUTH_JWT_SECRET environment variable for signing tokens (Brief: V-4 — "JWT secret must be strong and unique per environment")
- Add AUTH_SESSION_EXPIRY_HOURS environment variable defaulting to 24 (Brief: V-4 — "JWT expires after 24 hours (configurable via environment variable)")
- Use PyJWT or similar library for token encoding/decoding (Brief: V-4 — "Issue JWT token")

### Files touched
- backend/app/config.py: Add AUTH_JWT_SECRET and AUTH_SESSION_EXPIRY_HOURS fields (evidence: verified exists, contains Settings class)
- backend/app/api/auth.py: TBD:new file — Implement JWT generation in login endpoint (evidence: new auth module)
- .env.example: Add AUTH_JWT_SECRET and AUTH_SESSION_EXPIRY_HOURS documentation (evidence: verified exists)
- backend/requirements.txt: TBD:verify — May need PyJWT dependency (evidence: searched "requirements", no requirements.txt found; may use pyproject.toml or Dockerfile)

### Risk assessment (0–10)
Risk: 4/10 — JWT handling requires correct secret management and expiry logic

## V-5
### Product Manager translation (max detail, unambiguous)
- All API routes must require authentication (Brief: V-5 — "Protect all API routes")
- /health endpoint must be excluded from authentication requirement (Brief: V-5 — "except /health and /auth/login")
- /auth/login endpoint must be excluded from authentication requirement (Brief: V-5 — "except /health and /auth/login")
- Unauthenticated requests to protected routes must be rejected (Brief: V-5 — "Unauthenticated requests to protected routes are rejected")

### What must be changed (conceptual)
- Create auth middleware that validates JWT on incoming requests (Brief: V-5 — "Protect all API routes")
- Configure middleware to skip /health and /auth/login paths (Brief: V-5 — "except /health and /auth/login")
- Return 401 Unauthorized for requests without valid JWT (Brief: V-5 — "Unauthenticated requests to protected routes are rejected")

### Files touched
- backend/app/main.py: Add auth middleware to FastAPI app (evidence: verified exists, contains middleware configuration)
- backend/app/middleware/auth.py: TBD:new file — Create auth middleware (evidence: no middleware folder found; may create new or add to main.py)

### Risk assessment (0–10)
Risk: 5/10 — Middleware affects all routes; must correctly exclude public endpoints; testing required

## V-6
### Product Manager translation (max detail, unambiguous)
- Login page must display username input field (Brief: V-6 — "Username and password input form")
- Login page must display password input field (Brief: V-6 — "Username and password input form")
- Form must submit credentials to backend (Brief: V-6 — "Form submits credentials to backend")

### What must be changed (conceptual)
- Create new Login page component with username and password fields (Brief: V-6 — "Username and password input form")
- Form submission must POST to /auth/login endpoint (Brief: V-6 — "Form submits credentials to backend")
- Style login page to match existing application theme (Brief: V-6 — "Login page displays username and password input fields")

### Files touched
- frontend/src/pages/Login.tsx: TBD:new file — Create Login page component (evidence: pattern matches existing pages/Home.tsx, pages/Settings.tsx)
- frontend/src/App.tsx: Add /login route (evidence: verified exists, contains Routes definition)
- frontend/src/App.css: TBD:verify — May need login-specific styles (evidence: verified App.css exists via App.tsx import)

### Risk assessment (0–10)
Risk: 2/10 — Standard form component; follows existing page patterns

## V-7
### Product Manager translation (max detail, unambiguous)
- JWT must be stored in memory or localStorage on the frontend (Brief: V-7 — "Store JWT in memory or localStorage, handle expiry")
- JWT expiry must be handled appropriately (Brief: V-7 — "handle expiry")
- Expiry handling must redirect to login or refresh token (Brief: V-7 — "Expiry is handled appropriately")

### What must be changed (conceptual)
- Create auth context or service to manage JWT storage (Brief: V-7 — "Store JWT in memory or localStorage")
- Implement token storage on successful login (Brief: V-7 — "Store JWT in memory or localStorage")
- Implement expiry detection and redirect to login when token expires (Brief: V-7 — "handle expiry")
- Add JWT to API requests via Authorization header (Brief: V-7 — "Store JWT")

### Files touched
- frontend/src/contexts/AuthContext.tsx: TBD:new file — Create auth context for JWT state management (evidence: pattern matches existing contexts/SettingsContext.tsx)
- frontend/src/services/api.ts: Add JWT Authorization header to axios interceptor (evidence: verified exists, contains apiClient axios instance)
- frontend/src/App.tsx: Wrap app with AuthContext provider (evidence: verified exists, already uses SettingsProvider pattern)

### Risk assessment (0–10)
Risk: 4/10 — State management across app; must handle token expiry gracefully

## V-8
### Product Manager translation (max detail, unambiguous)
- Unauthenticated users must be redirected to login page (Brief: V-8 — "Redirect to login if not authenticated")
- All routes except login must require authentication (Brief: V-8 — "Unauthenticated users are redirected to login page")

### What must be changed (conceptual)
- Create protected route wrapper or guard component (Brief: V-8 — "Redirect to login if not authenticated")
- Wrap existing routes with authentication check (Brief: V-8 — "Unauthenticated users are redirected to login page")
- Redirect to /login if no valid JWT present (Brief: V-8 — "redirected to login page")

### Files touched
- frontend/src/App.tsx: Add authentication guard to routes (evidence: verified exists, contains Route definitions)
- frontend/src/components/ProtectedRoute.tsx: TBD:new file — Create route guard component (evidence: pattern matches existing components/*.tsx)

### Risk assessment (0–10)
Risk: 3/10 — Standard React routing pattern; must not block login route itself

## V-9
### Product Manager translation (max detail, unambiguous)
- Logout button must clear session (Brief: V-9 — "Clear session, redirect to login")
- Logout must redirect user to login page (Brief: V-9 — "redirect to login")

### What must be changed (conceptual)
- Add logout button to application header or navigation (Brief: V-9 — "Clear session")
- Clear JWT from storage on logout click (Brief: V-9 — "Clear session")
- Redirect to /login after clearing session (Brief: V-9 — "redirect to login")

### Files touched
- frontend/src/App.tsx: Add logout button to header/navigation (evidence: verified exists, contains header with navigation links)
- frontend/src/contexts/AuthContext.tsx: TBD:new file — Add logout function to auth context (evidence: context will manage auth state)

### Risk assessment (0–10)
Risk: 2/10 — Simple UI addition and state clearing

## V-10
### Product Manager translation (max detail, unambiguous)
- Authenticated users accessing login page must be redirected to the app (Brief: V-10 — "If already logged in, redirect from login page to app")

### What must be changed (conceptual)
- Add authentication check on login page mount (Brief: V-10 — "If already logged in")
- Redirect to main app (/) if valid JWT exists (Brief: V-10 — "redirect from login page to app")

### Files touched
- frontend/src/pages/Login.tsx: TBD:new file — Add redirect logic if already authenticated (evidence: login page will check auth state)

### Risk assessment (0–10)
Risk: 1/10 — Simple redirect logic on single page

## V-11
### Product Manager translation (max detail, unambiguous)
- AUTH_USERNAME environment variable for login username with default "admin" (Brief: V-11 — "AUTH_USERNAME Login username")
- AUTH_PASSWORD environment variable for login password with no default (Required) (Brief: V-11 — "AUTH_PASSWORD Login password Required, no default")
- AUTH_JWT_SECRET environment variable for JWT signing with no default (Required) (Brief: V-11 — "AUTH_JWT_SECRET Secret key for signing JWT tokens Required")
- AUTH_SESSION_EXPIRY_HOURS environment variable for session duration with default 24 (Brief: V-11 — "AUTH_SESSION_EXPIRY_HOURS JWT session duration 24")
- AUTH_PASSWORD and AUTH_JWT_SECRET are required with no defaults (Brief: V-11 — "AUTH_PASSWORD and AUTH_JWT_SECRET are required (no defaults)")
- App must refuse to start if AUTH_PASSWORD or AUTH_JWT_SECRET are not set (Brief: V-11 — "The app will refuse to start if AUTH_PASSWORD or AUTH_JWT_SECRET are not set")

### What must be changed (conceptual)
- Add AUTH_USERNAME field with default "admin" to Settings (Brief: V-11 — "AUTH_USERNAME Login username "admin"")
- Add AUTH_PASSWORD field with no default to Settings (Brief: V-11 — "AUTH_PASSWORD Login password Required, no default")
- Add AUTH_JWT_SECRET field with no default to Settings (Brief: V-11 — "AUTH_JWT_SECRET Secret key for signing JWT tokens Required")
- Add AUTH_SESSION_EXPIRY_HOURS field with default 24 to Settings (Brief: V-11 — "AUTH_SESSION_EXPIRY_HOURS JWT session duration 24")
- Add startup validation to fail if required vars missing (Brief: V-11 — "app will refuse to start if AUTH_PASSWORD or AUTH_JWT_SECRET are not set")

### Files touched
- backend/app/config.py: Add AUTH_USERNAME, AUTH_PASSWORD, AUTH_JWT_SECRET, AUTH_SESSION_EXPIRY_HOURS fields (evidence: verified exists, contains Settings class)
- backend/app/main.py: Add startup validation for required auth vars (evidence: verified exists, contains startup_event)
- .env.example: Document all four AUTH_* variables (evidence: verified exists)

### Risk assessment (0–10)
Risk: 3/10 — Config changes; startup validation is breaking change if vars not set

## V-12
### Product Manager translation (max detail, unambiguous)
- Credentials must never be hardcoded in the codebase (Brief: V-12 — "Credentials are never hardcoded in the codebase")
- Credentials are configured via environment variables (Brief: V-12 — "They are configured via environment variables")
- For local development, variables go in .env file which is gitignored (Brief: V-12 — "Local development: Add variables to .env file (already gitignored)")
- For production on Railway, variables are set in Railway dashboard Variables (Brief: V-12 — "Production (Railway): Add variables in Railway dashboard under service Variables")
- .env file must be gitignored (Brief: V-12 — ".env file is gitignored")

### What must be changed (conceptual)
- Verify .env is in .gitignore (Brief: V-12 — ".env file is gitignored")
- Document .env setup in .env.example (Brief: V-12 — "Local development: Add variables to .env file")
- TBD: May need Railway-specific documentation or railway.json updates (Brief: V-12 — "Production (Railway): Add variables in Railway dashboard")

### Files touched
- .gitignore: Verify .env is listed (evidence: verified exists, .env on line 2)
- .env.example: Add setup instructions for AUTH_* variables (evidence: verified exists)
- railway.json: TBD:verify — May need environment variable references (evidence: file exists per git status)

### Risk assessment (0–10)
Risk: 1/10 — Documentation and config verification only

## V-13
### Product Manager translation (max detail, unambiguous)
- Password must be set via environment variable, never hardcoded in code (Brief: V-13 — "Password must be set via environment variable (never hardcoded in code)")
- JWT secret must be strong and unique per environment (Brief: V-13 — "JWT secret must be strong and unique per environment")
- HTTPS must be used in production; Railway provides this (Brief: V-13 — "Use HTTPS in production (Railway provides this)")
- Rate limiting login attempts is optional for internal tool (Brief: V-13 — "Consider rate limiting login attempts (optional for internal tool)")

### What must be changed (conceptual)
- Ensure password is only read from environment, no hardcoded fallback (Brief: V-13 — "Password must be set via environment variable")
- Ensure JWT secret has no default value, forcing explicit configuration (Brief: V-13 — "JWT secret must be strong and unique per environment")
- TBD: Rate limiting is optional per brief (Brief: V-13 — "Consider rate limiting login attempts (optional for internal tool)")

### Files touched
- backend/app/config.py: Ensure AUTH_PASSWORD and AUTH_JWT_SECRET have no defaults (evidence: verified exists)
- backend/app/api/auth.py: TBD:new file — Optional rate limiting on /auth/login (evidence: auth endpoints in new file)

### Risk assessment (0–10)
Risk: 2/10 — Security constraints are config-level; rate limiting is optional
