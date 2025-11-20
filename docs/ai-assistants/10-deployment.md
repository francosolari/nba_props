# 10 - Deployment & Docker

**Part of:** AI Assistant Documentation
**Load when:** Deploying to production, working with Docker, or understanding CI/CD

## Table of Contents
- [Docker Setup](#docker-setup)
- [Blue-Green Deployment](#blue-green-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Environment Configuration](#environment-configuration)
- [Monitoring & Logs](#monitoring--logs)

## Docker Setup

See `DOCKER.md` for comprehensive documentation.

### Docker Compose Files

```
docker-compose.yml              # Production setup
docker-compose.dev.yml          # Development with local DB
docker-compose.dev-prod-db.yml  # Development with prod DB
```

### Production Setup

```bash
# Start production containers
docker-compose up -d

# View logs
docker-compose logs -f web-blue web-green

# Stop containers
docker-compose down

# Rebuild after code changes
docker-compose build --no-cache web-blue web-green
```

### Development Setup

**With Local Database (Recommended):**

```bash
# Start services
docker-compose -f docker-compose.dev.yml --env-file .env.dev.local up

# Run migrations
docker-compose -f docker-compose.dev.yml exec web python manage.py migrate

# Create superuser
docker-compose -f docker-compose.dev.yml exec web python manage.py createsuperuser

# Collect static files
docker-compose -f docker-compose.dev.yml exec web python manage.py collectstatic --noinput
```

**With Production Database (Use Sparingly):**

```bash
# CAUTION: Connects to production database!
docker-compose -f docker-compose.dev-prod-db.yml --env-file .env.dev.prod-db up
```

### Docker Commands

```bash
# Execute command in container
docker-compose exec web python manage.py shell

# Access container shell
docker-compose exec web bash

# View container resource usage
docker stats

# Clean up
docker system prune -a

# View networks
docker network ls

# View volumes
docker volume ls

# Remove volume (careful!)
docker volume rm nba_props_postgres_data
```

## Blue-Green Deployment

### Architecture

```
┌─────────────────────────────┐
│   Production Server         │
│                             │
│  ┌──────────┐  ┌──────────┐│
│  │web-blue  │  │web-green ││
│  │(port 8000│  │(port 8002││
│  └────┬─────┘  └─────┬────┘│
│       │ Active │     │     │
│       └────────┼─────┘     │
│                │            │
│       Traffic switches here│
│                             │
│       ┌─────────────┐      │
│       │ PostgreSQL  │      │
│       └─────────────┘      │
└─────────────────────────────┘
```

### How It Works

1. **Two containers always running**: `web-blue` and `web-green`
2. **One is active**, serving production traffic (e.g., blue on 8000)
3. **Deploy to inactive** container (e.g., green on 8002)
4. **Health check** on new container
5. **Switch traffic** from blue to green
6. **Old container** kept running as rollback option

### Benefits

- **Zero downtime**: Traffic switches instantly
- **Easy rollback**: Just switch back to old container
- **Test in production**: New container runs in prod environment before switching

### Manual Blue-Green Switch

```bash
# 1. Deploy to green (if blue is active)
docker-compose up -d --no-deps --build web-green

# 2. Health check
curl http://localhost:8002/health/

# 3. Switch traffic (update reverse proxy or load balancer)
# This depends on your infrastructure setup

# 4. Monitor logs
docker-compose logs -f web-green

# 5. If issues, switch back to blue
# (Reverse proxy change)
```

## CI/CD Pipeline

Located in `.github/workflows/ci-cd.yml`.

### Workflow Stages

```yaml
1. Test
   ├── Lint Python code
   ├── Run pytest
   ├── Lint JavaScript
   └── Run Jest tests

2. Build
   ├── Build Docker image
   ├── Tag with commit SHA
   └── Push to registry

3. Deploy to Staging
   ├── Pull new image
   ├── Deploy to inactive container
   ├── Run migrations
   └── Health check

4. Manual Approval Gate
   └── Awaits approval in GitHub

5. Deploy to Production
   ├── Switch traffic to new container
   └── Monitor
```

### Triggering Deployment

**Automatic (on push to main):**
```bash
git push origin main
# CI/CD automatically starts
```

**Manual (via GitHub Actions):**
1. Go to GitHub Actions tab
2. Select workflow
3. Click "Run workflow"
4. Choose branch
5. Confirm

### Monitoring Deployment

```bash
# View GitHub Actions logs
# Visit: https://github.com/<org>/<repo>/actions

# View server logs
ssh production-server
docker-compose logs -f web-blue web-green

# Check health endpoint
curl https://your-domain.com/health/
```

### Rollback Procedure

**If deployment fails:**

```bash
# 1. Switch traffic back to old container
# (Update reverse proxy/load balancer)

# 2. Check logs for errors
docker-compose logs web-green | tail -100

# 3. Fix issue locally
git checkout main
git pull
# Make fixes...

# 4. Redeploy
git add .
git commit -m "fix: Address deployment issue"
git push origin main
```

## Environment Configuration

### Environment Variables

**Production (.env):**
```bash
DJANGO_DEVELOPMENT=False
DEBUG=False
SECRET_KEY=<strong-random-key>
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

DATABASE_URL=postgresql://user:password@db:5432/nba_predictions

# Static files
STATIC_ROOT=/app/staticfiles/
STATIC_URL=/static/

# Security
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# OAuth
GOOGLE_OAUTH_CLIENT_ID=<your-client-id>
GOOGLE_OAUTH_CLIENT_SECRET=<your-secret>
```

**Development (.env.dev.local):**
```bash
DJANGO_DEVELOPMENT=True
DEBUG=True
SECRET_KEY=dev-secret-key

DATABASE_URL=postgresql://nba_user:nba_password@localhost:5432/nba_predictions

STATIC_ROOT=frontend/staticfiles/
STATIC_URL=/static/
```

### Secrets Management

**DO NOT commit secrets to git!**

```bash
# Use .env files (already in .gitignore)
cp .env.example .env
# Edit .env with secrets

# For CI/CD, use GitHub Secrets:
# Settings → Secrets and variables → Actions
```

## Monitoring & Logs

### Application Logs

```bash
# Docker logs
docker-compose logs -f web-blue

# Filter by time
docker-compose logs --since 30m web-blue

# Last 100 lines
docker-compose logs --tail 100 web-blue

# Follow all services
docker-compose logs -f
```

### Django Logs

```python
# backend/nba_predictions/settings.py
LOGGING = {
    'version': 1,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
        },
    },
}
```

### Health Check Endpoint

```python
# predictions/views/health.py
from django.http import JsonResponse
from django.db import connection

def health_check(request):
    try:
        # Check database
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")

        return JsonResponse({
            'status': 'healthy',
            'database': 'connected'
        })
    except Exception as e:
        return JsonResponse({
            'status': 'unhealthy',
            'error': str(e)
        }, status=500)
```

### Performance Monitoring

**Django Debug Toolbar (Development):**
```bash
pip install django-debug-toolbar

# Add to INSTALLED_APPS in settings.py
INSTALLED_APPS = [
    ...
    'debug_toolbar',
]

# Add middleware
MIDDLEWARE = [
    ...
    'debug_toolbar.middleware.DebugToolbarMiddleware',
]
```

**Query Monitoring:**
```python
from django.db import connection
from django.test.utils import override_settings

with override_settings(DEBUG=True):
    # Your code
    print(f"Queries: {len(connection.queries)}")
    for query in connection.queries:
        print(query['sql'])
```

## Deployment Checklist

**Before deploying:**
- [ ] All tests passing locally
- [ ] Migrations created and tested
- [ ] Frontend built and tested
- [ ] Environment variables configured
- [ ] Secrets not in code
- [ ] Documentation updated
- [ ] bd issues updated

**After deploying:**
- [ ] Health check passes
- [ ] Static files loading
- [ ] Database migrations applied
- [ ] No errors in logs
- [ ] Key features tested
- [ ] Performance acceptable
- [ ] Rollback plan ready

## Troubleshooting

### Issue: Container Won't Start

```bash
# Check logs
docker-compose logs web-blue

# Common causes:
# - Missing environment variables
# - Database connection error
# - Port already in use
# - Migration error

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache web-blue
docker-compose up -d web-blue
```

### Issue: Static Files Not Loading

```bash
# Collect static files
docker-compose exec web-blue python manage.py collectstatic --noinput

# Check STATIC_ROOT and STATIC_URL
docker-compose exec web-blue python manage.py diffsettings | grep STATIC

# Verify WhiteNoise configured
# Check backend/nba_predictions/settings.py
```

### Issue: Database Migration Error

```bash
# Check migration status
docker-compose exec web-blue python manage.py showmigrations

# Apply migrations
docker-compose exec web-blue python manage.py migrate

# If conflict, see 08-common-tasks.md
```

## Related Documentation

- **Docker details**: See `DOCKER.md`
- **Git workflow**: Load `09-git-workflow.md`
- **Common tasks**: Load `08-common-tasks.md`
- **Setup**: Load `02-development-setup.md`

---

**Key Takeaways:**
1. Blue-green deployment for zero downtime
2. Always test in staging before production
3. Monitor logs during deployment
4. Have rollback plan ready
5. Never commit secrets to git
6. Use health checks to verify deployment
