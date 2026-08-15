"""Serve the built submissions UI with deterministic data for visual QA."""

import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


FRONTEND_DIR = Path(__file__).resolve().parents[1]
STATIC_DIR = FRONTEND_DIR / "static"
PORT = 8001

EAST_TEAM_NAMES = [
    "Boston Celtics", "New York Knicks", "Milwaukee Bucks", "Cleveland Cavaliers",
    "Orlando Magic", "Indiana Pacers", "Philadelphia 76ers", "Miami Heat",
    "Chicago Bulls", "Atlanta Hawks", "Brooklyn Nets", "Toronto Raptors",
    "Charlotte Hornets", "Detroit Pistons", "Washington Wizards",
]
WEST_TEAM_NAMES = [
    "Oklahoma City Thunder", "Denver Nuggets", "Minnesota Timberwolves",
    "Los Angeles Lakers", "LA Clippers", "Dallas Mavericks", "Phoenix Suns",
    "Golden State Warriors", "Sacramento Kings", "Memphis Grizzlies",
    "New Orleans Pelicans", "Houston Rockets", "San Antonio Spurs",
    "Utah Jazz", "Portland Trail Blazers",
]


def conference_teams(names, conference, starting_id):
    """Build stable team fixtures for the responsive standings board."""
    return [
        {"id": starting_id + index, "name": name, "conference": conference, "position": index + 1}
        for index, name in enumerate(names)
    ]


EAST_TEAMS = conference_teams(EAST_TEAM_NAMES, "East", 1)
WEST_TEAMS = conference_teams(WEST_TEAM_NAMES, "West", 101)

QUESTIONS = [
    {
        "id": 1, "text": "Who wins MVP?", "question_type": "superlative",
        "category": "superlative", "point_value": 10,
        "options": [{"id": 11, "option_text": "Shai Gilgeous-Alexander"},
                    {"id": 12, "option_text": "Nikola Jokic"}],
    },
    {
        "id": 2, "text": "Defensive Player of the Year?", "question_type": "superlative",
        "category": "superlative", "point_value": 8,
        "options": [{"id": 21, "option_text": "Victor Wembanyama"},
                    {"id": 22, "option_text": "Evan Mobley"}],
    },
    {
        "id": 3, "text": "Will Boston win 55 games?", "question_type": "prop",
        "category": "prop", "point_value": 5,
        "options": [{"id": 31, "option_text": "Yes"}, {"id": 32, "option_text": "No"}],
    },
    {
        "id": 4, "text": "Will Oklahoma City lead the West?", "question_type": "prop",
        "category": "prop", "point_value": 5,
        "options": [{"id": 41, "option_text": "Yes"}, {"id": 42, "option_text": "No"}],
    },
]

STATUS = {
    "is_open": True,
    "deadline": "2026-10-01T23:59:59Z",
    "season_slug": "2025-26",
    "message": "Entries are open until October 1.",
}


class SubmissionQAHandler(BaseHTTPRequestHandler):
    """Return the app shell, built assets, and stable API fixtures."""

    def do_GET(self):
        """Handle the requests made while rendering SubmissionsPage."""
        path = self.path.split("?", maxsplit=1)[0]
        responses = {
            "/api/v2/submissions/questions/2025-26": {"questions": QUESTIONS, "submission_status": STATUS},
            "/api/v2/submissions/submission-status/2025-26": STATUS,
            "/api/v2/user/context": {"username": None, "is_admin": False, "is_authenticated": False},
            "/api/v2/seasons/": [{"slug": "2025-26", "year": "2025-26"}],
            "/api/v2/submissions/standings/2025-26": {"predictions": []},
            "/api/v2/standings/2025-26": {
                "east": EAST_TEAMS,
                "west": WEST_TEAMS,
            },
            "/api/v2/players/": {"players": [
                {"id": 1, "name": "Shai Gilgeous-Alexander"},
                {"id": 2, "name": "Nikola Jokic"},
                {"id": 3, "name": "Victor Wembanyama"},
                {"id": 4, "name": "Evan Mobley"},
            ]},
            "/api/v2/teams/": {"teams": EAST_TEAMS + WEST_TEAMS},
        }
        if path in responses:
            self._send(json.dumps(responses[path]).encode(), "application/json")
            return
        if path in {"/", "/qa-submissions.html"}:
            self._send((Path(__file__).parent / "submissions.html").read_bytes(), "text/html")
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
    print(f"Submissions UI QA: http://127.0.0.1:{PORT}/qa-submissions.html")
    ThreadingHTTPServer(("127.0.0.1", PORT), SubmissionQAHandler).serve_forever()
