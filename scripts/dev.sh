#!/usr/bin/env bash
set -euo pipefail

# Start Django in background using the venv Python
venv/bin/python backend/manage.py runserver 127.0.0.1:8000 &
DJANGO_PID=$!

cleanup() {
  if kill -0 "$DJANGO_PID" 2>/dev/null; then
    kill "$DJANGO_PID" 2>/dev/null || true
  fi
}
trap cleanup INT TERM EXIT

# Start webpack-dev-server for HMR and live reload
./node_modules/.bin/webpack serve --config frontend/webpack.config.js
