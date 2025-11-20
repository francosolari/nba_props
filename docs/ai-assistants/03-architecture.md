# 03 - Architecture

**Part of:** AI Assistant Documentation
**Load when:** Understanding system design, data flow, architectural decisions, or planning major features

## Table of Contents
- [System Overview](#system-overview)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Data Flow](#data-flow)
- [Key Architectural Patterns](#key-architectural-patterns)
- [Deployment Architecture](#deployment-architecture)

## System Overview

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTP/HTTPS
       ▼
┌─────────────────────────────────┐
│  Django Application             │
│  ┌───────────┐   ┌────────────┐│
│  │  Django   │◄──┤  React SPA ││
│  │  Views    │   │  (bundled) ││
│  └─────┬─────┘   └────────────┘│
│        │                        │
│        ▼                        │
│  ┌───────────┐   ┌────────────┐│
│  │  API v2   │   │   API v1   ││
│  │  (Ninja)  │   │  (Legacy)  ││
│  └─────┬─────┘   └─────┬──────┘│
│        │                │       │
│        └────────┬───────┘       │
│                 ▼               │
│        ┌─────────────────┐     │
│        │  Business Logic │     │
│        │   & Services    │     │
│        └────────┬────────┘     │
│                 ▼               │
│        ┌─────────────────┐     │
│        │  Django Models  │     │
│        │  (Polymorphic)  │     │
│        └────────┬────────┘     │
└─────────────────┼──────────────┘
                  ▼
         ┌────────────────┐
         │   PostgreSQL   │
         └────────────────┘
```

## Backend Architecture

### Django App Structure

```
backend/
├── nba_predictions/          # Project-level configuration
│   ├── settings.py           # Django settings
│   ├── urls.py               # Root URL routing
│   └── wsgi.py / asgi.py     # WSGI/ASGI entry points
│
├── accounts/                 # Authentication app
│   ├── models.py             # User profile extensions
│   └── views.py              # Auth views
│
└── predictions/              # Core application
    ├── models/               # Domain-driven model organization
    │   ├── question.py       # Questions + polymorphic subtypes
    │   ├── answer.py         # User answers
    │   ├── season.py         # NBA seasons
    │   ├── team.py           # NBA teams
    │   ├── player.py         # NBA players
    │   ├── standings.py      # Standings (polymorphic)
    │   ├── prediction.py     # User predictions
    │   ├── award.py          # Awards and odds
    │   ├── payment.py        # Payment tracking
    │   └── user_stats.py     # Aggregated user points
    │
    ├── api/
    │   ├── v1/               # Legacy REST API
    │   ├── v2/               # Modern Django Ninja API
    │   │   ├── api.py        # Main NinjaAPI instance
    │   │   ├── endpoints/    # Feature-based routers
    │   │   │   ├── players.py
    │   │   │   ├── teams.py
    │   │   │   ├── standings.py
    │   │   │   ├── leaderboard.py
    │   │   │   ├── answers.py
    │   │   │   ├── user_submissions.py
    │   │   │   ├── admin_questions.py
    │   │   │   ├── admin_grading.py
    │   │   │   ├── payments.py
    │   │   │   └── odds.py
    │   │   └── schemas/      # Pydantic models
    │   │       ├── __init__.py
    │   │       └── *.py      # Schema definitions
    │   └── common/
    │       └── services/
    │           └── answer_lookup_service.py  # Answer normalization
    │
    ├── management/commands/  # Custom Django commands
    │   ├── grade_props_answers.py
    │   ├── grade_standing_predictions.py
    │   ├── grade_ist_predictions.py
    │   └── scrape_odds.py
    │
    ├── routing/              # URL routing
    │   └── view_urls.py      # View-level routes
    │
    ├── templates/            # Django templates
    │   └── predictions/      # App templates
    │
    ├── views/                # Django views
    └── utils/                # Utility functions
```

### API Architecture (Dual Version)

#### API v1 (Legacy - Deprecating)
- Traditional Django views-based REST API
- Located in `predictions/api/v1/`
- Uses Django REST Framework patterns
- Being phased out in favor of v2

#### API v2 (Current - Django Ninja)
- Modern, type-safe REST API
- Located in `predictions/api/v2/`
- **Automatic OpenAPI documentation** at `/api/v2/docs/`
- Pydantic schemas for request/response validation
- Feature-based router organization

**API v2 Structure:**
```python
# predictions/api/v2/api.py
api = NinjaAPI(title="NBA Predictions API v2", version="2.0.0")

# Register routers
api.add_router("/players", players_router)
api.add_router("/teams", teams_router)
api.add_router("/standings", standings_router)
# ... etc
```

**Endpoint Pattern:**
```python
# predictions/api/v2/endpoints/players.py
from ninja import Router
from ..schemas import PlayerSchema

router = Router()

@router.get("/", response=List[PlayerSchema])
def list_players(request):
    return Player.objects.all()
```

### Service Layer

Business logic is organized into services:
- **AnswerLookupService** (`predictions/api/common/services/answer_lookup_service.py`)
  - Normalizes user answers (handles case, whitespace)
  - Resolves player/team lookups
  - Used by grading commands

## Frontend Architecture

### React Application Structure

```
frontend/src/
├── index.jsx                # Entry point - mounts components to DOM
├── App.js                   # Root component (minimal)
│
├── pages/                   # Page-level components
│   ├── HomePage.jsx
│   ├── LeaderboardPage.jsx
│   ├── LeaderboardDetailPage.jsx
│   ├── ProfilePage.jsx
│   ├── SubmissionsPage.jsx
│   └── AdminPanel.jsx
│
├── components/              # Reusable components (flat structure)
│   ├── PredictionBoard.jsx
│   ├── EditablePredictionBoard.jsx
│   ├── Leaderboard.jsx
│   ├── NBAStandings.jsx
│   ├── QuestionForm.jsx
│   ├── TeamLogo.jsx
│   └── ... (25+ components)
│
├── hooks/                   # Custom React hooks
│   ├── useAdminQuestions.js
│   ├── useLeaderboard.js
│   ├── useSubmissions.js
│   └── useUserSubmissions.js
│
├── utils/                   # Utility functions
│   ├── api.js               # API client
│   └── helpers.js           # Helper functions
│
├── styles/                  # CSS and styling
│   ├── styles.css           # Global styles
│   ├── palette.css          # Color palette
│   └── tailwind.config.js   # Tailwind configuration
│
└── types/                   # TypeScript types (if using TS)
```

### Component Mounting System

React components are mounted to Django template elements:

**Frontend (index.jsx):**
```javascript
import { createRoot } from 'react-dom/client';
import HomePage from './pages/HomePage';

function mountComponent(Component, elementId, componentName) {
  const element = document.getElementById(elementId);
  if (element) {
    const root = createRoot(element);
    root.render(<Component />);
  }
}

// Mount components
mountComponent(HomePage, 'home-root', 'HomePage');
mountComponent(LeaderboardPage, 'leaderboard-root', 'LeaderboardPage');
// ... etc
```

**Backend (Django template):**
```html
{% load static %}
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="{% static 'css/styles.css' %}">
</head>
<body>
  <div id="home-root" data-season-slug="{{ season.slug }}"></div>
  <script src="{% static 'js/bundle.js' %}"></script>
</body>
</html>
```

### State Management

- **Server State**: TanStack Query (React Query)
  - Automatic caching, refetching, and invalidation
  - Used for all API data
  - Example hooks: `useQuery`, `useMutation`

- **Local State**: React useState/useReducer
  - Form inputs, UI toggles, etc.

- **No Redux**: Despite earlier documentation mentioning Redux, the current implementation uses React Query for server state

### Build Process

1. **Webpack** bundles React code
   - Entry: `frontend/src/index.jsx`
   - Output: `frontend/static/js/bundle.js` and `frontend/static/css/styles.css`

2. **Django collectstatic** copies to `frontend/staticfiles/`

3. **WhiteNoise** serves static files in production

## Data Flow

### User Prediction Flow

```
1. User visits prediction page
   └─► Django view renders template with React mount point

2. React component loads
   └─► Fetches questions via API v2
   └─► GET /api/v2/questions/<season-slug>/

3. User submits answer
   └─► POST /api/v2/answers/
   └─► Answer saved to database

4. Admin sets correct answer
   └─► Updates Question.correct_answer field

5. Grading command runs
   └─► python manage.py grade_props_answers <season-slug>
   └─► AnswerLookupService normalizes answers
   └─► Points awarded based on question.point_value
   └─► UserStats updated

6. Leaderboard updates
   └─► GET /api/v2/leaderboard/<season-slug>/
   └─► Fetches UserStats ordered by points
```

### Authentication Flow

```
1. User clicks "Login with Google"
   └─► Redirects to /accounts/google/login/ (django-allauth)

2. OAuth flow completes
   └─► User created/updated in database
   └─► Session cookie set

3. Authenticated requests
   └─► Frontend includes session cookie
   └─► Django authenticates via session middleware
   └─► API endpoints check request.user
```

## Key Architectural Patterns

### 1. Polymorphic Inheritance

**Why**: Different question types require different fields and grading logic

**Implementation:**
```python
# Base model
class Question(PolymorphicModel):
    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    text = models.TextField()
    correct_answer = models.CharField(max_length=100)

# Subtype
class SuperlativeQuestion(Question):
    award = models.ForeignKey(Award, on_delete=models.CASCADE)
    current_leader = models.ForeignKey(Player, ...)
```

**Usage:**
```python
# Query all questions (returns correct subtypes)
questions = Question.objects.filter(season=season)

# Access subtype fields
for q in questions:
    real_q = q.get_real_instance()
    if isinstance(real_q, SuperlativeQuestion):
        print(real_q.award.name)
```

### 2. Season-Based Scoping

**Why**: NBA game operates in seasons, predictions are season-specific

**Pattern:**
- Most models have `season` ForeignKey
- URLs include season slug: `/predictions/2024-25/`
- API endpoints accept season slug parameter
- Get current season: `Season.objects.order_by('-end_date').first()`

### 3. Service Layer for Business Logic

**Why**: Keep views thin, reuse logic across commands and APIs

**Example**: `AnswerLookupService`
- Used by grading commands
- Used by API endpoints for answer validation
- Centralizes normalization logic

### 4. Feature-Based API Organization

**Why**: Better scalability, easier to maintain than monolithic files

**Structure:**
```
api/v2/endpoints/
├── players.py       # Player-related endpoints
├── teams.py         # Team-related endpoints
├── standings.py     # Standings endpoints
├── leaderboard.py   # Leaderboard endpoints
└── answers.py       # Answer submission endpoints
```

Each file exports a `router` that's registered in `api.py`.

## Deployment Architecture

### Blue-Green Deployment

```
┌─────────────────┐
│  GitHub Actions │
│   CI/CD Pipeline│
└────────┬────────┘
         │
         │ Build & Push Docker Image
         ▼
┌─────────────────────────────┐
│   Docker Registry           │
└────────┬────────────────────┘
         │
         │ Pull Image
         ▼
┌─────────────────────────────┐
│   Production Server         │
│                             │
│  ┌──────────┐  ┌──────────┐│
│  │web-blue  │  │web-green ││
│  │(port 8000│  │(port 8002││
│  └────┬─────┘  └─────┬────┘│
│       │              │     │
│       └──────┬───────┘     │
│              ▼             │
│       ┌─────────────┐      │
│       │ PostgreSQL  │      │
│       └─────────────┘      │
└─────────────────────────────┘
```

**Process:**
1. Push to main branch
2. GitHub Actions builds Docker image
3. Image pushed to registry
4. Deploy to inactive container (blue or green)
5. Health check on new container
6. Switch traffic to new container
7. Old container kept as rollback option

**Benefits:**
- Zero-downtime deployments
- Easy rollback
- Test in production environment before switching

### Container Architecture

```yaml
# docker-compose.yml
services:
  web-blue:
    image: nba-predictions:latest
    ports: ["8000:8000"]

  web-green:
    image: nba-predictions:latest
    ports: ["8002:8000"]

  db:
    image: postgres:13
    volumes: ["postgres_data:/var/lib/postgresql/data"]
```

## Related Documentation

- **Django patterns**: Load `04-backend-django.md`
- **API development**: Load `05-backend-api.md`
- **React patterns**: Load `06-frontend-react.md`
- **Database schema**: Load `07-database-models.md`
- **Deployment details**: Load `10-deployment.md`

---

**Key Takeaways:**
1. Dual API architecture (v1 legacy, v2 current with Django Ninja)
2. Polymorphic models for flexible question types
3. React Query for server state management
4. Component mounting pattern for Django-React integration
5. Blue-green deployment for zero-downtime updates
6. Service layer for business logic reuse
