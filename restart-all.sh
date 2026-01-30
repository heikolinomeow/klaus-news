#!/bin/bash
# Nuclear restart script - completely resets and rebuilds everything
set -e  # Exit on any error

echo "🔄 Klaus News - Full Nuclear Reset"
echo "===================================="

# Stop and remove all containers
echo ""
echo "⏹️  Stopping and removing containers..."
docker-compose down --remove-orphans

# Remove old images to force complete rebuild
echo ""
echo "🗑️  Removing old images..."
docker rmi klaus-news-frontend klaus-news-backend 2>/dev/null || true

# Clear build cache for clean builds (keep 2GB of recent cache)
echo ""
echo "🧹 Clearing Docker build cache..."
docker buildx prune -f --reserved-space 2GB 2>/dev/null || true

# Rebuild frontend
echo ""
echo "🔨 Building frontend..."
if ! docker-compose build --no-cache frontend; then
    echo ""
    echo "❌ Frontend build FAILED!"
    echo "   Check the error above and fix before retrying."
    exit 1
fi

# Rebuild backend
echo ""
echo "🔨 Building backend..."
if ! docker-compose build --no-cache backend; then
    echo ""
    echo "❌ Backend build FAILED!"
    echo "   Check the error above and fix before retrying."
    exit 1
fi

# Start everything
echo ""
echo "▶️  Starting all services..."
docker-compose up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# Verify containers are running
echo ""
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Services failed to start!"
    docker-compose logs --tail=20
    exit 1
fi

# Show status
echo "✅ All services rebuilt and started successfully!"
echo ""
docker-compose ps

echo ""
echo "🌐 Application available at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "💡 If browser shows old content, hard refresh with Cmd+Shift+R"
