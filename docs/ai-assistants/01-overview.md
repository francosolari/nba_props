# 01 - Project Overview

**Part of:** AI Assistant Documentation
**Load when:** Starting work on the project, need high-level understanding, or getting context

## Table of Contents
- [Quick Summary](#quick-summary)
- [Tech Stack](#tech-stack)
- [Directory Structure](#directory-structure)
- [Key Concepts](#key-concepts)
- [Related Documentation](#related-documentation)

## Quick Summary

NBA Predictions Game is a full-stack web application where users make predictions about NBA seasons and earn points based on accuracy. Users can:
- Predict MVP, awards, and player stats
- Make conference standings predictions
- Track points on leaderboards
- Compare performance with other users

**Season-based architecture**: Most features are scoped to an NBA season (e.g., "2024-25").

## Tech Stack

### Backend
- **Framework**: Django 4.2.6
- **Database**: PostgreSQL
- **API**:
  - Django Ninja (v2) - Modern, type-safe REST API
  - Django REST Framework (v1) - Legacy, being deprecated
- **Key Libraries**:
  - `django-polymorphic` - Model inheritance for Questions and Standings
  - `django-allauth` - Authentication
  - `nba_api` - Live NBA stats
  - `Pydantic` - Schema validation (API v2)

### Frontend
- **Framework**: React 18
- **State/Data**: TanStack Query (React Query) for server state
- **Styling**: Tailwind CSS
- **Build**: Webpack 5

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Web Server**: Gunicorn + WhiteNoise (static files)
- **Deployment**: Blue-Green deployment strategy
- **CI/CD**: GitHub Actions

### Development Tools
- **Issue Tracking**: bd (beads) - Git-friendly, dependency-aware issue tracker
- **Testing**: pytest (backend), Jest + RTL (frontend)

## Directory Structure

```
nba_props/
├── backend/                 # Django project
│   ├── nba_predictions/    # Main Django project settings
│   ├── accounts/           # User authentication (django-allauth)
│   └── predictions/        # Core application
│       ├── models/         # Database models (organized by domain)
│       │   ├── question.py      # Question + polymorphic subtypes
│       │   ├── answer.py        # User answers
│       │   ├── season.py        # NBA seasons
│       │   ├── team.py          # NBA teams
│       │   ├── player.py        # NBA players
│       │   ├── standings.py     # Standings (polymorphic)
│       │   ├── prediction.py    # User predictions
│       │   ├── award.py         # NBA awards and odds
│       │   └── user_stats.py    # Aggregated user points
│       ├── api/
│       │   ├── v1/         # Legacy REST API (being deprecated)
│       │   ├── v2/         # Modern Django Ninja API
│       │   │   ├── api.py       # Main NinjaAPI instance
│       │   │   ├── endpoints/   # Feature-based routers
│       │   │   └── schemas/     # Pydantic schemas
│       │   └── common/     # Shared API utilities
│       │       └── services/    # Business logic (e.g., AnswerLookupService)
│       ├── management/     # Django management commands
│       │   └── commands/        # Custom commands (grading, data fetch)
│       ├── templates/      # Django templates
│       ├── views/          # Django views
│       └── routing/        # URL routing
│
├── frontend/               # React application
│   ├── src/
│   │   ├── pages/         # Page-level components
│   │   ├── components/    # Reusable components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── utils/         # Utility functions
│   │   ├── styles/        # CSS and Tailwind config
│   │   ├── types/         # TypeScript types
│   │   └── index.jsx      # Component mounting entry point
│   └── static/            # Built static files (bundle.js, styles.css)
│
├── docs/                  # Documentation
│   ├── ai-assistants/     # Modular AI assistant guides
│   ├── backend/           # Backend-specific docs
│   ├── frontend/          # Frontend-specific docs
│   └── tech_debt_remediation/  # Technical debt tracking
│
├── scripts/               # Utility scripts
├── .github/workflows/     # CI/CD pipelines
└── [Various .md files]    # Root-level documentation

```

## Key Concepts

### 1. Polymorphic Models
Uses `django-polymorphic` for model inheritance:
- **Question** subtypes: SuperlativeQuestion, PropQuestion, PlayerStatPredictionQuestion, HeadToHeadQuestion, InSeasonTournamentQuestion, NBAFinalsPredictionQuestion
- **Standings** subtypes: RegularSeasonStanding, ISTStanding, PlayoffStanding
- Always use `.get_real_instance()` to access subclass fields

### 2. Season-Based Scoping
Most features are tied to an NBA season:
- Seasons identified by slug (e.g., "2024-25")
- Questions belong to seasons
- Predictions are per-season
- Leaderboards are per-season
- Get latest: `Season.objects.order_by('-end_date').first()`

### 3. Dual API Architecture
- **API v1** (`/api/v1/`): Legacy Django views-based REST API
- **API v2** (`/api/v2/`): Modern Django Ninja API with automatic docs at `/api/v2/docs/`
- **Migration in progress**: Prefer v2 for all new endpoints

### 4. Component Mounting Pattern
React components mount to Django template elements by ID:
```javascript
// frontend/src/index.jsx
mountComponent(HomePage, 'home-root', 'HomePage');
```

Django templates render:
```html
<div id="home-root" data-season-slug="2024-25"></div>
```

### 5. Grading System
User points calculated via management commands:
1. Admin sets `correct_answer` on Question model
2. Run grading command: `python manage.py grade_props_answers <season-slug>`
3. `AnswerLookupService` normalizes and resolves answers
4. Points awarded based on `question.point_value`
5. Results aggregated into UserStats for leaderboards

### 6. Blue-Green Deployment
- Two web containers: `web-blue` (port 8000) and `web-green` (port 8002)
- CI/CD switches traffic between containers
- Zero-downtime deployments

### 7. bd (beads) Issue Tracking
- **Required for all task tracking** - DO NOT use markdown TODOs
- Git-friendly (auto-syncs to `.beads/issues.jsonl`)
- Dependency-aware (track blockers)
- See `AGENTS.md` for detailed workflow

## Related Documentation

Load these files for specific topics:

| Topic | File | When to Load |
|-------|------|--------------|
| Setup & Commands | `02-development-setup.md` | Setting up environment, running commands |
| Architecture | `03-architecture.md` | Understanding system design, data flow |
| Django Backend | `04-backend-django.md` | Working with models, polymorphism |
| API Development | `05-backend-api.md` | Creating/modifying API endpoints |
| React Frontend | `06-frontend-react.md` | Working with React components |
| Database | `07-database-models.md` | Schema, relationships, migrations |
| Common Tasks | `08-common-tasks.md` | Step-by-step guides |
| Git Workflow | `09-git-workflow.md` | Commits, PRs, bd usage |
| Deployment | `10-deployment.md` | Docker, CI/CD |
| Security | `11-security-best-practices.md` | Auth, validation patterns |
| Testing | `12-testing.md` | Writing and running tests |

---

**Next Steps:**
- For environment setup → Load `02-development-setup.md`
- For architecture deep-dive → Load `03-architecture.md`
- For task-specific guidance → Load `08-common-tasks.md`
