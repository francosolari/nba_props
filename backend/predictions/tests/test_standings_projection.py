"""
Tests for the shared standings scoring rule and the finish projection.

The projection is deliberately checked against properties rather than pinned
numbers wherever a pinned number would only restate the implementation: that it
converges on the grade, that it narrows as games run out, that recency moves it
in the right direction and not too far.
"""

import pytest

from predictions.services.standings_projection import (
    HISTORY_WEIGHT,
    SEASON_GAMES,
    TeamForm,
    TeamOutlook,
    expected_points,
    pick_is_settled,
    project_board,
    project_conference,
    project_finish,
)
from predictions.services.standings_scoring import (
    points_available,
    score_position,
)


def conference(count, played, last_ten=None):
    """A conference on an even ladder of win rates from .650 down to .350."""
    forms = []
    for i in range(count):
        rate = 0.65 - (0.3 * i) / max(1, count - 1)
        wins = round(played * rate)
        forms.append(TeamForm(
            team=f'Team {i + 1}',
            wins=wins,
            losses=played - wins,
            position=i + 1,
            last_ten_wins=last_ten,
        ))
    return forms


class TestScorePosition:
    """The rule that decides real money. Mirrors whatIf.test.js exactly."""

    def test_three_on_the_nose_one_either_side_nothing_beyond(self):
        assert score_position(4, 4) == 3
        assert score_position(4, 5) == 1
        assert score_position(4, 3) == 1
        assert score_position(4, 6) == 0

    def test_scores_nothing_when_either_position_is_missing(self):
        assert score_position(None, 3) == 0
        assert score_position(3, None) == 0

    def test_reports_what_an_exact_call_would_still_add(self):
        assert points_available(4, 4) == 0
        assert points_available(4, 5) == 2
        assert points_available(4, 9) == 3


class TestGradingCommandParity:
    """
    The grading command used to inline these bands. It now calls the helper, so
    this pins the behaviour the command had before the refactor.
    """

    @pytest.mark.parametrize('predicted,actual,points', [
        (1, 1, 3), (1, 2, 1), (2, 1, 1), (1, 3, 0), (15, 15, 3), (15, 1, 0),
    ])
    def test_matches_the_original_step_function(self, predicted, actual, points):
        assert score_position(predicted, actual) == points


class TestProjectConference:
    def test_every_team_gets_a_distribution_summing_to_one(self):
        for team in project_conference(conference(5, 20), draws=500):
            assert sum(team.chance) == pytest.approx(1.0)

    def test_is_deterministic_across_runs(self):
        forms = conference(8, 30)
        first = project_conference(forms, draws=500)
        second = project_conference(forms, draws=500)
        assert [t.chance for t in first] == [t.chance for t in second]

    def test_collapses_onto_the_real_table_once_every_game_is_played(self):
        forms = [
            TeamForm(team='Boston', wins=60, losses=22, position=1),
            TeamForm(team='New York', wins=50, losses=32, position=2),
        ]
        boston, knicks = project_conference(forms, draws=500)
        assert boston.chance[1] == 1.0
        assert knicks.chance[2] == 1.0

    def test_narrows_as_the_season_runs_out(self):
        early = project_conference(conference(10, 15), draws=1500)
        late = project_conference(conference(10, 75), draws=1500)
        assert late[0].chance[1] > early[0].chance[1]


class TestRecency:
    """
    A team playing far better than its record deserves a better projection —
    but only a little better, because ten games is a small sample.
    """

    def _rate_for(self, last_ten_wins):
        forms = conference(6, 50)
        hot = TeamForm(
            team=forms[3].team, wins=forms[3].wins, losses=forms[3].losses,
            position=forms[3].position, last_ten_wins=last_ten_wins,
        )
        forms[3] = hot
        return project_conference(forms, draws=1)[3].rate

    def test_a_hot_streak_raises_the_projected_rate(self):
        assert self._rate_for(9) > self._rate_for(None)

    def test_a_cold_streak_lowers_it(self):
        assert self._rate_for(1) < self._rate_for(None)

    def test_recency_is_deliberately_mild(self):
        """
        A 9-1 stretch must not drag a 50-game .500 team anywhere near .900.
        Ten games is too small a sample to justify it, and over-weighting recent
        form makes projections worse rather than better.
        """
        hot = self._rate_for(9)
        assert hot - self._rate_for(None) < 0.1

    def test_falls_back_to_the_season_rate_without_a_last_ten(self):
        """Rows predating the L10 column must still project, just without recency."""
        forms = [TeamForm(team='A', wins=30, losses=20, position=1, last_ten_wins=None)]
        outlook = project_conference(forms, draws=1)[0]
        # 30 wins in 50, shrunk toward .500 by the 12-game prior.
        assert outlook.rate == pytest.approx((30 + 6) / (50 + 12))

    def test_down_weighting_history_costs_sample_size(self):
        """
        Recency is not free: an estimate built on fewer effective games is worth
        less, and the projection has to know that so it can widen accordingly.
        """
        with_recency = project_conference(
            [TeamForm(team='A', wins=30, losses=20, position=1, last_ten_wins=6)], draws=1,
        )[0]
        assert with_recency.weight < 50
        assert HISTORY_WEIGHT < 1.0

    def test_matches_the_javascript_twin_on_a_shared_fixture(self):
        """
        The same assertion lives in frontend/src/features/home/__tests__/
        projection.test.js. The two models must agree: the homepage and the
        digest describe the same season, and a player reading both should not
        find two different projections.
        """
        outlook = project_conference(
            [TeamForm(team='A', wins=30, losses=20, position=1, last_ten_wins=8)], draws=1,
        )[0]
        # 8 of the last 10, 22 of the 40 before at 0.6 weight: (8 + 13.2 + 6) / (34 + 12).
        assert outlook.rate == pytest.approx(0.591304, abs=1e-6)
        assert outlook.weight == pytest.approx(47.377, abs=1e-3)

    def test_a_hot_team_is_projected_to_finish_higher(self):
        """The rate has to actually reach the finishing positions."""
        cold = conference(8, 50, last_ten=2)
        hot = list(cold)
        hot[5] = TeamForm(
            team=cold[5].team, wins=cold[5].wins, losses=cold[5].losses,
            position=cold[5].position, last_ten_wins=9,
        )
        assert (project_conference(hot, draws=2000)[5].expected_position
                < project_conference(cold, draws=2000)[5].expected_position)


