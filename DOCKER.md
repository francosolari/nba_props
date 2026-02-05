# Docker Setup Guide

This document explains the Docker setup for the NBA Predictions application, including development and production configurations.

## Overview

The project now has separate Docker configurations for:
- **Development with local database** - Isolated testing environment
- **Development with production database** - Testing against real data
- **Production deployment** - Blue-green deployment ready

## File Structure

```
.
├── Dockerfile                          # Production Dockerfile (multi-stage with frontend build)
├── Dockerfile.dev                      # Development Dockerfile with local DB
├── Dockerfile.dev.prod-db              # Development Dockerfile with prod DB
├── docker-compose.yml                  # Production docker-compose (original, unchanged)
├── docker-compose.dev.yml              # Development with local PostgreSQL
├── docker-compose.dev-prod-db.yml      # Development with production database
├── .env.dev.local                      # Docker Compose env for local dev (GITIGNORED)
├── .env.dev.prod-db                    # Docker Compose env for prod DB (GITIGNORED)
└── backend/
    ├── .env                            # Production/local development (points to prod DB)
    ├── .env.docker.local               # Container env for local DB (GITIGNORED)
    └── .env.docker.prod-db             # Container env for prod DB (GITIGNORED)
```

## Development Environments

### Option 1: Local Development with Isolated Database

**Best for:** Testing migrations, destructive operations, experimentation

**Setup:**
1. Ensure you have the environment files (create from templates below if missing)
2. Start the environment:
```bash
docker-compose -f docker-compose.dev.yml --env-file .env.dev.local up
```

**Features:**
- Local PostgreSQL database (port 5433 to avoid conflicts)
- Fresh database with all migrations applied
- Web server on http://localhost:8000
- Includes frontend build (React bundle)

**Commands:**
```bash
# Start services
docker-compose -f docker-compose.dev.yml --env-file .env.dev.local up

# Start in detached mode
docker-compose -f docker-compose.dev.yml --env-file .env.dev.local up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f web

# Stop services
docker-compose -f docker-compose.dev.yml down

# Rebuild after code changes
docker-compose -f docker-compose.dev.yml --env-file .env.dev.local build --no-cache web
docker-compose -f docker-compose.dev.yml --env-file .env.dev.local up -d

# Access Django shell
docker-compose -f docker-compose.dev.yml exec web python manage.py shell

# Run migrations
docker-compose -f docker-compose.dev.yml exec web python manage.py migrate

# Create superuser
docker-compose -f docker-compose.dev.yml exec web python manage.py createsuperuser
```

**Database Access:**
- Host: localhost
- Port: 5433
- Database: nba_dev
- User: devuser
- Password: devpassword

### Option 2: Development with Production Database

**Best for:** Testing against real data, debugging production issues

**Setup:**
```bash
docker-compose -f docker-compose.dev-prod-db.yml --env-file .env.dev.prod-db up
```

**Features:**
- Connects to production PostgreSQL at 134.209.213.185
- No local database service
- Web server on http://localhost:8000
- Includes frontend build

**Commands:**
```bash
# Start service (no DB, connects to production)
docker-compose -f docker-compose.dev-prod-db.yml --env-file .env.dev.prod-db up

# Stop service
docker-compose -f docker-compose.dev-prod-db.yml down

# View logs
docker-compose -f docker-compose.dev-prod-db.yml logs -f web

# Rebuild
docker-compose -f docker-compose.dev-prod-db.yml --env-file .env.dev.prod-db build --no-cache web
```

**Warning:** This connects to the real production database. Be careful with migrations and destructive operations!

## Production Environment

**Original configuration remains unchanged:**

```bash
docker-compose up
```

This uses:
- `docker-compose.yml` (unchanged)
- `Dockerfile` (now updated with frontend build)
- Environment variables from `.env`

**Production Features:**
- Blue-green deployment support (web-blue, web-green)
- PostgreSQL service (or connects to external DB)
- Gunicorn production server
- Multi-stage build with frontend bundling

## Environment File Templates

### `.env.dev.local`
```bash
# Development Environment - Local Database
POSTGRES_DB=nba_dev
POSTGRES_USER=devuser
POSTGRES_PASSWORD=devpassword
DATABASE_HOST=db
DATABASE_PORT=5432
DATABASE_NAME=nba_dev
DATABASE_USER=devuser
DATABASE_PASSWORD=devpassword

DJANGO_SETTINGS_MODULE=nba_predictions.settings
DJANGO_DEVELOPMENT=True
SECRET_KEY='your-secret-key'

GOOGLE_OAUTH_CLIENT_ID=your-client-id
GOOGLE_OAUTH_SECRET=your-secret

SENDGRID_API_KEY=your-sendgrid-key
USE_SENDGRID_IN_DEV=False
DEFAULT_FROM_EMAIL=noreply@propspredictions.com

CF_TURNSTILE_SITE_KEY=your-site-key
CF_TURNSTILE_SECRET_KEY=your-secret-key
```

