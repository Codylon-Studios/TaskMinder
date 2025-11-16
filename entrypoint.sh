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

UNSAFE_DEACTIVATE_CSP="$(cat /run/secrets/unsafe_deactivate_csp)"
export UNSAFE_DEACTIVATE_CSP

DATABASE_URL="$(cat /run/secrets/database_url)"
export DATABASE_URL

# ==============================================================================
# ----- One time v2 deployment cmds -----
# ==============================================================================
# PGPASSWORD="$DB_PASSWORD" psql -X -U "$DB_USER" "$DB_NAME" < /usr/src/app/backend/src/prisma/seed.sql
# bunx prisma migrate resolve --applied 0_init

# ==============================================================================
# ----- Run Initialization Tasks -----
# ==============================================================================
echo "Running database migrations..."
bunx prisma migrate deploy

# ==============================================================================
# ----- One time v2 migration cmds -----
# ==============================================================================

# bunx prisma migrate resolve --applied 0_init
# bunx prisma migrate resolve --applied 20250804114621_migrate_to_multiple_classes

# Update ClamAV virus database
echo "Updating ClamAV virus database..."
freshclam --foreground=true || echo "Warning: ClamAV database update failed."

# ==============================================================================
# ----- Start ClamAV daemon -----
# ==============================================================================
echo "Starting clamd..."
clamd &

# Wait until clamd is ready
echo "Waiting for clamd to become ready..."
for i in $(seq 1 20); do
    if clamdscan --version >/dev/null 2>&1; then
        echo "clamd is ready."
        break
    fi
    echo "Waiting... $i"
    sleep 1
done

echo "Flushing Redis..."
redis-cli -h redis FLUSHALL || echo "Redis flush failed"

echo "Initialization complete. Starting application as 'bun'..."

# ==============================================================================
# ----- Start the Main Application -----
# ==============================================================================
exec su -s /bin/sh bun -c "$*"