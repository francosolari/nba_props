# CI/CD Safe Testing Guide

## Overview

This guide provides a **SAFE, step-by-step approach** to test your CI/CD pipeline without risking your production server.

## Current Setup (What's Already Working)

### Good News
1. ✅ **Dockerfile with multi-stage build** - Compiles frontend during Docker build (not on server)
2. ✅ **GitHub Actions workflow** - Builds on GitHub's runners (protects your low-power server)
3. ✅ **Blue-Green deployment** - Zero-downtime deployments with rollback capability
4. ✅ **DockerHub workflow** - Builds → Push to DockerHub → Server pulls image

### Your Concern
- You implemented nba_predictions-41 (multi-stage Docker build)
- You haven't tested the new Dockerfile or CI/CD workflow
- Your server is low-power and crashed when building large Docker images
- You want to ensure automated testing/deployment works safely

## Safe Testing Strategy

### Phase 1: Local Docker Build Test (SAFEST - No Server Risk)

Test the multi-stage Dockerfile locally to ensure it works before pushing anywhere.

```bash
# Step 1: Create a test branch (don't touch main!)
git checkout -b test/ci-cd-validation

# Step 2: Build Docker image locally to verify multi-stage build works
docker build --platform linux/amd64 -t nba_props_test:local .

# Expected: Should see two stages:
# - Stage 1: Node.js frontend build (npm ci, npm run build)
# - Stage 2: Python backend setup with compiled assets from Stage 1

# Step 3: Test the built image locally
docker run -d --name nba_test -p 9000:8000 \
  -e DJANGO_DEVELOPMENT=True \
  -e SECRET_KEY="test-key-123" \
  -e DATABASE_HOST="localhost" \
  -e DATABASE_PORT="5432" \
  -e DATABASE_NAME="test_db" \
  -e DATABASE_USER="test_user" \
  -e DATABASE_PASSWORD="test_pass" \
  nba_props_test:local

# Step 4: Check if it's running
curl http://localhost:9000/

# Step 5: Clean up
docker stop nba_test
docker rm nba_test
docker rmi nba_props_test:local
```

**If this fails**: Fix Dockerfile issues locally before proceeding.

---

### Phase 2: GitHub Actions Build Test (SAFE - No Deployment)

Test that GitHub Actions can build the image without deploying to production.

#### Option A: Use Test Workflow (Recommended)

Create `.github/workflows/test-ci.yml`:

```yaml
name: Test CI Build (No Deploy)

on:
  push:
    branches: [ test/**, feature/** ]
  pull_request:
    branches: [ main ]

env:
  DOCKER_IMAGE: fsolaric/nba_props_web
  REGISTRY: docker.io

jobs:
  test-build:
    name: Test Docker Build (No Push)
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install frontend dependencies
        run: npm ci

      - name: Build frontend
        run: npm run build

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Docker image (test only - no push)
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          platforms: linux/amd64
          push: false  # IMPORTANT: Don't push to DockerHub
          tags: ${{ env.DOCKER_IMAGE }}:test
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Success notification
        run: |
          echo "✅ Docker build test successful!"
          echo "Image built but NOT pushed to DockerHub"
```

#### How to Test:

```bash
# Step 1: Create test workflow
# (Copy the workflow above to .github/workflows/test-ci.yml)

# Step 2: Commit and push to test branch
git add .github/workflows/test-ci.yml
git commit -m "Add test CI workflow (no deployment)"
git push origin test/ci-cd-validation

# Step 3: Watch GitHub Actions
# Go to: https://github.com/francosolari/nba_props/actions
# The workflow will run but NOT deploy to your server
```

**If this fails**: Check GitHub Actions logs, fix issues, and retry.

---

### Phase 3: Full CI/CD Test with Staging Flag (CAREFUL - Controlled Deploy)

Test the full workflow but with manual confirmation before production deployment.

#### Option B: Add Approval Gate to Existing Workflow

Modify `.github/workflows/deploy-simplified.yml`:

```yaml
deploy:
  name: Deploy to Production
  needs: build-and-push
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  environment: production  # Add this line - requires manual approval in GitHub

  steps:
    # ... rest of your existing deploy steps
```

Then configure in GitHub:
1. Go to: `Settings` → `Environments` → `New environment`
2. Name: `production`
3. Enable: `Required reviewers` → Add yourself
4. Now deployments to `main` require your manual approval!

---

### Phase 4: Production Rollout (FINAL)

Once you've tested and confirmed everything works:

```bash
# Step 1: Merge test branch to main
git checkout main
git merge test/ci-cd-validation
git push origin main

# Step 2: GitHub Actions will:
#   - Build Docker image on GitHub runners (not your server!)
#   - Push to DockerHub
#   - SSH to your server
#   - Run blue_green_deploy.sh (pulls from DockerHub)

# Step 3: Monitor deployment
# - Watch GitHub Actions: https://github.com/francosolari/nba_props/actions
# - Check server health: http://propspredictions.com/
```

