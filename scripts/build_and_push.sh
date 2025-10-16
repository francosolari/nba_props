#!/bin/bash
# Build and Push Docker Image Script
# Automatically increments version and builds for linux/amd64

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_USERNAME="fsolaric"
IMAGE_NAME="nba_props_web"
VERSION_FILE=".docker-version"

echo -e "${BLUE}=== Docker Build and Push Script ===${NC}\n"

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "${YELLOW}Current branch: $CURRENT_BRANCH${NC}\n"

# Get current version or start at v1.0.0
if [ -f "$VERSION_FILE" ]; then
    CURRENT_VERSION=$(cat "$VERSION_FILE")
    echo -e "${YELLOW}Current version: $CURRENT_VERSION${NC}"
else
    CURRENT_VERSION="v1.2.5"
    echo -e "${YELLOW}No version file found, starting at: $CURRENT_VERSION${NC}"
fi

# Parse version (remove 'v' prefix)
VERSION_NUMBER="${CURRENT_VERSION#v}"
IFS='.' read -r -a VERSION_PARTS <<< "$VERSION_NUMBER"

MAJOR="${VERSION_PARTS[0]}"
MINOR="${VERSION_PARTS[1]}"
PATCH="${VERSION_PARTS[2]}"

# Increment patch version
PATCH=$((PATCH + 1))
NEW_VERSION="v${MAJOR}.${MINOR}.${PATCH}"

echo -e "${GREEN}New version: $NEW_VERSION${NC}\n"

# Save new version to file
echo "$NEW_VERSION" > "$VERSION_FILE"
echo -e "${GREEN}✓ Version saved to $VERSION_FILE${NC}\n"

# Confirm
read -p "Commit version file, push, and build $DOCKER_USERNAME/$IMAGE_NAME:$NEW_VERSION? (y/N): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    echo "Cancelled"
    # Revert version file
    echo "$CURRENT_VERSION" > "$VERSION_FILE"
    exit 0
fi

# Commit and push the version file
echo -e "\n${YELLOW}Step 0: Committing and pushing version file...${NC}"
git add "$VERSION_FILE"
git commit -m "Bump version to $NEW_VERSION" || echo "No changes to commit"
git push origin "$CURRENT_BRANCH"
echo -e "${GREEN}✓ Version file pushed to remote${NC}"

echo -e "\n${YELLOW}Step 1: SSH to server and pull latest code...${NC}"
ssh root@134.209.213.185 << 'ENDSSH'
cd /var/www/nba_props
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
echo "Pulling latest code from branch: $CURRENT_BRANCH"
git pull origin "$CURRENT_BRANCH"
echo "✓ Code updated on server"
ENDSSH
echo -e "${GREEN}✓ Server code updated${NC}"

echo -e "\n${YELLOW}Step 2: Building frontend with npm...${NC}"
npm run build
echo -e "${GREEN}✓ Frontend built successfully${NC}"

echo -e "\n${YELLOW}Step 3: Building Docker image for linux/amd64...${NC}"

# Check if buildx is available
if docker buildx version &> /dev/null; then
    # Use buildx for multi-platform build
    echo "Using docker buildx..."

    # Create builder if it doesn't exist
    if ! docker buildx inspect mybuilder &> /dev/null; then
        echo "Creating buildx builder..."
        docker buildx create --name mybuilder --use
        docker buildx inspect --bootstrap
    else
        docker buildx use mybuilder
    fi

    # Build and push in one command
    docker buildx build \
        --platform linux/amd64 \
        -t $DOCKER_USERNAME/$IMAGE_NAME:$NEW_VERSION \
        -t $DOCKER_USERNAME/$IMAGE_NAME:latest \
        --push \
        .

    echo -e "${GREEN}✓ Built and pushed successfully using buildx${NC}"
else
    # Fallback to traditional build
    echo "Using traditional docker build..."
    docker build --platform linux/amd64 -t $DOCKER_USERNAME/$IMAGE_NAME:$NEW_VERSION .
    docker tag $DOCKER_USERNAME/$IMAGE_NAME:$NEW_VERSION $DOCKER_USERNAME/$IMAGE_NAME:latest

    echo -e "\n${YELLOW}Step 3: Pushing to Docker Hub...${NC}"
    docker push $DOCKER_USERNAME/$IMAGE_NAME:$NEW_VERSION
    docker push $DOCKER_USERNAME/$IMAGE_NAME:latest

    echo -e "${GREEN}✓ Built and pushed successfully${NC}"
fi

echo -e "\n${BLUE}=== Build Complete ===${NC}"
echo -e "Image: ${GREEN}$DOCKER_USERNAME/$IMAGE_NAME:$NEW_VERSION${NC}"
echo -e "Also tagged as: ${GREEN}$DOCKER_USERNAME/$IMAGE_NAME:latest${NC}\n"

echo -e "${YELLOW}To deploy to your server, run:${NC}"
echo -e "${BLUE}ssh root@134.209.213.185${NC}"
echo -e "${BLUE}cd /var/www/nba_props${NC}"
echo -e "${BLUE}bash scripts/blue_green_deploy.sh $DOCKER_USERNAME/$IMAGE_NAME:$NEW_VERSION${NC}\n"

# Option to automatically deploy
read -p "Deploy to server now? (y/N): " DEPLOY
if [ "$DEPLOY" = "y" ]; then
    echo -e "\n${YELLOW}Deploying to server...${NC}"
    ssh root@134.209.213.185 "cd /var/www/nba_props && bash scripts/blue_green_deploy.sh $DOCKER_USERNAME/$IMAGE_NAME:$NEW_VERSION"
fi
