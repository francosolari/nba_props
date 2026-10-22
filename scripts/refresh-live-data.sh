#!/usr/bin/env bash
#
# refresh-live-data.sh -- pull standings and player stats from NBA.com into the
# PRODUCTION database, then regrade.
#
# NBA.com blocks the server, and production Postgres no longer accepts direct
# connections, so this runs from a home machine through an SSH tunnel. Safe to
# run from cron/launchd: it opens the tunnel if needed and closes what it opened.
#
#   bash scripts/refresh-live-data.sh [season-slug]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PY="$ROOT/venv/bin/python"
[[ -x "$PY" ]] || PY="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")/venv/bin/python"
PORT="${NBA_TUNNEL_PORT:-15432}"
PROD_SSH="${NBA_PROD_SSH:-root@134.209.213.185}"

if ! nc -z 127.0.0.1 "$PORT" 2>/dev/null; then
  ssh -f -N -o ExitOnForwardFailure=yes -o BatchMode=yes -L "$PORT:127.0.0.1:5432" "$PROD_SSH"
  trap 'pkill -f "ssh -f -N -o ExitOnForwardFailure=yes -o BatchMode=yes -L $PORT:" || true' EXIT
fi
export DATABASE_HOST=127.0.0.1 DATABASE_PORT="$PORT"

manage() { "$PY" backend/manage.py "$@"; }

SEASON="${1:-$(manage shell -c "from predictions.models import Season; print(Season.objects.order_by('-start_date').first().slug)" 2>/dev/null | tail -1)}"
echo "$(date '+%F %T') refreshing $SEASON"

manage update_season_standings "$SEASON"
manage update_player_stat_answers "$SEASON"
manage grade_standing_predictions "$SEASON"
manage grade_props_answers "$SEASON"
echo "$(date '+%F %T') done"
