#!/usr/bin/env bash
set -euo pipefail

# Function to kill process on a specific port
kill_port() {
  local port=$1
  echo "Checking for processes on port $port..."

  # Find and kill process on the port (macOS/Linux compatible)
  if lsof -ti:$port > /dev/null 2>&1; then
    echo "Killing process on port $port..."
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    echo "Port $port cleared."
  else
    echo "No process found on port $port."
  fi
}

# Kill Django (port 8000) and Webpack (port 8080)
kill_port 8000
kill_port 8080

echo ""
echo "Starting dev servers..."
echo ""

# Run the dev script
bash ./scripts/dev.sh