class TestExpectedPoints:
    settled = TeamOutlook(team='A', wins=0, remaining=0, rate=0.5, weight=1,
                          chance=[0, 0, 1, 0])

    def test_reduces_to_the_grading_rule_when_the_finish_is_certain(self):
        assert expected_points(2, self.settled) == 3
        assert expected_points(1, self.settled) == 1
        assert expected_points(3, self.settled) == 1

    def test_weights_each_reachable_finish_by_how_often_it_happens(self):
        split = TeamOutlook(team='A', wins=0, remaining=0, rate=0.5, weight=1,
                            chance=[0, 0, 0.5, 0, 0.5])
        assert expected_points(2, split) == pytest.approx(1.5)

    def test_scores_nothing_without_a_pick_or_an_outlook(self):
        assert expected_points(None, self.settled) == 0
        assert expected_points(2, None) == 0

    def test_a_finished_season_projects_exactly_the_graded_score(self):
        """The projection and the grade can never disagree about a done season."""
        forms = conference(10, SEASON_GAMES)
        outlook = project_finish({'east': forms}, draws=200)
        board = [(form.team, form.position) for form in forms]

        graded = sum(score_position(pos, form.position)
                     for (team, pos), form in zip(board, forms))
        assert project_board(board, outlook).points == pytest.approx(graded)


class TestPickIsSettled:
    def _outlook(self, chance):
        return TeamOutlook(team='A', wins=0, remaining=0, rate=0.5, weight=1, chance=chance)

    def test_settles_on_a_certain_payout_whether_that_is_three_or_nothing(self):
        assert pick_is_settled(2, self._outlook([0, 0, 1, 0, 0]))
        assert pick_is_settled(9, self._outlook([0, 0, 1, 0, 0]))

    def test_settles_when_different_finishes_happen_to_pay_the_same(self):
        assert pick_is_settled(2, self._outlook([0, 0.5, 0, 0.5, 0]))

    def test_stays_live_when_the_payout_is_not_fixed(self):
        assert not pick_is_settled(2, self._outlook([0, 0.5, 0.5, 0, 0]))
        assert not pick_is_settled(2, self._outlook([0, 0, 0.5, 0, 0.5]))


class TestProjectBoard:
    def test_totals_in_expectation_and_counts_what_is_still_live(self):
        outlook = {
            'A': TeamOutlook(team='A', wins=0, remaining=0, rate=0.5, weight=1,
                             chance=[0, 1, 0, 0]),
            'B': TeamOutlook(team='B', wins=0, remaining=0, rate=0.5, weight=1,
                             chance=[0, 0, 0.5, 0.5]),
        }
        board = project_board([('A', 1), ('B', 3)], outlook)

        assert board.points == pytest.approx(3 + (0.5 * 1 + 0.5 * 3))
        assert board.settled == 1
        assert board.live == 1
        assert board.ceiling == 6

    def test_an_unknown_team_scores_nothing_rather_than_raising(self):
        board = project_board([('Nowhere', 4)], {})
        assert board.points == 0
        assert board.live == 1


class TestTheProblemThisSolves:
    def test_the_projection_moves_where_the_graded_score_does_not(self):
        """
        The whole point. A board called one or two places off scores the same
        graded total all season, because nothing crosses a position boundary.
        The projection has to move anyway.
        """
        board_positions = [1, 3, 2, 5, 4, 7, 6, 9, 8, 10]
        graded = []
        projected = []

        for played in (10, 30, 50, 70):
            forms = conference(10, played)
            board = [(form.team, pos) for form, pos in zip(forms, board_positions)]
            graded.append(sum(score_position(pos, form.position)
                              for (team, pos), form in zip(board, forms)))
            projected.append(project_board(board, project_finish({'e': forms}, draws=2000)).points)

        assert len(set(graded)) == 1, 'fixture should hold the graded score flat'
        assert len(set(round(p, 2) for p in projected)) == len(projected)
        assert max(projected) - min(projected) > 1.0