### `backend/.env.docker.local`
```bash
# PostgreSQL Configuration - Local Docker Database
POSTGRES_DB=nba_dev
POSTGRES_USER=devuser
POSTGRES_PASSWORD=devpassword
DATABASE_HOST=db
DATABASE_PORT=5432

DJANGO_SETTINGS_MODULE=nba_predictions.settings
DJANGO_DEVELOPMENT=True
SECRET_KEY='your-secret-key'

GOOGLE_OAUTH_CLIENT_ID=your-client-id
GOOGLE_OAUTH_SECRET=your-secret

SENDGRID_API_KEY=your-sendgrid-key
USE_SENDGRID_IN_DEV=False
DEFAULT_FROM_EMAIL=noreply@propspredictions.com

CF_TURNSTILE_SITE_KEY=your-site-key
CF_TURNSTILE_SECRET_KEY=your-secret-key

DATABASE_NAME=${POSTGRES_DB}
DATABASE_USER=${POSTGRES_USER}
DATABASE_PASSWORD=${POSTGRES_PASSWORD}
```

### `.env.dev.prod-db`
```bash
# Development Environment - Production Database
POSTGRES_DB=mydb
POSTGRES_USER=myuser
POSTGRES_PASSWORD=mypassword
DATABASE_HOST=134.209.213.185
DATABASE_PORT=5432
DATABASE_NAME=mydb
DATABASE_USER=myuser
DATABASE_PASSWORD=mypassword

DJANGO_SETTINGS_MODULE=nba_predictions.settings
DJANGO_DEVELOPMENT=True
SECRET_KEY='your-secret-key'

GOOGLE_OAUTH_CLIENT_ID=your-client-id
GOOGLE_OAUTH_SECRET=your-secret

SENDGRID_API_KEY=your-sendgrid-key
USE_SENDGRID_IN_DEV=True
DEFAULT_FROM_EMAIL=noreply@propspredictions.com

CF_TURNSTILE_SITE_KEY=your-site-key
CF_TURNSTILE_SECRET_KEY=your-secret-key
```

## Docker Architecture

### Multi-Stage Build

All Dockerfiles now use multi-stage builds:

1. **Stage 1 (frontend-builder):** Node.js 16
   - Installs npm dependencies
   - Builds React frontend with Webpack
   - Outputs to `frontend/static/`

2. **Stage 2 (python):** Python 3.11
   - Installs Python dependencies
   - Copies backend code
   - Copies built frontend from Stage 1
   - Runs `collectstatic` to gather all static files
   - Runs Django (runserver for dev, gunicorn for prod)

### Benefits

- **Smaller images:** Node.js dependencies not included in final image
- **Complete app:** Frontend bundle included automatically
- **Reproducible:** Same build process in dev and prod
- **Fast rebuilds:** Docker layer caching optimized

## Troubleshooting

### Port Conflicts

If port 5432 is in use:
```bash
# Check what's using the port
lsof -i :5432

# Either stop that service, or use dev-prod-db setup (no local DB)
docker-compose -f docker-compose.dev-prod-db.yml --env-file .env.dev.prod-db up
```

### Frontend Not Loading

If you see template errors or missing static files:
```bash
# Rebuild with --no-cache to ensure frontend is built
docker-compose -f docker-compose.dev.yml --env-file .env.dev.local build --no-cache web
docker-compose -f docker-compose.dev.yml --env-file .env.dev.local up -d
```

### Database Connection Issues

**Local dev:**
```bash
# Check if db service is running
docker-compose -f docker-compose.dev.yml ps

# Check logs
docker-compose -f docker-compose.dev.yml logs db
```

**Production DB:**
```bash
# Verify you can reach the production DB
ping 134.209.213.185

# Check credentials in .env.dev.prod-db
```

### Volume Issues

If database state is corrupted:
```bash
# Stop and remove volumes
docker-compose -f docker-compose.dev.yml down -v

# Start fresh
docker-compose -f docker-compose.dev.yml --env-file .env.dev.local up
```

## CI/CD Integration

A corrected CI/CD workflow is available at `.github/workflows/ci-cd-corrected.yml`.

**Key differences from original:**
- Correct paths to `backend/requirements.txt`
- Runs tests from `backend/` directory
- Builds frontend before testing
- Uses actual Docker Hub username (via secrets)
- Deployment steps are commented out (configure for your server)

