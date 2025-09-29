#!/bin/bash

set -e

DOCKERCMD=/usr/bin/docker
BACKUP_DIR="/opt/TaskMinder/db-backups"
SECRETS_DIR="/opt/TaskMinder/docker_secrets"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%S-%3NZ")
TEMP_DIR="/opt/TaskMinder/tmp/pg_backup_$$"
MAX_BACKUPS=48  # Keep only the 48 most recent backups


log() {
    echo -e "INFO: $1"
}

error() {
    echo -e "ERROR: $1" >&2
    exit 1
}

# Create backup directory if it doesn't exist
create_backup_dir() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
        chmod 755 "$BACKUP_DIR"
    fi
}

# Read database credentials from Docker secrets files
read_db_credentials() {
    log "Reading database credentials from Docker secrets..."
    if [[ ! -d "$SECRETS_DIR" ]]; then
        error "Secrets directory not found: $SECRETS_DIR"
    fi

    if [[ -f "$SECRETS_DIR/db_name.txt" ]]; then
        POSTGRES_DB=$(tr -d '\n\r' < "$SECRETS_DIR/db_name.txt")
    else
        log "db_name.txt not found, using default: postgres"
        POSTGRES_DB="postgres"
    fi

    if [[ -f "$SECRETS_DIR/db_user.txt" ]]; then
        POSTGRES_USER=$(tr -d '\n\r' < "$SECRETS_DIR/db_user.txt")
    else
        log "db_user.txt not found, using default: postgres"
        POSTGRES_USER="postgres"
    fi

    if [[ -f "$SECRETS_DIR/db_password.txt" ]]; then
        POSTGRES_PASSWORD=$(tr -d '\n\r' < "$SECRETS_DIR/db_password.txt")
    else
        error "db_password.txt not found in $SECRETS_DIR"
    fi

    if [[ -z "$POSTGRES_DB" || -z "$POSTGRES_USER" || -z "$POSTGRES_PASSWORD" ]]; then
        error "Missing required database credentials"
    fi
}

# Create database backup
create_backup() {
    local container_id=$1
    local backup_file="$TEMP_DIR/backup_${TIMESTAMP}.sql"
    mkdir -p "$TEMP_DIR"

    export PGPASSWORD="$POSTGRES_PASSWORD"
    if ! "$DOCKERCMD" exec "$container_id" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$backup_file"; then
        unset PGPASSWORD
        error "Failed to create backup for database '$POSTGRES_DB'"
    fi
    unset PGPASSWORD

    echo "$backup_file"
}

# Compress backup function
compress_backup() {
    local backup_file=$1
    local compressed_file="${backup_file}.gz"

    if ! gzip -f "$backup_file"; then
        error "Failed to compress backup file: $backup_file"
    fi
    echo "$compressed_file"
}

# Move backup to final destination
move_backup() {
    local source_file=$1
    local final_file="$BACKUP_DIR/$(basename "$source_file")"

    if ! mv "$source_file" "$final_file"; then
        error "Failed to move backup to final destination"
    fi

    log "Backup stored at: $final_file"

    local file_size=$(du -h "$final_file" | cut -f1)
    log "Backup size: $file_size"
    echo "$final_file"
}

# Cleanup old backups - keep only the most recent MAX_BACKUPS files
cleanup_old_backups() {
    log "Checking for old backups to clean up..."
    # Use find with -maxdepth to avoid issues with subdirectories
    local backup_files_found=$(find "$BACKUP_DIR" -maxdepth 1 -name "backup_*.sql.gz" -type f)
    local backup_count=$(echo "$backup_files_found" | wc -l)

    if [[ $backup_count -le $MAX_BACKUPS ]]; then
        log "Found $backup_count backup files, no cleanup needed (max is $MAX_BACKUPS)."
        return 0
    fi

    log "Found $backup_count backups, cleaning up oldest to leave $MAX_BACKUPS."
    local files_to_delete=$((backup_count - MAX_BACKUPS))

    # This is a safe way to delete the oldest files
    ls -t "$BACKUP_DIR"/backup_*.sql.gz | tail -n "$files_to_delete" | while read -r file; do
        log "Deleting old backup: $(basename "$file")"
        rm -f "$file"
    done
}

# Cleanup temporary files
cleanup_temp() {
    if [[ -d "$TEMP_DIR" ]]; then
        log "Cleaning up temporary directory: $TEMP_DIR"
        rm -rf "$TEMP_DIR"
    fi
}

# Main execution
main() {
    log "Starting PostgreSQL Docker backup process..."

    read_db_credentials
    create_backup_dir

    log "Looking for PostgreSQL container..."
    CONTAINER_ID=$(docker ps --filter "name=taskminder-postgres" --format "{{.ID}}" | head -n 1)
    if [ -z "$CONTAINER_ID" ]; then
        error "No running PostgreSQL container found with name 'taskminder-postgres'!"
    fi
    log "Found container: $CONTAINER_ID"

    # Create the backup in a temp directory
    log "Creating temporary backup..."
    backup_file=$(create_backup "$CONTAINER_ID")
    log "Temporary backup created: $backup_file"

    # Compress the backup while it's still in the temp directory
    log "Compressing backup..."
    compressed_file=$(compress_backup "$backup_file")
    log "Backup compressed: $compressed_file"

    # Move the FINAL, COMPRESSED file to its destination
    log "Moving compressed backup to final destination..."
    final_file=$(move_backup "$compressed_file")

    # Cleanup old backups
    cleanup_old_backups

    log "Backup process completed successfully!"
}

# Trap to ensure temporary files are always cleaned up, even on error
trap cleanup_temp EXIT

main "$@"