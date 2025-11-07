# CI/CD Workflow Guide

## Overview

This guide explains the complete CI/CD workflow for the NBA Predictions project, designed for safe automated deployments with manual control.

## 🎯 Recommended Workflow (Best Practice)

### The Three-Stage Process

```
1. PR Testing (Automatic)
   ↓
2. Merge to Main (Manual)
   ↓
3. Production Deployment (Manual Approval Required)
```

---

## Stage 1: Pull Request Testing (Automatic)

**What happens when you create a PR:**

### ✅ Automatic Checks Run:
1. **Tests and Coverage** (`test-and-coverage.yml`)
   - Runs all pytest tests
   - Generates coverage report
   - Tests must pass (coverage is informational only)

2. **Docker Build Test** (`test-ci-build.yml`)
   - Builds Docker image
   - Verifies the build succeeds
   - Does NOT push to DockerHub
   - Does NOT deploy

### 📝 How to Create a PR for Testing:

```bash
# Make your changes on a feature branch
git checkout -b feature/my-new-feature

# Make changes, commit them
git add .
git commit -m "Add new feature"

# Push to GitHub
git push origin feature/my-new-feature

# Create PR via GitHub UI or CLI
gh pr create --title "Add new feature" --body "Description of changes"
```

### 🔍 What to Check Before Merging:

1. ✅ All CI checks pass (green checkmarks in PR)
2. ✅ Coverage report looks reasonable (view in PR artifacts)
3. ✅ Code review complete
4. ✅ You've tested locally if needed

**Important**: PRs do NOT deploy anything - they only test!

---

## Stage 2: Merge to Main (Manual Decision)

Once your PR is approved and tests pass:

```bash
# Merge via GitHub UI (recommended)
# OR via command line:
git checkout main
git merge feature/my-new-feature
git push origin main
```

**This triggers the deployment workflow!**

---

## Stage 3: Production Deployment (Manual Approval)

When you push to `main`, the `deploy-simplified.yml` workflow runs:

### Step 3a: Build & Push (Automatic)
✅ Builds Docker image on GitHub Actions
✅ Pushes to DockerHub (fsolaric/nba_props_web)
✅ Auto-increments version number

### Step 3b: Deploy Job (WAITS FOR YOUR APPROVAL)

**GitHub will PAUSE here and wait for you to approve!**

You'll get a notification and see:
```
🟡 Deployment waiting for approval
   Environment: production
   [Review deployments]
```

### How to Approve Deployment:

**Option A: GitHub UI**
1. Go to: https://github.com/francosolari/nba_props/actions
2. Click on the running workflow
3. Click "Review deployments"
4. Check "production"
5. Click "Approve and deploy"

**Option B: GitHub CLI**
```bash
gh run list --branch main
gh run view <run-id>
# Follow the URL to approve
```

### Step 3c: Deployment Executes (After Approval)

Once you approve, the workflow:
1. SSH to your server (134.209.213.185)
2. Runs your existing `blue_green_deploy.sh` script
3. Deploys to idle container
4. Runs health checks
5. Switches nginx traffic
6. Reports success

**Your existing deployment script is unchanged!**

---

## 🛡️ Safety Features

### Why This Workflow is Safe:

1. **PRs test everything first** - Catch issues before merge
2. **Manual approval required** - You control when deployment happens
3. **Blue-green deployment** - Old version stays running for rollback
4. **Health checks** - Won't switch traffic if health check fails
5. **Local deployment still works** - Your scripts are unchanged

### Rollback Procedure:

If something goes wrong after deployment:

```bash
# SSH to your server
ssh root@134.209.213.185

# Rollback to previous version
cd /var/www/nba_props

# Check current ports
grep "proxy_pass.*127.0.0.1:" /etc/nginx/sites-enabled/propspredictions.conf

# Switch back to old container (example: switch from 8002 to 8000)
sudo sed -i 's/127.0.0.1:8002/127.0.0.1:8000/g' /etc/nginx/sites-enabled/propspredictions.conf
sudo nginx -t && sudo systemctl reload nginx
```

