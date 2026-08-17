"""
The standings scoring rule, in one place.

A standings pick pays 3 on the nose, 1 either side, and nothing beyond. That
sentence is the whole rule, and it decides real money, so it lives here rather
than being restated by each caller. Both the grading command and the projection
read it from this module; if the pool ever changes the bands, this is the only
Python that moves.

There is a JavaScript twin at ``frontend/src/features/home/whatIf.js``
(``scorePosition``). The two must agree — a projection that disagreed with the
grade would be worse than no projection at all — so change them together and
keep ``test_standings_scoring.py`` in step with ``whatIf.test.js``.
"""

from __future__ import annotations

from typing import Optional

EXACT_POINTS = 3
NEAR_POINTS = 1
MISS_POINTS = 0

#: The most a single standings pick can be worth.
MAX_POINTS_PER_PICK = EXACT_POINTS


def score_position(predicted: Optional[int], actual: Optional[int]) -> int:
    """
    What one standings pick is worth against a finishing position.

    A missing pick or a missing finish scores nothing rather than raising: the
    grading command meets teams with no recorded standing, and the projection
    meets boards with gaps in them.
    """
    if not predicted or not actual:
        return MISS_POINTS

    gap = abs(predicted - actual)
    if gap == 0:
        return EXACT_POINTS
    if gap == 1:
        return NEAR_POINTS
    return MISS_POINTS


def points_available(predicted: Optional[int], actual: Optional[int]) -> int:
    """What an exact call would still add on top of what this pick scores now."""
    return EXACT_POINTS - score_position(predicted, actual)
