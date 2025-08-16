#!/bin/bash

# MongoDB Backup Script for TaskFlow
# This script creates backups of the MongoDB database

set -e  # Exit on error

# Configuration
BACKUP_DIR="/backups/mongodb"
CONTAINER_NAME="taskflow-mongodb"
ENV_FILE=".env.production"
MAX_BACKUPS=30  # Keep last 30 backups

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "ℹ $1"
}

# Load environment variables
load_env() {
    if [ -f "$ENV_FILE" ]; then
        set -a
        source "$ENV_FILE"
        set +a
        print_success "Environment variables loaded"
    else
        print_error "Environment file $ENV_FILE not found"
        exit 1
    fi
}

# Create backup directory
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        print_success "Backup directory created: $BACKUP_DIR"
    fi
}

# Perform backup
perform_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="taskflow_backup_${timestamp}"
    local backup_path="${BACKUP_DIR}/${backup_name}"
    
    print_info "Starting backup: ${backup_name}"
    
    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        print_error "MongoDB container '${CONTAINER_NAME}' is not running"
        exit 1
    fi
    
    # Perform mongodump
    docker exec "${CONTAINER_NAME}" mongodump \
        --username="${MONGO_ROOT_USERNAME:-admin}" \
        --password="${MONGO_ROOT_PASSWORD}" \
        --authenticationDatabase=admin \
        --db=TaskFlowDb \
        --archive="/tmp/${backup_name}.archive" \
        --gzip
    
    # Copy backup from container
    docker cp "${CONTAINER_NAME}:/tmp/${backup_name}.archive" "${backup_path}.archive"
    
    # Remove backup from container
    docker exec "${CONTAINER_NAME}" rm "/tmp/${backup_name}.archive"
    
    # Create metadata file
    cat > "${backup_path}.meta" <<EOF
Backup Date: $(date)
Database: TaskFlowDb
Container: ${CONTAINER_NAME}
Size: $(du -h "${backup_path}.archive" | cut -f1)
EOF
    
    print_success "Backup completed: ${backup_path}.archive"
    
    # Return backup path for other operations
    echo "${backup_path}.archive"
}

# Restore from backup
restore_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        print_error "Please specify a backup file to restore"
        list_backups
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_warning "This will restore the database from: $backup_file"
    print_warning "Current database data will be OVERWRITTEN!"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_info "Restore cancelled"
        exit 0
    fi
    
    print_info "Starting restore..."
    
    # Copy backup to container
    docker cp "$backup_file" "${CONTAINER_NAME}:/tmp/restore.archive"
    
    # Perform mongorestore
    docker exec "${CONTAINER_NAME}" mongorestore \
        --username="${MONGO_ROOT_USERNAME:-admin}" \
        --password="${MONGO_ROOT_PASSWORD}" \
        --authenticationDatabase=admin \
        --archive="/tmp/restore.archive" \
        --gzip \
        --drop
    
    # Remove backup from container
    docker exec "${CONTAINER_NAME}" rm "/tmp/restore.archive"
    
    print_success "Database restored successfully"
}

# List available backups
list_backups() {
    print_info "Available backups:"
    if [ -d "$BACKUP_DIR" ]; then
        ls -lh "$BACKUP_DIR"/*.archive 2>/dev/null | tail -n 20 || print_warning "No backups found"
    else
        print_warning "Backup directory does not exist"
    fi
}

# Clean old backups
cleanup_old_backups() {
    print_info "Cleaning old backups (keeping last $MAX_BACKUPS)..."
    
    if [ -d "$BACKUP_DIR" ]; then
        # Count backups
        backup_count=$(ls -1 "$BACKUP_DIR"/*.archive 2>/dev/null | wc -l)
        
        if [ "$backup_count" -gt "$MAX_BACKUPS" ]; then
            # Calculate how many to delete
            delete_count=$((backup_count - MAX_BACKUPS))
            
            # Delete oldest backups
            ls -1t "$BACKUP_DIR"/*.archive | tail -n "$delete_count" | while read file; do
                rm "$file"
                rm -f "${file%.archive}.meta"  # Remove metadata file too
                print_info "Deleted old backup: $(basename $file)"
            done
            
            print_success "Cleanup completed"
        else
            print_info "No cleanup needed ($backup_count backups, max: $MAX_BACKUPS)"
        fi
    fi
}

# Automated backup with cleanup
automated_backup() {
    load_env
    create_backup_dir
    backup_file=$(perform_backup)
    cleanup_old_backups
    
    # Log to syslog if available
    if command -v logger &> /dev/null; then
        logger -t taskflow-backup "Backup completed: $backup_file"
    fi
}

# Verify backup
verify_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        print_error "Please specify a backup file to verify"
        list_backups
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_info "Verifying backup: $backup_file"
    
    # Copy backup to container
    docker cp "$backup_file" "${CONTAINER_NAME}:/tmp/verify.archive"
    
    # Try to list collections in the backup
    docker exec "${CONTAINER_NAME}" bash -c "
        mongorestore \
            --username='${MONGO_ROOT_USERNAME:-admin}' \
            --password='${MONGO_ROOT_PASSWORD}' \
            --authenticationDatabase=admin \
            --archive='/tmp/verify.archive' \
            --gzip \
            --dryRun 2>&1 | grep 'collection' | head -10
    "
    
    # Remove backup from container
    docker exec "${CONTAINER_NAME}" rm "/tmp/verify.archive"
    
    print_success "Backup appears to be valid"
}

# Show menu
show_menu() {
    echo ""
    echo "TaskFlow MongoDB Backup Manager"
    echo "================================"
    echo "1. Perform backup now"
    echo "2. Restore from backup"
    echo "3. List available backups"
    echo "4. Verify backup integrity"
    echo "5. Clean old backups"
    echo "6. Setup automated backups (cron)"
    echo "7. Exit"
    echo ""
    read -p "Choose an option: " choice
}

# Setup cron job for automated backups
setup_cron() {
    print_info "Setting up automated backups..."
    
    # Get current script path
    script_path="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
    
    # Create cron entry (daily at 2 AM)
    cron_entry="0 2 * * * $script_path --auto >> /var/log/taskflow-backup.log 2>&1"
    
    # Check if cron entry already exists
    if crontab -l 2>/dev/null | grep -q "taskflow-backup"; then
        print_warning "Cron job already exists"
    else
        # Add cron entry
        (crontab -l 2>/dev/null; echo "$cron_entry") | crontab -
        print_success "Cron job added for daily backups at 2 AM"
        print_info "Logs will be written to: /var/log/taskflow-backup.log"
    fi
}

# Main execution
main() {
    if [ "$1" == "--auto" ]; then
        # Automated mode for cron
        automated_backup
    else
        # Interactive mode
        load_env
        
        while true; do
            show_menu
            case $choice in
                1)
                    create_backup_dir
                    perform_backup
                    ;;
                2)
                    read -p "Enter backup file path: " backup_file
                    restore_backup "$backup_file"
                    ;;
                3)
                    list_backups
                    ;;
                4)
                    read -p "Enter backup file path: " backup_file
                    verify_backup "$backup_file"
                    ;;
                5)
                    cleanup_old_backups
                    ;;
                6)
                    setup_cron
                    ;;
                7)
                    print_info "Exiting..."
                    exit 0
                    ;;
                *)
                    print_error "Invalid option"
                    ;;
            esac
        done
    fi
}

# Run main function
main "$@"