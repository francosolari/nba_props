from __future__ import annotations
from collections import defaultdict
from typing import Dict, List, Optional

from predictions.models import Answer


def _compute_question_correctness(answer_list: List[Answer]) -> Dict[int, Dict[str, float]]:
    """
    Build a map of question_id -> {correct, total} across provided answers.
    Only counts answers with a non-null is_correct flag.
    """
    stats: Dict[int, Dict[str, float]] = defaultdict(lambda: {"correct": 0, "total": 0})
    for ans in answer_list:
        if ans.is_correct is None:
            continue
        s = stats[ans.question_id]
        s["total"] += 1
        if ans.is_correct:
            s["correct"] += 1
    return stats


def _correct_rate(question_stats: Dict[int, Dict[str, float]], qid: Optional[int]) -> Optional[float]:
    if not qid or qid not in question_stats:
        return None
    s = question_stats[qid]
    if s["total"] == 0:
        return None
    return s["correct"] / s["total"]


def apply_leaderboard_insights(users: Dict[int, Dict], answer_list: List[Answer]) -> None:
    """
    Mutates the provided `users` dict to:
    - Mark per-category best performers (is_best)
    - Add curated interesting predictions per category (hard_wins, easy_misses)
    - Add user-level badges for category bests

    users: { user_id: { categories: { name: {points, max_points, predictions: [...] } } } }
    Each prediction dict may include question_id, question, answer, correct, points
    """
    # 1) Global correctness stats per question
    question_stats = _compute_question_correctness(answer_list)

    # 2) Category max points across all users
    category_max_points: Dict[str, float] = defaultdict(float)
    for u in users.values():
        for cat_name, cat in u.get("categories", {}).items():
            if cat.get("points", 0) > category_max_points[cat_name]:
                category_max_points[cat_name] = cat.get("points", 0)

    # 3) Per-user annotations
    for u in users.values():
        badges = []
        for cat_name, cat in u.get("categories", {}).items():
            # Best-in-category flag
            is_best = cat.get("points", 0) == category_max_points.get(cat_name, 0)
            cat["is_best"] = is_best
            if is_best and cat.get("points", 0) > 0:
                badges.append({"type": "category_best", "category": cat_name, "points": cat.get("points", 0)})

            # Curate interesting predictions
            hard_wins = []
            easy_misses = []
            for p in cat.get("predictions", []):
                qid = p.get("question_id")
                rate = _correct_rate(question_stats, qid)
                if rate is None or p.get("correct") is None:
                    continue
                if p.get("correct") and rate < 0.35:
                    hw = dict(p)
                    hw["global_correct_rate"] = round(rate, 2)
                    hard_wins.append(hw)
                if (p.get("correct") is False) and rate > 0.65:
                    em = dict(p)
                    em["global_correct_rate"] = round(rate, 2)
                    easy_misses.append(em)

            cat["interesting"] = {
                "hard_wins": hard_wins[:3],
                "easy_misses": easy_misses[:3],
            }

        u["badges"] = badges

