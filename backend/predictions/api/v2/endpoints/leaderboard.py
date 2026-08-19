from __future__ import annotations
from collections import defaultdict
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Union

from ninja import Router

from django.core.cache import cache

from predictions.api.v2.utils import results_visible
from predictions.api.v2.cache_utils import LEADERBOARD_CACHE_KEY, LEADERBOARD_CACHE_TTL
from django.utils import timezone
from predictions.models import Answer, RegularSeasonStandings, Season
from predictions.models.prediction import StandingPrediction
from predictions.models.question import (
    Question,
    SuperlativeQuestion,
    InSeasonTournamentQuestion,
    PropQuestion,
)
from predictions.api.common.utils import resolve_answers_optimized
from predictions.services.standings_scoring import score_position
from predictions.api.common.services.leaderboard_insights import apply_leaderboard_insights

router = Router(tags=["leaderboards"])


# ─────────── Category rules ───────────
@dataclass(slots=True)
class CategoryRule:
    name: str
    predicate: Callable[[Union[Answer, StandingPrediction]], bool]


def _is_superlative_answer(obj: Answer) -> bool:
    """Fast check for superlative questions using polymorphic_ctype"""
    return (isinstance(obj, Answer)
            and obj.question
            and obj.question.polymorphic_ctype
            and obj.question.polymorphic_ctype.model == 'superlativequestion')


def _is_non_superlative_non_ist_answer(obj: Answer) -> bool:
    """Fast check for other question types"""
    if not isinstance(obj, Answer) or not obj.question or not obj.question.polymorphic_ctype:
        return False

    model_name = obj.question.polymorphic_ctype.model
    return model_name not in ('superlativequestion', 'inseasontournamentquestion')


CATEGORY_RULES: List[CategoryRule] = [
    CategoryRule(
        name="Regular Season Standings",
        predicate=lambda o: isinstance(o, StandingPrediction),
    ),
    CategoryRule(
        name="Player Awards",
        predicate=_is_superlative_answer,
    ),
    CategoryRule(
        name="Props & Yes/No",
        predicate=_is_non_superlative_non_ist_answer,
    ),
]


def _resolve_category(obj: Union[Answer, StandingPrediction]) -> Optional[str]:
    for rule in CATEGORY_RULES:
        if rule.predicate(obj):
            return rule.name
    return None


REGULAR_SEASON_GAMES = 82


def _reachable_positions(standings_rows) -> Dict[str, range]:
    """Every conference seed each team could still finish in.

    The NBA's own clinch flags answer a different question than this pool does.
    ``ClinchedPlayoffBirth`` and ``ClinchedDivisionTitle`` say which bucket a team
    has secured; only ``ClinchedConferenceTitle`` pins an exact seed. Scoring here
    is on exact conference rank, so the bound is computed from win totals instead.

    A team must finish above another when its worst finish still beats the
    other's best, and could finish above it whenever their ranges touch — ties
    are counted against the team, since a tiebreaker could go either way. Once
    every team in a conference has played its schedule out the recorded
    positions are already final, so each range collapses to a single seed.
    """
    by_conference: Dict[str, List[Dict]] = defaultdict(list)
    for name, position, conference, wins, losses in standings_rows:
        if position is None:
            continue
        played = (wins or 0) + (losses or 0)
        remaining = max(0, REGULAR_SEASON_GAMES - played)
        by_conference[conference].append({
            "name": name,
            "position": position,
            "remaining": remaining,
            "floor": wins or 0,
            "ceiling": (wins or 0) + remaining,
        })

    reachable: Dict[str, range] = {}
    for teams in by_conference.values():
        finished = all(team["remaining"] == 0 for team in teams)
        for team in teams:
            if finished:
                reachable[team["name"]] = range(team["position"], team["position"] + 1)
                continue
            others = [o for o in teams if o["name"] != team["name"]]
            must_be_above = sum(1 for o in others if o["floor"] > team["ceiling"])
            could_be_above = sum(1 for o in others if o["ceiling"] >= team["floor"])
            reachable[team["name"]] = range(must_be_above + 1, could_be_above + 2)
    return reachable


