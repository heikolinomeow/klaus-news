# Klaus News - Railway Deployment Playbook

## High-Level Deployment Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Your Local Machine                                         │
│  ├─ Make code changes (listed below)                        │
│  ├─ Test locally: docker-compose up                         │
│  └─ Push to GitHub                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  GitHub Repository                                          │
│  └─ Code stored, version controlled                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Railway Platform                                           │
│  ├─ Auto-detects your Docker setup                          │
│  ├─ Builds containers                                       │
│  ├─ Deploys 3 services:                                     │
│  │   1. PostgreSQL Database (managed)                       │
│  │   2. Backend (FastAPI on internal network)              │
│  │   3. Frontend (React/Nginx, publicly accessible)        │
│  └─ Assigns URLs:                                           │
│      - Frontend: https://klaus-news.up.railway.app          │
│      - Backend: https://klaus-news-backend.railway.app      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Your Team Accesses                                         │
│  └─ https://klaus-news.up.railway.app                       │
│     (Frontend makes API calls to backend internally)        │
└─────────────────────────────────────────────────────────────┘
```

---

## What Needs to Change in the Repo

### **1. Backend CORS Configuration**

**File:** `backend/app/main.py`

**Current Code (lines 17-24):**
```python
# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Change To:**
```python
import os

# CORS configuration - allow both local dev and production
allowed_origins = [
    "http://localhost:5173",  # Vite dev server (local)
    "http://localhost:3000",  # Docker frontend (local)
]

# Add production frontend URL from environment variable
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Why:** Allows backend to accept requests from Railway frontend URL while keeping local dev working.

---

### **2. Frontend API URL Configuration**

**File:** `docker-compose.yml`

**Current Code (lines 53-54):**
```yaml
environment:
  - VITE_API_URL=http://localhost:8000
