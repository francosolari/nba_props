# 05 - Backend: API Development

**Part of:** AI Assistant Documentation
**Load when:** Creating or modifying API endpoints, working with Django Ninja, or understanding API patterns

## Table of Contents
- [API Architecture Overview](#api-architecture-overview)
- [API v2 (Django Ninja) - Current](#api-v2-django-ninja---current)
- [Creating New Endpoints](#creating-new-endpoints)
- [Schema Design](#schema-design)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [API v1 (Legacy)](#api-v1-legacy)

## API Architecture Overview

The project has two API versions:

| Version | Technology | Status | Location | Documentation |
|---------|-----------|---------|----------|---------------|
| **v1** | Django views | Legacy, deprecating | `predictions/api/v1/` | Manual docs |
| **v2** | Django Ninja | Current, preferred | `predictions/api/v2/` | Auto-generated at `/api/v2/docs/` |

**IMPORTANT**: All new endpoints must use API v2 (Django Ninja).

## API v2 (Django Ninja) - Current

### Main API Instance

Located in `predictions/api/v2/api.py`:

```python
from ninja import NinjaAPI
from ninja.security import django_auth

# Create API instance
api = NinjaAPI(
    title="NBA Predictions API v2",
    version="2.0.0",
    description="Modern REST API for NBA predictions",
)

# Import and register routers
from .endpoints.players import router as players_router
from .endpoints.teams import router as teams_router
# ... etc

api.add_router("/players", players_router)
api.add_router("/teams", teams_router)
# ... etc
```

### URL Configuration

In `predictions/api/v2/urls.py`:

```python
from django.urls import path
from .api import api

urlpatterns = [
    path("", api.urls),
]
```

Main URL config includes this:

```python
# predictions/urls.py
urlpatterns = [
    path('api/v2/', include('predictions.api.v2.urls')),
]
```

**Result**: Endpoints available at `/api/v2/<router>/<endpoint>/`

### Endpoint Organization

Endpoints organized by feature in `predictions/api/v2/endpoints/`:

```
endpoints/
├── __init__.py
├── players.py              # GET /api/v2/players/
├── teams.py                # GET /api/v2/teams/
├── standings.py            # GET /api/v2/standings/
├── leaderboard.py          # GET /api/v2/leaderboard/
├── answers.py              # POST /api/v2/answers/
├── user_submissions.py     # GET /api/v2/user-submissions/
├── admin_questions.py      # POST /api/v2/admin/questions/
├── admin_grading.py        # POST /api/v2/admin/grading/
├── payments.py             # POST /api/v2/payments/
├── odds.py                 # GET /api/v2/odds/
└── homepage.py             # GET /api/v2/homepage/
```

## Creating New Endpoints

### Step 1: Define Schemas

Create Pydantic schemas in `predictions/api/v2/schemas/` or `schemas.py`:

```python
# predictions/api/v2/schemas.py
from ninja import Schema
from typing import List, Optional
from datetime import datetime

class PlayerSchema(Schema):
    id: int
    name: str
    team_name: Optional[str] = None
    position: Optional[str] = None
    jersey_number: Optional[int] = None

class PlayerDetailSchema(Schema):
    id: int
    name: str
    team: "TeamSchema"  # Forward reference
    position: str
    stats: Optional[dict] = None

class PlayerCreateSchema(Schema):
    name: str
    team_id: int
    position: str
    jersey_number: Optional[int] = None

class ErrorSchema(Schema):
    message: str
    details: Optional[dict] = None
```

### Step 2: Create Router

Create new file in `predictions/api/v2/endpoints/`:

```python
# predictions/api/v2/endpoints/players.py
from ninja import Router
from typing import List
from django.shortcuts import get_object_or_404
from predictions.models import Player, Team
from ..schemas import PlayerSchema, PlayerDetailSchema, PlayerCreateSchema, ErrorSchema

router = Router()

@router.get("/", response=List[PlayerSchema])
def list_players(request, team: str = None):
    """List all players, optionally filtered by team"""
    players = Player.objects.select_related('team').all()

    if team:
        players = players.filter(team__abbreviation=team)

    return players


@router.get("/{player_id}", response=PlayerDetailSchema)
def get_player(request, player_id: int):
    """Get detailed info for a specific player"""
    player = get_object_or_404(
        Player.objects.select_related('team'),
        id=player_id
    )
    return player


@router.post("/", response={201: PlayerDetailSchema, 400: ErrorSchema})
def create_player(request, payload: PlayerCreateSchema):
    """Create a new player"""
    try:
        team = Team.objects.get(id=payload.team_id)
        player = Player.objects.create(
            name=payload.name,
            team=team,
            position=payload.position,
            jersey_number=payload.jersey_number
        )
        return 201, player
    except Team.DoesNotExist:
        return 400, {"message": "Team not found"}
    except Exception as e:
        return 400, {"message": str(e)}


@router.put("/{player_id}", response=PlayerDetailSchema)
def update_player(request, player_id: int, payload: PlayerCreateSchema):
    """Update a player"""
    player = get_object_or_404(Player, id=player_id)

    player.name = payload.name
    player.team_id = payload.team_id
    player.position = payload.position
    player.jersey_number = payload.jersey_number
    player.save()

    return player


@router.delete("/{player_id}", response={204: None})
def delete_player(request, player_id: int):
    """Delete a player"""
    player = get_object_or_404(Player, id=player_id)
    player.delete()
    return 204, None
```

### Step 3: Register Router

In `predictions/api/v2/api.py`:

```python
from .endpoints.players import router as players_router

api.add_router("/players", players_router)
```

### Step 4: Test

Visit `/api/v2/docs/` to see interactive documentation and test your endpoints.

## Schema Design

### Best Practices

#### 1. Separate Input/Output Schemas

```python
# Input schema (for POST/PUT)
class QuestionCreateSchema(Schema):
    season_id: int
    text: str
    point_value: float = 0.5

# Output schema (for GET)
class QuestionSchema(Schema):
    id: int
    season: SeasonSchema
    text: str
    point_value: float
    created_at: datetime
```

#### 2. Use Optional for Nullable Fields

```python
class PlayerSchema(Schema):
    id: int
    name: str
    team_name: Optional[str] = None  # Can be null
    stats: Optional[dict] = None     # Can be null
```

#### 3. Nested Schemas

```python
class TeamSchema(Schema):
    id: int
    name: str
    abbreviation: str

class PlayerDetailSchema(Schema):
    id: int
    name: str
    team: TeamSchema  # Nested object
```

#### 4. Type Hints

```python
from typing import List, Dict, Optional
from datetime import datetime, date

class LeaderboardEntrySchema(Schema):
    rank: int
    user_id: int
    username: str
    points: float
    answers: List[str]
    metadata: Dict[str, any]
    last_updated: datetime
```

### Schema from Django Model

Django Ninja can auto-generate schemas:

```python
from ninja import ModelSchema
from predictions.models import Player

class PlayerSchema(ModelSchema):
    class Config:
        model = Player
        model_fields = ['id', 'name', 'position', 'jersey_number']
```

**Custom fields:**

```python
class PlayerSchema(ModelSchema):
    team_name: str

    class Config:
        model = Player
        model_fields = ['id', 'name', 'position']

    @staticmethod
    def resolve_team_name(obj):
        return obj.team.name if obj.team else None
```

## Authentication

### Require Authentication

```python
from ninja.security import django_auth

@router.get("/profile", auth=django_auth)
def get_profile(request):
    """Get current user's profile (requires login)"""
    user = request.user  # Guaranteed to exist
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email
    }
```

### Optional Authentication

```python
@router.get("/leaderboard")
def get_leaderboard(request, season_slug: str):
    """Get leaderboard (optionally shows current user's rank)"""
    leaderboard = get_leaderboard_data(season_slug)

    if request.user.is_authenticated:
        user_rank = get_user_rank(request.user, season_slug)
        return {
            "leaderboard": leaderboard,
            "user_rank": user_rank
        }

    return {"leaderboard": leaderboard}
```

### Admin-Only Endpoints

```python
from django.http import HttpResponseForbidden

@router.post("/admin/questions", auth=django_auth)
def create_question(request, payload: QuestionCreateSchema):
    """Create question (admin only)"""
    if not request.user.is_staff:
        return HttpResponseForbidden("Admin access required")

    # Create question...
```

## Error Handling

### Multiple Response Types

```python
@router.post("/answers/", response={
    201: AnswerSchema,
    400: ErrorSchema,
    404: ErrorSchema
})
def submit_answer(request, payload: AnswerCreateSchema):
    try:
        question = Question.objects.get(id=payload.question_id)
    except Question.DoesNotExist:
        return 404, {"message": "Question not found"}

    # Validate answer
    if not payload.answer_text:
        return 400, {"message": "Answer text is required"}

    # Create answer
    answer = Answer.objects.create(
        user=request.user,
        question=question,
        answer_text=payload.answer_text
    )

    return 201, answer
```

### Global Error Handler

In `predictions/api/v2/api.py`:

```python
from ninja.errors import ValidationError

@api.exception_handler(ValidationError)
def validation_errors(request, exc):
    return api.create_response(
        request,
        {"message": "Validation error", "errors": exc.errors},
        status=400,
    )

@api.exception_handler(Exception)
def server_error(request, exc):
    return api.create_response(
        request,
        {"message": "Internal server error"},
        status=500,
    )
```

## API v1 (Legacy)

Located in `predictions/api/v1/`.

**DO NOT ADD NEW ENDPOINTS TO V1**

### Migration Path

When updating v1 endpoints:
1. Check if v2 equivalent exists
2. If not, create v2 endpoint first
3. Update frontend to use v2
4. Mark v1 as deprecated
5. Eventually remove v1

### V1 Pattern (for reference only)

```python
# predictions/api/v1/views.py
from django.http import JsonResponse
from predictions.models import Player

def list_players(request):
    players = Player.objects.all()
    return JsonResponse({
        "players": [
            {"id": p.id, "name": p.name}
            for p in players
        ]
    })
```

## Common Patterns

### Pagination

```python
from ninja.pagination import paginate, PageNumberPagination

@router.get("/players", response=List[PlayerSchema])
@paginate(PageNumberPagination)
def list_players(request):
    return Player.objects.all()

# Result: /api/v2/players/?page=1&page_size=20
```

### Filtering

```python
from ninja import Query

class PlayerFilterSchema(Schema):
    team: Optional[str] = None
    position: Optional[str] = None
    min_points: Optional[float] = None

@router.get("/players", response=List[PlayerSchema])
def list_players(request, filters: Query[PlayerFilterSchema]):
    players = Player.objects.all()

    if filters.team:
        players = players.filter(team__abbreviation=filters.team)

    if filters.position:
        players = players.filter(position=filters.position)

    return players
```

### File Uploads

```python
from ninja import File, UploadedFile

@router.post("/upload-photo")
def upload_photo(request, file: UploadedFile = File(...)):
    # Handle file upload
    content = file.read()
    # Save to disk or cloud storage
    return {"filename": file.name, "size": len(content)}
```

## Testing API Endpoints

### Interactive Docs

Visit `/api/v2/docs/` for Swagger UI with:
- Endpoint documentation
- Request/response examples
- Try-it-out functionality

### Python Requests

```python
import requests

# GET request
response = requests.get("http://localhost:8000/api/v2/players/")
players = response.json()

# POST request
response = requests.post(
    "http://localhost:8000/api/v2/players/",
    json={
        "name": "LeBron James",
        "team_id": 1,
        "position": "SF"
    }
)
```

### Django Test Client

```python
from django.test import TestCase, Client

class PlayerAPITest(TestCase):
    def test_list_players(self):
        client = Client()
        response = client.get('/api/v2/players/')
        self.assertEqual(response.status_code, 200)
```

## Related Documentation

- **Django patterns**: Load `04-backend-django.md`
- **Frontend API usage**: Load `06-frontend-react.md`
- **Database schema**: Load `07-database-models.md`
- **Testing**: Load `12-testing.md`

---

**Key Takeaways:**
1. Always use API v2 (Django Ninja) for new endpoints
2. Organize endpoints by feature in separate router files
3. Use Pydantic schemas for type safety
4. Test with interactive docs at `/api/v2/docs/`
5. Follow RESTful conventions
6. Handle authentication explicitly
7. Return proper HTTP status codes
