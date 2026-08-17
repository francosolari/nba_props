"""Serve both home-page states with deterministic local QA fixtures."""

import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


FRONTEND_DIR = Path(__file__).resolve().parents[1]
STATIC_DIR = FRONTEND_DIR / "static"
PORT = 8002

def _perturb(order, swaps):
    """A rival's board: the real order with the first few pairs transposed."""
    board = list(order)
    for pair in range(min(swaps, len(board) // 2)):
        left = pair * 2
        board[left], board[left + 1] = board[left + 1], board[left]
    return board


def _predictions(east_picks, west_picks, actual_east, actual_west):
    """Every standings pick, scored the way the grading command scores them."""
    rows = []
    for picks, actual, conference in (
        (east_picks, actual_east, "East"), (west_picks, actual_west, "West"),
    ):
        actual_positions = {team: index + 1 for index, team in enumerate(actual)}
        for index, team in enumerate(picks):
            predicted, real = index + 1, actual_positions[team]
            gap = abs(predicted - real)
            rows.append({
                "team": team, "conference": conference,
                "predicted_position": predicted, "actual_position": real,
                "points": 3 if gap == 0 else 1 if gap == 1 else 0,
            })
    return rows


def _categories(east_picks, west_picks, seed=0):
    """A pool entry's graded categories, standings board included."""
    picks = _predictions(east_picks, west_picks, EAST_ORDER, WEST_ORDER)
    return {
        "Regular Season Standings": {
            "points": sum(row["points"] for row in picks),
            "max_points": 90,
            "predictions": picks,
        },
        # Graded and settled: only the standings can move on a what-if.
        "Player Awards": {"points": 48 - seed, "max_points": 80, "predictions": []},
        "Props & Yes/No": {"points": 44 - (seed % 5) * 2, "max_points": 75, "predictions": []},
    }

# Jordan sits 9th of 12 so the leaderboard preview has to pin their row below
# the visible window — the case a top-three fixture would never exercise.
_RIVALS = [
    (1, 201, "will-k", "Will K", 184),
    (2, 202, "mike-r", "Mike R", 176),
    (3, 205, "douglas-p", "Douglas P", 172),
    (4, 203, "nick-a", "Nick A", 161),
    (5, 204, "danny-h", "Danny H", 154),
    (6, 206, "amir-n", "Amir N", 149),
    (7, 207, "justin-f", "Justin F", 145),
    (8, 208, "colin-h", "Colin H", 141),
    (9, 101, "jordan-qa", "Jordan", 138),
    (10, 209, "kareem-n", "Kareem N", 132),
    (11, 210, "sasha-b", "Sasha B", 127),
    (12, 211, "tomas-l", "Tomas L", 119),
]

def _build_leaderboard():
    """Score every entry off its own board so the table and the picks agree."""
    entries = []
    for index, (_, uid, username, name, _) in enumerate(_RIVALS):
        if uid == 101:
            east, west = EAST_PICKS, WEST_PICKS
        else:
            swaps = min(index + 1, 6)
            east, west = _perturb(EAST_ORDER, swaps), _perturb(WEST_ORDER, swaps)
        categories = _categories(east, west, seed=index)
        entries.append({
            "id": uid, "username": username, "display_name": name,
            "total_points": sum(category["points"] for category in categories.values()),
            "categories": categories,
        })

    entries.sort(key=lambda entry: -entry["total_points"])
    for rank, entry in enumerate(entries, start=1):
        entry["rank"] = rank
    return entries

def _game(gid, away, home, tipoff, status="scheduled", scores=None, tv=None):
    """Build one schedule row in the shape NBAGames renders."""
    away_side = {"name": away[0], "slug": away[1], "tricode": away[2], "wins": 0, "losses": 0}
    home_side = {"name": home[0], "slug": home[1], "tricode": home[2], "wins": 0, "losses": 0}
    if scores:
        away_side["score"], home_side["score"] = scores
    return {
        "game_id": str(gid), "away": away_side, "home": home_side,
        "tipoff": tipoff, "status": status, "arena": "", "national_tv": tv,
    }


BOS = ("Boston Celtics", "celtics", "BOS")
NYK = ("New York Knicks", "knicks", "NYK")
OKC = ("Oklahoma City Thunder", "thunder", "OKC")
DEN = ("Denver Nuggets", "nuggets", "DEN")
LAL = ("Los Angeles Lakers", "lakers", "LAL")
MIL = ("Milwaukee Bucks", "bucks", "MIL")
DAL = ("Dallas Mavericks", "mavericks", "DAL")
MIN = ("Minnesota Timberwolves", "timberwolves", "MIN")

PHI = ("Philadelphia 76ers", "76ers", "PHI")
MIA = ("Miami Heat", "heat", "MIA")
CLE = ("Cleveland Cavaliers", "cavaliers", "CLE")
ORL = ("Orlando Magic", "magic", "ORL")
GSW = ("Golden State Warriors", "warriors", "GSW")
SAC = ("Sacramento Kings", "kings", "SAC")
PHX = ("Phoenix Suns", "suns", "PHX")
LAC = ("Los Angeles Clippers", "clippers", "LAC")

# A real NBA night runs to a dozen games, which is the case the rail has to
# survive: three slates here, the first one full.
SCHEDULE = {
    "games": [
        _game(1, DEN, OKC, "2027-01-14T19:00:00-05:00", "live", (58, 61), "ESPN"),
        _game(2, BOS, NYK, "2027-01-14T19:30:00-05:00", "scheduled", tv="TNT"),
        _game(3, LAL, DAL, "2027-01-14T20:00:00-05:00"),
        _game(4, PHI, MIA, "2027-01-14T20:00:00-05:00"),
        _game(5, CLE, ORL, "2027-01-14T20:30:00-05:00"),
        _game(6, GSW, SAC, "2027-01-14T22:00:00-05:00"),
        _game(7, PHX, LAC, "2027-01-14T22:30:00-05:00"),
        _game(8, MIN, MIL, "2027-01-14T21:00:00-05:00"),
        _game(9, MIL, MIN, "2027-01-15T19:00:00-05:00"),
        _game(10, NYK, BOS, "2027-01-15T19:30:00-05:00", tv="ESPN"),
        _game(11, DAL, PHX, "2027-01-15T21:00:00-05:00"),
        _game(12, OKC, DEN, "2027-01-16T20:00:00-05:00", tv="ABC"),
        _game(13, MIA, CLE, "2027-01-16T20:30:00-05:00"),
    ]
}

CUP = {
    "winner": {"display_name": "Justin F", "points": 7},
    "tied_winners": [],
    "champion_team": "New York Knicks",
}

EAST_ORDER = [
    "Boston Celtics", "New York Knicks", "Milwaukee Bucks", "Cleveland Cavaliers",
    "Orlando Magic", "Philadelphia 76ers", "Indiana Pacers", "Miami Heat",
    "Atlanta Hawks", "Chicago Bulls", "Brooklyn Nets", "Toronto Raptors",
    "Charlotte Hornets", "Detroit Pistons", "Washington Wizards",
]

WEST_ORDER = [
    "Oklahoma City Thunder", "Denver Nuggets", "Minnesota Timberwolves", "Dallas Mavericks",
    "Los Angeles Clippers", "Phoenix Suns", "New Orleans Pelicans", "Los Angeles Lakers",
    "Sacramento Kings", "Golden State Warriors", "Houston Rockets", "Utah Jazz",
    "Memphis Grizzlies", "San Antonio Spurs", "Portland Trail Blazers",
]

# The QA board is deliberately imperfect: a few exact calls near the top, a
# couple of big misses lower down, so every drift state is on screen at once.
EAST_PICKS = [
    "Boston Celtics", "Milwaukee Bucks", "New York Knicks", "Philadelphia 76ers",
    "Orlando Magic", "Miami Heat", "Indiana Pacers", "Atlanta Hawks",
    "Cleveland Cavaliers", "Brooklyn Nets", "Chicago Bulls", "Charlotte Hornets",
    "Toronto Raptors", "Washington Wizards", "Detroit Pistons",
]

WEST_PICKS = [
    "Denver Nuggets", "Oklahoma City Thunder", "Phoenix Suns", "Minnesota Timberwolves",
    "Los Angeles Clippers", "Dallas Mavericks", "Los Angeles Lakers", "Sacramento Kings",
    "New Orleans Pelicans", "Golden State Warriors", "Memphis Grizzlies", "Utah Jazz",
    "Houston Rockets", "Portland Trail Blazers", "San Antonio Spurs",
]


def _ladder(order, top_wins):
    """A full conference table.

    Records are paired — two teams to a mark — so neighbours are level on the
    tiebreak and one head-to-head result genuinely reorders them. A table spaced
    a clear game apart would absorb any single night and show nothing.
    """
    return [
        {
            "position": index + 1, "team": team,
            "wins": top_wins - index // 2, "losses": 82 - (top_wins - index // 2),
        }
        for index, team in enumerate(order)
    ]


def _board(picks):
    """The entry's own 1–15 order, in the submissions endpoint's shape."""
    return [{"team_name": team, "predicted_position": index + 1} for index, team in enumerate(picks)]


LEADERBOARD = {"leaderboard": _build_leaderboard(), "season": {"slug": "2026-27"}}

PODIUM = [
    {"rank": entry["rank"], "id": entry["id"], "display_name": entry["display_name"], "points": entry["total_points"]}
    for entry in LEADERBOARD["leaderboard"][:3]
]


HOMEPAGE = {
    "mini_standings": {
        "eastern": _ladder(EAST_ORDER, 58),
        "western": _ladder(WEST_ORDER, 60),
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

    def _state(self):
        """Read the QA state from the page that issued the request.

        The React app never forwards the harness state, so the shell's own URL
        in the Referer is what tells the graded season apart from a live one.
        """
        referer = self.headers.get("Referer", "")
        query = referer.split("?", maxsplit=1)[1] if "?" in referer else ""
        return dict(pair.split("=", maxsplit=1) for pair in query.split("&") if "=" in pair).get("state", "")

    def do_GET(self):
        """Handle requests made while rendering every home state."""
        path = self.path.split("?", maxsplit=1)[0]
        state = self._state()
        homepage = dict(HOMEPAGE)
        if state in {"season", "graded"}:
            homepage["cup"] = CUP
        if state == "graded":
            homepage["season"] = {"slug": "2026-27", "complete": True}
            homepage["podium"] = PODIUM
        responses = {
            "/api/v2/leaderboards/2026-27": LEADERBOARD,
            "/api/v2/homepage/data": homepage,
            "/api/v2/nba/schedule": SCHEDULE,
            "/api/v2/submissions/questions/2026-27": QUESTIONS,
            "/api/v2/submissions/standings/2026-27": {
                "east": _board(EAST_PICKS),
                "west": _board(WEST_PICKS),
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
    print(f"Season underway: http://127.0.0.1:{PORT}/qa-home.html?state=season")
    print(f"Season graded:   http://127.0.0.1:{PORT}/qa-home.html?state=graded")
    ThreadingHTTPServer(("127.0.0.1", PORT), HomeQAHandler).serve_forever()
