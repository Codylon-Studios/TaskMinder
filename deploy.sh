# Use this only for non-major version updates (e.g., `v1.1.0 → v1.2.3`). 
# For major version upgrades, please refer to the migration guides at https://docs.taskminder.de, as they may include breaking changes.
#!/bin/bash
set -e

# Configurations - check before execution!
DOCKERCMD=/usr/bin/docker
GITCMD=/usr/bin/git
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
  "$GITCMD" fetch origin
  "$GITCMD" reset --hard origin/"$BRANCH"
else
  echo "Cloning repository..."
  "$GITCMD" clone -b "$BRANCH" "$REPO_URL" .
fi

# Check for docker-compose file
if [ ! -f "compose.yaml" ]; then
  echo "Error: compose.yaml not found."
  exit 1
fi

# Build and restart Docker containers
echo "Building and restarting Docker containers..."
"DOCKERCMD" compose down
"DOCKERCMD" compose pull
"DOCKERCMD" compose build
"DOCKERCMD" compose up -d

echo "Deployment completed successfully!"
