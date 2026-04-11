#!/bin/sh
set -e

# ==============================================================================
# ----- Load Docker Secrets into Environment Variables -----
# ==============================================================================
DB_USER="$(cat /run/secrets/db_user)"
export DB_USER

DB_PASSWORD="$(cat /run/secrets/db_password)"
export DB_PASSWORD

DB_NAME="$(cat /run/secrets/db_name)"
export DB_NAME

DB_HOST="$(cat /run/secrets/db_host)"
export DB_HOST

REDIS_PORT="$(cat /run/secrets/redis_port)"
export REDIS_PORT

SESSION_SECRET="$(cat /run/secrets/session_secret)"
export SESSION_SECRET

DATABASE_URL="$(cat /run/secrets/database_url)"
export DATABASE_URL

ENCRYPTION_KEY="$(cat /run/secrets/encryption_key)"
export ENCRYPTION_KEY

ENCRYPTION_KEY_SECONDARY="$(cat /run/secrets/encryption_key_secondary)"
export ENCRYPTION_KEY_SECONDARY

ENCRYPTION_KEY_LOOKUP="$(cat /run/secrets/encryption_key_lookup)"
export ENCRYPTION_KEY_LOOKUP

PROXY_HOP="$(cat /run/secrets/proxy_hop)"
export PROXY_HOP

# ==============================================================================
# Ensure permissions for data are returned to bun user
# ==============================================================================
echo "Returning data directory permissions to bun..."
chown -R bun:bun /usr/src/app/data

# ==============================================================================
# Ensure permissions for ClamAV directories
# ==============================================================================
echo "Returning ClamAV directory permissions to clamav..."
chown -R clamav:clamav /var/lib/clamav /run/clamav

# ==============================================================================
# Run DB Migrations (as bun)
# ==============================================================================
echo "Running database migrations..."
su-exec bun:bun bunx prisma migrate deploy

# ==============================================================================
# One time migration cmd for server encryption (v2.2.5)
# Ignore if first time setting up server or your current version is >= v2.2.5
# ==============================================================================
# su-exec bun:bun bun run encrypt:migrate

# ==============================================================================
# Regular migration cmds for server encryption key rotation (>= v2.2.5)
# Ignore if first time setting up server or your current version is < v2.2.5
# ==============================================================================
# su-exec bun:bun bun run encrypt:rotate

# ======================================================================
# Update ClamDB (as clamav)
# ======================================================================
echo "Updating ClamAV virus database..."
su-exec clamav:clamav freshclam --foreground || echo "Warning: ClamAV database update failed."

# ======================================================================
# Start clamd (as clamav)
# ======================================================================
echo "Starting clamd..."
su-exec clamav:clamav clamd &

# Wait until clamd is ready
echo "Waiting for clamd to become ready..."
for i in $(seq 1 20); do
    if su-exec clamav:clamav clamdscan --version >/dev/null 2>&1; then
        echo "clamd is ready."
        break
    fi
    echo "Waiting... $i"
    sleep 1
done

# Check if clamd is actually ready after waiting
if ! su-exec clamav:clamav clamdscan --version >/dev/null 2>&1; then
    echo "Error: clamd failed to start within 20 seconds"
    exit 1
fi

# ======================================================================
# Flush Redis (as bun)
# ======================================================================
echo "Flushing Redis..."
su-exec bun:bun redis-cli -h redis FLUSHALL || echo "Redis flush failed"

echo "Initialization complete. Starting application as 'bun'..."

# ==============================================================================
# ----- Start the Main Application -----
# ==============================================================================
exec su-exec bun:bun "$@"