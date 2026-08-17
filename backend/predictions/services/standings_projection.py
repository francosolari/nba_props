"""
Where the season is heading, and what a board is worth against it.

The Python twin of ``frontend/src/features/home/projection.js``. The homepage
computes this in the browser from data it already holds; the weekly digest has
no browser, so the same model lives here. Both read the scoring bands from
:mod:`predictions.services.standings_scoring`, so neither can drift from the
grade.

Why a distribution rather than a projected table
------------------------------------------------

The obvious approach — run each team's win pace out to 82 games and score the
board against the resulting ladder — does nothing at all. Projected win
percentage is ``(wins + remaining * rate) / 82``, which for ``rate = wins /
played`` reduces exactly to ``wins / played``, the current win percentage.
Multiplying every team by the same 82 preserves the order, so the projected
ladder *is* the current ladder and the projected score *is* the current score.
Pace cannot move a number that only responds to order.

What moves is the uncertainty. Two teams one game apart in November are far
less separated than the same two in March, because November has sixty more
games left to reshuffle them. So this samples: each team's remaining games are
drawn at its estimated win rate, the conference re-ranked on the result, and
that repeats until every team has a probability over each finishing position. A
board is then scored *in expectation*.

At the final buzzer every distribution is a point mass and the expected score
equals the graded score exactly, so a projection and a final grade can never
disagree about a finished season.

This is a projection and never a score. The pool is graded on real final
standings by ``grade_standing_predictions``; nothing here writes to that.
"""

from __future__ import annotations

import math
import random
import zlib
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Sequence

from .standings_scoring import EXACT_POINTS, score_position

SEASON_GAMES = 82

#: Enough draws that the expected total is stable well inside a tenth of a
#: point, which is finer than anything a digest or a UI prints.
DRAWS = 4000

#: A pace read off very few games is mostly noise, so a rate is pulled toward
#: .500 by a fixed prior. Twelve games is roughly a seventh of a season: enough
#: that an 0-3 team is not projected to lose all 82, and faded by Christmas.
PRIOR_GAMES = 12
PRIOR_RATE = 0.5

#: How much a game before the last ten counts, relative to a game inside it.
#:
#: This is the recency knob, and it is deliberately mild. Recent form feels far
#: more informative than it is: ten games is a very small sample, and a team's
#: season-long record is built on many more. Weighting the last ten heavily
#: makes projections *worse* on average, not better — it trades real signal for
#: noise. Recency earns its place only because team strength genuinely does
#: change during a season (trades, injuries, a rookie arriving), and .6 is about
#: the most that change justifies. Set it to 1.0 to switch recency off.
HISTORY_WEIGHT = 0.6

#: A pick reads as settled once one payout is all but certain.
SETTLED_CONFIDENCE = 0.95


@dataclass(frozen=True)
class TeamForm:
    """
    One team's season to date, as much of it as is known.

    ``last_ten_wins`` is optional because it arrives from the standings feed and
    older rows predate the column. Without it the projection falls back to the
    plain season rate, which is the behaviour before recency existed.
    """

    team: str
    wins: int
    losses: int
    position: Optional[int] = None
    last_ten_wins: Optional[int] = None

    @property
    def played(self) -> int:
        return min(self.wins + self.losses, SEASON_GAMES)

    @property
    def remaining(self) -> int:
        return max(0, SEASON_GAMES - self.played)


@dataclass
class TeamOutlook:
    """A team's finishing position as a distribution rather than a number."""

    team: str
    wins: int
    remaining: int
    rate: float
    #: Effective sample size behind ``rate``, after recency weighting.
    weight: float
    #: ``chance[p]`` is the probability of finishing ``p``th; index 0 unused so a
    #: lookup reads as a position rather than an offset.
    chance: List[float] = field(default_factory=list)

    @property
    def expected_position(self) -> float:
        return sum(p * chance for p, chance in enumerate(self.chance))

    @property
    def projected_wins(self) -> int:
        return round(self.wins + self.remaining * self.rate)


def _weighted_rate(form: TeamForm) -> tuple:
    """
    A team's win rate with recent games counted more heavily, and the effective
    sample size that rate is worth.

    The last ten games carry full weight and everything before them carries
    ``HISTORY_WEIGHT``. Down-weighting history buys recency at the cost of
    sample: the returned weight is the effective number of games behind the
    estimate, which is strictly less than the number actually played whenever
    recency is switched on. The caller needs that, because a rate estimated from
    less means a *wider* projection, not a narrower one.
    """
    played = form.played
    if played <= 0:
        return PRIOR_RATE, 0.0

    recent_games = min(10, played)
    older_games = played - recent_games

    if form.last_ten_wins is None or older_games == 0:
        wins, games, sum_squares = form.wins, played, played
    else:
        # Clamp: a feed that disagrees with itself must not produce a negative
        # win count for the older stretch.
        recent_wins = max(0, min(form.last_ten_wins, recent_games, form.wins))
        older_wins = max(0, form.wins - recent_wins)
        wins = recent_wins + HISTORY_WEIGHT * older_wins
        games = recent_games + HISTORY_WEIGHT * older_games
        # n_eff = (sum of weights)^2 / (sum of squared weights), the standard
        # effective-sample-size of a weighted mean.
        sum_squares = recent_games + older_games * HISTORY_WEIGHT ** 2

    rate = (wins + PRIOR_RATE * PRIOR_GAMES) / (games + PRIOR_GAMES)
    effective = (games ** 2 / sum_squares) if sum_squares else 0.0
    return rate, effective


