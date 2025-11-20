# 04 - Backend: Django Patterns

**Part of:** AI Assistant Documentation
**Load when:** Working with Django models, ORM queries, polymorphic models, or backend business logic

## Table of Contents
- [Model Organization](#model-organization)
- [Polymorphic Models](#polymorphic-models)
- [Common Model Patterns](#common-model-patterns)
- [Django ORM Best Practices](#django-orm-best-practices)
- [Management Commands](#management-commands)
- [Admin Interface](#admin-interface)

## Model Organization

Models are organized by domain in `predictions/models/`:

```python
# predictions/models/__init__.py
from .season import Season
from .team import Team
from .player import Player
from .question import Question, SuperlativeQuestion, PropQuestion, ...
from .answer import Answer
from .standings import Standing, RegularSeasonStanding, ISTStanding, ...
from .prediction import StandingPrediction, PlayoffPrediction
from .award import Award, Odds
from .payment import Payment
from .user_stats import UserStats
```

**Benefits of this organization:**
- Easier to find related models
- Reduces merge conflicts
- Clearer dependencies
- Better code organization

## Polymorphic Models

This project uses `django-polymorphic` for model inheritance.

### Question Model Hierarchy

```python
# predictions/models/question.py
from polymorphic.models import PolymorphicModel

class Question(PolymorphicModel):
    """Base question model"""
    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    text = models.TextField()
    point_value = models.FloatField(default=0.5)
    correct_answer = models.CharField(max_length=100, null=True, blank=True)
    is_manual = models.BooleanField(default=False)
    last_updated = models.DateTimeField(auto_now=True)

class SuperlativeQuestion(Question):
    """Award predictions (MVP, DPOY, etc.)"""
    award = models.ForeignKey(Award, on_delete=models.CASCADE)
    winners = models.ManyToManyField(Player, related_name='superlative_wins')
    is_finalized = models.BooleanField(default=False)
    current_leader = models.ForeignKey(Player, null=True, ...)
    current_leader_odds = models.CharField(max_length=10, null=True, ...)

class PropQuestion(Question):
    """Player stat thresholds (e.g., "Will LeBron score 30+ PPG?")"""
    player = models.ForeignKey(Player, on_delete=models.CASCADE)
    stat_type = models.CharField(max_length=50)
    threshold = models.FloatField()

class PlayerStatPredictionQuestion(Question):
    """Predict exact stat value"""
    player = models.ForeignKey(Player, on_delete=models.CASCADE)
    stat_type = models.CharField(max_length=50)

class HeadToHeadQuestion(Question):
    """Compare two players"""
    player_a = models.ForeignKey(Player, related_name='h2h_a', ...)
    player_b = models.ForeignKey(Player, related_name='h2h_b', ...)
    stat_type = models.CharField(max_length=50)

class InSeasonTournamentQuestion(Question):
    """IST-specific predictions"""
    tournament_stage = models.CharField(max_length=50)

class NBAFinalsPredictionQuestion(Question):
    """Finals matchup and winner"""
    pass
```

### Working with Polymorphic Models

#### Querying

```python
# Returns mixed list of Question subtypes
questions = Question.objects.filter(season=season)

# Filter by specific subtype
superlative_questions = SuperlativeQuestion.objects.filter(season=season)

# Query by base class, filter by subtype field (works!)
mvp_questions = Question.objects.filter(award__name="MVP")
```

#### Accessing Subtype Fields

```python
# WRONG - base model doesn't have subtype fields
question = Question.objects.get(id=1)
print(question.award)  # AttributeError!

# CORRECT - get real instance first
question = Question.objects.get(id=1)
real_question = question.get_real_instance()

if isinstance(real_question, SuperlativeQuestion):
    print(real_question.award.name)
elif isinstance(real_question, PropQuestion):
    print(f"{real_question.player.name} - {real_question.stat_type}")
```

#### Creating Instances

```python
# Create subtype directly
superlative_q = SuperlativeQuestion.objects.create(
    season=season,
    text="Who will win MVP?",
    award=mvp_award,
    point_value=1.0
)

# Polymorphic query includes it
all_questions = Question.objects.filter(season=season)
# Now includes superlative_q
```

### Standings Model Hierarchy

```python
# predictions/models/standings.py
class Standing(PolymorphicModel):
    """Base standing model"""
    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    wins = models.IntegerField(default=0)
    losses = models.IntegerField(default=0)

class RegularSeasonStanding(Standing):
    """Regular season standings"""
    conference = models.CharField(max_length=10)
    division = models.CharField(max_length=50)
    conference_rank = models.IntegerField(null=True)

class ISTStanding(Standing):
    """In-Season Tournament standings"""
    group = models.CharField(max_length=10)
    point_differential = models.IntegerField(default=0)

class PlayoffStanding(Standing):
    """Playoff bracket"""
    seed = models.IntegerField()
    round = models.CharField(max_length=50)
    opponent = models.ForeignKey(Team, related_name='playoff_opponent', ...)
```

## Common Model Patterns

### Season Foreign Key

Most models should reference a season:

```python
class Answer(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    answer_text = models.TextField()
    points_awarded = models.FloatField(default=0)

    class Meta:
        unique_together = ('user', 'question')
```

### Timestamps

Use Django's auto fields for tracking:

```python
class Payment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=6, decimal_places=2)

    # Automatically set on creation
    created_at = models.DateTimeField(auto_now_add=True)

    # Automatically updated on save
    updated_at = models.DateTimeField(auto_now=True)
```

### Soft Deletes (Not Currently Used)

If needed in the future:

```python
class SoftDeleteModel(models.Model):
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def delete(self, *args, **kwargs):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save()
```

### Slugs for URLs

```python
class Season(models.Model):
    name = models.CharField(max_length=20)  # e.g., "2024-25"
    slug = models.SlugField(unique=True)    # e.g., "2024-25"
    start_date = models.DateField()
    end_date = models.DateField()

    def __str__(self):
        return self.name
```

## Django ORM Best Practices

### Select Related (Foreign Keys)

Use `select_related()` for foreign key relationships to avoid N+1 queries:

```python
# BAD - N+1 queries
questions = Question.objects.filter(season=season)
for q in questions:
    print(q.season.name)  # New query for each iteration!

# GOOD - Single query with JOIN
questions = Question.objects.filter(season=season).select_related('season')
for q in questions:
    print(q.season.name)  # No additional queries
```

### Prefetch Related (Many-to-Many / Reverse FK)

Use `prefetch_related()` for many-to-many and reverse foreign key relationships:

```python
# BAD - N+1 queries
questions = SuperlativeQuestion.objects.filter(season=season)
for q in questions:
    print(q.winners.all())  # New query for each iteration!

# GOOD - Two queries total
questions = SuperlativeQuestion.objects.filter(
    season=season
).prefetch_related('winners')
for q in questions:
    print(q.winners.all())  # Uses prefetched data
```

### Combined Optimization

```python
# Optimize complex query
questions = Question.objects.filter(
    season=season
).select_related(
    'season',  # Foreign key
).prefetch_related(
    'answer_set',  # Reverse FK
    'answer_set__user',  # Nested relationship
)
```

### Only/Defer for Large Fields

```python
# Only fetch needed fields
questions = Question.objects.only('id', 'text', 'point_value')

# Exclude large fields
questions = Question.objects.defer('metadata_json')
```

### Aggregation

```python
from django.db.models import Count, Sum, Avg

# Count answers per question
question_stats = Question.objects.annotate(
    answer_count=Count('answer')
)

# Sum points for leaderboard
user_stats = UserStats.objects.filter(
    season=season
).aggregate(
    total_points=Sum('points'),
    avg_points=Avg('points')
)
```

### Bulk Operations

```python
# Bulk create (much faster than loop)
answers = [
    Answer(user=user, question=q, answer_text="LeBron")
    for q in questions
]
Answer.objects.bulk_create(answers)

# Bulk update
Answer.objects.filter(question=question).update(points_awarded=1.0)
```

### F Expressions (Atomic Updates)

```python
from django.db.models import F

# Increment without race condition
UserStats.objects.filter(user=user, season=season).update(
    points=F('points') + 1.0
)
```

## Management Commands

Located in `predictions/management/commands/`.

### Command Structure

```python
# predictions/management/commands/grade_props_answers.py
from django.core.management.base import BaseCommand
from predictions.models import Season, Question, Answer

class Command(BaseCommand):
    help = 'Grade user answers for a season'

    def add_arguments(self, parser):
        parser.add_argument('season_slug', type=str, help='Season slug')

    def handle(self, *args, **options):
        season_slug = options['season_slug']
        season = Season.objects.get(slug=season_slug)

        self.stdout.write(f"Grading season: {season.name}")

        # Grading logic here...

        self.stdout.write(self.style.SUCCESS('Grading complete!'))
```

### Running Commands

```bash
# Basic usage
python manage.py grade_props_answers 2024-25

# With Django management wrapper
venv/bin/python backend/manage.py grade_props_answers 2024-25
```

### Common Commands in This Project

```bash
# Grading
python manage.py grade_props_answers <season-slug>
python manage.py grade_standing_predictions <season-slug>
python manage.py grade_ist_predictions <season-slug>

# Data fetching
python manage.py scrape_odds
python manage.py update_standings <season-slug>

# Database
python manage.py migrate
python manage.py makemigrations
python manage.py shell_plus
```

## Admin Interface

Located in `predictions/admin.py`.

### Basic Admin Registration

```python
from django.contrib import admin
from .models import Season, Team, Player

@admin.register(Season)
class SeasonAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'start_date', 'end_date')
    prepopulated_fields = {'slug': ('name',)}
    ordering = ('-start_date',)

@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'abbreviation', 'conference', 'division')
    list_filter = ('conference', 'division')
    search_fields = ('name', 'abbreviation')

@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ('name', 'team', 'position')
    list_filter = ('team', 'position')
    search_fields = ('name',)
    autocomplete_fields = ('team',)
```

### Polymorphic Admin

```python
from polymorphic.admin import PolymorphicParentModelAdmin, PolymorphicChildModelAdmin

class QuestionChildAdmin(PolymorphicChildModelAdmin):
    base_model = Question

@admin.register(SuperlativeQuestion)
class SuperlativeQuestionAdmin(QuestionChildAdmin):
    base_model = SuperlativeQuestion
    list_display = ('text', 'award', 'season', 'point_value')
    list_filter = ('award', 'season')

@admin.register(Question)
class QuestionParentAdmin(PolymorphicParentModelAdmin):
    base_model = Question
    child_models = (SuperlativeQuestion, PropQuestion, ...)
    list_display = ('text', 'season', 'point_value')
```

### Custom Admin Actions

```python
@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    actions = ['set_correct_answer']

    def set_correct_answer(self, request, queryset):
        # Custom action logic
        queryset.update(correct_answer="LeBron James")
        self.message_user(request, f"Updated {queryset.count()} questions")

    set_correct_answer.short_description = "Set correct answer"
```

## Related Documentation

- **API development**: Load `05-backend-api.md`
- **Database schema**: Load `07-database-models.md`
- **Common tasks**: Load `08-common-tasks.md`
- **Architecture overview**: Load `03-architecture.md`

---

**Key Takeaways:**
1. Models organized by domain in separate files
2. Use `get_real_instance()` for polymorphic models
3. Optimize queries with `select_related()` and `prefetch_related()`
4. Management commands for business logic
5. Leverage Django admin for data management
