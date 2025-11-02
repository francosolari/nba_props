#!/bin/bash
# Blue-Green Deployment Script for NBA Predictions
# Usage: ./scripts/blue_green_deploy.sh <docker-image-tag>
# Example: ./scripts/blue_green_deploy.sh fsolaric/nba_props_web:v1.2.3

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment variables from .env
ENV_FILE="$PROJECT_ROOT/backend/.env"
if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Loading environment variables from $ENV_FILE...${NC}"
    set -a
    source "$ENV_FILE"
    set +a
    echo -e "${GREEN}✓ Environment variables loaded${NC}\n"
else
    echo -e "${RED}Warning: .env file not found at $ENV_FILE${NC}"
    echo -e "${YELLOW}Continuing with existing environment variables...${NC}\n"
fi

# Configuration
NGINX_CONFIG="/etc/nginx/sites-enabled/propspredictions.conf"
DB_BACKUP_DIR="/var/www/backups"
DOCKER_NETWORK="nba_props_mynetwork"
BACKEND_MOUNT="/var/www/nba_props/backend:/app"

# Database credentials from .env
DB_USER=${DATABASE_USER:-myuser}
DB_NAME=${DATABASE_NAME:-mydb}
DB_HOST=${DATABASE_HOST:-propspredictions.com}

# Parse arguments
DOCKER_IMAGE=${1:-}
if [ -z "$DOCKER_IMAGE" ]; then
    echo -e "${RED}Error: Docker image tag required${NC}"
    echo "Usage: $0 <docker-image-tag>"
    echo "Example: $0 fsolaric/nba_props_web:v1.2.3"
    exit 1
fi

echo -e "${GREEN}=== NBA Predictions Blue-Green Deployment ===${NC}"
echo "Docker image: $DOCKER_IMAGE"
echo ""

# Step 0: Pull latest code from current branch
echo -e "${YELLOW}Step 0: Pulling latest code from git...${NC}"
cd "$PROJECT_ROOT"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
echo "Current branch: $CURRENT_BRANCH"
git pull origin "$CURRENT_BRANCH" || {
    echo -e "${RED}Warning: git pull failed${NC}"
    read -p "Continue anyway? (y/N): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
}
echo -e "${GREEN}✓ Code updated${NC}\n"

# Step 1: Detect current live color
echo -e "${YELLOW}Step 1: Detecting current live color...${NC}"
CURRENT_PORT=$(grep "proxy_pass.*127.0.0.1:" "$NGINX_CONFIG" | grep -oP ':\K[0-9]+' | head -1)

if [ "$CURRENT_PORT" = "8000" ]; then
    LIVE_COLOR="blue"
    LIVE_PORT="8000"
    IDLE_COLOR="green"
    IDLE_PORT="8002"
    IDLE_CONTAINER="nba_props_web-green_1"
elif [ "$CURRENT_PORT" = "8002" ]; then
    LIVE_COLOR="green"
    LIVE_PORT="8002"
    IDLE_COLOR="blue"
    IDLE_PORT="8000"
    IDLE_CONTAINER="nba_props_web-blue_1"
else
    echo -e "${RED}Error: Could not determine current live color (port: $CURRENT_PORT)${NC}"
    exit 1
fi

echo -e "${GREEN}Current live: $LIVE_COLOR (port $LIVE_PORT)${NC}"
echo -e "${GREEN}Deploying to: $IDLE_COLOR (port $IDLE_PORT)${NC}"
echo ""

# Step 2: Database backup
echo -e "${YELLOW}Step 2: Creating database backup...${NC}"
mkdir -p "$DB_BACKUP_DIR"
BACKUP_FILE="$DB_BACKUP_DIR/nba_predictions_backup_$(date +%Y%m%d_%H%M%S).sql"

docker exec nba_props_db_1 pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null || {
    echo -e "${RED}Warning: Database backup failed${NC}"
    read -p "Continue anyway? (y/N): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
}

if [ -f "$BACKUP_FILE" ]; then
    echo -e "${GREEN}Backup created: $BACKUP_FILE ($(du -h $BACKUP_FILE | cut -f1))${NC}"
else
    echo -e "${YELLOW}No backup file created${NC}"
fi
echo ""

# Step 3: Pull new Docker image
echo -e "${YELLOW}Step 3: Pulling Docker image...${NC}"
docker pull "$DOCKER_IMAGE"
echo ""

# Step 4: Stop and remove idle container
echo -e "${YELLOW}Step 4: Stopping idle ($IDLE_COLOR) container...${NC}"
docker stop "$IDLE_CONTAINER" 2>/dev/null || true
docker rm "$IDLE_CONTAINER" 2>/dev/null || true
echo ""

