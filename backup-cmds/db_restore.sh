#!/bin/bash
set -e


APP_BASE_DIR="opt/TaskMinder"
BACKUP_DIR="$APP_BASE_DIR/db-backups"
SECRETS_DIR="$APP_BASE_DIR/docker_secrets"
CONTAINER_NAME="taskminder-postgres"


log() { echo "INFO: $1"; }
error() { echo "ERROR: $1" >&2; exit 1; }



# Check for root privileges
if [ "$(id -u)" -ne 0 ]; then
  error "This script must be run with sudo (e.g., 'sudo sh ./db_restore.sh <backup-file>')"
fi


log "Reading database credentials from secrets..."
if [ ! -d "$SECRETS_DIR" ]; then
    error "Secrets directory not found: $SECRETS_DIR"
fi

if [[ -f "$SECRETS_DIR/db_name.txt" ]]; then
    DB_NAME=$(tr -d '\n\r' < "$SECRETS_DIR/db_name.txt")
    log "Database name found: $DB_NAME"
else
    log "db_name.txt not found, using default: postgres"
    DB_NAME="postgres"
fi

if [[ -f "$SECRETS_DIR/db_user.txt" ]]; then
    DB_USER=$(tr -d '\n\r' < "$SECRETS_DIR/db_user.txt")
    log "Database user found: $DB_USER"
else
    log "db_user.txt not found, using default: postgres"
    DB_USER="postgres"
fi

# Check if a backup filename was provided
if [ -z "$1" ]; then
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup_*.sql.gz | head -n 1)
    if [ -z "$LATEST_BACKUP" ]; then
        error "No backup file specified and no backups found in $BACKUP_DIR"
    fi
    BACKUP_FILE_PATH=$LATEST_BACKUP
    log "No backup file specified. Using the latest one found: $(basename "$LATEST_BACKUP")"
else
    BACKUP_FILENAME=$1
    BACKUP_FILE_PATH="$BACKUP_DIR/$BACKUP_FILENAME"
fi

# Check if the backup file actually exists
if [ ! -f "$BACKUP_FILE_PATH" ]; then
    error "Backup file not found at: $BACKUP_FILE_PATH"
fi

log "Starting restore for database '$DB_NAME' from '$(basename "$BACKUP_FILE_PATH")'..."

# Change ownership so the container can read the file
log "Setting ownership of backup file to 1000:1000 for Docker..."
chown 1000:1000 "$BACKUP_FILE_PATH"

# Copy the backup file into the container's /tmp directory
log "Copying backup file into the container..."
docker cp "$BACKUP_FILE_PATH" "$CONTAINER_NAME:/tmp/$(basename "$BACKUP_FILE_PATH")"

# Execute the restore inside the container and clean up
log "Terminating existing connections and restoring database..."
log "(This may take a while depending on database size...)"
docker exec "$CONTAINER_NAME" bash -c "
    set -e
    # Terminate all other connections to the target database
    psql -U \"$DB_USER\" -d postgres -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = E'\\\\''\$DB_NAME'\\\\'' AND pid <> pg_backend_pid();\"

    # Restore the database from the gzipped file
    gunzip < /tmp/$(basename "$BACKUP_FILE_PATH") | psql -U \"$DB_USER\" -d \"$DB_NAME\"

    # Remove the temporary backup file from inside the container
    rm /tmp/$(basename "$BACKUP_FILE_PATH")
"

log "Restore completed successfully!"