#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./restore_db.sh <backup_file.sql>"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "⚠ WARNING: This will overwrite all current data. Continue? (y/N)"
read -r response
if [[ ! "$response" =~ ^[Yy]$ ]]; then
  echo "Restore cancelled."
  exit 0
fi

echo "Stopping containers..."
docker-compose stop backend frontend

echo "Restoring database from ${BACKUP_FILE}..."
docker-compose exec -T postgres psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS klaus_news;"
docker-compose exec -T postgres psql -U postgres -d postgres -c "CREATE DATABASE klaus_news;"
docker-compose exec -T postgres psql -U postgres klaus_news < "${BACKUP_FILE}"

echo "✓ Database restored successfully"
echo "Restarting containers..."
docker-compose up -d