def _pick_is_locked(predicted_position, seeds: Optional[range]) -> bool:
    """Whether a pick's points are settled, which is a weaker test than the seed.

    A pick scores the same 0 whether a team finishes eleventh or fifteenth, so
    its points can be final long before the seed is. That is the claim the board
    makes, so it is the one measured here.
    """
    if not seeds:
        return False
    return len({score_position(predicted_position, seed) for seed in seeds}) == 1


def _seed_range(seeds: Optional[range], season_over: bool, actual_position) -> Optional[List[int]]:
    """The best and worst seed a team can still finish in, as a pair.

    A finished season leaves no room to move, so the range collapses onto the
    recorded position regardless of what the win arithmetic would allow.
    """
    if season_over and actual_position:
        return [actual_position, actual_position]
    if not seeds:
        return None
    return [seeds.start, seeds.stop - 1]


# ─────────── Aggregator ───────────
def _build_leaderboard(season_slug: str) -> List[Dict]:
    """
    Cached entry point for the leaderboard computation.

    The computation itself does not depend on who is asking -- only whether
    they are *allowed to see it* does (handled separately via
    ``results_visible`` by the caller) -- so it is safe to cache briefly and
    share across requests. This is the same short-TTL, in-process caching
    pattern already used for the submissions questions cache.
    """
    cache_key = LEADERBOARD_CACHE_KEY.format(season_slug=season_slug)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    # _compute_leaderboard builds its rows out of defaultdicts (for the
    # convenient auto-vivifying assembly above); those hold an unpicklable
    # lambda as their default_factory, so flatten to plain dicts/lists before
    # handing the result to the cache backend.
    leaderboard = _to_plain(_compute_leaderboard(season_slug))
    cache.set(cache_key, leaderboard, timeout=LEADERBOARD_CACHE_TTL)
    return leaderboard