def _seed_from(forms: Sequence[TeamForm]) -> int:
    """
    The seed is the table itself, so the same standings always project the same
    way. A number that drifted between two runs would read as news when nothing
    had happened — and a digest that disagreed with the homepage would be worse.
    """
    signature = '|'.join(
        f'{form.team}:{form.wins}:{form.losses}:{form.last_ten_wins}' for form in forms
    )
    # Not the builtin hash(): it is salted per process, so it would reseed on
    # every run and defeat the point of seeding from the table at all.
    return zlib.crc32(signature.encode('utf-8'))


def project_conference(forms: Sequence[TeamForm], draws: int = DRAWS) -> List[TeamOutlook]:
    """Every team in one conference, as a distribution over finishing positions."""
    forms = list(forms)
    if not forms:
        return []

    size = len(forms)
    counts = [[0] * size for _ in forms]
    rates_and_weights = [_weighted_rate(form) for form in forms]

    if all(form.remaining == 0 for form in forms):
        # A finished conference has nothing to sample: every team is already
        # where it will end.
        for index, form in enumerate(forms):
            settled = min(size, max(1, form.position or index + 1))
            counts[index][settled - 1] = draws
    else:
        rng = random.Random(_seed_from(forms))
        spreads = []
        for form, (rate, weight) in zip(forms, rates_and_weights):
            remaining = form.remaining
            variance = remaining * rate * (1 - rate)
            # The rate itself is an estimate, and an estimate off by a little
            # compounds across every remaining game. Ignoring that understates
            # the spread badly in November, which is exactly when the projection
            # most needs to be honest about what it does not know.
            if weight > 0:
                variance += (remaining ** 2) * rate * (1 - rate) / weight
            spreads.append(math.sqrt(variance))

        order = list(range(size))
        for _ in range(draws):
            sampled = []
            for index, form in enumerate(forms):
                rate = rates_and_weights[index][0]
                drawn = form.remaining * rate + spreads[index] * rng.gauss(0, 1)
                drawn = min(max(drawn, 0), form.remaining)
                sampled.append((form.wins + drawn, form.position or index + 1, index))
            # Most wins first; a tie holds the current order so an untouched
            # table never reshuffles.
            order.sort(key=lambda i: (-sampled[i][0], sampled[i][1]))
            for rank, index in enumerate(order):
                counts[index][rank] += 1

    outlooks = []
    for index, form in enumerate(forms):
        rate, weight = rates_and_weights[index]
        outlooks.append(TeamOutlook(
            team=form.team,
            wins=form.wins,
            remaining=form.remaining,
            rate=rate,
            weight=weight,
            chance=[0.0] + [count / draws for count in counts[index]],
        ))
    return outlooks


def project_finish(conferences: Dict[str, Sequence[TeamForm]],
                   draws: int = DRAWS) -> Dict[str, TeamOutlook]:
    """
    Both conferences at once, keyed by team name.

    Conferences are projected independently because a standings pick is a call
    on a position within a conference — an Eastern team's finish is unaffected
    by how the West sorts out.
    """
    outlook: Dict[str, TeamOutlook] = {}
    for forms in conferences.values():
        for team in project_conference(forms, draws=draws):
            outlook[team.team] = team
    return outlook


def expected_points(predicted: Optional[int], outlook: Optional[TeamOutlook]) -> float:
    """
    What one pick is worth against a distribution rather than a position: the
    scoring rule applied to every finish the team might reach, weighted by how
    often it reaches it.
    """
    if not predicted or outlook is None:
        return 0.0
    return sum(
        chance * score_position(predicted, position)
        for position, chance in enumerate(outlook.chance)
    )


def pick_is_settled(predicted: Optional[int], outlook: Optional[TeamOutlook]) -> bool:
    """
    Whether a pick's payout is effectively decided.

    Note this is a question about the payout, not about the table. A team certain
    to finish either side of a called position is not settled at all, because 1
    and 3 are different answers — while a team certain to finish two places away
    on either side is settled, because both answers are nothing.
    """
    if outlook is None:
        return False

    payouts: Dict[int, float] = {}
    for position, chance in enumerate(outlook.chance):
        points = score_position(predicted, position)
        payouts[points] = payouts.get(points, 0.0) + chance

    return bool(payouts) and max(payouts.values()) >= SETTLED_CONFIDENCE


@dataclass
class BoardProjection:
    """One entrant's standings board, read against the projection."""

    points: float = 0.0
    settled: int = 0
    live: int = 0

    @property
    def ceiling(self) -> int:
        return (self.settled + self.live) * EXACT_POINTS


def project_board(picks: Iterable, outlook: Dict[str, TeamOutlook]) -> BoardProjection:
    """
    Score a board in expectation. ``picks`` is any iterable of
    ``(team_name, predicted_position)`` pairs.
    """
    board = BoardProjection()
    for team, predicted in picks:
        team_outlook = outlook.get(team)
        board.points += expected_points(predicted, team_outlook)
        if pick_is_settled(predicted, team_outlook):
            board.settled += 1
        else:
            board.live += 1
    return board
