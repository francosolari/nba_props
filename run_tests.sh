#!/bin/bash
# Fast test runner for nba_predictions
#
# Usage:
#   ./run_tests.sh                      # All backend tests (no coverage)
#   ./run_tests.sh --cov                # All backend tests with coverage
#   ./run_tests.sh backend/accounts     # Specific directory
#   ./run_tests.sh -k "test_leaderboard" # Filter by name
#   ./run_tests.sh --frontend           # Frontend tests only
#   ./run_tests.sh --all                # Backend + frontend

set -e
cd "$(dirname "$0")"

if [[ "$1" == "--frontend" ]]; then
    shift
    exec npx jest --ci "$@"
fi

if [[ "$1" == "--all" ]]; then
    shift
    echo "=== Backend ==="
    venv/bin/pytest --override-ini="addopts=--reuse-db --strict-markers -p no:warnings" --tb=short -q "$@"
    echo ""
    echo "=== Frontend ==="
    npx jest --ci --no-coverage
    exit $?
fi

if [[ "$1" == "--cov" ]]; then
    shift
    exec venv/bin/pytest --tb=short -q "$@"
fi

# Default: fast run, no coverage
exec venv/bin/pytest --override-ini="addopts=--reuse-db --strict-markers -p no:warnings" --tb=short -q "$@"
