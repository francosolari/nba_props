#!/usr/bin/env bash
set -euo pipefail

# Start Django using this checkout's virtualenv, or reuse the main worktree's
# ignored virtualenv when this checkout is a linked git worktree.
PYTHON_BIN="venv/bin/python"
if [[ ! -x "$PYTHON_BIN" ]]; then
  GIT_COMMON_DIR="$(git rev-parse --git-common-dir 2>/dev/null || true)"
  if [[ -n "$GIT_COMMON_DIR" ]]; then
    if [[ "$GIT_COMMON_DIR" != /* ]]; then
      GIT_COMMON_DIR="$(cd "$GIT_COMMON_DIR" && pwd)"
    fi
    MAIN_WORKTREE="$(dirname "$GIT_COMMON_DIR")"
    if [[ -x "$MAIN_WORKTREE/venv/bin/python" ]]; then
      PYTHON_BIN="$MAIN_WORKTREE/venv/bin/python"
    fi
  fi
fi

if [[ ! -x "$PYTHON_BIN" ]]; then
  echo "Unable to find venv/bin/python in this checkout or the main git worktree." >&2
  exit 1
fi

"$PYTHON_BIN" backend/manage.py runserver 127.0.0.1:8000 &
DJANGO_PID=$!

cleanup() {
  if kill -0 "$DJANGO_PID" 2>/dev/null; then
    kill "$DJANGO_PID" 2>/dev/null || true
  fi
}
trap cleanup INT TERM EXIT

# Start webpack-dev-server for HMR and live reload
if [[ -x "./node_modules/.bin/webpack" ]]; then
  WEBPACK_BIN="./node_modules/.bin/webpack"
elif [[ -x "./frontend/node_modules/.bin/webpack" ]]; then
  WEBPACK_BIN="./frontend/node_modules/.bin/webpack"
else
  echo "Webpack binary not found."
  echo "Run 'npm ci' from the repository root (nba_predictions)."
  exit 1
fi

"$WEBPACK_BIN" serve --config frontend/webpack.config.js
