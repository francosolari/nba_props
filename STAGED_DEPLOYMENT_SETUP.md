# Staged Deployment Setup Guide

## Overview

You now have **two deployment workflows** available:

1. **`deploy-simplified.yml`** - Single approval before deployment (simpler)
2. **`deploy-staged.yml`** - Two approvals: deploy to idle, then switch traffic (safer)

## Recommended: Use Staged Deployment

The **staged deployment** workflow (`deploy-staged.yml`) matches your requirements:
- Deploy new version to idle container (blue or green)
- **You manually test the idle container**
- Separate approval to switch production traffic
- Old version keeps running until you approve the switch

---

## Setup Instructions

### Step 1: Configure GitHub Environments

You need to create two GitHub environments with manual approval:

#### Environment 1: `staging-deploy`

1. Go to: https://github.com/francosolari/nba_props/settings/environments
2. Click **"New environment"**
3. Name: `staging-deploy`
4. Enable **"Required reviewers"**
5. Add yourself (`francosolari`) as a required reviewer
6. Set **"Environment URL"** (optional): `http://134.209.213.185:8002`
7. Click **"Configure environment"** to save

#### Environment 2: `production-traffic-switch`

1. Same location: https://github.com/francosolari/nba_props/settings/environments
2. Click **"New environment"**
3. Name: `production-traffic-switch`
4. Enable **"Required reviewers"**
5. Add yourself (`francosolari`) as a required reviewer
6. Set **"Environment URL"** (optional): `https://propspredictions.com`
7. Click **"Configure environment"** to save

---

## How the Staged Workflow Works

### When you merge a PR to `main`:

```
┌─────────────────────────────────────────────────┐
│ 1. Build & Push (Automatic)                    │
│    ✅ Builds Docker image on GitHub Actions     │
│    ✅ Pushes to DockerHub                       │
│    ✅ Auto-increments version                   │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 2. Deploy to Idle Container (Manual Approval)  │
│    🟡 WAITS for your approval                   │
│    → Click "Review deployments" in GitHub       │
│    → Approve "staging-deploy"                   │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 3. Deployment to Idle Container                │
│    ✅ Determines which container is idle        │
│    ✅ Deploys new version to idle port          │
│    ✅ Runs database migrations                  │
│    ✅ Health check on idle container            │
│    ⚠️  Production STILL on old version          │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 4. Manual Testing (You Do This)                │
│    🧪 SSH to server or curl idle container      │
│    🧪 Test the new version thoroughly           │
│    🧪 curl http://134.209.213.185:8002/         │
│       (or :8000 depending on which is idle)     │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 5. Switch Traffic (Second Manual Approval)     │
│    🟡 WAITS for your second approval            │
│    → Go back to GitHub Actions                  │
│    → Click "Review deployments"                 │
│    → Approve "production-traffic-switch"        │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 6. Traffic Switch Executes                     │
│    ✅ Updates nginx config                      │
│    ✅ Reloads nginx (zero downtime)             │
│    ✅ Production now on new version             │
│    ✅ Old container still running for rollback  │
└─────────────────────────────────────────────────┘
```

---

## Testing the Idle Container

After the first approval (deploy-to-idle completes), the workflow tells you which port the idle container is on.

### Option A: From Your Laptop

```bash
# Test the idle container (check workflow output for port)
curl http://134.209.213.185:8002/
# OR
curl http://134.209.213.185:8000/

# Full smoke test
curl -I http://134.209.213.185:8002/api/v2/seasons/
curl http://134.209.213.185:8002/api/v2/teams/
```

### Option B: SSH to Server

```bash
ssh root@134.209.213.185

# Check which port is idle
grep "proxy_pass.*127.0.0.1:" /etc/nginx/sites-enabled/propspredictions.conf

# Test idle container locally
curl http://localhost:8002/  # or :8000

# Check container logs
docker logs nba_props_web-green_1  # or nba_props_web-blue_1

# Check container health
docker ps | grep nba_props_web
```

---

## Workflow in Action: Step-by-Step

### 1. Merge PR to Main

```bash
# Via GitHub UI (recommended)
# OR via CLI:
gh pr merge <PR-number> --squash
```

### 2. GitHub Actions Builds Automatically

- Go to: https://github.com/francosolari/nba_props/actions
- You'll see the workflow running: **"Staged Deployment with Manual Traffic Switch"**
- Build & Push job completes automatically

### 3. First Approval Request Appears

You'll see:
```
🟡 deploy-to-idle
   Environment: staging-deploy
   [Review deployments]
```

**Click "Review deployments":**
1. Check the box for `staging-deploy`
2. (Optional) Add comment: "Deploying v1.3.20 to idle container"
3. Click **"Approve and deploy"**

### 4. Idle Container Deployment

The workflow:
- SSHs to your server
- Pulls the new Docker image
- Determines which container (blue or green) is idle
- Deploys to that idle container
- Runs migrations
- Health checks the idle container

**Check the workflow logs** to see which port the idle container is on:
```
Current live port: 8000
Deploying to idle green container (port 8002)
...
✅ Health check passed (HTTP 200)
Idle container is ready for testing!
```

### 5. You Test Manually

```bash
# Test the idle container at the port shown in logs
curl http://134.209.213.185:8002/

# Test key endpoints
curl http://134.209.213.185:8002/api/v2/seasons/
curl http://134.209.213.185:8002/api/v2/leaderboard/2024-25/

# Check if it looks good
```

**If something's wrong:**
- Just don't approve the traffic switch
- Production stays on the working version
- Fix the issue, merge a new PR, repeat

**If everything looks good:**
- Proceed to approve traffic switch

### 6. Second Approval Request Appears