**If deployment fails**: Your blue-green setup already has rollback built-in (see blue_green_deploy.sh:236-237)

---

## Safety Features Already in Your Setup

### 1. Blue-Green Deployment Rollback
Your `scripts/blue_green_deploy.sh` keeps the old container running. To rollback:

```bash
# SSH to server
ssh root@134.209.213.185

# Rollback to previous deployment
sed -i 's/127.0.0.1:8002/127.0.0.1:8000/g' /etc/nginx/sites-enabled/propspredictions.conf
nginx -t && systemctl reload nginx
```

### 2. Database Backups
Every deployment creates a backup at `/var/www/backups/` (blue_green_deploy.sh:97)

### 3. Health Checks
The deployment script checks health before flipping traffic (blue_green_deploy.sh:166-180)

---

## Troubleshooting

### "Docker build crashes my server"
**Solution**: Your setup already prevents this! GitHub Actions builds on GitHub's runners, not your server. Your server only pulls the pre-built image from DockerHub.

### "I want to test without affecting production"
**Solution**: Use Phase 2 (test workflow on test branch). It builds but doesn't deploy.

### "What if CI/CD fails mid-deployment?"
**Solution**:
1. Blue-green deployment keeps old container running
2. Manual rollback is simple (see above)
3. Database backup is automatic

### "How do I disable automated deployment?"
**Solution**: Remove the `deploy` job from `.github/workflows/deploy-simplified.yml` or add `environment: production` with required reviewers (Phase 3).

---

## Recommended Testing Order

```
1. Phase 1 (Local Docker build)          ← START HERE (safest)
2. Phase 2 (GitHub Actions test build)   ← Verify CI works
3. Phase 3 (Add approval gate)           ← Add safety before production
4. Phase 4 (Full production rollout)     ← Only after confirming all above
```

---

## Current CI/CD Workflow Analysis

Your `.github/workflows/deploy-simplified.yml` is well-structured:

✅ **Pros:**
- Builds on GitHub Actions (protects your server)
- Auto-increments version
- Uses Docker buildx for caching
- Blue-green deployment with health checks
- Pushes to DockerHub (server pulls, doesn't build)

⚠️ **Concerns:**
- No automated tests before deployment (see below)
- Auto-deploys on every `main` push (no approval gate)
- Skips tests (name says "No Tests - Temporary")

---

## Adding Automated Tests (Recommended)

Create `.github/workflows/test.yml`:

```yaml
name: Run Tests

on:
  push:
    branches: [ main, develop, test/** ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install Python dependencies
        run: |
          pip install -r backend/requirements.txt

      - name: Run backend tests
        env:
          DJANGO_SETTINGS_MODULE: nba_predictions.settings
          DJANGO_DEVELOPMENT: True
          DATABASE_HOST: localhost
          DATABASE_PORT: 5432
          DATABASE_NAME: test_db
          DATABASE_USER: test_user
          DATABASE_PASSWORD: test_password
          SECRET_KEY: test-secret-key-for-ci
        run: |
          cd backend
          python manage.py migrate
          pytest predictions/tests/ -v --cov=predictions

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install frontend dependencies
        run: npm ci

      - name: Run frontend tests (if you have them)
        run: npm test -- --passWithNoTests

      - name: Build frontend
        run: npm run build
```

Then modify `deploy-simplified.yml` to depend on tests:

```yaml
deploy:
  name: Deploy to Production
  needs: [build-and-push, test]  # Add test dependency
  # ... rest of deploy job
```

---

## Quick Start (TL;DR)

```bash
# 1. Test Docker build locally (safest first step)
docker build --platform linux/amd64 -t nba_props_test:local .

# 2. Create test branch and test workflow
git checkout -b test/ci-cd-validation
# Create .github/workflows/test-ci.yml (see Phase 2)
git add .github/workflows/test-ci.yml
git commit -m "Add test CI workflow"
git push origin test/ci-cd-validation

# 3. Watch GitHub Actions (won't deploy to production)
# https://github.com/francosolari/nba_props/actions

# 4. If successful, add approval gate (Phase 3) before merging to main
```

---

## Next Steps

1. ✅ Read this guide
2. ⬜ Run Phase 1 (local Docker build test)
3. ⬜ Run Phase 2 (GitHub Actions test)
4. ⬜ Add automated tests (optional but recommended)
5. ⬜ Add approval gate (Phase 3)
6. ⬜ Merge to main (Phase 4)

---

## Questions?

- **"Is my server safe?"** → Yes! GitHub builds, server only pulls.
- **"What if something breaks?"** → Blue-green rollback is built-in.
- **"How do I test without risk?"** → Phase 1 & 2 (test branch, no deploy).
- **"Should I add tests?"** → Yes! See "Adding Automated Tests" section.
