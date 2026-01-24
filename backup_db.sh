#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
BACKUP_FILE="${BACKUP_DIR}/klaus_news_backup_${TIMESTAMP}.sql"

mkdir -p "${BACKUP_DIR}"

echo "Starting database backup..."

docker-compose exec -T postgres pg_dump -U postgres klaus_news > "${BACKUP_FILE}"

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "✓ Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"