After you've tested, go back to the workflow:
```
🟡 switch-traffic
   Environment: production-traffic-switch
   [Review deployments]
```

**Click "Review deployments":**
1. Check the box for `production-traffic-switch`
2. (Optional) Add comment: "Tested on port 8002, switching traffic"
3. Click **"Approve and deploy"**

### 7. Traffic Switch Executes

The workflow:
- Updates nginx config: `127.0.0.1:8000` → `127.0.0.1:8002`
- Reloads nginx
- Verifies production health check
- Done!

**Production is now on the new version** 🎉

---

## Rollback Procedure

If issues appear after switching traffic:

```bash
# SSH to server
ssh root@134.209.213.185

# Check current port
grep "proxy_pass.*127.0.0.1:" /etc/nginx/sites-enabled/propspredictions.conf

# Switch back to old container
# Example: if new version is on 8002, switch back to 8000
sudo sed -i 's/127.0.0.1:8002/127.0.0.1:8000/g' /etc/nginx/sites-enabled/propspredictions.conf

# Test and reload
sudo nginx -t && sudo systemctl reload nginx

# Verify
curl https://propspredictions.com/
```

---

## Comparison: Simplified vs Staged

### `deploy-simplified.yml` (Single Approval)

**Flow:**
1. Build & Push (automatic)
2. **One approval** → Deploy + Switch Traffic (all at once)

**Pros:**
- Simpler, fewer steps
- Faster deployment

**Cons:**
- Can't test before traffic switch
- Traffic switches immediately after approval

**Use when:**
- Small, low-risk changes
- You're confident in CI test coverage

---

### `deploy-staged.yml` (Two Approvals) ⭐ Recommended

**Flow:**
1. Build & Push (automatic)
2. **First approval** → Deploy to idle container
3. You test manually
4. **Second approval** → Switch traffic

**Pros:**
- Test before switching traffic
- Production stays on working version during testing
- More control, safer

**Cons:**
- Extra approval step
- Slightly slower

**Use when:**
- Database migrations involved
- New features you want to verify
- Any time you want extra safety

---

## Which Workflow Will Run?

Both workflows trigger on `push` to `main`. If you want to use only the staged workflow:

### Option A: Disable Simplified Workflow

Rename or delete:
```bash
# Disable by renaming
mv .github/workflows/deploy-simplified.yml .github/workflows/deploy-simplified.yml.disabled

# OR delete it
rm .github/workflows/deploy-simplified.yml
```

### Option B: Keep Both (Advanced)

Modify `deploy-simplified.yml` to only run on specific paths:
```yaml
on:
  push:
    branches: [ main ]
    paths:
      - 'NEVER_TRIGGER'  # Effectively disabled
```

### Option C: Use Workflow Dispatch

Keep both, but change `deploy-simplified.yml` to only run manually:
```yaml
on:
  workflow_dispatch:  # Only manual trigger, remove push trigger
```

---

## Recommendation

**For your use case**, I recommend:

1. **Use `deploy-staged.yml` as your default** (already triggers on push to main)
2. **Disable `deploy-simplified.yml`** by renaming it to `.yml.disabled`
3. Keep it in the repo for reference or emergency fast deploys

```bash
# Disable simplified workflow
git mv .github/workflows/deploy-simplified.yml .github/workflows/deploy-simplified.yml.disabled
git commit -m "Disable simplified workflow, use staged deployment"
git push
```

---

## Testing the Setup

### Test on a Small Change

1. Make a trivial change (e.g., update a comment)
2. Create a PR
3. Merge to main
4. Watch the workflow:
   - Build should complete automatically
   - You'll get first approval request
   - Approve it
   - Idle container deploys
   - Test manually
   - Approve traffic switch
   - Done!

---

## Environment Setup Checklist

Before your first deployment with this workflow:

- [ ] Created `staging-deploy` environment in GitHub
  - [ ] Added yourself as required reviewer
- [ ] Created `production-traffic-switch` environment in GitHub
  - [ ] Added yourself as required reviewer
- [ ] Decided which workflow to use (staged recommended)
- [ ] Optionally disabled `deploy-simplified.yml`
- [ ] Tested with a small change

---

## Quick Reference

**GitHub Settings:**
- Environments: https://github.com/francosolari/nba_props/settings/environments
- Actions: https://github.com/francosolari/nba_props/actions

**Server Details:**
- Host: 134.209.213.185
- Blue container: port 8000 (`nba_props_web-blue_1`)
- Green container: port 8002 (`nba_props_web-green_1`)
- Nginx config: `/etc/nginx/sites-enabled/propspredictions.conf`

**Testing URLs:**
- Production: https://propspredictions.com
- Idle container (blue): http://134.209.213.185:8000
- Idle container (green): http://134.209.213.185:8002

---

## FAQ

**Q: Can I skip the second approval if I'm confident?**
A: Yes, just approve it immediately. But the workflow always deploys to idle first.

**Q: What if I never approve the traffic switch?**
A: Production keeps running on the old version. The idle container just sits there harmlessly.

**Q: Can I still deploy manually with my scripts?**
A: Yes! Your `build_and_push.sh` and `blue_green_deploy.sh` scripts are unchanged.

**Q: What if CI builds the wrong version?**
A: Don't approve the deployment. Fix and push again. Each push creates a new workflow run.

**Q: How do I know which container is idle?**
A: Check the workflow logs after `deploy-to-idle` completes. It tells you explicitly.

---

## Next Steps

1. **Set up the two GitHub environments** (staging-deploy, production-traffic-switch)
2. **Decide on workflow** (recommend: disable simplified, use staged)
3. **Test with a small change** to verify the flow
4. **Enjoy safer deployments!**

You now have full control: test before switching traffic, and production never goes down unexpectedly.
