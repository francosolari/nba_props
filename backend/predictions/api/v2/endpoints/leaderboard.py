from __future__ import annotations
from collections import defaultdict
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Union

from ninja import Router
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


# ─────────── Aggregator ───────────
def _build_leaderboard(season_slug: str) -> List[Dict]:
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

    actual_positions = dict(
        RegularSeasonStandings.objects
        .filter(season__slug=season_slug, season_type="regular")
        .values_list("team__name", "position")
    )
    team_conference = dict(
        RegularSeasonStandings.objects
        .filter(season__slug=season_slug, season_type="regular")
        .values_list("team__name", "team__conference")
    )

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
            u_rec["display_name"] = u.first_name + " " + u.last_name[0]
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
        })
        u_rec["total_points"] += sp.points

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
        }
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
                conf_key = 0 if d.get("conference", "").lower().startswith("w") else 1
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

    # Build leaderboard data
    leaderboard = _build_leaderboard(season.slug)

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
        "season": {
            "slug": season.slug,
            "year": season.year,
            "submission_end_date": submission_end,
            "submissions_open": timezone.now() < season.submission_end_date if season.submission_end_date else False,
        }
    }