# Step 5: Start idle container with new image
echo -e "${YELLOW}Step 5: Starting idle ($IDLE_COLOR) container...${NC}"
docker run -d \
  --name "$IDLE_CONTAINER" \
  --network "$DOCKER_NETWORK" \
  -p "$IDLE_PORT:8000" \
  -v "$BACKEND_MOUNT" \
  -e DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-nba_predictions.settings}" \
  -e DJANGO_DEVELOPMENT=False \
  -e SECRET_KEY="${SECRET_KEY}" \
  -e DATABASE_HOST="${DATABASE_HOST}" \
  -e DATABASE_PORT="${DATABASE_PORT:-5432}" \
  -e DATABASE_NAME="${DATABASE_NAME}" \
  -e DATABASE_USER="${DATABASE_USER}" \
  -e DATABASE_PASSWORD="${DATABASE_PASSWORD}" \
  -e SENDGRID_API_KEY="${SENDGRID_API_KEY}" \
  -e DEFAULT_FROM_EMAIL="${DEFAULT_FROM_EMAIL}" \
  -e CF_TURNSTILE_SITE_KEY="${CF_TURNSTILE_SITE_KEY}" \
  -e CF_TURNSTILE_SECRET_KEY="${CF_TURNSTILE_SECRET_KEY}" \
  -e GOOGLE_OAUTH_CLIENT_ID="${GOOGLE_OAUTH_CLIENT_ID}" \
  -e GOOGLE_OAUTH_SECRET="${GOOGLE_OAUTH_SECRET}" \
  -e STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY}" \
  -e STRIPE_PUBLISHABLE_KEY="${STRIPE_PUBLISHABLE_KEY}" \
  -e STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET}" \
  "$DOCKER_IMAGE" \
  sh -c "python manage.py migrate && gunicorn nba_predictions.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120 --access-logfile - --error-logfile -"

# Wait for container to start
sleep 10

# Check if container is running
if ! docker ps | grep -q "$IDLE_CONTAINER"; then
    echo -e "${RED}Error: $IDLE_COLOR container failed to start${NC}"
    docker logs "$IDLE_CONTAINER" --tail 50
    exit 1
fi
echo -e "${GREEN}$IDLE_COLOR container started${NC}"
echo ""

# Step 6: Health check
echo -e "${YELLOW}Step 6: Health check on $IDLE_COLOR (port $IDLE_PORT)...${NC}"
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$IDLE_PORT/ || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}Health check passed (HTTP $HEALTH_CHECK)${NC}"
else
    echo -e "${RED}Health check failed (HTTP $HEALTH_CHECK)${NC}"
    echo "Container logs:"
    docker logs "$IDLE_CONTAINER" --tail 50

    read -p "Continue with deployment anyway? (y/N): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        echo "Deployment cancelled"
        exit 1
    fi
fi
echo ""

# Step 7: Flip traffic
echo -e "${YELLOW}Step 7: Ready to flip traffic${NC}"
echo "This will switch production from $LIVE_COLOR (port $LIVE_PORT) to $IDLE_COLOR (port $IDLE_PORT)"
read -p "Proceed with traffic flip? (y/N): " FLIP

if [ "$FLIP" != "y" ]; then
    echo "Traffic flip cancelled. $IDLE_COLOR is ready but not live."
    echo "To flip manually later, run:"
    echo "  sed -i 's/127.0.0.1:$LIVE_PORT/127.0.0.1:$IDLE_PORT/g' $NGINX_CONFIG"
    echo "  nginx -t && systemctl reload nginx"
    exit 0
fi

# Backup Nginx config
cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

# Update Nginx
sed -i "s/127.0.0.1:$LIVE_PORT/127.0.0.1:$IDLE_PORT/g" "$NGINX_CONFIG"

# Test and reload Nginx
if nginx -t 2>/dev/null; then
    systemctl reload nginx
    echo -e "${GREEN}Traffic flipped to $IDLE_COLOR${NC}"
else
    echo -e "${RED}Nginx config test failed, restoring backup${NC}"
    cp "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)" "$NGINX_CONFIG"
    exit 1
fi
echo ""

# Step 8: Verify production
echo -e "${YELLOW}Step 8: Verifying production...${NC}"
sleep 3

PUBLIC_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://propspredictions.com/ || echo "000")

if [ "$PUBLIC_HEALTH" = "200" ]; then
    echo -e "${GREEN}Production health check passed (HTTP $PUBLIC_HEALTH)${NC}"
else
    echo -e "${RED}Production health check failed (HTTP $PUBLIC_HEALTH)${NC}"
fi
echo ""

# Summary
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo "Previous live: $LIVE_COLOR (port $LIVE_PORT)"
echo "New live: $IDLE_COLOR (port $IDLE_PORT)"
echo "Docker image: $DOCKER_IMAGE"
echo "Database backup: $BACKUP_FILE"
echo ""
echo "Old $LIVE_COLOR container is still running for rollback if needed."
echo ""
echo "To rollback, run:"
echo "  sed -i 's/127.0.0.1:$IDLE_PORT/127.0.0.1:$LIVE_PORT/g' $NGINX_CONFIG"
echo "  nginx -t && systemctl reload nginx"
echo ""
