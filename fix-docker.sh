#!/bin/bash
# Fix Docker Desktop connection issues on macOS

echo "Fixing Docker Desktop connection..."

# Kill Docker Desktop
killall Docker

# Wait a moment
sleep 2

# Restart Docker Desktop
open -a Docker

echo "Docker Desktop restarting... wait 30 seconds then your containers should be back up."
echo "Then visit http://localhost:5173 to see your changes."
