#!/bin/sh
set -e

# ==============================================================================
# ----- Load Docker Secrets into Environment Variables -----
# ==============================================================================
export DB_USER=$(cat /run/secrets/db_user)
export DB_PASSWORD=$(cat /run/secrets/db_password)
export DB_NAME=$(cat /run/secrets/db_name)
export DB_HOST=$(cat /run/secrets/db_host)
export REDIS_PORT=$(cat /run/secrets/redis_port)
export SESSION_SECRET=$(cat /run/secrets/session_secret)
export CLASSCODE=$(cat /run/secrets/classcode)
export DSB_USER=$(cat /run/secrets/dsb_user)
export DSB_PASSWORD=$(cat /run/secrets/dsb_password)
export DSB_ACTIVATED=$(cat /run/secrets/dsb_activated)
export UNSAFE_DEACTIVATE_CSP=$(cat /run/secrets/unsafe_deactivate_csp)
export DATABASE_URL=$(cat /run/secrets/database_url)

# ==============================================================================
# ----- Run One-Time Initialization Tasks -----
# ==============================================================================
echo "Running database migrations..."
bunx prisma migrate deploy

echo "Flushing Redis..."
redis-cli -h redis FLUSHALL

echo "Initialization complete. Starting application..."

# ==============================================================================
# ----- Start the Main Application -----
# ==============================================================================
exec "$@"