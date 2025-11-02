# CI/CD Workflow Issues Analysis

## Original Workflow Problems

The original `.github/workflows/ci-cd.yml` file has multiple critical issues that would prevent it from working in production.

### Critical Issues

#### 1. Incorrect File Paths (Line 40)
**Problem:**
```yaml
pip install -r requirements.txt
```
**Issue:** The file is at `backend/requirements.txt`, not in the root.

**Fix:**
```yaml
pip install -r backend/requirements.txt
```

#### 2. Wrong Working Directory (Line 60)
**Problem:**
```yaml
run: |
  python manage.py test
```
**Issue:** Running from root directory, but `manage.py` is in `backend/`.

**Fix:**
```yaml
run: |
  cd backend
  python manage.py test
```

#### 3. Missing Frontend Build
**Problem:** Tests run without building the frontend first.

**Issue:** If tests rely on static files, they will fail.

**Fix:**
```yaml
- name: Build frontend
  run: npm run build
```

#### 4. Placeholder Docker Hub Username (Line 94)
**Problem:**
```yaml
tags: yourusername/nba-predictions:latest
```
**Issue:** "yourusername" is a placeholder, not your actual Docker Hub account.

**Fix:**
```yaml
tags: ${{ secrets.DOCKERHUB_USERNAME }}/nba-predictions:latest
```

#### 5. Placeholder Deployment Paths (Lines 112, 149, 167)
**Problem:**
```bash
cd /path/to/nba_predictions
cd /path/to/nginx
```
**Issue:** These are placeholder paths that don't exist on your server.

**Fix:** Replace with actual server paths or use secrets:
```bash
cd ${{ secrets.DEPLOY_PATH }}
```

#### 6. Non-existent Nginx Configuration
**Problem:** The workflow assumes an nginx load balancer exists and is configured for blue-green deployment.

**Issue:** Your `docker-compose.yml` doesn't include nginx. The workflow tries to:
- Update nginx.conf
- Reload nginx
- Switch between blue/green upstreams

**Fix:** Either:
- Set up nginx load balancer infrastructure
- Remove blue-green switching logic
- Use a simpler single-environment deployment

#### 7. Blue-Green Deployment Assumptions
**Problem:** Workflow implements complex blue-green deployment:
1. Deploy to blue environment
2. Run smoke tests
3. Switch nginx to point to blue
4. Deploy to green environment

**Issue:** This requires:
- Two running web containers (blue and green)
- Load balancer (nginx) to switch between them
- Health check endpoints
- Rollback procedures

None of this infrastructure appears to be set up.

## What Works vs. What Doesn't

### ✅ Would Work
- Test job (with path fixes)
- Build job (with username fix)
- Docker image building and pushing

### ❌ Would Fail
- All deployment jobs (wrong paths, missing infrastructure)
- Blue-green switching (no nginx, incomplete setup)
- Smoke tests (wrong endpoint)

## Recommendations

### Short Term (Manual Deployment)

**Disable CI/CD until ready:**
1. Keep `.github/workflows/ci-cd.yml` for reference
2. Use `.github/workflows/ci-cd-corrected.yml` for testing only
3. Deploy manually using SSH:

```bash
# SSH to server
ssh your-server

# Pull latest code
cd /path/to/project
git pull

# Rebuild and restart
docker-compose build
docker-compose down
docker-compose up -d

# Run migrations
docker-compose exec web python manage.py migrate
```

### Medium Term (Simple CI/CD)

**Use corrected workflow without deployment:**
1. Rename `ci-cd-corrected.yml` to `ci-cd.yml`
2. Add GitHub Secrets:
   - `DOCKERHUB_USERNAME`
   - `DOCKERHUB_TOKEN`
3. Let it run tests and build images
4. Deploy manually when image is ready

### Long Term (Full Blue-Green)

**If you want blue-green deployment:**

1. **Set up nginx load balancer:**
   ```yaml
   # Add to docker-compose.yml
   nginx:
     image: nginx:latest
     ports:
       - "80:80"
       - "443:443"
     volumes:
       - ./nginx.conf:/etc/nginx/nginx.conf
     depends_on:
       - web-blue
       - web-green
   ```

2. **Configure nginx.conf:**
   ```nginx
   upstream backend {
       server web-blue:8000;  # or web-green:8000
   }

   server {
       listen 80;
       location / {
           proxy_pass http://backend;
       }
   }
   ```

3. **Add health check endpoint:**
   ```python
   # In Django
   @api.get("/health/")
   def health_check(request):
       return {"status": "ok"}
   ```

4. **Update deployment workflow** to:
   - Deploy to inactive environment
   - Run health checks
   - Switch nginx upstream
   - Keep old version running for rollback

## Current Best Practice

For your current setup, **manual deployment is safer:**

```bash
# 1. Test locally first
docker-compose -f docker-compose.dev.yml --env-file .env.dev.local up

# 2. Push to GitHub
git push

# 3. SSH to production server
ssh your-server

# 4. Pull and deploy
cd /path/to/project
git pull
docker-compose build
docker-compose up -d
docker-compose exec web python manage.py migrate
```

## Required GitHub Secrets

If you enable CI/CD, add these secrets in GitHub Settings → Secrets:

```
DOCKERHUB_USERNAME=your-docker-hub-username
DOCKERHUB_TOKEN=your-docker-hub-access-token
SSH_HOST=your-server-ip (e.g., 134.209.213.185)
SSH_USERNAME=your-ssh-username
SSH_PRIVATE_KEY=your-ssh-private-key
DEPLOY_PATH=/path/to/nba_predictions (actual path on server)
```

## Summary

The original CI/CD workflow was an **AI-generated template** that:
- Has correct structure and concepts
- Contains placeholder values that don't work
- Assumes infrastructure (nginx, blue-green) that doesn't exist
- Would fail immediately if triggered

The corrected workflow:
- Fixes all path issues
- Uses secrets for credentials
- Disables deployment by default
- Provides a foundation for when you're ready

**Recommendation:** Stick with manual deployment until you're ready to invest time in proper CI/CD infrastructure setup.
