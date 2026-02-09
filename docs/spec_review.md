# Spec Review (bts-1 output)

## Audit Metadata
- **Brief Source:** `docs/brief.md`
- **Specs Source:** `docs/specs.md`
- **Auditor:** bts-1 (Spec Auditor with Zero Drift)
- **Date:** 2026-02-09

---

## Gate 0 — Coverage/Numbering Check

| Check | Result | Notes |
|-------|--------|-------|
| Missing V in specs | PASS | None missing |
| Extra V in specs | PASS | None extra |
| Duplicate V | PASS | None |
| Order mismatch | PASS | V-1 through V-13 in correct order |

**Brief V-list:** V-1, V-2, V-3, V-4, V-5, V-6, V-7, V-8, V-9, V-10, V-11, V-12, V-13
**Specs V-list:** V-1, V-2, V-3, V-4, V-5, V-6, V-7, V-8, V-9, V-10, V-11, V-12, V-13

**Gate 0 Verdict:** PASS

---

## Gate 1 — Traceability Tags

All PMT and WMBC bullets include traceability tags in the format:
`(Brief: V-x — "<anchor fragment>")`

Verified anchor fragments are verbatim from brief for all V-items.

**Gate 1 Verdict:** PASS

---

## Gate 2 — Typed Clarifiers

The brief uses structured sections:
- `Requirement:`
- `Acceptance Criteria:`
- `Constraints:`

The brief does NOT use the specific typed clarifier labels (CLARIFICATION, USER INSIGHT, DEFINITIVE SPEC, Exception, Condition, Behavior, Order note). Therefore, Gate 2 is not applicable.

**Gate 2 Verdict:** N/A (brief does not use typed clarifier labels)

---

## Gate 3 — Embedded Blocks and Exact Strings

### Brief V-3 Table
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | Accepts username/password, returns JWT |
| `/auth/logout` | POST | Optional endpoint (JWT is stateless) |
| `/auth/me` | GET | Returns authentication status |

**Specs V-3 preservation:** All three endpoints preserved verbatim in PMT. PASS

### Brief V-11 Table
| Variable | Description | Default |
|----------|-------------|---------|
| AUTH_USERNAME | Login username | "admin" |
| AUTH_PASSWORD | Login password | Required, no default |
| AUTH_JWT_SECRET | Secret key for signing JWT tokens | Required |
| AUTH_SESSION_EXPIRY_HOURS | JWT session duration | 24 |

**Specs V-11 preservation:** All four variables with correct defaults preserved in PMT. PASS

**Gate 3 Verdict:** PASS

---

## Gate 4 — Files Touched Evidence Format

| V-item | All paths have evidence? | Status |
|--------|-------------------------|--------|
| V-1 | Yes | PASS |
| V-2 | Yes | PASS |
| V-3 | Yes | PASS |
| V-4 | Yes | PASS |
| V-5 | Yes | PASS |
| V-6 | Yes | PASS |
| V-7 | Yes | PASS |
| V-8 | Yes | PASS |
| V-9 | Yes | PASS |
| V-10 | Yes | PASS |
| V-11 | Yes | PASS |
| V-12 | Yes, but weak | MINOR ISSUE |
| V-13 | Yes | PASS |

**V-12 Issue:** `.gitignore` path has evidence `(evidence: searched ".gitignore", needs verification)` — should be updated to verified evidence since .env IS present on line 2.

**Gate 4 Verdict:** PASS with 1 minor annotation fix needed

---

## Per-V Losslessness Audit

### V-1: Authentication Flow

**Brief Constraint Inventory (8 items + 6 acceptance criteria):**
1. User navigates to app → sees login screen
2. User enters username and password
3. Backend verifies credentials against environment variables
4. Invalid: Show error "Invalid credentials"
5. Valid: Create JWT session token, redirect to app
6. User is now authenticated and can use all features
7. Session expires after 24 hours (configurable)
8. User can click "Logout" to end session early

**PMT Accuracy:** All 8 requirements + acceptance criteria preserved. PASS
**PMT Lossless:** YES
**WMBC Consistency:** Matches PMT, no scope creep. PASS

---

### V-2: Credentials Storage

**Brief Constraint Inventory (3 items):**
1. Username and password stored in environment variables
2. Credentials are never hardcoded in the codebase
3. Constraint: Password must be set via environment variable (never hardcoded in code)

**PMT Accuracy:** All items preserved. PASS
**PMT Lossless:** YES
**WMBC Consistency:** Matches PMT. PASS

---

### V-3: API Endpoints

**Brief Constraint Inventory (table + 3 acceptance criteria):**
1. POST /auth/login — Accepts username/password, returns JWT
2. POST /auth/logout — Optional endpoint (JWT is stateless)
3. GET /auth/me — Returns authentication status

**PMT Accuracy:** All 3 endpoints preserved with details. PASS
**PMT Lossless:** YES
**WMBC Consistency:** Matches PMT. PASS

---

### V-4: JWT Session

**Brief Constraint Inventory (3 items):**
1. Issue JWT token on successful login with 24-hour expiry
2. JWT expires after 24 hours (configurable via environment variable)
3. Constraint: JWT secret must be strong and unique per environment

**PMT Accuracy:** All items preserved. PASS
**PMT Lossless:** YES
**WMBC Consistency:** Matches PMT. PASS

