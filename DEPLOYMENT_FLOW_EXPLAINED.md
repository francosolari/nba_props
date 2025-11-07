# Complete Deployment Flow: PR → Digital Ocean Server

## 📊 Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ Step 1: You Merge PR to Main                                         │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Step 2: GitHub Actions Workflow Triggers                             │
│ File: .github/workflows/deploy-simplified.yml                        │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Step 3: Build Job (Runs on GitHub's Servers)                         │
│ ├─ Install Node.js & npm dependencies                                │
│ ├─ Run: npm run build (compiles frontend)                            │
│ ├─ Increment version: v1.3.19 → v1.3.20                              │
│ ├─ Build Docker image for linux/amd64                                │
│ ├─ Push to DockerHub: fsolaric/nba_props_web:v1.3.20                 │
│ └─ Output: image_tag = v1.3.20                                        │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Step 4: Deployment Job WAITS for Your Approval                       │
│ Environment: production (requires manual approval)                   │
│                                                                       │
│ 🛑 WORKFLOW PAUSES HERE                                              │
│                                                                       │
│ You see notification: "Deployment waiting for approval"              │
│ You go to: github.com/francosolari/nba_props/actions                 │
│ You click: "Review deployments" → "Approve"                          │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Step 5: After Approval - SSH to Your Digital Ocean Server            │
│ Connection Details:                                                   │
│ ├─ Host: 134.209.213.185 (from secrets.SSH_HOST)                     │
│ ├─ User: root (from secrets.SSH_USERNAME)                            │
│ ├─ Auth: SSH private key (from secrets.SSH_PRIVATE_KEY)              │
│ └─ Port: 22                                                           │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Step 6: Commands Execute on Your Server                              │
│ Working Directory: /var/www/nba_props                                │
│                                                                       │
│ 1. cd /var/www/nba_props                                             │
│ 2. git pull origin main                                              │
│ 3. chmod +x scripts/blue_green_deploy.sh                             │
│ 4. Export environment variables (SECRET_KEY, DATABASE_*, etc.)       │
│ 5. Run: echo "y" | bash scripts/blue_green_deploy.sh \               │
│         fsolaric/nba_props_web:v1.3.20                                │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Step 7: Blue-Green Deployment Script Executes on Your Server         │
│ File: scripts/blue_green_deploy.sh (YOUR existing script)            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Deep Dive: What Happens on Your Digital Ocean Server

When `blue_green_deploy.sh` runs on your server, here's the step-by-step:

### **Phase 1: Detect Current State**

```bash
# On your server at /var/www/nba_props
# Script checks which container is currently live

# Reads nginx config to see current port
CURRENT_PORT=$(grep "proxy_pass.*127.0.0.1:" /etc/nginx/sites-enabled/propspredictions.conf)

# Determines:
# If port 8000 is live → Deploy to port 8002 (green)
# If port 8002 is live → Deploy to port 8000 (blue)
```

**Example Output:**
```
Current live: blue (port 8000)
Deploying to: green (port 8002)
```

### **Phase 2: Database Backup**

```bash
# Creates backup before deployment
BACKUP_FILE="/var/www/backups/nba_predictions_backup_20250107_153000.sql"

docker exec nba_props_db_1 pg_dump -U myuser mydb > $BACKUP_FILE
```

**Safety net**: If something goes wrong, you can restore from this backup.

### **Phase 3: Pull New Docker Image**

```bash
# Your server pulls from DockerHub (NOT building locally!)
docker pull fsolaric/nba_props_web:v1.3.20
```

**This is key**: Your low-power server doesn't build the image - it just downloads the pre-built one from DockerHub.

### **Phase 4: Deploy to IDLE Container**

```bash
# Stop and remove old idle container
docker stop nba_props_web-green_1
docker rm nba_props_web-green_1

# Start new idle container with new image
docker run -d \
  --name nba_props_web-green_1 \
  --network nba_props_mynetwork \
  -p 8002:8000 \
  -v /var/www/nba_props/backend:/app \
  -e DJANGO_SETTINGS_MODULE="nba_predictions.settings" \
  -e DJANGO_DEVELOPMENT=False \
  -e SECRET_KEY="$SECRET_KEY" \
  -e DATABASE_HOST="$DATABASE_HOST" \
  -e DATABASE_PORT="5432" \
  -e DATABASE_NAME="$DATABASE_NAME" \
  -e DATABASE_USER="$DATABASE_USER" \
  -e DATABASE_PASSWORD="$DATABASE_PASSWORD" \
  -e SENDGRID_API_KEY="$SENDGRID_API_KEY" \
  # ... all your other env vars
  fsolaric/nba_props_web:v1.3.20 \
  sh -c "python manage.py migrate && gunicorn nba_predictions.wsgi:application --bind 0.0.0.0:8000"
```

**What's happening:**
1. New container starts on port 8002
2. Runs Django migrations automatically
3. Starts Gunicorn with 2 workers
4. **Traffic still goes to old container (port 8000)** - users see no disruption

### **Phase 5: Health Check**

```bash
# Wait for container to start
sleep 10

# Check if idle container is healthy
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8002/)

if [ "$HEALTH_CHECK" = "200" ]; then
  echo "✓ Health check passed"
else
  echo "✗ Health check failed"
  # Shows container logs and asks if you want to continue
fi
```

**Safety check**: Won't switch traffic if the new version isn't responding correctly.

### **Phase 6: Traffic Switch (The Critical Moment)**

```bash
# Script asks: "Proceed with traffic flip? (y/N)"
# In CI/CD, this is auto-confirmed with: echo "y" | bash script.sh

# Backup nginx config
cp /etc/nginx/sites-enabled/propspredictions.conf \
   /etc/nginx/sites-enabled/propspredictions.conf.backup.20250107_153045

# Switch nginx from old port to new port
sed -i 's/127.0.0.1:8000/127.0.0.1:8002/g' \
  /etc/nginx/sites-enabled/propspredictions.conf

# Test nginx config
nginx -t

# If test passes, reload nginx (no downtime!)
systemctl reload nginx
```

**What happens:**
```
BEFORE:
Internet → nginx → 127.0.0.1:8000 (blue/old version)
                   127.0.0.1:8002 (green/new version - not receiving traffic)

AFTER:
Internet → nginx → 127.0.0.1:8000 (blue/old version - still running for rollback!)
                   127.0.0.1:8002 (green/new version - NOW receiving traffic)
```

### **Phase 7: Verify Production**

```bash
# Wait a moment for nginx reload
sleep 3

# Check production URL
PUBLIC_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://propspredictions.com/)

if [ "$PUBLIC_HEALTH" = "200" ]; then
  echo "✅ Production health check passed"
else
  echo "⚠️ Production health check failed"
fi
```

### **Phase 8: Deployment Complete**

```
=== Deployment Complete ===
Previous live: blue (port 8000)
New live: green (port 8002)
Docker image: fsolaric/nba_props_web:v1.3.20
Database backup: /var/www/backups/nba_predictions_backup_20250107_153000.sql

Old blue container is still running for rollback if needed.
```

---

## 🎬 Timeline Example

Here's a real timeline of what happens:

```
14:00:00 - You merge PR on GitHub
14:00:05 - GitHub Actions triggers
14:00:10 - Starts building Docker image on GitHub's servers

14:02:30 - Docker build complete
14:02:35 - Pushes to DockerHub (fsolaric/nba_props_web:v1.3.20)
14:02:40 - Build job complete
14:02:45 - Deploy job WAITS for approval

[... you're doing other things ...]

15:30:00 - You check GitHub Actions
15:30:10 - You click "Review deployments"
15:30:15 - You click "Approve and deploy"
15:30:20 - GitHub Actions SSHs to 134.209.213.185

15:30:25 - Server: cd /var/www/nba_props
15:30:26 - Server: git pull origin main
15:30:28 - Server: Running blue_green_deploy.sh
15:30:30 - Server: Detected current live: blue (8000)
15:30:32 - Server: Creating database backup
15:30:45 - Server: Backup complete (2.3 MB)
15:30:46 - Server: docker pull fsolaric/nba_props_web:v1.3.20
15:31:15 - Server: Pulled new image (1.2 GB)
15:31:16 - Server: Stopping old green container
15:31:17 - Server: Starting new green container (port 8002)
15:31:30 - Server: Running migrations
15:31:35 - Server: Starting gunicorn
15:31:45 - Server: Health check on localhost:8002 → 200 OK ✅
15:31:46 - Server: Switching nginx traffic...
15:31:47 - Server: nginx config updated (8000 → 8002)
15:31:48 - Server: nginx -t → OK
15:31:49 - Server: systemctl reload nginx → OK
15:31:52 - Server: Public health check → 200 OK ✅

15:31:55 - DEPLOYMENT COMPLETE!
           - New version live on propspredictions.com
           - Old version still running on port 8000 (for rollback)
```

**Total deployment time**: ~1.5 minutes after approval

---

## 🏗️ Your Server Architecture

### Container Layout on Digital Ocean Server

```
┌─────────────────────────────────────────────────────────────────┐
│ Digital Ocean Droplet (134.209.213.185)                          │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ NGINX (Reverse Proxy)                                    │    │
│  │ Port: 80/443 → proxies to backend                        │    │
│  │ Config: /etc/nginx/sites-enabled/propspredictions.conf  │    │
│  │                                                           │    │
│  │ Current proxy: proxy_pass http://127.0.0.1:8002         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              ↓                                    │
│  ┌────────────────────────────┬────────────────────────────┐    │
│  │ Blue Container (OLD)       │ Green Container (NEW)      │    │
│  │ Name: nba_props_web-blue_1 │ Name: nba_props_web-green_1│    │
│  │ Port: 8000                 │ Port: 8002                 │    │
│  │ Image: ...:v1.3.19         │ Image: ...:v1.3.20         │    │
│  │ Status: Running ⚪         │ Status: Running 🟢         │    │
│  │ Traffic: No                │ Traffic: YES ✅            │    │
│  └────────────────────────────┴────────────────────────────┘    │
│                              ↓                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ PostgreSQL Container                                     │    │
│  │ Name: nba_props_db_1                                     │    │
│  │ Port: 5432                                               │    │
│  │ Network: nba_props_mynetwork (shared with web)          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  📁 Directories:                                                 │
│  ├─ /var/www/nba_props (your code)                              │
│  ├─ /var/www/nba_props/backend (mounted to containers)          │
│  └─ /var/www/backups (database backups)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security: How GitHub Actions Accesses Your Server

### SSH Connection Details (Stored in GitHub Secrets)

```yaml
# GitHub Actions reads these secrets:
secrets.SSH_HOST          = "134.209.213.185"
secrets.SSH_USERNAME      = "root"
secrets.SSH_PRIVATE_KEY   = "-----BEGIN RSA PRIVATE KEY-----\n..."
secrets.SSH_PORT          = 22 (or default)
```

### What Happens:
1. GitHub Actions runner creates SSH connection
2. Authenticates using your private key (stored securely in GitHub)
3. Runs commands as root on your server
4. Closes connection when done

**Security Note**: The private key never leaves GitHub's secure environment.

---

## 🎯 Key Points About Your Setup

### Why This Works Well for Your Low-Power Server:

✅ **Docker builds on GitHub** (not your server)
- GitHub's powerful servers compile your code
- Your server just downloads the pre-built image
- Saves CPU/memory on your droplet

✅ **Blue-Green keeps old version running**
- If new version fails, old version still serving traffic
- Easy instant rollback (just switch nginx back)

✅ **Health checks before switching**
- Won't switch traffic unless new version responds with 200
- Prevents broken deployments from affecting users

✅ **Database backups before deployment**
- Automatic backup before every deployment
- Can restore if migrations cause issues

---

## 🔄 Rollback Procedure

If something goes wrong after deployment, rollback is simple:

### Option 1: From Your Laptop

```bash
# SSH to your server
ssh root@134.209.213.185

# Check which containers are running
docker ps

# Check current nginx config
cat /etc/nginx/sites-enabled/propspredictions.conf | grep proxy_pass

# If currently pointing to 8002, switch back to 8000
sudo sed -i 's/127.0.0.1:8002/127.0.0.1:8000/g' \
  /etc/nginx/sites-enabled/propspredictions.conf

# Test and reload nginx
sudo nginx -t && sudo systemctl reload nginx

# Verify
curl http://propspredictions.com/
```

**Rollback time**: ~10 seconds

### Option 2: Restore Database Backup (If Needed)

```bash
# SSH to server
ssh root@134.209.213.185

# List backups
ls -lh /var/www/backups/

# Restore from backup
docker exec -i nba_props_db_1 psql -U myuser mydb < \
  /var/www/backups/nba_predictions_backup_20250107_153000.sql
```

---

## 📊 What Gets Deployed

### Files Synchronized to Your Server:

When `git pull origin main` runs on your server:
```
/var/www/nba_props/
├── backend/              ✅ Pulled from git
│   ├── manage.py
│   ├── nba_predictions/
│   ├── predictions/
│   └── requirements.txt
├── scripts/              ✅ Pulled from git
│   └── blue_green_deploy.sh
├── .github/              ✅ Pulled from git (but not used on server)
└── frontend/             ⚠️ NOT pulled - built into Docker image
```

### What's in the Docker Image:

```
Docker Image: fsolaric/nba_props_web:v1.3.20
├── Python 3.11
├── Backend dependencies (from requirements.txt)
├── Compiled frontend assets (from npm run build)
│   ├── frontend/static/js/bundle.js
│   └── frontend/static/css/styles.css
└── Django collectstatic files
```

---

## 🎓 Summary

**Simple Answer:**

1. You merge PR → GitHub builds Docker image
2. You approve → GitHub SSHs to your server
3. Server runs your existing `blue_green_deploy.sh` script
4. Script deploys to idle container, checks health, switches traffic
5. Done! Your Digital Ocean server is now running the new version

**Your server never builds the image** - it just downloads and runs it.
**Your deployment script is unchanged** - CI/CD just calls it automatically.
**You control when deployment happens** - via the approval button.

---

## 🔗 Related Files

- **Workflow**: `.github/workflows/deploy-simplified.yml` (lines 97-164)
- **Deploy Script**: `scripts/blue_green_deploy.sh` (your existing script)
- **Build Script**: `scripts/build_and_push.sh` (for local use)

---

## ❓ Common Questions

**Q: Does the server need to build anything?**
A: No! GitHub builds the Docker image. Your server just downloads it from DockerHub.

**Q: How long is the server offline during deployment?**
A: Zero downtime! Traffic switches instantly from old to new container.

**Q: What if the new version crashes?**
A: Old container is still running. Just switch nginx back (takes 10 seconds).

**Q: Can I test the new version before switching traffic?**
A: Not in the current CI/CD setup, but you can manually deploy and test before approving. See the "Scenario 4" in `CI_CD_WORKFLOW_GUIDE.md`.

**Q: What happens if the database migration fails?**
A: Container won't start, health check fails, traffic stays on old version.

**Q: Can I see logs during deployment?**
A: Yes! Watch GitHub Actions live at: https://github.com/francosolari/nba_props/actions

---

Hope this clarifies the complete flow! Let me know if you have more questions about any specific part.
