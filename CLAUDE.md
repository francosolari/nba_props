# CLAUDE.md

**Note**: This project uses [bd (beads)](https://github.com/steveyegge/beads) for issue tracking. Use `bd` commands instead of markdown TODOs. See AGENTS.md for workflow details.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NBA Predictions Game is a web application where users make predictions about NBA seasons and earn points. It features user predictions, leaderboards, and score tracking throughout the NBA season.

**Tech Stack:**
- Backend: Django 4.2.6 + PostgreSQL + Django Ninja (API v2)
- Frontend: React 18 + TanStack Query + Tailwind CSS
- Build: Webpack 5
- Deployment: Docker + Gunicorn + WhiteNoise
- Data Source: nba_api library for live NBA stats

## Development Commands

### Local Development (Recommended)
```bash
# Start both Django and Webpack in development mode
npm run dev

# This script (scripts/dev.sh):
# - Runs Django on 127.0.0.1:8000
# - Runs Webpack in watch mode
```

### Individual Services
```bash
# Django development server
venv/bin/python backend/manage.py runserver 127.0.0.1:8000

# Webpack build (production)
npm run build

# Webpack watch mode
npm run webpack-watch
```

### Database Management
```bash
# Run migrations
venv/bin/python backend/manage.py migrate

# Create migrations
venv/bin/python backend/manage.py makemigrations

# Django shell
venv/bin/python backend/manage.py shell_plus
```

### Grading and Data Management
```bash
# Grade user answers for a season (calculates points)
venv/bin/python backend/manage.py grade_props_answers <season-slug>

# Grade standing predictions
venv/bin/python backend/manage.py grade_standing_predictions <season-slug>

# Grade in-season tournament predictions
venv/bin/python backend/manage.py grade_ist_predictions <season-slug>

# Fetch NBA team slugs
npm run fetch:team-slugs
```

### Docker Operations

**See `DOCKER.md` for comprehensive Docker documentation.**

```bash
# Production (original setup - unchanged)
docker-compose up

# Development with local PostgreSQL database (recommended for testing)
docker-compose -f docker-compose.dev.yml --env-file .env.dev.local up

# Development with production database (use sparingly)
docker-compose -f docker-compose.dev-prod-db.yml --env-file .env.dev.prod-db up

# Rebuild after code changes
docker-compose -f docker-compose.dev.yml build --no-cache web

# View logs
docker-compose -f docker-compose.dev.yml logs -f web

# Stop services
docker-compose -f docker-compose.dev.yml down
```

## Architecture

### Backend Structure

**Django Apps:**
- `predictions/` - Core app containing all prediction logic
- `accounts/` - User authentication and profiles (django-allauth)
- `nba_predictions/` - Project settings and root URL config

**API Architecture (Dual Version):**
- **API v1** (`predictions/api/v1/`) - Legacy Django views-based REST API
- **API v2** (`predictions/api/v2/`) - Modern Django Ninja API with type safety
  - `endpoints/` - Feature-based endpoint routers (teams, players, standings, leaderboard, etc.)
  - `schemas/` - Pydantic models for request/response validation
  - `api.py` - Main NinjaAPI instance with documentation at `/api/v2/docs/`

**Models Organization** (`predictions/models/`):
The app uses Django Polymorphic for model inheritance:
- `question.py` - Base Question model with polymorphic subtypes:
  - `SuperlativeQuestion` (MVP, awards)
  - `PropQuestion` (player stats)
  - `PlayerStatPredictionQuestion`
  - `HeadToHeadQuestion`
  - `InSeasonTournamentQuestion`
  - `NBAFinalsPredictionQuestion`
- `answer.py` - User answers to questions
- `season.py` - NBA season management
- `team.py` / `player.py` - NBA entities
- `standings.py` - Regular season, IST, and playoff standings (polymorphic)
- `prediction.py` - User predictions (standings, playoffs)
- `award.py` - NBA awards and odds tracking
- `user_stats.py` - Aggregated user points per season

**Key Services:**
- `predictions/api/common/services/answer_lookup_service.py` - Resolves and normalizes user answers for grading

**URL Routing:**
- `/admin/` - Django admin
- `/accounts/` - Authentication (django-allauth)
- `/api/v1/` - Legacy API
- `/api/v2/` - Modern Django Ninja API
- `/` - React frontend views (served via `predictions/routing/view_urls.py`)

### Frontend Structure

**Architecture:**
- React 18 with multiple page-level components
- React Query (TanStack Query) for API data fetching and caching
- Component mounting system in `index.jsx` that mounts specific components to DOM elements with IDs
- Each page gets mounted to a Django template with corresponding root element

**Pages** (`frontend/src/pages/`):
- `HomePage.jsx` - Main landing page
- `LeaderboardPage.jsx` / `LeaderboardDetailPage.jsx` - User rankings
- `ProfilePage.jsx` - User profile and stats
- `SubmissionsPage.jsx` - User prediction submissions
- `AdminPanel.jsx` - Admin question management

**Components** (`frontend/src/components/`):
- Currently flat structure (25+ components)
- Mix of prediction boards, leaderboards, standings displays, and forms
- Components like `PredictionBoard`, `Leaderboard`, `NBAStandings`, `EditablePredictionBoard`, `QuestionForm`

**Hooks** (`frontend/src/hooks/`):
- `useAdminQuestions.js` - Admin question management
- `useLeaderboard.js` - Leaderboard data
- `useSubmissions.js` / `useUserSubmissions.js` - User prediction submissions

**Styling:**
- Tailwind CSS via PostCSS
- Custom utilities in `frontend/src/styles/`
- Palette definitions in `frontend/src/styles/palette.css`

**Build Process:**
- Webpack bundles to `frontend/static/js/bundle.js` and `frontend/static/css/styles.css`
- Django serves via WhiteNoise from `frontend/staticfiles/` (after collectstatic)
- Dev server runs on port 8080 with HMR

### Database

**PostgreSQL Configuration:**
- Development: Can use local PostgreSQL or Docker container
- Production: Separate PostgreSQL service in docker-compose
- Migrations tracked in `predictions/migrations/`

**Key Relationships:**
- Questions belong to Seasons
- Answers link Users to Questions
- UserStats aggregate points per User per Season
- StandingPredictions track user's conference standings predictions
- Polymorphic models use django-polymorphic for type inheritance

### Deployment

**Blue-Green Deployment:**
- Two web containers: `web-blue` (port 8000) and `web-green` (port 8002)
- CI/CD via GitHub Actions (`.github/workflows/ci-cd.yml`)
- Docker images built and pushed on main branch
- Traffic switches between blue/green for zero-downtime deploys

**Static Files:**
- Collected to `frontend/staticfiles/`
- Served by WhiteNoise in production
- Compressed with `CompressedManifestStaticFilesStorage`

## Important Context

### API Migration in Progress
The codebase is transitioning from API v1 to v2. When adding endpoints:
1. Prefer API v2 (Django Ninja) for new endpoints
2. API v2 provides automatic OpenAPI docs at `/api/v2/docs/`
3. Use Pydantic schemas in `predictions/api/v2/schemas/` for type safety
4. API v1 will eventually be deprecated (see `IMPROVEMENT_PLAN.cursorrules` for details)

### Grading System
User points are calculated via management commands that:
1. Compare user answers to correct answers (set on Question model)
2. Award points based on `question.point_value`
3. Aggregate into UserStats for leaderboard display
4. Use `AnswerLookupService` to normalize and resolve answers (handles player/team lookups)

### Component Mounting Pattern
React components mount to Django template elements by ID:
```javascript
mountComponent(HomePage, 'home-root', 'HomePage');
```
Django templates render `<div id="home-root" data-season-slug="..."></div>`

### Season-Based Architecture
Most features are scoped to a Season (identified by slug like "2024-25"):
- Questions belong to seasons
- Predictions are per-season
- Leaderboards are per-season
- Use `Season.objects.order_by('-end_date').first()` to get latest season

### Polymorphic Models
The app heavily uses django-polymorphic for Question and Standings models:
- Always use `.get_real_instance()` to access subclass fields
- Query with `.filter()` works across all subtypes
- Each subtype has specific grading logic

## Environment Setup

1. Copy `.env.example` to `.env` and configure:
   - `DJANGO_DEVELOPMENT=True` for local dev
   - Database credentials (PostgreSQL required)
   - `DJANGO_SETTINGS_MODULE=nba_predictions.settings`

2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   npm install
   ```

3. Run migrations:
   ```bash
   venv/bin/python backend/manage.py migrate
   ```

4. Create superuser:
   ```bash
   venv/bin/python backend/manage.py createsuperuser
   ```

## Key Files to Reference

- `DOCKER.md` - **Comprehensive Docker setup guide** (development & production)
- `IMPROVEMENT_PLAN.cursorrules` - Detailed roadmap of planned improvements
- `CONTRIBUTING.md` - Contribution guidelines
- `DESIGN_REVIEW.md` - Design decisions and architecture notes
- `backend/nba_predictions/settings.py` - Django configuration
- `frontend/webpack.config.js` - Build configuration
- `docker-compose.yml` - Production service definitions
- `docker-compose.dev.yml` - Development with local database
- `docker-compose.dev-prod-db.yml` - Development with production database
- `predictions/api/v2/api.py` - API v2 main configuration
- `.github/workflows/ci-cd-corrected.yml` - Fixed CI/CD workflow
