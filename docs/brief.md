# Polished Brief (from docs/new-brief.md)

## Context

### Problem Statement (New Brief §1)
The Klaus News application currently has no authentication. Anyone with network access can use the app, modify settings, publish articles, and access all features. This is a security risk, and access must be restricted to authorized users only.

### Proposed Solution Overview (New Brief §2)
Implement simple username/password authentication with credentials stored in environment variables. One shared account for all users. Quick to implement, no database changes, no external dependencies.

---

## Work Package: 3. User Flow

- **V-1: Authentication Flow**
  - Work package: User Flow
  - Source: New Brief §3.1
  - Anchor quote: "User navigates to the app and sees a login screen"
  - Requirement:
    1. User navigates to the app and sees a login screen.
    2. User enters username and password.
    3. Backend verifies credentials against environment variables:
       - **Invalid**: Show error "Invalid credentials"
       - **Valid**: Create JWT session token, redirect to app
    4. User is now authenticated and can use all features.
    5. Session expires after 24 hours (configurable); user must re-authenticate.
    6. User can click "Logout" to end session early.
  - Acceptance Criteria:
    - Login screen is displayed for unauthenticated users.
    - Valid credentials result in JWT token issuance and redirect to the app.
    - Invalid credentials display error message "Invalid credentials".
    - Sessions expire after configured duration (default: 24 hours).
    - Logout ends session early.

---

## Work Package: 4. Backend Requirements

- **V-2: Credentials Storage**
  - Work package: Backend Requirements
  - Source: New Brief §4.1
  - Anchor quote: "Username and password stored in environment variables"
  - Requirement:
    - Username and password stored in environment variables.
    - Credentials are never hardcoded in the codebase.
  - Constraints:
    - Password must be set via environment variable (never hardcoded in code).

- **V-3: API Endpoints**
  - Work package: Backend Requirements
  - Source: New Brief §4.2
  - Anchor quote: "POST /auth/login Accepts username/password, returns JWT"
  - Requirement:
    | Endpoint | Method | Description |
    |----------|--------|-------------|
    | `/auth/login` | POST | Accepts username/password, returns JWT |
    | `/auth/logout` | POST | Optional endpoint (JWT is stateless) |
    | `/auth/me` | GET | Returns authentication status |
  - Acceptance Criteria:
    - `POST /auth/login` accepts username and password, returns JWT on success.
    - `GET /auth/me` returns current authentication status.
    - `POST /auth/logout` available (optional, JWT is stateless).

- **V-4: JWT Session**
  - Work package: Backend Requirements
  - Source: New Brief §4.3
  - Anchor quote: "Issue JWT token on successful login with 24-hour expiry"
  - Requirement:
    - Issue JWT token on successful login with 24-hour expiry.
  - Acceptance Criteria:
    - JWT issued on successful login.
    - JWT expires after 24 hours (configurable via environment variable).
  - Constraints:
    - JWT secret must be strong and unique per environment.

- **V-5: Auth Middleware**
  - Work package: Backend Requirements
  - Source: New Brief §4.4
  - Anchor quote: "Protect all API routes except /health and /auth/login"
  - Requirement:
    - Protect all API routes except `/health` and `/auth/login`.
  - Acceptance Criteria:
    - All API routes require authentication except `/health` and `/auth/login`.
    - Unauthenticated requests to protected routes are rejected.

---

## Work Package: 5. Frontend Requirements

- **V-6: Login Page**
  - Work package: Frontend Requirements
  - Source: New Brief §5.1
  - Anchor quote: "Username and password input form"
  - Requirement:
    - Username and password input form.
  - Acceptance Criteria:
    - Login page displays username and password input fields.
    - Form submits credentials to backend.

- **V-7: Auth State Management**
  - Work package: Frontend Requirements
  - Source: New Brief §5.2
  - Anchor quote: "Store JWT in memory or localStorage, handle expiry"
  - Requirement:
    - Store JWT in memory or localStorage, handle expiry.
  - Acceptance Criteria:
    - JWT stored in memory or localStorage.
    - Expiry is handled appropriately.

- **V-8: Protected Routes**
  - Work package: Frontend Requirements
  - Source: New Brief §5.3
  - Anchor quote: "Redirect to login if not authenticated"
  - Requirement:
    - Redirect to login if not authenticated.
  - Acceptance Criteria:
    - Unauthenticated users are redirected to login page.

- **V-9: Logout Button**
  - Work package: Frontend Requirements
  - Source: New Brief §5.4
  - Anchor quote: "Clear session, redirect to login"
  - Requirement:
    - Clear session, redirect to login.
  - Acceptance Criteria:
    - Logout button clears session.
    - User is redirected to login page after logout.

- **V-10: Auto-Redirect**
  - Work package: Frontend Requirements
  - Source: New Brief §5.5
  - Anchor quote: "If already logged in, redirect from login page to app"
  - Requirement:
    - If already logged in, redirect from login page to app.
  - Acceptance Criteria:
    - Authenticated users accessing login page are redirected to the app.

---

## Work Package: 6. Configuration (Environment Variables)

- **V-11: Environment Variables**
  - Work package: Configuration (Environment Variables)
  - Source: New Brief §6.1
  - Anchor quote: "AUTH_USERNAME Login username"
  - Requirement:
    | Variable | Description | Default |
    |----------|-------------|---------|
    | `AUTH_USERNAME` | Login username | "admin" |
    | `AUTH_PASSWORD` | Login password | Required, no default |
    | `AUTH_JWT_SECRET` | Secret key for signing JWT tokens | Required |
    | `AUTH_SESSION_EXPIRY_HOURS` | JWT session duration | 24 |
  - Constraints:
    - `AUTH_PASSWORD` and `AUTH_JWT_SECRET` are required (no defaults).
    - The app will refuse to start if `AUTH_PASSWORD` or `AUTH_JWT_SECRET` are not set.

- **V-12: Setup Workflow**
  - Work package: Configuration (Environment Variables)
  - Source: New Brief §6.2
  - Anchor quote: "Credentials are never hardcoded in the codebase"
  - Requirement:
    - Credentials are never hardcoded in the codebase. They are configured via environment variables.
    1. **Local development**: Add variables to `.env` file (already gitignored).
    2. **Production (Railway)**: Add variables in Railway dashboard under service Variables.
  - Constraints:
    - Credentials must never be hardcoded.
    - `.env` file is gitignored.

---

## Work Package: 7. Security Considerations

- **V-13: Security Requirements**
  - Work package: Security Considerations
  - Source: New Brief §7
  - Anchor quote: "Password must be set via environment variable (never hardcoded in code)"
  - Requirement:
    - Password must be set via environment variable (never hardcoded in code).
    - JWT secret must be strong and unique per environment.
    - Use HTTPS in production (Railway provides this).
    - Consider rate limiting login attempts (optional for internal tool).

---

## Global Constraints: Out of Scope (New Brief §8)

The following are explicitly out of scope:
- Multiple user accounts
- Password hashing in database
- Password reset functionality
- User registration
- Role-based permissions
- OTP/MFA

---

## Verification: Success Criteria (New Brief §9)

1. Unauthenticated users see only the login page.
2. Correct credentials grant access to the full app.
3. Incorrect credentials show an error message.
4. Sessions persist for 24 hours (or until logout).
5. All existing functionality works unchanged for authenticated users.