---

## 📋 Complete Workflow Example

### Example: Adding a New Feature

**Week 1: Development & Testing**
```bash
# Day 1: Start feature
git checkout -b feature/add-player-stats
# ... make changes ...
git commit -m "Add player stats endpoint"
git push origin feature/add-player-stats

# Create PR
gh pr create --title "Add player stats" --body "Adds /api/v2/player-stats endpoint"

# CI runs automatically:
# - Tests pass ✅
# - Docker build succeeds ✅
# - Coverage report generated ✅
```

**Week 1: Code Review**
- Review code
- Make requested changes
- Push updates (CI runs again automatically)

**Week 2: Merge & Deploy**
```bash
# Day 1: Merge PR (via GitHub UI)
# Merging to main triggers deployment workflow

# Workflow builds Docker image automatically
# Then WAITS for your approval

# Day 1 (or Day 2, whenever you're ready):
# 1. Go to GitHub Actions
# 2. See "Deployment waiting for approval"
# 3. Click "Review deployments"
# 4. Approve deployment

# Deployment runs:
# - Pulls code on server
# - Deploys to idle container
# - Health check passes
# - Switches traffic
# - Done! ✅
```

---

## 🔧 Local Deployment (Unchanged)

Your existing local deployment scripts still work exactly as before:

### Local Build & Push:
```bash
# Build and push from your laptop (just like always)
./scripts/build_and_push.sh
```

### Manual Server Deployment:
```bash
# SSH to server and deploy manually (just like always)
ssh root@134.209.213.185
cd /var/www/nba_props
bash scripts/blue_green_deploy.sh fsolaric/nba_props_web:v1.3.20
```

**Nothing changed here! You can still do manual deployments anytime.**

---

## ⚙️ Setting Up Manual Approval (One-Time Setup)

To enable manual approval, you need to configure the GitHub environment:

### Steps:

1. Go to: https://github.com/francosolari/nba_props/settings/environments
2. Click "New environment"
3. Name it: `production`
4. Enable "Required reviewers"
5. Add yourself as a reviewer
6. Save

**Done!** Now all deployments to `production` environment require your approval.

---

## 📊 Understanding the Workflows

### Workflow Files:

