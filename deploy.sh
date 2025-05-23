#!/bin/bash
set -e

# Configuration
APP_DIR="/opt/TaskMinder"
REPO_URL="https://github.com/Codylon-Studios/taskminder.git"
BRANCH="main"

echo "Starting deployment process..."

# Ensure running as correct user
if [ ! -w "$APP_DIR" ]; then
  echo "Error: No write permission to $APP_DIR. Run as a user with appropriate permissions."
  exit 1
fi

# Navigate to application directory
cd "$APP_DIR"

# Pull latest changes
if [ -d ".git" ]; then
  echo "Git repository exists, pulling latest changes..."
  git fetch origin
  git reset --hard origin/"$BRANCH"
else
  echo "Cloning repository..."
  git clone -b "$BRANCH" "$REPO_URL" .
fi

# Check for docker-compose file
if [ ! -f "docker-compose.yml" ]; then
  echo "Error: docker-compose.yml not found."
  exit 1
fi

# Build and restart Docker containers
echo "Building and restarting Docker containers..."
docker compose down
docker compose pull
docker compose build
docker compose up -d

echo "Deployment completed successfully!"
