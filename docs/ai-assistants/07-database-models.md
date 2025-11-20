# 07 - Database Models & Schema

**Part of:** AI Assistant Documentation
**Load when:** Working with database schema, models, relationships, or migrations

## Table of Contents
- [Database Schema Overview](#database-schema-overview)
- [Core Models](#core-models)
- [Polymorphic Models](#polymorphic-models)
- [Relationships](#relationships)
- [Migrations](#migrations)

## Database Schema Overview

**Database**: PostgreSQL 13+
**ORM**: Django ORM
**Special Features**: Polymorphic inheritance via django-polymorphic

### Model Organization

Models in `predictions/models/`:
- `season.py` - NBA seasons
- `team.py` - NBA teams
- `player.py` - NBA players
- `question.py` - Questions (polymorphic base + subtypes)
- `answer.py` - User answers
- `standings.py` - Standings (polymorphic base + subtypes)
- `prediction.py` - User predictions
- `award.py` - Awards and betting odds
- `payment.py` - Payment tracking
- `user_stats.py` - Aggregated user points

## Core Models

### Season
```python
class Season(models.Model):
    name = models.CharField(max_length=20)  # "2024-25"
    slug = models.SlugField(unique=True)    # "2024-25"
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
```

### Team
```python
class Team(models.Model):
    name = models.CharField(max_length=100)
    abbreviation = models.CharField(max_length=3)
    city = models.CharField(max_length=100)
    conference = models.CharField(max_length=10)  # East/West
    division = models.CharField(max_length=50)
    logo_url = models.URLField(blank=True)
```

### Player
```python
class Player(models.Model):
    name = models.CharField(max_length=100)
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True)
    position = models.CharField(max_length=10)
    jersey_number = models.IntegerField(null=True)
    is_active = models.BooleanField(default=True)
```

### Answer
```python
class Answer(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    answer_text = models.TextField()
    points_awarded = models.FloatField(default=0)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'question')
```

### UserStats
```python
class UserStats(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    points = models.FloatField(default=0)
    correct_answers = models.IntegerField(default=0)
    total_answers = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'season')
```

## Polymorphic Models

### Question Hierarchy

```python
# Base model
class Question(PolymorphicModel):
    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    text = models.TextField()
    point_value = models.FloatField(default=0.5)
    correct_answer = models.CharField(max_length=100, null=True)
    is_manual = models.BooleanField(default=False)
    last_updated = models.DateTimeField(auto_now=True)

# Subtypes
class SuperlativeQuestion(Question):
    """MVP, DPOY, etc."""
    award = models.ForeignKey(Award, on_delete=models.CASCADE)
    winners = models.ManyToManyField(Player, related_name='superlative_wins')
    current_leader = models.ForeignKey(Player, null=True, ...)

class PropQuestion(Question):
    """Player stat thresholds"""
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
    """IST predictions"""
    tournament_stage = models.CharField(max_length=50)

class NBAFinalsPredictionQuestion(Question):
    """Finals predictions"""
    pass
```

### Standing Hierarchy

```python
class Standing(PolymorphicModel):
    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    wins = models.IntegerField(default=0)
    losses = models.IntegerField(default=0)

class RegularSeasonStanding(Standing):
    conference = models.CharField(max_length=10)
    conference_rank = models.IntegerField(null=True)

class ISTStanding(Standing):
    group = models.CharField(max_length=10)
    point_differential = models.IntegerField(default=0)

class PlayoffStanding(Standing):
    seed = models.IntegerField()
    round = models.CharField(max_length=50)
```

## Relationships

### One-to-Many

```
Season ──< Question
Season ──< Answer
Season ──< UserStats
Team ──< Player
Question ──< Answer
User ──< Answer
User ──< UserStats
```

### Many-to-Many

```
SuperlativeQuestion >──< Player (winners)
```

### Polymorphic

```
Question (base)
  ├── SuperlativeQuestion
  ├── PropQuestion
  ├── PlayerStatPredictionQuestion
  ├── HeadToHeadQuestion
  ├── InSeasonTournamentQuestion
  └── NBAFinalsPredictionQuestion

Standing (base)
  ├── RegularSeasonStanding
  ├── ISTStanding
  └── PlayoffStanding
```

## Migrations

### Creating Migrations

```bash
# After model changes
python manage.py makemigrations

# Create empty migration for data migration
python manage.py makemigrations predictions --empty --name migrate_data

# Specific app
python manage.py makemigrations predictions
```

### Applying Migrations

```bash
# Apply all pending migrations
python manage.py migrate

# Apply to specific migration
python manage.py migrate predictions 0042_previous_migration

# Show migration status
python manage.py showmigrations

# Show SQL for migration (don't execute)
python manage.py sqlmigrate predictions 0043
```

### Data Migrations

Example:

```python
# migrations/0044_populate_user_stats.py
from django.db import migrations

def populate_user_stats(apps, schema_editor):
    Season = apps.get_model('predictions', 'Season')
    UserStats = apps.get_model('predictions', 'UserStats')
    User = apps.get_model('auth', 'User')

    for season in Season.objects.all():
        for user in User.objects.all():
            UserStats.objects.get_or_create(
                user=user,
                season=season,
                defaults={'points': 0}
            )

class Migration(migrations.Migration):
    dependencies = [
        ('predictions', '0043_previous_migration'),
    ]

    operations = [
        migrations.RunPython(populate_user_stats),
    ]
```

### Best Practices

1. **Always review generated migrations** before applying
2. **Test migrations** on a copy of production data
3. **Backup database** before running migrations in production
4. **Never edit applied migrations** - create new ones
5. **Use RunPython** for data migrations
6. **Add reverse operations** when possible

## Common Queries

### Get Current Season

```python
current_season = Season.objects.order_by('-end_date').first()
```

### Get Questions for Season

```python
questions = Question.objects.filter(season=season).select_related('season')
```

### Get User's Answers

```python
answers = Answer.objects.filter(
    user=user,
    question__season=season
).select_related('question', 'question__season')
```

### Get Leaderboard

```python
leaderboard = UserStats.objects.filter(
    season=season
).select_related('user').order_by('-points')
```

### Polymorphic Queries

```python
# Get all questions (returns correct subtypes)
questions = Question.objects.filter(season=season)

# Filter by subtype field
mvp_questions = Question.objects.filter(award__name="MVP")

# Get specific subtype only
superlative_questions = SuperlativeQuestion.objects.filter(season=season)

# Access subtype fields
for q in questions:
    real_q = q.get_real_instance()
    if isinstance(real_q, SuperlativeQuestion):
        print(real_q.award.name)
```

## Related Documentation

- **Django patterns**: Load `04-backend-django.md`
- **Architecture**: Load `03-architecture.md`
- **Common tasks**: Load `08-common-tasks.md`

---

**Key Points:**
- PostgreSQL database with Django ORM
- Polymorphic models for Questions and Standings
- Season-based scoping for most models
- Always use `get_real_instance()` for polymorphic models
- Test migrations before production
