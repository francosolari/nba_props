# 02 - Development Setup

**Part of:** AI Assistant Documentation
**Load when:** Setting up development environment, running commands, configuring tools

## Table of Contents
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Development Commands](#development-commands)
- [Database Management](#database-management)
- [Grading Commands](#grading-commands)
- [Docker Operations](#docker-operations)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- **Python**: 3.11+
- **Node.js**: 16+
- **PostgreSQL**: 13+ (or use Docker)
- **Docker**: Latest (optional, for containerized development)
- **Git**: Latest
- **bd (beads)**: Issue tracking CLI (`npm install -g beads-cli` or `pip install beads`)

## Initial Setup

### 1. Clone and Install Dependencies

```bash
# Clone repository
git clone <repository-url>
cd nba_props

# Backend dependencies
pip install -r backend/requirements.txt

# Frontend dependencies
npm install
```

### 2. Environment Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
```

**Key environment variables:**
```bash
DJANGO_DEVELOPMENT=True
DJANGO_SETTINGS_MODULE=nba_predictions.settings
DATABASE_URL=postgresql://user:password@localhost:5432/nba_predictions
SECRET_KEY=your-secret-key-here
```

### 3. Database Setup

```bash
# Run migrations
venv/bin/python backend/manage.py migrate

# Create superuser
venv/bin/python backend/manage.py createsuperuser
```

### 4. Verify Installation

```bash
# Check Django setup
venv/bin/python backend/manage.py check

# Check frontend build
npm run build
```

## Development Commands

### Local Development (Recommended)

```bash
# Start both Django and Webpack in development mode
npm run dev

# This script (scripts/dev.sh):
# - Runs Django on 127.0.0.1:8000
# - Runs Webpack in watch mode
```

**What this does:**
- Django dev server with hot reload
- Webpack watch mode for auto-rebuilding frontend
- Both processes run in parallel

### Individual Services

#### Django Development Server
```bash
# Standard development server
venv/bin/python backend/manage.py runserver 127.0.0.1:8000

# Custom port
venv/bin/python backend/manage.py runserver 127.0.0.1:8080

# All interfaces (use cautiously)
venv/bin/python backend/manage.py runserver 0.0.0.0:8000
```

#### Webpack Build

```bash
# Production build (minified, optimized)
npm run build

# Watch mode (auto-rebuild on changes)
npm run webpack-watch

# Development build (faster, with source maps)
npm run build:dev
```

#### Django Shell

```bash
# Standard Django shell
venv/bin/python backend/manage.py shell

# Enhanced shell with shell_plus (auto-imports models)
venv/bin/python backend/manage.py shell_plus
```

## Database Management

### Migrations

```bash
# Create new migrations after model changes
venv/bin/python backend/manage.py makemigrations

# Apply migrations
venv/bin/python backend/manage.py migrate

# Show migration status
venv/bin/python backend/manage.py showmigrations

# Rollback to specific migration
venv/bin/python backend/manage.py migrate predictions 0042_previous_migration

# Generate SQL for migration (don't apply)
venv/bin/python backend/manage.py sqlmigrate predictions 0043
```

### Database Operations

```bash
# Django shell for database queries
venv/bin/python backend/manage.py shell_plus

# Database shell (PostgreSQL)
venv/bin/python backend/manage.py dbshell

# Dump database to file
pg_dump nba_predictions > backup.sql

# Restore database from file
psql nba_predictions < backup.sql
```

## Grading Commands

These commands calculate user points based on correct answers.

### Grade User Answers

```bash
# Grade props (player stats, awards) for a season
venv/bin/python backend/manage.py grade_props_answers <season-slug>

# Example
venv/bin/python backend/manage.py grade_props_answers 2024-25
```

**What it does:**
1. Fetches all questions for the season
2. Compares user answers to `correct_answer` field
3. Awards points based on `point_value`
4. Updates UserStats model

### Grade Standing Predictions

```bash
# Grade conference standings predictions
venv/bin/python backend/manage.py grade_standing_predictions <season-slug>

# Example
venv/bin/python backend/manage.py grade_standing_predictions 2024-25
```

### Grade IST Predictions

```bash
# Grade In-Season Tournament predictions
venv/bin/python backend/manage.py grade_ist_predictions <season-slug>

# Example
venv/bin/python backend/manage.py grade_ist_predictions 2024-25
```

### Data Fetching

```bash
# Fetch NBA team slugs from nba_api
npm run fetch:team-slugs

# Update odds for awards (if scraper is configured)
venv/bin/python backend/manage.py scrape_odds
```

## Docker Operations

See `DOCKER.md` for comprehensive Docker documentation.

### Production (Original Setup)

```bash
# Start production containers
docker-compose up

# Build and start
docker-compose up --build

# Run in background
docker-compose up -d

# Stop containers
docker-compose down

# View logs
docker-compose logs -f web
```

### Development with Local Database (Recommended)

```bash
# Start development containers with local PostgreSQL
docker-compose -f docker-compose.dev.yml --env-file .env.dev.local up

# Rebuild after code changes
docker-compose -f docker-compose.dev.yml build --no-cache web

# View logs
docker-compose -f docker-compose.dev.yml logs -f web

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### Development with Production Database (Use Sparingly)

```bash
# Start development containers with production database
docker-compose -f docker-compose.dev-prod-db.yml --env-file .env.dev.prod-db up

# Use with caution - you're connecting to production data!
```

### Docker Utilities

```bash
# Execute command in running container
docker-compose exec web python manage.py shell

# Access container shell
docker-compose exec web bash

# View container resource usage
docker stats

# Clean up unused images and containers
docker system prune -a
```

## Environment Variables

### Required Variables

```bash
# Django
DJANGO_DEVELOPMENT=True
DJANGO_SETTINGS_MODULE=nba_predictions.settings
SECRET_KEY=your-secret-key-here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/nba_predictions

# Frontend
NODE_ENV=development
```

### Optional Variables

```bash
# Debug
DEBUG=True
DJANGO_LOG_LEVEL=INFO

# Allowed hosts (production)
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Static files (production)
STATIC_URL=/static/
STATIC_ROOT=/app/staticfiles/

# OAuth (if using Google login)
GOOGLE_OAUTH_CLIENT_ID=your-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
```

### Environment Files

- `.env` - Main environment file (local development)
- `.env.example` - Template for new developers
- `.env.dev.local` - Docker development with local DB
- `.env.dev.prod-db` - Docker development with production DB

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>

# Or use different port
venv/bin/python backend/manage.py runserver 127.0.0.1:8001
```

#### 2. Database Connection Error

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

#### 3. Migration Conflicts

```bash
# Show migration status
venv/bin/python backend/manage.py showmigrations

# Rollback problematic migration
venv/bin/python backend/manage.py migrate predictions 0042_previous_migration

# Delete conflicting migration file and recreate
rm backend/predictions/migrations/0043_conflict.py
venv/bin/python backend/manage.py makemigrations
```

#### 4. Frontend Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Webpack cache
rm -rf node_modules/.cache

# Check for syntax errors
npm run build
```

#### 5. Static Files Not Loading

```bash
# Collect static files
venv/bin/python backend/manage.py collectstatic --noinput

# Check STATIC_ROOT and STATIC_URL settings
venv/bin/python backend/manage.py diffsettings | grep STATIC
```

### Debug Mode

```bash
# Enable Django debug toolbar (if installed)
DJANGO_DEBUG_TOOLBAR=True venv/bin/python backend/manage.py runserver

# Run with verbose logging
DJANGO_LOG_LEVEL=DEBUG venv/bin/python backend/manage.py runserver

# Check Django configuration
venv/bin/python backend/manage.py diffsettings
```

## Related Documentation

- **Docker details**: See `DOCKER.md`
- **Database schema**: Load `07-database-models.md`
- **Common tasks**: Load `08-common-tasks.md`
- **CI/CD**: Load `10-deployment.md`
- **Testing**: Load `12-testing.md`

---

**Next Steps:**
- For architecture understanding → Load `03-architecture.md`
- For Django-specific patterns → Load `04-backend-django.md`
- For API development → Load `05-backend-api.md`
