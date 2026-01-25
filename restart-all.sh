#!/bin/bash
# Unified restart script - restarts everything to pick up all changes

echo "🔄 Restarting Klaus News - Full Stack"
echo "========================================"

# Stop all services
echo ""
echo "⏹️  Stopping all services..."
docker-compose down

# Rebuild frontend (to pick up CSS/code changes)
echo ""
echo "🔨 Rebuilding frontend..."
docker-compose build frontend

# Rebuild backend (if needed)
echo ""
echo "🔨 Rebuilding backend..."
docker-compose build backend

# Start everything
echo ""
echo "▶️  Starting all services..."
docker-compose up -d

# Wait a moment for services to start
sleep 3

# Show status
echo ""
echo "✅ All services restarted!"
echo ""
docker-compose ps

echo ""
echo "🌐 Application available at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