**To enable:**
1. Rename `ci-cd-corrected.yml` to `ci-cd.yml` (or keep both)
2. Add GitHub Secrets:
   - `DOCKERHUB_USERNAME`
   - `DOCKERHUB_TOKEN`
   - `SSH_HOST` (if deploying)
   - `SSH_USERNAME` (if deploying)
   - `SSH_PRIVATE_KEY` (if deploying)
   - `DEPLOY_PATH` (if deploying)

## Best Practices

1. **Use local dev for destructive testing:** Migrations, data wipes, etc.
2. **Use prod-db dev sparingly:** Only when debugging production-specific issues
3. **Never commit .env files:** They're gitignored for security
4. **Rebuild after dependency changes:** `npm install` or `pip install` changes require rebuild
5. **Use --no-cache for major changes:** Frontend updates, Dockerfile modifications

## Session Management

### Database Session Cleanup

The application uses database-backed sessions with `SESSION_SAVE_EVERY_REQUEST = True`, which extends session expiry on each user request. This improves user experience but increases session table growth.

**Recommended:** Set up a periodic cleanup job to remove expired sessions.

**Option 1: Cron Job (Production Server)**
```bash
# Add to crontab (run daily at 3 AM)
0 3 * * * /path/to/venv/bin/python /path/to/backend/manage.py clearsessions

# Or via Docker:
0 3 * * * cd /path/to/project && docker-compose exec web python manage.py clearsessions
```

**Option 2: Docker Service (Scheduled Container)**

Add to `docker-compose.yml`:
```yaml
services:
  session-cleanup:
    image: your-app-image
    command: sh -c "while true; do python manage.py clearsessions && sleep 86400; done"
    depends_on:
      - db
    environment:
      - DATABASE_HOST=db
      - DATABASE_NAME=mydb
      # ... other env vars
```

**Option 3: Manual Cleanup**
```bash
# Local development
venv/bin/python backend/manage.py clearsessions

# Docker development
docker-compose -f docker-compose.dev.yml exec web python manage.py clearsessions

# Production
docker-compose exec web python manage.py clearsessions
```

**Performance Monitoring:**
- Monitor database write load after deploying session changes
- Check `django_session` table size: `SELECT COUNT(*) FROM django_session;`
- If performance issues arise, consider Redis session backend or reduce `SESSION_COOKIE_AGE`
- See `PERFORMANCE_MONITORING.md` for detailed monitoring guide

**Rollback Procedures:**

If session changes cause issues, follow these steps:

**Quick Rollback (Disable Middleware Only):**
```python
# In backend/nba_predictions/settings.py, comment out:
# 'nba_predictions.middleware.ThrottledSessionMiddleware',

# Restart services
docker-compose restart web-blue web-green
```

**Full Rollback (Restore Previous Behavior):**
```python
# In backend/nba_predictions/settings.py:
# 1. Add back:
SESSION_SAVE_EVERY_REQUEST = True

# 2. Remove middleware from MIDDLEWARE list
# 3. Stop session-cleanup service
docker-compose stop session-cleanup

# 4. Restart web services
docker-compose restart web-blue web-green
```

**Emergency: All Users Logged Out (Manual Session Clear):**
```bash
# If session table corruption or critical issues
docker-compose exec web python manage.py shell
```
```python
from django.contrib.sessions.models import Session
Session.objects.all().delete()  # CAUTION: Logs out all users
```

## Production Deployment

When deploying to production:

1. **Ensure production .env is configured** on your server
2. **Pull latest code** on production server
3. **Build images:**
   ```bash
   docker-compose build
   ```
4. **Run migrations:**
   ```bash
   docker-compose run web python manage.py migrate
   ```
5. **Set up session cleanup cron job** (see Session Management section above)
6. **Start services:**
   ```bash
   docker-compose up -d
   ```

## Quick Reference

| Task | Command |
|------|---------|
| Dev with local DB | `docker-compose -f docker-compose.dev.yml --env-file .env.dev.local up` |
| Dev with prod DB | `docker-compose -f docker-compose.dev-prod-db.yml --env-file .env.dev.prod-db up` |
| Production | `docker-compose up` |
| Rebuild dev | `docker-compose -f docker-compose.dev.yml build --no-cache web` |
| View logs | `docker-compose -f docker-compose.dev.yml logs -f web` |
| Stop all | `docker-compose -f docker-compose.dev.yml down` |
| Django shell | `docker-compose -f docker-compose.dev.yml exec web python manage.py shell` |
| Run migrations | `docker-compose -f docker-compose.dev.yml exec web python manage.py migrate` |
| Create superuser | `docker-compose -f docker-compose.dev.yml exec web python manage.py createsuperuser` |