**`.github/workflows/test-and-coverage.yml`**
- Runs on: PRs, pushes to any branch
- Purpose: Run tests and generate coverage
- Action: Informational (won't block on low coverage)

**`.github/workflows/test-ci-build.yml`**
- Runs on: PRs, test branches
- Purpose: Verify Docker build works
- Action: Build only (no push, no deploy)

**`.github/workflows/deploy-simplified.yml`**
- Runs on: Pushes to `main` only
- Purpose: Build and deploy to production
- Action: Build → Push → WAIT FOR APPROVAL → Deploy

---

## 🎓 CI/CD Best Practices (What You're Doing Right)

### ✅ What Your Setup Does Well:

1. **Test Before Merge**
   - All PRs run tests automatically
   - Catch issues before they reach main

2. **Manual Control**
   - You approve production deployments
   - No surprise deployments

3. **Blue-Green Deployment**
   - Zero downtime
   - Easy rollback

4. **Separate Test & Deploy**
   - Tests run on PRs (fast feedback)
   - Deployment only on main (controlled)

5. **Coverage Reporting**
   - See test coverage trends
   - Not blocking (informational only)

### 🚫 What to Avoid:

❌ **Don't** merge PRs with failing tests
❌ **Don't** skip PR reviews
❌ **Don't** approve deployments without checking CI logs
❌ **Don't** push directly to main (use PRs)

---

## 📞 Common Scenarios

### Scenario 1: "I want to test my changes before creating a PR"

**Solution: Test locally**
```bash
# Run tests locally
./venv/bin/pytest backend/predictions/tests/ -v

# Build Docker locally
docker build --platform linux/amd64 -t test:local .

# Test locally
npm run dev
```

### Scenario 2: "I want to see if the deployment works without affecting production"

**Current Setup**: The `deploy-simplified.yml` workflow does automatic deployment after approval.

**Options**:
1. **Use test branches** - Push to `test/*` branches to run CI without deployment
2. **Approve carefully** - Only approve after reviewing CI logs
3. **Use blue-green rollback** - If something breaks, roll back immediately

### Scenario 3: "I want to deploy urgently"

**Fast-track deployment**:
```bash
# 1. Skip PR (only for urgent fixes)
git checkout main
git pull
# make urgent fix
git commit -m "URGENT: Fix critical bug"
git push origin main

# 2. Approve deployment immediately when prompted
# (workflow still builds & tests, but you can approve faster)
```

### Scenario 4: "CI is passing but I want to test manually on the server first"

**Solution**:
1. Let CI build and push the image
2. **Don't approve the deployment**
3. SSH to your server and test manually:
   ```bash
   ssh root@134.209.213.185
   cd /var/www/nba_props

   # Deploy to idle container manually (your existing script)
   bash scripts/blue_green_deploy.sh fsolaric/nba_props_web:v1.3.20

   # Test the idle container before switching traffic
   curl http://localhost:8002/  # (or 8000, whichever is idle)

   # If good, manually switch traffic
   # If bad, just leave it - traffic stays on working version
   ```

---

## 🎯 Recommended Workflow for You

Based on your setup (low-power server, manual deployment preference), here's the ideal workflow:

### Daily Development:
1. Work on feature branches
2. Create PRs when ready
3. Let CI run tests automatically
4. Merge when tests pass

### Weekly Deployment:
1. Accumulate merged PRs on `main`
2. Pick a deployment window (e.g., Friday afternoon)
3. Push to `main` (or it's already there from merges)
4. CI builds Docker image automatically
5. You get approval request
6. Review logs, then approve
7. Deployment runs automatically
8. Monitor for issues
9. Roll back if needed

### Emergency Fixes:
1. Make fix on hotfix branch
2. Create PR (CI tests it)
3. Merge to main
4. Approve deployment immediately
5. Monitor closely

---

## 📝 Summary

**What You Have Now:**
✅ Automated testing on PRs
✅ Automated Docker builds
✅ Manual approval for deployments
✅ Blue-green deployment with rollback
✅ Coverage reporting (informational)
✅ Local deployment still works

**What Happens Automatically:**
- Tests run on every PR
- Docker builds on main branch
- Version numbers increment

**What You Control:**
- When to merge PRs
- When to deploy to production (approval required)
- Emergency rollbacks

**Your deployment scripts are unchanged** - you can still deploy manually anytime!

---

## 🔗 Quick Links

- **GitHub Actions**: https://github.com/francosolari/nba_props/actions
- **Environment Settings**: https://github.com/francosolari/nba_props/settings/environments
- **Production URL**: https://propspredictions.com
- **Server**: 134.209.213.185

---

## ❓ FAQ

**Q: Do I have to use CI/CD?**
A: No! Your manual deployment scripts still work. CI/CD is optional but recommended.

**Q: What if CI fails?**
A: Fix the issue, push again. CI will re-run automatically.

**Q: Can I skip the approval?**
A: No, that's the safety feature! But you can approve immediately if you want.

**Q: What if the server is down during deployment?**
A: The workflow will fail and notify you. Your old version keeps running.

**Q: How do I disable auto-deployment?**
A: Remove the `deploy` job from `.github/workflows/deploy-simplified.yml`

**Q: Can I test deployments on a staging server?**
A: Not in the current setup, but you can test on the idle container (see Scenario 4).

---

## 🎉 You're All Set!

Your CI/CD is configured for safe, controlled deployments with manual approval. Test it out with a small change!
