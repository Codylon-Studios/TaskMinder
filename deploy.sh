#!/bin/bash
set -e

# Ensure script runs as root
if [ "$(id -u)" -ne 0 ]; then
  echo "Switching to root user..."
  exec sudo su -c "$0"
fi

# Configuration
APP_DIR="/home/TaskMinder"
REPO_URL="https://github.com/Codylon-Studios/taskminder.git"
BRANCH="main"

echo "Starting deployment process..."

# Navigate to application directory
cd $APP_DIR

# Pull latest changes
if [ -d ".git" ]; then
  echo "Git repository exists, pulling latest changes..."
  git pull origin $BRANCH
else
  echo "Cloning repository..."
  git clone -b $BRANCH $REPO_URL .
fi

# Build and restart Docker containers
echo "Building and restarting Docker containers..."
docker compose down
docker compose pull
docker compose build
docker compose up -d

echo "Deployment completed successfully!"