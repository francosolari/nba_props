# Database Setup Best Practices

## Current Question: SQLite vs PostgreSQL for Local Development?

### TL;DR: **Use PostgreSQL everywhere (current setup is correct)**

## Why PostgreSQL in Development?

### 1. Production Parity (Most Important)
**"Your development environment should mirror production as closely as possible"**

Using SQLite locally while running PostgreSQL in production creates a **two-database problem**:

**Issues that won't appear until production:**
- SQL syntax differences
- Migration compatibility
- Query performance characteristics
- Data type handling differences

**Real example from your codebase:**
```python
# This works differently in SQLite vs PostgreSQL:
Question.objects.filter(season__slug__icontains='2024')  # Case-insensitive search

# PostgreSQL: Uses ILIKE (efficient, indexed)
# SQLite: Uses LIKE with LOWER() (slower, can't use index)
```

### 2. Django Polymorphic Compatibility

Your app uses `django-polymorphic` extensively (Question, Standings models). Polymorphic queries involve complex JOINs that:
- **Work differently** between databases
- **Perform differently** (query planner variations)
- **May fail** in ways that only show up in one database

Example:
```python
# Your code (predictions/models/question.py)
Question.objects.select_related('season').all()

# This generates different SQL in SQLite vs PostgreSQL
# PostgreSQL: Optimized JOIN with proper type casting
# SQLite: Less efficient, different execution plan
```

### 3. Migration Safety

Migrations tested on SQLite might fail on PostgreSQL:

```python
# migrations/0024_award_odds_player_playerstat.py
class Migration(migrations.Migration):
    operations = [
        migrations.CreateModel(
            name='Player',
            fields=[
                ('id', models.BigAutoField(...)),  # Different in SQLite vs PostgreSQL
            ],
        ),
    ]
```

**SQLite:** Creates `INTEGER PRIMARY KEY AUTOINCREMENT`
**PostgreSQL:** Creates `BIGSERIAL` (different behavior, different max value)

### 4. Data Type Differences

| Feature | PostgreSQL | SQLite | Impact |
|---------|-----------|--------|--------|
| JSONField | Native JSON type | Text field | Can't query JSON efficiently |
| DateTimeField | Timezone-aware | Naive datetime | Timezone bugs |
| ArrayField | Native arrays | Not supported | Can't use this feature |
| ILIKE | Case-insensitive search | Emulated with LOWER() | Performance issues |

## Your Current Setup (CORRECT)

Looking at your settings.py, you're using PostgreSQL in both dev and prod:

**Development (`IS_DEVELOPMENT=True`):**
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'HOST': os.getenv('DATABASE_HOST', 'propspredictions.com'),
        # ... connects to production DB at 134.209.213.185
    }
}
```

**Production:**
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'HOST': os.getenv('DATABASE_HOST', 'propspredictions.com'),
        # ... same setup
    }
}
```

This is **best practice** - same database engine everywhere.

## Recommended Development Workflows

### Option 1: Docker with Local PostgreSQL (BEST)

**What I just set up for you:**

```bash
# Isolated local PostgreSQL database
docker-compose -f docker-compose.dev.yml --env-file .env.dev.local up
```

**Benefits:**
- ✅ Isolated from production (safe testing)
- ✅ Same database engine as production
- ✅ Fresh database for testing migrations
- ✅ Can destroy and recreate easily
- ✅ No risk to production data

**When to use:** Testing migrations, destructive operations, experimentation

### Option 2: Local PostgreSQL Instance

**Install PostgreSQL locally:**

```bash
# macOS (via Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb nba_dev
```

**Update backend/.env:**
```bash
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=nba_dev
DATABASE_USER=your_username
DATABASE_PASSWORD=your_password
```

**Benefits:**
- ✅ Fast (no Docker overhead)
- ✅ Same database engine as production
- ✅ Easier to browse with tools (pgAdmin, Postico)

**Drawbacks:**
- ❌ Another service to manage
- ❌ Can forget to start it
- ❌ Harder to reset/recreate

### Option 3: Production Database (CURRENT)

**Your current backend/.env:**
```bash
DATABASE_HOST=134.209.213.185  # Production server
```

**Benefits:**
- ✅ Real data for debugging
- ✅ Tests against actual production state

