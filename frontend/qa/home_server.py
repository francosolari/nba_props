"""Serve both home-page states with deterministic local QA fixtures."""

import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


FRONTEND_DIR = Path(__file__).resolve().parents[1]
STATIC_DIR = FRONTEND_DIR / "static"
PORT = 8002

LEADERBOARD = {
    "leaderboard": [
        {"rank": 1, "id": 201, "username": "will-k", "display_name": "Will K", "total_points": 184, "categories": {}},
        {"rank": 2, "id": 202, "username": "mike-r", "display_name": "Mike R", "total_points": 176, "categories": {}},
        {
            "rank": 3, "id": 101, "username": "jordan-qa", "display_name": "Jordan", "total_points": 168,
            "categories": {
                "Regular Season Standings": {"points": 72, "max_points": 120},
                "Player Awards": {"points": 48, "max_points": 80},
                "Props & Yes/No": {"points": 48, "max_points": 75},
            },
        },
        {"rank": 4, "id": 203, "username": "nick-a", "display_name": "Nick A", "total_points": 161, "categories": {}},
        {"rank": 5, "id": 204, "username": "danny-h", "display_name": "Danny H", "total_points": 154, "categories": {}},
    ],
    "season": {"slug": "2026-27"},
}

HOMEPAGE = {
    "mini_standings": {
        "eastern": [
            {"position": 1, "team": "Boston Celtics", "wins": 58, "losses": 24},
            {"position": 2, "team": "New York Knicks", "wins": 52, "losses": 30},
            {"position": 3, "team": "Milwaukee Bucks", "wins": 49, "losses": 33},
            {"position": 4, "team": "Cleveland Cavaliers", "wins": 48, "losses": 34},
        ],
        "western": [
            {"position": 1, "team": "Oklahoma City Thunder", "wins": 60, "losses": 22},
            {"position": 2, "team": "Denver Nuggets", "wins": 56, "losses": 26},
            {"position": 3, "team": "Minnesota Timberwolves", "wins": 53, "losses": 29},
            {"position": 4, "team": "Dallas Mavericks", "wins": 50, "losses": 32},
        ],
    }
}

QUESTIONS = {
    "questions": [
        {"id": 1, "question_type": "superlative"},
        {"id": 2, "question_type": "superlative"},
        {"id": 3, "question_type": "prop"},
        {"id": 4, "question_type": "prop"},
        {"id": 5, "question_type": "prop"},
        {"id": 6, "question_type": "ist"},
    ]
}


class HomeQAHandler(BaseHTTPRequestHandler):
    """Return the home shell, built assets, and stable API fixtures."""

    def do_GET(self):
        """Handle requests made while rendering both home states."""
        path = self.path.split("?", maxsplit=1)[0]
        responses = {
            "/api/v2/leaderboards/2026-27": LEADERBOARD,
            "/api/v2/homepage/data": HOMEPAGE,
            "/api/v2/submissions/questions/2026-27": QUESTIONS,
            "/api/v2/submissions/standings/2026-27": {
                "east": [{"team_name": "Boston Celtics", "predicted_position": 1}],
                "west": [{"team_name": "Oklahoma City Thunder", "predicted_position": 1}],
            },
            "/api/v2/submissions/answers/2026-27": {
                "answers": [{"question_id": 1}, {"question_id": 2}, {"question_id": 3}, {"question_id": 4}],
            },
            "/api/v2/user/context": {"username": "jordan-qa", "is_admin": False, "is_authenticated": True},
        }
        if path in responses:
            self._send(json.dumps(responses[path]).encode(), "application/json")
            return
        if path in {"/", "/qa-home.html"}:
            self._send((Path(__file__).parent / "home.html").read_bytes(), "text/html")
            return
        if path.startswith("/static/"):
            asset = STATIC_DIR / path.removeprefix("/static/")
            if asset.is_file() and STATIC_DIR in asset.resolve().parents:
                content_type = mimetypes.guess_type(asset.name)[0] or "application/octet-stream"
                self._send(asset.read_bytes(), content_type)
                return
        self.send_error(404)

    def _send(self, content, content_type):
        """Send a successful response with an explicit content type."""
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)


if __name__ == "__main__":
    print(f"Home UI QA: http://127.0.0.1:{PORT}/qa-home.html")
    print(f"Authenticated: http://127.0.0.1:{PORT}/qa-home.html?state=auth")
    ThreadingHTTPServer(("127.0.0.1", PORT), HomeQAHandler).serve_forever()
