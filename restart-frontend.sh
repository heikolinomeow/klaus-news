#!/bin/bash
# Quick restart script for frontend container

echo "Restarting frontend container..."

# Try docker-compose first
if docker-compose restart frontend 2>/dev/null; then
    echo "✓ Frontend restarted via docker-compose"
    exit 0
fi

# Fallback to docker CLI
if docker restart $(docker ps -q -f name=frontend) 2>/dev/null; then
    echo "✓ Frontend restarted via docker CLI"
    exit 0
fi

# If both fail, show helpful message
echo "❌ Could not restart frontend automatically."
echo "Please restart the 'frontend' container from Docker Desktop UI"
echo "or run: docker restart <frontend-container-id>"