**Drawbacks:**
- ⚠️ Risk of modifying production data
- ⚠️ Migrations run on production
- ⚠️ Slower (network latency)
- ⚠️ Can't work offline

**When to use:** Debugging production-specific issues ONLY

### Option 4: SQLite (NOT RECOMMENDED)

**Why it exists:**
- Zero setup
- File-based (portable)
- Good for tutorials

**Why NOT to use it:**
- ❌ Different SQL dialect
- ❌ Different migration behavior
- ❌ Different query performance
- ❌ Bugs won't show until production
- ❌ Your app uses polymorphic models (incompatible)

**Only acceptable for:**
- Simple CRUD apps
- Learning Django basics
- Prototypes you'll never deploy

## My Recommendation for Your Workflow

### Primary: Docker Dev Environment

```bash
# Day-to-day development
docker-compose -f docker-compose.dev.yml --env-file .env.dev.local up

# Benefits:
# - Safe isolated testing
# - Fresh database
# - Same as production (PostgreSQL)
# - Can nuke and rebuild anytime
```

### Secondary: Production DB (Sparingly)

```bash
# Only when debugging production issues
docker-compose -f docker-compose.dev-prod-db.yml --env-file .env.dev.prod-db up

# Use when:
# - Investigating production bug with real data
# - Testing against production state
# - Be VERY careful with migrations!
```

### Emergency Only: SQLite Fallback

If you absolutely need a quick fallback (no Docker, no network), add this to `backend/nba_predictions/settings.py`:

```python
# At the top after imports
USE_SQLITE_FALLBACK = os.getenv('USE_SQLITE_FALLBACK', 'False').lower() == 'true'

# In database configuration
if USE_SQLITE_FALLBACK:
    print("⚠️  WARNING: Using SQLite fallback - NOT for production testing!")
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
elif IS_DEVELOPMENT:
    # Your existing PostgreSQL config
    DATABASES = { ... }
```

Then in `.env`:
```bash
USE_SQLITE_FALLBACK=True  # Only when desperate!
```

**Use this ONLY for:**
- Quick experiments that don't matter
- When network/Docker is down
- Testing something unrelated to database

**NEVER use for:**
- Migration testing
- Production-related debugging
- Anything you care about

## Summary Table

| Setup | Database | Use Case | Risk Level |
|-------|----------|----------|------------|
| **Docker Dev** (Recommended) | Local PostgreSQL | Daily development, testing | ✅ Safe |
| Local PostgreSQL | Local PostgreSQL | Daily development | ✅ Safe |
| Docker Prod DB | Production PostgreSQL | Production debugging | ⚠️ Medium |
| Production Direct | Production PostgreSQL | Emergency debugging | 🚨 High |
| SQLite Fallback | SQLite | Emergency only | ⚠️ Not production-safe |

## What I've Set Up for You

Your Docker setup now includes:

1. **`docker-compose.dev.yml`** - Local PostgreSQL (recommended)
   - Database: Fresh PostgreSQL in Docker
   - Port: 5433 (doesn't conflict with local PostgreSQL)
   - Safe for destructive testing

2. **`docker-compose.dev-prod-db.yml`** - Production DB
   - Database: Your production PostgreSQL at 134.209.213.185
   - Use carefully!

3. **`backend/.env`** - Unchanged (still points to production)

## Migration Workflow

**Safe migration testing:**

```bash
# 1. Test migration on Docker first
docker-compose -f docker-compose.dev.yml --env-file .env.dev.local up -d
docker-compose -f docker-compose.dev.yml exec web python manage.py makemigrations
docker-compose -f docker-compose.dev.yml exec web python manage.py migrate

# 2. If it works, test on production DB clone
# (Or skip to production if confident)

# 3. Deploy to production
ssh your-server
cd /path/to/project
git pull
docker-compose exec web python manage.py migrate
```

## Bottom Line

**Your current setup (PostgreSQL everywhere) is correct.** The Docker dev environment I created gives you:
- Safe testing (local PostgreSQL)
- Production parity (same database engine)
- Easy cleanup (just `docker-compose down -v`)

**Don't switch to SQLite** unless you're absolutely stuck without Docker/network access, and even then only for trivial testing.
