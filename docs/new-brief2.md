# New Brief: Simple Username/Password Authentication

## 1. Problem Statement

The Klaus News application currently has no authentication. Anyone with network access can use the app, modify settings, publish articles, and access all features. This is a security risk, and access must be restricted to authorized users only.

## 2. Proposed Solution Overview

Implement simple username/password authentication with credentials stored in environment variables. One shared account for all users. Quick to implement, no database changes, no external dependencies.

---

## 3. User Flow

### 3.1 Authentication Flow

**Requirement (Merged Narrative):**
1. User navigates to the app and sees a login screen.
2. User enters username and password.
3. Backend verifies credentials against environment variables:
   - **Invalid**: Show error "Invalid credentials"
   - **Valid**: Create JWT session token, redirect to app
4. User is now authenticated and can use all features.
5. Session expires after 24 hours (configurable); user must re-authenticate.
6. User can click "Logout" to end session early.

**Acceptance Criteria:**
- Login screen is displayed for unauthenticated users.
- Valid credentials result in JWT token issuance and redirect to the app.
- Invalid credentials display error message "Invalid credentials".
- Sessions expire after configured duration (default: 24 hours).
- Logout ends session early.

---

## 4. Backend Requirements

### 4.1 Credentials Storage

**Requirement (Merged Narrative):**
Username and password stored in environment variables. Credentials are never hardcoded in the codebase.

**Constraints:**
- Password must be set via environment variable (never hardcoded in code).

---

### 4.2 API Endpoints

**Requirement (Merged Narrative):**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | Accepts username/password, returns JWT |
| `/auth/logout` | POST | Optional endpoint (JWT is stateless) |
| `/auth/me` | GET | Returns authentication status |

**Acceptance Criteria:**
- `POST /auth/login` accepts username and password, returns JWT on success.
- `GET /auth/me` returns current authentication status.
- `POST /auth/logout` available (optional, JWT is stateless).

---

### 4.3 JWT Session

**Requirement (Merged Narrative):**
Issue JWT token on successful login with 24-hour expiry.

**Acceptance Criteria:**
- JWT issued on successful login.
- JWT expires after 24 hours (configurable via environment variable).

**Constraints:**
- JWT secret must be strong and unique per environment.

---

### 4.4 Auth Middleware

**Requirement (Merged Narrative):**
Protect all API routes except `/health` and `/auth/login`.

**Acceptance Criteria:**
- All API routes require authentication except `/health` and `/auth/login`.
- Unauthenticated requests to protected routes are rejected.

---

## 5. Frontend Requirements

### 5.1 Login Page

**Requirement (Merged Narrative):**
Username and password input form.

**Acceptance Criteria:**
- Login page displays username and password input fields.
- Form submits credentials to backend.

---

### 5.2 Auth State Management

**Requirement (Merged Narrative):**
Store JWT in memory or localStorage, handle expiry.

**Acceptance Criteria:**
- JWT stored in memory or localStorage.
- Expiry is handled appropriately.

---

### 5.3 Protected Routes

**Requirement (Merged Narrative):**
Redirect to login if not authenticated.

**Acceptance Criteria:**
- Unauthenticated users are redirected to login page.

---

### 5.4 Logout Button

**Requirement (Merged Narrative):**
Clear session, redirect to login.

**Acceptance Criteria:**
- Logout button clears session.
- User is redirected to login page after logout.

---

### 5.5 Auto-Redirect

**Requirement (Merged Narrative):**
If already logged in, redirect from login page to app.

**Acceptance Criteria:**
- Authenticated users accessing login page are redirected to the app.

---

## 6. Configuration (Environment Variables)

### 6.1 Environment Variables

**Requirement (Merged Narrative):**

| Variable | Description | Default |
|----------|-------------|---------|
| `AUTH_USERNAME` | Login username | "admin" |
| `AUTH_PASSWORD` | Login password | Required, no default |
| `AUTH_JWT_SECRET` | Secret key for signing JWT tokens | Required |
| `AUTH_SESSION_EXPIRY_HOURS` | JWT session duration | 24 |

**Constraints:**
- `AUTH_PASSWORD` and `AUTH_JWT_SECRET` are required (no defaults).
- The app will refuse to start if `AUTH_PASSWORD` or `AUTH_JWT_SECRET` are not set.

---

### 6.2 Setup Workflow

**Requirement (Merged Narrative):**
Credentials are never hardcoded in the codebase. They are configured via environment variables.

1. **Local development**: Add variables to `.env` file (already gitignored).
2. **Production (Railway)**: Add variables in Railway dashboard under service Variables.

**Constraints:**
- Credentials must never be hardcoded.
- `.env` file is gitignored.

---

## 7. Security Considerations

**Requirement (Merged Narrative):**
- Password must be set via environment variable (never hardcoded in code).
- JWT secret must be strong and unique per environment.
- Use HTTPS in production (Railway provides this).
- Consider rate limiting login attempts (optional for internal tool).

---

## 8. Out of Scope

The following are explicitly out of scope:
- Multiple user accounts
- Password hashing in database
- Password reset functionality
- User registration
- Role-based permissions
- OTP/MFA

---

## 9. Success Criteria

1. Unauthenticated users see only the login page.
2. Correct credentials grant access to the full app.
3. Incorrect credentials show an error message.
4. Sessions persist for 24 hours (or until logout).
5. All existing functionality works unchanged for authenticated users.