---

### V-5: Auth Middleware

**Brief Constraint Inventory (2 items):**
1. Protect all API routes except /health and /auth/login
2. Unauthenticated requests to protected routes are rejected

**PMT Accuracy:** Both items preserved. PASS
**PMT Lossless:** YES
**WMBC Consistency:** Matches PMT. PASS

---

### V-6: Login Page

**Brief Constraint Inventory (3 items):**
1. Username and password input form
2. Login page displays username and password input fields
3. Form submits credentials to backend

**PMT Accuracy:** All items preserved. PASS
**PMT Lossless:** YES
**WMBC Consistency:** Matches PMT. PASS

---

### V-7: Auth State Management

**Brief Constraint Inventory (3 items):**
1. Store JWT in memory or localStorage, handle expiry
2. JWT stored in memory or localStorage
3. Expiry is handled appropriately

**PMT Accuracy:** All items preserved. PASS
**PMT Lossless:** YES
**WMBC Consistency:** Matches PMT. PASS

---

### V-8: Protected Routes

**Brief Constraint Inventory (2 items):**
1. Redirect to login if not authenticated
2. Unauthenticated users are redirected to login page

**PMT Accuracy:** Both items preserved. PASS
**PMT Lossless:** YES
**WMBC Consistency:** Matches PMT. PASS

---

### V-9: Logout Button

**Brief Constraint Inventory (3 items):**
1. Clear session, redirect to login
2. Logout button clears session
3. User is redirected to login page after logout

**PMT Accuracy:** All items preserved. PASS
**PMT Lossless:** YES
**WMBC Consistency:** Matches PMT. PASS

---

### V-10: Auto-Redirect

**Brief Constraint Inventory (2 items):**
1. If already logged in, redirect from login page to app
2. Authenticated users accessing login page are redirected to the app

**PMT Accuracy:** Both items preserved. PASS
**PMT Lossless:** YES
**WMBC Consistency:** Matches PMT. PASS

---

### V-11: Environment Variables

**Brief Constraint Inventory (table + 2 constraints):**
1. AUTH_USERNAME — Login username, default "admin"
2. AUTH_PASSWORD — Login password, Required, no default
3. AUTH_JWT_SECRET — Secret key for signing JWT tokens, Required
4. AUTH_SESSION_EXPIRY_HOURS — JWT session duration, default 24
5. Constraint: AUTH_PASSWORD and AUTH_JWT_SECRET are required (no defaults)
6. Constraint: App will refuse to start if AUTH_PASSWORD or AUTH_JWT_SECRET are not set

**PMT Accuracy:** All 4 variables + 2 constraints preserved. PASS
**PMT Lossless:** YES
**WMBC Consistency:** Matches PMT. PASS

---

### V-12: Setup Workflow

**Brief Constraint Inventory (6 items):**
1. Credentials are never hardcoded in the codebase
2. They are configured via environment variables
3. Local development: Add variables to .env file (already gitignored)
4. Production (Railway): Add variables in Railway dashboard under service Variables
5. Constraint: Credentials must never be hardcoded
6. Constraint: .env file is gitignored

**PMT Accuracy:** All items preserved. PASS
**PMT Lossless:** YES
**WMBC Consistency:** Matches PMT. PASS

**Files Touched Issue:** `.gitignore` evidence needs strengthening (verified .env IS on line 2)

---

### V-13: Security Requirements

**Brief Constraint Inventory (4 items):**
1. Password must be set via environment variable (never hardcoded in code)
2. JWT secret must be strong and unique per environment
3. Use HTTPS in production (Railway provides this)
4. Consider rate limiting login attempts (optional for internal tool)

**PMT Accuracy:** All 4 items preserved. PASS
**PMT Lossless:** YES
**WMBC Consistency:** Matches PMT. PASS

---

## Repo Path Verification

| Path | Claimed Status | Verified |
|------|---------------|----------|
| frontend/src/App.tsx | exists | YES |
| backend/app/config.py | exists | YES |
| backend/app/main.py | exists | YES |
| .env.example | exists | YES |
| frontend/src/services/api.ts | exists | YES |
| frontend/src/contexts/SettingsContext.tsx | exists | YES |
| .gitignore | exists, contains .env | YES (line 2) |
| railway.json | exists | YES |
| frontend/src/pages/Login.tsx | TBD:new file | N/A (new) |
| backend/app/api/auth.py | TBD:new file | N/A (new) |
| frontend/src/contexts/AuthContext.tsx | TBD:new file | N/A (new) |
| backend/app/middleware/auth.py | TBD:new file | N/A (no middleware folder exists) |
| frontend/src/components/ProtectedRoute.tsx | TBD:new file | N/A (new) |

All claimed existing paths verified. All new file paths appropriately marked as TBD:new file.

---

## Summary

| Metric | Count |
|--------|-------|
| Inaccurate PMT | 0 |
| Inaccurate WMBC | 0 |
| Missing constraints | 0 |
| Scope creep items | 0 |
| Unverified paths | 0 |
| Evidence annotation fixes needed | 1 |

**Overall Verdict:** PASS — Specs are lossless and accurate vs brief.

**Minor Fix Required:** V-12 `.gitignore` evidence annotation should be updated from "needs verification" to "verified exists, .env on line 2".
