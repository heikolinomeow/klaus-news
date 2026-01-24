# Klaus News

AI-powered news aggregation and curation platform that fetches posts from curated X (Twitter) lists, categorizes them using AI, and generates articles for Microsoft Teams.

## Tech Stack

### Backend
- **Python 3.11+** with **FastAPI** (async web framework)
- **PostgreSQL** (primary database)
- **SQLAlchemy** (ORM)
- **APScheduler** (background job scheduling)
- **OpenAI API** (GPT-4-turbo for categorization, title/summary generation, article writing)
- **X (Twitter) API** (post ingestion from curated lists)

### Frontend
- **React 18** with **TypeScript**
- **Vite** (build tool)
- **Axios** (API client)

### Infrastructure
- **Docker** & **Docker Compose** (containerization)
- **Railway** (production deployment)

## Project Structure

```
klaus-news/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Configuration (loads from .env)
│   │   ├── database.py          # Database setup
│   │   ├── models/              # SQLAlchemy models
│   │   │   ├── post.py          # Post model
│   │   │   └── article.py       # Article model
│   │   ├── services/            # External API clients
│   │   │   ├── x_client.py      # X API client
│   │   │   ├── openai_client.py # OpenAI client
│   │   │   └── scheduler.py     # Background jobs
│   │   └── api/                 # API endpoints
│   │       ├── posts.py         # Posts endpoints
│   │       └── articles.py      # Articles endpoints
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main app component
│   │   ├── types/               # TypeScript types
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   └── services/            # API client
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
├── docs/                        # Design documents
├── docker-compose.yml
├── .env.example
└── README.md
```

## Setup Instructions

### Prerequisites
- Docker & Docker Compose
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd klaus-news
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your real API credentials
   ```

3. **Start services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

   This will start:
   - PostgreSQL on `localhost:5432`
   - FastAPI backend on `http://localhost:8000`
   - React frontend on `http://localhost:3000`

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Railway Deployment

1. **Initialize git repository** (if not already done)
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Create Railway project**
   - Go to [Railway](https://railway.app)
   - Create new project from GitHub repo

3. **Configure services in Railway**
   - Add PostgreSQL database service
   - Add backend service (auto-detected from `backend/Dockerfile`)
   - Add frontend service (auto-detected from `frontend/Dockerfile`)

4. **Set environment variables in Railway**
   - Add all variables from `.env.example`
   - Railway will auto-provide `DATABASE_URL` for PostgreSQL

5. **Deploy**
   - Push to GitHub triggers automatic deployment
   - Railway builds and deploys both services

## Development Workflow

### Backend Development
```bash
# Install dependencies locally (optional, for IDE support)
cd backend
pip install -r requirements.txt

# The backend runs in hot-reload mode via docker-compose
# Edit files in backend/app/ and changes will auto-reload
```

### Frontend Development
```bash
# Install dependencies locally (optional, for IDE support)
cd frontend
npm install

# The frontend runs via docker-compose
# Edit files in frontend/src/ and changes will hot-reload
```

### Database Migrations
```bash
# Access database
docker-compose exec postgres psql -U postgres -d klaus_news

# Run migrations (to be implemented)
# docker-compose exec backend alembic upgrade head
```

## API Endpoints

### Posts
- `GET /api/posts` - Get all posts (excluding archived)
- `GET /api/posts/recommended` - Get recommended posts (high worthiness score)
- `GET /api/posts/{id}` - Get single post
- `POST /api/posts/{id}/select` - Mark post as selected

### Articles
- `GET /api/articles` - Get all articles
- `POST /api/articles` - Generate article from post
- `PUT /api/articles/{id}` - Update article content
- `POST /api/articles/{id}/regenerate` - Regenerate article
- `POST /api/articles/{id}/post-to-teams` - Post to Teams channel

## Design Decisions

See [docs/DESIGN_DECISIONS.md](docs/DESIGN_DECISIONS.md) for detailed business logic choices (categorization taxonomy, scoring algorithms, etc.).

## License

[To be determined]