```

**Change To:**
```yaml
environment:
  - VITE_API_URL=${BACKEND_URL:-http://localhost:8000}
```

**Why:** Uses environment variable for backend URL. Railway sets `BACKEND_URL`, local dev uses `localhost:8000` as fallback.

---

### **3. Create Railway Configuration File (Optional but Recommended)**

**Create New File:** `railway.json` (in project root)

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**Why:** Tells Railway exactly how to deploy your services.

---

### **4. Create Production Environment File Template**

**Create New File:** `.env.railway.example`

```bash
# Copy this to Railway environment variables

# Backend API Keys (REQUIRED)
X_API_KEY=your_x_api_key_here
X_API_SECRET=your_x_api_secret_here
OPENAI_API_KEY=your_openai_api_key_here
TEAMS_WEBHOOK_URL=your_teams_webhook_url_here

# Database (Railway auto-provides this)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Frontend/Backend Communication (set after deployment)
BACKEND_URL=https://klaus-news-backend-abc123.up.railway.app
FRONTEND_URL=https://klaus-news-frontend-xyz789.up.railway.app
```

**Why:** Documents what environment variables need to be set in Railway.

---

## Deployment Steps

### **Phase 1: Preparation (One Time)**

1. **Create GitHub Repository** (if not already done)
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/klaus-news.git
   git push -u origin main
   ```

2. **Sign Up for Railway**
   - Go to https://railway.app
   - Sign up with GitHub account
   - Free tier: $5 credit/month (should be enough for testing)
   - Paid: ~$20-30/month for production

3. **Make Code Changes**
   - Update `backend/app/main.py` (CORS configuration)
   - Update `docker-compose.yml` (VITE_API_URL)
   - Create `railway.json`
   - Create `.env.railway.example`
   - Commit and push changes

### **Phase 2: Initial Deployment**

4. **Create New Railway Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `klaus-news` repository
   - Railway auto-detects docker-compose.yml

5. **Add PostgreSQL Database**
   - In Railway dashboard, click "New"
   - Select "Database" → "PostgreSQL"
   - Railway creates database and provides `DATABASE_URL`

6. **Configure Backend Service**
   - Railway auto-creates "backend" service from docker-compose
   - Click on backend service
   - Go to "Variables" tab
   - Add environment variables:
     ```
     X_API_KEY=<your_key>
     X_API_SECRET=<your_secret>
     OPENAI_API_KEY=<your_key>
     TEAMS_WEBHOOK_URL=<your_webhook>
     DATABASE_URL=${{Postgres.DATABASE_URL}}
     ```
   - Click "Deploy"
   - Copy the generated backend URL (e.g., `https://klaus-news-backend-abc123.up.railway.app`)

7. **Configure Frontend Service**
   - Railway auto-creates "frontend" service from docker-compose
   - Click on frontend service
   - Go to "Variables" tab
   - Add environment variable:
     ```
     VITE_API_URL=<paste_backend_url_from_step_6>
     ```
   - Click "Deploy"
   - Copy the generated frontend URL (e.g., `https://klaus-news-frontend-xyz789.up.railway.app`)

8. **Update Backend CORS**
   - Go back to backend service
   - Add one more environment variable:
     ```
     FRONTEND_URL=<paste_frontend_url_from_step_7>
     ```
   - Redeploy backend

9. **Test Deployment**
   - Open frontend URL in browser
   - Check if posts load
   - Try generating an article
   - Verify Teams webhook works

### **Phase 3: Team Access**

10. **Share URL with Team**
    - Send frontend URL to team members
    - Bookmark it for easy access
    - Works from any computer on the network

---

## Post-Deployment: How Updates Work

### **Automatic Deployments**

Railway watches your GitHub repository. When you push changes:

```bash
# 1. Make changes locally
git add .
git commit -m "Fix: Update article generation logic"

# 2. Push to GitHub
git push origin main

# 3. Railway automatically:
#    - Detects the push
#    - Rebuilds affected containers
#    - Deploys new version
#    - Zero downtime (keeps old version running until new one is ready)
```

### **Manual Deployments**

In Railway dashboard:
- Click service (backend or frontend)
- Click "Deploy" → "Redeploy"

---

## Local vs Railway: What's Different

| Aspect | Local Development | Railway Production |
|--------|------------------|-------------------|
| **Access URL** | localhost:3000 | klaus-news.up.railway.app |
| **Backend API** | localhost:8000 | klaus-news-backend.railway.app |
| **Database** | Docker PostgreSQL | Railway Managed PostgreSQL |
| **Environment Variables** | .env file or docker-compose | Railway Variables UI |
| **Port 3000 & 8000** | Exposed on your machine | Hidden, Railway handles routing |
| **SSL/HTTPS** | No (http only) | Yes (automatic) |
| **Team Access** | Only you | Anyone with URL |

---

## Cost Breakdown (Railway)

| Resource | Usage | Estimated Cost |
|----------|-------|---------------|
| **PostgreSQL** | Small DB, 5-20 users | ~$5-10/month |
| **Backend** | Always running, low traffic | ~$5-10/month |
| **Frontend** | Nginx static files | ~$2-5/month |
| **Total** | | **~$12-25/month** |

**Note:** Railway free tier gives $5 credit/month. For production with 5-20 users, expect ~$20-25/month.

---

## Rollback Plan (If Something Goes Wrong)

Railway keeps deployment history:

1. Click on service (backend or frontend)
2. Go to "Deployments" tab
3. Find previous working deployment
4. Click "Redeploy"

Or revert code in GitHub:
```bash
git revert HEAD
git push origin main
# Railway auto-deploys the reverted version
```

---

## Monitoring & Logs

**View Logs:**
- Railway dashboard → Click service → "Logs" tab
- Real-time logs from backend/frontend
- Filter by error, warning, info

**Health Check:**
- Backend health endpoint: `https://klaus-news-backend.railway.app/health`
- Should return: `{"status": "healthy", "app": "Klaus News"}`

**Uptime Monitoring:**
- Railway shows uptime percentage in dashboard
- Get email alerts if service goes down (configure in settings)

---

## Security Considerations (Internal Use)

✅ **Good:**
- Railway provides automatic HTTPS
- Environment variables are encrypted
- Database is isolated, only accessible by backend
- No public API keys in code

⚠️ **Consider:**
- Railway URLs are publicly accessible (anyone with link can access)
- No authentication on frontend (any employee with URL can use it)
- May want to add basic auth or IP whitelist for sensitive data

**To restrict access (optional):**
1. Add IP whitelist in Railway (paid feature)
2. Add basic authentication to Nginx in frontend
3. Use company VPN and deploy on internal network instead

---

## Troubleshooting Common Issues

### Frontend loads but can't fetch data
- **Cause:** Backend URL not set or wrong
- **Fix:** Check `VITE_API_URL` in frontend environment variables

### Backend rejects requests (CORS error)
- **Cause:** Frontend URL not in CORS allow list
- **Fix:** Check `FRONTEND_URL` is set in backend environment variables

### Database connection failed
- **Cause:** DATABASE_URL not connected
- **Fix:** In Railway, link PostgreSQL service to backend: `${{Postgres.DATABASE_URL}}`

### Environment variables not working
- **Cause:** Need to redeploy after changing variables
- **Fix:** After updating variables, click "Deploy" → "Redeploy"

---

## Summary: Changes Required

### Code Changes (3 files)
1. ✏️ `backend/app/main.py` - Update CORS to use environment variable
2. ✏️ `docker-compose.yml` - Update VITE_API_URL to use environment variable
3. ➕ `railway.json` - Add Railway configuration (optional)
4. ➕ `.env.railway.example` - Document required environment variables

### Railway Configuration
1. 🗃️ Add PostgreSQL database
2. ⚙️ Set 4 API keys in backend (X API, OpenAI, Teams webhook)
3. 🔗 Set BACKEND_URL in frontend environment
4. 🔗 Set FRONTEND_URL in backend environment

### Total Time Estimate
- Code changes: 15 minutes
- Railway setup: 30 minutes
- Testing: 15 minutes
- **Total: ~1 hour**

---

## Next Steps

1. ✅ Review this playbook
2. ✅ Make the code changes listed above
3. ✅ Test locally with `docker-compose up`
4. ✅ Push to GitHub
5. ✅ Sign up for Railway
6. ✅ Follow deployment steps
7. ✅ Share URL with team

---

**Questions or issues during deployment?** Railway has great documentation at https://docs.railway.app
