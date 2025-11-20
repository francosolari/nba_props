# 08 - Common Tasks

**Part of:** AI Assistant Documentation
**Load when:** Need step-by-step guidance for specific tasks

## Table of Contents
- [Adding a New Question Type](#adding-a-new-question-type)
- [Creating a New API Endpoint](#creating-a-new-api-endpoint)
- [Adding a New React Page](#adding-a-new-react-page)
- [Running Grading for a Season](#running-grading-for-a-season)
- [Deploying Changes](#deploying-changes)
- [Debugging Common Issues](#debugging-common-issues)

## Adding a New Question Type

**Use case**: Create a new polymorphic question subtype (e.g., "Best Record Question")

### Steps

1. **Define the model** in `predictions/models/question.py`:

```python
class BestRecordQuestion(Question):
    """Which team will have the best record?"""
    conference = models.CharField(
        max_length=10,
        choices=[('East', 'Eastern'), ('West', 'Western')],
        null=True,
        blank=True
    )
```

2. **Create migration**:

```bash
python manage.py makemigrations
python manage.py migrate
```

3. **Register in admin** (`predictions/admin.py`):

```python
from .models import BestRecordQuestion

@admin.register(BestRecordQuestion)
class BestRecordQuestionAdmin(QuestionChildAdmin):
    base_model = BestRecordQuestion
    list_display = ('text', 'conference', 'season', 'point_value')
    list_filter = ('conference', 'season')
```

4. **Add to API schema** (if needed):

```python
# predictions/api/v2/schemas.py
class BestRecordQuestionSchema(Schema):
    id: int
    text: str
    conference: Optional[str]
    point_value: float
```

5. **Update frontend** (if specific UI needed):

```javascript
// frontend/src/components/BestRecordQuestionCard.jsx
function BestRecordQuestionCard({ question }) {
  return (
    <div>
      <h3>{question.text}</h3>
      {question.conference && <p>Conference: {question.conference}</p>}
      {/* Answer form */}
    </div>
  );
}
```

## Creating a New API Endpoint

**Use case**: Add a new endpoint to fetch playoff brackets

### Steps

1. **Define schema** in `predictions/api/v2/schemas.py`:

```python
class PlayoffBracketSchema(Schema):
    season_slug: str
    rounds: List[PlayoffRoundSchema]

class PlayoffRoundSchema(Schema):
    round_name: str
    matchups: List[PlayoffMatchupSchema]

class PlayoffMatchupSchema(Schema):
    team_a: str
    team_b: str
    winner: Optional[str]
```

2. **Create router** in `predictions/api/v2/endpoints/playoffs.py`:

```python
from ninja import Router
from ..schemas import PlayoffBracketSchema

router = Router()

@router.get("/{season_slug}", response=PlayoffBracketSchema)
def get_playoff_bracket(request, season_slug: str):
    season = get_object_or_404(Season, slug=season_slug)
    # Fetch and format bracket data
    return {
        "season_slug": season_slug,
        "rounds": [...]
    }
```

3. **Register router** in `predictions/api/v2/api.py`:

```python
from .endpoints.playoffs import router as playoffs_router

api.add_router("/playoffs", playoffs_router)
```

4. **Test at** `/api/v2/docs/` or:

```bash
curl http://localhost:8000/api/v2/playoffs/2024-25/
```

## Adding a New React Page

**Use case**: Create a new page for playoff predictions

### Steps

1. **Create page component** in `frontend/src/pages/PlayoffPage.jsx`:

```javascript
import React from 'react';
import { useQuery } from '@tanstack/react-query';

function PlayoffPage() {
  const rootElement = document.getElementById('playoff-root');
  const seasonSlug = rootElement?.dataset?.seasonSlug;

  const { data, isLoading } = useQuery({
    queryKey: ['playoffs', seasonSlug],
    queryFn: () => fetch(`/api/v2/playoffs/${seasonSlug}/`).then(r => r.json()),
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto">
      <h1>Playoff Bracket</h1>
      {/* Render bracket */}
    </div>
  );
}

export default PlayoffPage;
```

2. **Mount component** in `frontend/src/index.jsx`:

```javascript
import PlayoffPage from './pages/PlayoffPage';

mountComponent(PlayoffPage, 'playoff-root', 'PlayoffPage');
```

3. **Create Django template** in `predictions/templates/predictions/playoff.html`:

```html
{% extends "base.html" %}
{% load static %}

{% block content %}
  <div id="playoff-root" data-season-slug="{{ season.slug }}"></div>
{% endblock %}

{% block scripts %}
  <script src="{% static 'js/bundle.js' %}"></script>
{% endblock %}
```

4. **Add Django view** in `predictions/views/playoff_views.py`:

```python
from django.shortcuts import render
from predictions.models import Season

def playoff_view(request, season_slug):
    season = get_object_or_404(Season, slug=season_slug)
    return render(request, 'predictions/playoff.html', {
        'season': season,
    })
```

5. **Add URL** in `predictions/routing/view_urls.py`:

```python
from ..views.playoff_views import playoff_view

urlpatterns = [
    path('playoffs/<slug:season_slug>/', playoff_view, name='playoff'),
]
```

6. **Build frontend**:

```bash
npm run build
python manage.py collectstatic --noinput
```

## Running Grading for a Season

**Use case**: Grade user answers after setting correct answers

### Steps

1. **Set correct answers** via Django admin:
   - Go to `/admin/predictions/question/`
   - Edit each question
   - Set `correct_answer` field
   - Save

2. **Run grading command**:

```bash
# Grade props/awards
python manage.py grade_props_answers 2024-25

# Grade standings
python manage.py grade_standing_predictions 2024-25

# Grade IST
python manage.py grade_ist_predictions 2024-25
```

3. **Verify results**:
   - Check UserStats: `/admin/predictions/userstats/`
   - Check leaderboard: `/leaderboard/2024-25/`

4. **Debug if needed**:

```bash
# Django shell
python manage.py shell_plus

# Check specific user
from predictions.models import UserStats
stats = UserStats.objects.get(user__username='johndoe', season__slug='2024-25')
print(f"Points: {stats.points}")
```

## Deploying Changes

**Use case**: Deploy new features to production

### Local Testing

```bash
# 1. Run tests
pytest backend/

# 2. Build frontend
npm run build

# 3. Collect static files
python manage.py collectstatic --noinput

# 4. Run migrations (on test DB first!)
python manage.py migrate

# 5. Test locally
python manage.py runserver
```

### Docker Testing

```bash
# 1. Build image
docker-compose -f docker-compose.dev.yml build

# 2. Start containers
docker-compose -f docker-compose.dev.yml up

# 3. Run migrations
docker-compose -f docker-compose.dev.yml exec web python manage.py migrate

# 4. Test
# Visit http://localhost:8000
```

### Production Deployment

```bash
# 1. Commit changes
git add .
git commit -m "Add playoff bracket feature"

# 2. Push to feature branch
git push -u origin claude/playoff-bracket-<session-id>

# 3. CI/CD automatically:
#    - Runs tests
#    - Builds Docker image
#    - Deploys to staging (blue or green)
#    - Awaits manual approval
#    - Switches traffic to new container

# 4. Monitor logs
docker-compose logs -f web-blue
```

See `DOCKER.md` and `10-deployment.md` for details.

## Debugging Common Issues

### Issue: Migration Conflicts

**Symptoms**: `Migration conflicts detected`

**Solution**:

```bash
# 1. Check migration status
python manage.py showmigrations predictions

# 2. Rollback to common ancestor
python manage.py migrate predictions 0042_common_migration

# 3. Delete conflicting migrations
rm backend/predictions/migrations/0043_conflict.py

# 4. Recreate migrations
python manage.py makemigrations

# 5. Apply
python manage.py migrate
```

### Issue: React Component Not Rendering

**Symptoms**: Blank page, no errors

**Checklist**:

1. **Check element ID matches**:
   ```javascript
   // index.jsx
   mountComponent(HomePage, 'home-root', 'HomePage');
   ```
   ```html
   <!-- template -->
   <div id="home-root"></div>
   ```

2. **Check bundle is loaded**:
   ```html
   <script src="{% static 'js/bundle.js' %}"></script>
   ```

3. **Check browser console** for errors

4. **Rebuild frontend**:
   ```bash
   npm run build
   python manage.py collectstatic --noinput
   ```

### Issue: API 404 Errors

**Symptoms**: `GET /api/v2/endpoint/ 404`

**Checklist**:

1. **Router registered**:
   ```python
   # api.py
   api.add_router("/endpoint", endpoint_router)
   ```

2. **URLs configured**:
   ```python
   # urls.py
   path('api/v2/', include('predictions.api.v2.urls')),
   ```

3. **Check endpoint path**:
   ```python
   # endpoints/endpoint.py
   @router.get("/")  # Results in /api/v2/endpoint/
   ```

4. **Test directly**:
   ```bash
   curl http://localhost:8000/api/v2/endpoint/
   ```

### Issue: Database Query Slow

**Symptoms**: Page loads slowly, many DB queries

**Solution**:

Use `select_related()` and `prefetch_related()`:

```python
# BEFORE (N+1 queries)
questions = Question.objects.filter(season=season)
for q in questions:
    print(q.season.name)  # New query each time!

# AFTER (1 query)
questions = Question.objects.filter(season=season).select_related('season')
for q in questions:
    print(q.season.name)  # Uses cached data
```

Debug with Django Debug Toolbar or:

```python
from django.db import connection
from django.test.utils import override_settings

with override_settings(DEBUG=True):
    # Your query
    print(len(connection.queries))  # Number of queries
    print(connection.queries)       # Query details
```

## Related Documentation

- **Django patterns**: Load `04-backend-django.md`
- **API development**: Load `05-backend-api.md`
- **React patterns**: Load `06-frontend-react.md`
- **Deployment**: Load `10-deployment.md`
- **Testing**: Load `12-testing.md`

---

**Key Takeaways:**
- Follow patterns established in existing code
- Test locally before deploying
- Use migrations for database changes
- Rebuild frontend after React changes
- Check Django admin for data verification