def _to_plain(value):
    if isinstance(value, dict):
        return {k: _to_plain(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_to_plain(v) for v in value]
    return value


def _compute_leaderboard(season_slug: str) -> List[Dict]:
    # Once a season is over nothing it produced can move again, whether or not an
    # administrator ever flipped an award to finalized. Past seasons therefore
    # read as fully locked rather than advertising points still in play.
    season_over = (
        Season.objects
        .filter(slug=season_slug, end_date__lt=timezone.now().date())
        .exists()
    )

    # Standing predictions
    standing_qs = (
        StandingPrediction.objects
        .select_related("user", "team")
        .filter(season__slug=season_slug)
        .only("id", "user__id", "user__username", "user__first_name", "user__last_name",
              "team__name", "points", "predicted_position")
    )

    # Answers (polymorphic Question carries season)
    answer_qs = (
        Answer.objects
        .select_related("user", "question", "question__polymorphic_ctype")
        .filter(question__season__slug=season_slug)
        .exclude(question__polymorphic_ctype__model='inseasontournamentquestion')
    )

    # Use optimized answer resolution
    answer_list = list(answer_qs)
    resolved_answer_values_map = resolve_answers_optimized(answer_list)

    standings_rows = list(
        RegularSeasonStandings.objects
        .filter(season__slug=season_slug, season_type="regular")
        .values_list("team__name", "position", "team__conference", "wins", "losses")
    )
    actual_positions = {name: position for name, position, _, _, _ in standings_rows}
    team_conference = {name: conference for name, _, conference, _, _ in standings_rows}
    team_records = {name: (wins or 0, losses or 0) for name, _, _, wins, losses in standings_rows}
    reachable_seeds = _reachable_positions(standings_rows)

    # --- 1. fixed max_points for the standings category -----------------
    season_standings_total = (
        RegularSeasonStandings.objects
        .filter(season__slug=season_slug, season_type="regular")
        .only("id")
        .count()
    )
    regular_max_points = season_standings_total * 3  # 3 pts each

    users: Dict[int, Dict] = defaultdict(
        lambda: {
            "id": None,
            "rank": None,
            "display_name": None,
            "username": None,
            "avatar": None,
            "total_points": 0,
            "accuracy": 0,
            "categories": defaultdict(
                lambda: {"points": 0, "max_points": 0, "predictions": []}
            ),
        }
    )

    # StandingPrediction rows
    for sp in standing_qs:
        cat = _resolve_category(sp)
        if not cat:
            continue

        actual_pos = actual_positions.get(sp.team.name)
        conference = team_conference.get(sp.team.name)
        u = sp.user
        u_rec = users[u.id]
        if u_rec["id"] is None:
            u_rec["id"], u_rec["username"] = u.id, u.username
            # Not every account carries both names — indexing the surname
            # blindly took the whole board down for anyone signed up without one.
            u_rec["display_name"] = f"{u.first_name} {u.last_name[:1]}".strip() or u.username
            u_rec["avatar"] = getattr(u, "avatar_url", None)
        c = u_rec["categories"][cat]
        c["points"] += sp.points
        c["max_points"] = regular_max_points
        c["predictions"].append({
            "team": sp.team.name,
            "conference": conference,
            "predicted_position": sp.predicted_position,
            "actual_position": actual_pos,
            "correct": None,
            "points": sp.points,
            # True when this pick's points can no longer move, either because the
            # season is done or because every seed the team can still reach pays
            # the same.
            "is_locked": season_over or _pick_is_locked(
                sp.predicted_position, reachable_seeds.get(sp.team.name)
            ),
            # The record, and the seeds this team can still reach. Together they
            # answer how much room a position has left to move.
            "wins": team_records.get(sp.team.name, (None, None))[0],
            "losses": team_records.get(sp.team.name, (None, None))[1],
            "seed_range": _seed_range(reachable_seeds.get(sp.team.name), season_over, actual_pos),
        })
        u_rec["total_points"] += sp.points

    # `ans.question` resolves to the base Question, so subclass fields are not
    # reachable through it. Superlative state is prefetched by id the same way
    # prop line data is below.
    #
    # Superlatives pay first and second place, and while an award is unfinalized
    # both are read off the latest odds scrape: the leader stands in as the
    # provisional correct answer, the runner-up as the provisional partial. The
    # board needs both so a What-If scenario knows who it is displacing.
    superlative_meta: Dict[int, Dict] = {
        q.id: {
            "is_finalized": q.is_finalized,
            "leader": q.current_leader.name if q.current_leader_id else None,
            "runner_up": q.current_runner_up.name if q.current_runner_up_id else None,
        }
        for q in (
            SuperlativeQuestion.objects
            .filter(season__slug=season_slug)
            .select_related("current_leader", "current_runner_up")
        )
    }

    # Prefetch prop question line data for over/under display
    prop_question_data: Dict[int, Dict] = {}
    for pq in (
        PropQuestion.objects
        .filter(season__slug=season_slug)
        .only("id", "line", "outcome_type")
    ):
        prop_question_data[pq.id] = {
            "line": pq.line,
            "outcome_type": pq.outcome_type,
        }

    # Answer rows with resolved values
    for ans in answer_list:
        cat = _resolve_category(ans)
        if not cat:
            continue
        u = ans.user
        u_rec = users[u.id]
        if u_rec["id"] is None:
            u_rec["id"], u_rec["username"] = u.id, u.username
            u_rec["avatar"] = getattr(u, "avatar_url", None)
        score = ans.points_earned
        c = u_rec["categories"][cat]
        c["points"] += score
        c["max_points"] += ans.question.point_value
        pred = {
            "question_id": ans.question_id,
            "question": ans.question.text,
            "answer": resolved_answer_values_map.get(ans.id, str(ans.answer)),  # Human-readable value
            "correct": ans.is_correct,
            "points": score,
            "point_value": ans.question.point_value,
            "score_status": ans.question.score_status_for_points(score, ans.is_correct),
            # The result itself, so the board can show the answer key beside a
            # question rather than leaving it to be inferred from whoever happened
            # to pick it — which is impossible when nobody did.
            "correct_answer": ans.question.correct_answer or None,
            # Superlatives carry a real finalization flag: until an award is
            # awarded, `correct_answer` is only the current odds leader, so the
            # points it scores are provisional. Question types without the flag
            # report None — unknown, never a promise that the result is settled.
            "is_finalized": superlative_meta.get(ans.question_id, {}).get("is_finalized"),
            # `is_finalized` stays a faithful report of the award itself. Whether
            # the points can still move is the separate question the board asks,
            # and a finished season settles it for everything.
            "is_locked": season_over or superlative_meta.get(ans.question_id, {}).get("is_finalized") is True,
        }
        if ans.question_id in superlative_meta:
            meta = superlative_meta[ans.question_id]
            pred["leader_answer"] = meta["leader"]
            pred["runner_up_answer"] = meta["runner_up"]
        if ans.question_id in prop_question_data:
            pq_info = prop_question_data[ans.question_id]
            if pq_info["line"] is not None:
                pred["line"] = pq_info["line"]
            if pq_info["outcome_type"] is not None:
                pred["outcome_type"] = pq_info["outcome_type"]
        c["predictions"].append(pred)
        u_rec["total_points"] += score

    # ─── Sort the standings predictions: West 1‑15, then East 1‑15 ───
    for u_rec in users.values():
        standings = u_rec["categories"].get("Regular Season Standings")
        if standings:
            def _sort_key(d):
                # A team missing from the conference map stores None here, and
                # a dict default does not cover a key that exists holding None.
                conf_key = 0 if (d.get("conference") or "").lower().startswith("w") else 1
                pos_key = d.get("actual_position") or 999
                return (conf_key, pos_key)

            standings["predictions"].sort(key=_sort_key)

    # Apply production-grade insights/annotations
    apply_leaderboard_insights(users, answer_list)

    # Accuracy + rank
    leaderboard: List[Dict] = []
    for u in users.values():
        preds = [
            p for cat in u["categories"].values()
            for p in cat["predictions"]
            if p.get("correct") is not None
        ]
        if preds:
            correct_cnt = sum(1 for p in preds if p.get("correct"))
            u["accuracy"] = round(100 * correct_cnt / len(preds))
        leaderboard.append(u)

    leaderboard.sort(key=lambda x: x["total_points"], reverse=True)
    for i, u in enumerate(leaderboard, 1):
        u["rank"] = i
    return leaderboard


@router.get(
    "/{season_slug}",
    response=dict,
    summary="Season leaderboard (optimized)",
)
def leaderboard_view(request, season_slug: str):
    """
    Returns leaderboard data with season metadata including submission_end_date.
    Frontend can use this to determine if submissions are still open.
    """
    # Resolve season
    if season_slug == "current":
        season = Season.objects.order_by('-end_date').first()
        if not season:
            return {"error": "No seasons found", "leaderboard": [], "season": None}
    else:
        try:
            season = Season.objects.get(slug=season_slug)
        except Season.DoesNotExist:
            return {"error": f"Season '{season_slug}' not found", "leaderboard": [], "season": None}

    # Other entries stay sealed until the submission window closes, so nobody
    # can copy a submitted entry while they still have time to change theirs.
    visible = results_visible(season, request.user)
    leaderboard = _build_leaderboard(season.slug) if visible else []

    # Serialize season metadata
    submission_end = None
    if season.submission_end_date:
        if timezone.is_naive(season.submission_end_date):
            submission_end = timezone.make_aware(season.submission_end_date)
        else:
            submission_end = season.submission_end_date
        submission_end = submission_end.isoformat()

    return {
        "leaderboard": leaderboard,
        "results_locked": not visible,
        "season": {
            "slug": season.slug,
            "year": season.year,
            "submission_end_date": submission_end,
            "submissions_open": timezone.now() < season.submission_end_date if season.submission_end_date else False,
        }
    }
