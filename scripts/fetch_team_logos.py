#!/usr/bin/env python
"""Download every team's primary logo as SVG from the NBA CDN.

The logo directory was a mix of SVG and PNG, which meant TeamLogo had to guess
an extension and ate a 404 per team whenever it guessed wrong. Fetching one
format for all thirty removes the guess entirely.

Team ids come from nba_api's bundled static list, and slugs are derived the same
way `resolveTeamLogoSlug` derives them in the frontend, so the files land on the
names the component already asks for.

These are the league's trademarked marks, used here the same way the app already
used them; this script only changes their file format.

    venv/bin/python scripts/fetch_team_logos.py [--dry-run]
"""

import argparse
import re
import subprocess
import sys
from pathlib import Path

from nba_api.stats.static import teams as nba_teams

TEAM_DIR = Path(__file__).resolve().parent.parent / "frontend" / "static" / "img" / "teams"
CDN = "https://cdn.nba.com/logos/nba/{team_id}/primary/L/logo.svg"
# Mirrors TEAM_LOGO_SLUG_OVERRIDES in frontend/src/components/TeamLogo.jsx.
SLUG_OVERRIDES = {"los-angeles-clippers": "la-clippers"}


def slugify(name):
    """Match the frontend's slug exactly, override included."""
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower().replace("&", "and")).strip("-")
    return SLUG_OVERRIDES.get(slug, slug)


def fetch(url):
    """Fetch with curl, under curl's own User-Agent.

    The CDN rejects an unfamiliar User-Agent — with a custom one it stalls or
    returns an HTTP/2 stream error on every request, which is also why urllib
    fails here. Leave the header alone and it serves normally.
    """
    result = subprocess.run(
        ["curl", "-sS", "--fail", "--max-time", "20", url],
        capture_output=True,
        check=True,
    )
    return result.stdout


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Report what would change, write nothing.")
    args = parser.parse_args()

    TEAM_DIR.mkdir(parents=True, exist_ok=True)
    written, skipped, failed = [], [], []

    for team in sorted(nba_teams.get_teams(), key=lambda t: t["full_name"]):
        slug = slugify(team["full_name"])
        target = TEAM_DIR / f"{slug}.svg"
        try:
            payload = fetch(CDN.format(team_id=team["id"]))
        except Exception as error:  # noqa: BLE001 - report and continue the run
            failed.append((slug, error))
            continue

        if not payload.lstrip().startswith(b"<svg") and b"<svg" not in payload[:400]:
            failed.append((slug, "response was not SVG"))
            continue

        if target.exists() and target.read_bytes() == payload:
            skipped.append(slug)
            continue

        if not args.dry_run:
            target.write_bytes(payload)
        written.append((slug, len(payload)))
        print(f"{'would write' if args.dry_run else 'wrote'} {slug}.svg ({len(payload):,}b)", flush=True)

    if skipped:
        print(f"unchanged: {len(skipped)}")
    for slug, error in failed:
        print(f"FAILED {slug}: {error}", file=sys.stderr)

    print(f"\n{len(written)} written, {len(skipped)} unchanged, {len(failed)} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
