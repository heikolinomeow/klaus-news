#!/bin/bash
# Rebuild and restart frontend container to pick up CSS changes

echo "Rebuilding frontend container with new CSS..."

docker-compose build frontend
docker-compose up -d frontend

echo "✓ Frontend rebuilt and restarted."
echo "Visit http://localhost:3000/settings/system to see changes."
