"""What the board is allowed to call settled.

A pick's points are locked when nothing that can still happen would change them.
That is a weaker test than the seed being decided, and deliberately so: a pick
scores the same 0 whether a team finishes eleventh or fifteenth.
"""
from predictions.api.v2.endpoints.leaderboard import (
    _pick_is_locked,
    _reachable_positions,
)


def row(name, position, conference, wins, losses):
    return (name, position, conference, wins, losses)


class TestReachablePositions:
    def test_a_finished_conference_collapses_to_the_recorded_order(self):
        # Every team has played 82. Teams level on wins still hold their recorded
        # seeds, because the tiebreaker has already been applied to produce them.
        rows = [
            row("Alpha", 1, "East", 50, 32),
            row("Bravo", 2, "East", 50, 32),
            row("Charlie", 3, "East", 40, 42),
        ]
        seeds = _reachable_positions(rows)
        assert seeds["Alpha"] == range(1, 2)
        assert seeds["Bravo"] == range(2, 3)
        assert seeds["Charlie"] == range(3, 4)

    def test_a_clear_leader_late_on_is_pinned_to_first(self):
        # Two games left. Bravo tops out at 52, below Alpha's floor of 60.
        rows = [
            row("Alpha", 1, "East", 60, 20),
            row("Bravo", 2, "East", 50, 30),
            row("Charlie", 3, "East", 30, 50),
        ]
        assert _reachable_positions(rows)["Alpha"] == range(1, 2)

    def test_a_team_that_can_only_be_caught_keeps_a_range(self):
        # Two games left and a two-win gap: Bravo can reach 52 and tie Alpha, so
        # neither seed is pinned.
        rows = [
            row("Alpha", 1, "East", 52, 28),
            row("Bravo", 2, "East", 50, 30),
        ]
        seeds = _reachable_positions(rows)
        assert seeds["Alpha"] == range(1, 3)
        assert seeds["Bravo"] == range(1, 3)

    def test_nothing_is_pinned_early_in_a_season(self):
        rows = [
            row("Alpha", 1, "East", 5, 1),
            row("Bravo", 2, "East", 4, 2),
            row("Charlie", 3, "East", 3, 3),
        ]
        assert all(len(seeds) > 1 for seeds in _reachable_positions(rows).values())

    def test_conferences_are_ranked_independently(self):
        rows = [
            row("Alpha", 1, "East", 60, 22),
            row("Bravo", 1, "West", 60, 22),
        ]
        seeds = _reachable_positions(rows)
        assert seeds["Alpha"] == range(1, 2)
        assert seeds["Bravo"] == range(1, 2)

    def test_teams_with_no_recorded_position_are_skipped(self):
        assert _reachable_positions([row("Alpha", None, "East", 60, 22)]) == {}


class TestPickIsLocked:
    def test_an_exact_seed_locks_the_pick(self):
        assert _pick_is_locked(4, range(4, 5)) is True

    def test_a_hopeless_pick_locks_before_the_seed_does(self):
        # The team will finish somewhere between 11th and 15th. A pick of 1st
        # scores nothing across that whole range, so its points are already final
        # even though the seed is wide open.
        assert _pick_is_locked(1, range(11, 16)) is True

    def test_a_pick_still_in_contention_stays_open(self):
        # Finishing 4th pays 3, 5th pays 1, 6th pays 0.
        assert _pick_is_locked(4, range(4, 7)) is False

    def test_a_pick_is_only_settled_when_every_seed_pays_the_same(self):
        # The team finishes 5th or 6th. A pick of 5th pays 3 then 1, and a pick
        # of 7th pays 0 then 1 — neither is settled. A pick of 8th pays nothing
        # either way, so it is.
        assert _pick_is_locked(5, range(5, 7)) is False
        assert _pick_is_locked(7, range(5, 7)) is False
        assert _pick_is_locked(8, range(5, 7)) is True

    def test_an_unknown_team_is_never_called_settled(self):
        assert _pick_is_locked(4, None) is False


# ============================================================================
# What the endpoint actually reports
# ============================================================================

import pytest  # noqa: E402
from django.utils import timezone  # noqa: E402

from predictions.api.v2.endpoints.leaderboard import _build_leaderboard  # noqa: E402
from predictions.models import RegularSeasonStandings  # noqa: E402
from predictions.tests.factories import (  # noqa: E402
    AnswerFactory,
    CurrentSeasonFactory,
    EasternTeamFactory,
    PastSeasonFactory,
    PlayerFactory,
    StandingPredictionFactory,
    SuperlativeQuestionFactory,
    UserFactory,
)


def award_question(season, leader, runner_up, finalized=False):
    """A superlative whose provisional answer is the current odds leader."""
    question = SuperlativeQuestionFactory(
        season=season,
        text='Who wins Most Valuable Player?',
        correct_answer=leader.name,
        is_finalized=finalized,
    )
    question.current_leader = leader
    question.current_runner_up = runner_up
    question.save(update_fields=['current_leader', 'current_runner_up'])
    return question


def award_predictions(rows):
    """The Player Awards predictions for the first entry of a leaderboard."""
    return rows[0]['categories']['Player Awards']['predictions']


@pytest.mark.django_db
class TestAwardPayload:
    def test_an_unfinalized_award_reports_its_odds_leader_and_runner_up(self):
        # `answer.question` resolves to the base Question, so these subclass
        # fields only arrive if they are prefetched by id.
        season = CurrentSeasonFactory(slug='lock-1', year='lock-1')
        leader, runner_up = PlayerFactory(name='Leader'), PlayerFactory(name='Runner Up')
        question = award_question(season, leader, runner_up)
        AnswerFactory(user=UserFactory(), question=question, answer='Leader', points_earned=5, is_correct=True)

        prediction = award_predictions(_build_leaderboard(season.slug))[0]
        assert prediction['leader_answer'] == 'Leader'
        assert prediction['runner_up_answer'] == 'Runner Up'
        # The result travels with the question so the board can name it even when
        # nobody picked it — a leader no one backed has no cell of its own.
        assert prediction['correct_answer'] == 'Leader'
        assert prediction['is_finalized'] is False
        # Scored off today's odds, so the points can still move.
        assert prediction['is_locked'] is False

    def test_an_awarded_award_locks_its_points(self):
        season = CurrentSeasonFactory(slug='lock-2', year='lock-2')
        leader, runner_up = PlayerFactory(name='Leader'), PlayerFactory(name='Runner Up')
        question = award_question(season, leader, runner_up, finalized=True)
        AnswerFactory(user=UserFactory(), question=question, answer='Leader', points_earned=5, is_correct=True)

        prediction = award_predictions(_build_leaderboard(season.slug))[0]
        assert prediction['is_finalized'] is True
        assert prediction['is_locked'] is True


@pytest.mark.django_db
class TestSeasonOver:
    def test_a_finished_season_locks_everything_it_produced(self):
        # The bug this covers: a season can end without an administrator ever
        # flipping an award to finalized, which left old boards advertising
        # points that could no longer possibly move.
        season = PastSeasonFactory(slug='lock-3', year='lock-3')
        assert season.end_date < timezone.now().date()

        leader, runner_up = PlayerFactory(name='Leader'), PlayerFactory(name='Runner Up')
        question = award_question(season, leader, runner_up, finalized=False)
        user = UserFactory()
        AnswerFactory(user=user, question=question, answer='Leader', points_earned=5, is_correct=True)

        team = EasternTeamFactory(name='East Team', abbreviation='ET1', conference='East')
        RegularSeasonStandings.objects.create(
            team=team, season=season, season_type='regular', position=1, wins=50, losses=32,
        )
        StandingPredictionFactory(user=user, season=season, team=team, predicted_position=1, points=3)

        rows = _build_leaderboard(season.slug)
        award = award_predictions(rows)[0]
        standing = rows[0]['categories']['Regular Season Standings']['predictions'][0]

        assert award['is_locked'] is True
        # The award itself is still not finalized — that stays a faithful report.
        assert award['is_finalized'] is False
        assert standing['is_locked'] is True


@pytest.mark.django_db
class TestStandingsPayload:
    def _season(self, slug, played, gap):
        """Five East teams, evenly spaced by ``gap`` wins, ``played`` games in."""
        season = CurrentSeasonFactory(slug=slug, year=slug)
        teams = []
        for i in range(1, 6):
            wins = played - ((i - 1) * gap) - 10
            team = EasternTeamFactory(name=f'East {i}', abbreviation=f'E{i}', conference='East')
            RegularSeasonStandings.objects.create(
                team=team, season=season, season_type='regular',
                position=i, wins=wins, losses=played - wins,
            )
            teams.append(team)
        return season, teams

    def _first_standing(self, season):
        rows = _build_leaderboard(season.slug)
        return rows[0]['categories']['Regular Season Standings']['predictions'][0]

    def test_a_pick_that_cannot_score_is_settled_before_the_seed_is(self):
        # Two games left and ten wins between each team: the bottom side is stuck
        # at fifth, so a pick of first is already worth nothing.
        season, teams = self._season('lock-4', played=80, gap=10)
        StandingPredictionFactory(
            user=UserFactory(first_name='A', last_name='B'),
            season=season, team=teams[-1], predicted_position=1, points=0,
        )

        standing = self._first_standing(season)
        assert standing['is_locked'] is True
        assert standing['points'] == 0

    def test_a_pick_still_in_contention_is_not_settled(self):
        # Twenty games left and four wins between each team: the leader can still
        # be caught, so a pick of first could pay 3, 1 or nothing.
        season, teams = self._season('lock-5', played=62, gap=4)
        StandingPredictionFactory(
            user=UserFactory(first_name='A', last_name='B'),
            season=season, team=teams[0], predicted_position=1, points=3,
        )

        assert self._first_standing(season)['is_locked'] is False

    def test_a_pick_is_settled_once_the_schedule_is_played_out(self):
        season, teams = self._season('lock-8', played=82, gap=4)
        StandingPredictionFactory(
            user=UserFactory(first_name='A', last_name='B'),
            season=season, team=teams[2], predicted_position=3, points=3,
        )

        standing = self._first_standing(season)
        assert standing['is_locked'] is True
        assert standing['points'] == 3


@pytest.mark.django_db
class TestDisplayName:
    def test_an_account_with_no_surname_still_builds_a_board(self):
        # Indexing the surname blindly used to raise IndexError and take the
        # whole leaderboard down for anyone signed up without one.
        season = CurrentSeasonFactory(slug='lock-6', year='lock-6')
        team = EasternTeamFactory(name='East Solo', abbreviation='ES1', conference='East')
        RegularSeasonStandings.objects.create(
            team=team, season=season, season_type='regular', position=1, wins=40, losses=22,
        )
        user = UserFactory(first_name='Mononym', last_name='')
        StandingPredictionFactory(user=user, season=season, team=team, predicted_position=1, points=3)

        assert _build_leaderboard(season.slug)[0]['display_name'] == 'Mononym'

    def test_an_account_with_no_name_at_all_falls_back_to_its_username(self):
        season = CurrentSeasonFactory(slug='lock-7', year='lock-7')
        team = EasternTeamFactory(name='East Blank', abbreviation='EB1', conference='East')
        RegularSeasonStandings.objects.create(
            team=team, season=season, season_type='regular', position=1, wins=40, losses=22,
        )
        user = UserFactory(first_name='', last_name='')
        StandingPredictionFactory(user=user, season=season, team=team, predicted_position=1, points=3)

        assert _build_leaderboard(season.slug)[0]['display_name'] == user.username


@pytest.mark.django_db
class TestAnswerKey:
    def test_a_result_nobody_picked_still_reaches_the_board(self):
        season = CurrentSeasonFactory(slug='lock-9', year='lock-9')
        leader, runner_up = PlayerFactory(name='Unpicked'), PlayerFactory(name='Second')
        question = award_question(season, leader, runner_up)
        # The only entry names somebody else entirely.
        AnswerFactory(user=UserFactory(), question=question, answer='Someone Else', points_earned=0, is_correct=False)

        prediction = award_predictions(_build_leaderboard(season.slug))[0]
        assert prediction['answer'] == 'Someone Else'
        assert prediction['correct_answer'] == 'Unpicked'
        assert prediction['runner_up_answer'] == 'Second'

    def test_an_ungraded_question_reports_no_result_rather_than_an_empty_string(self):
        season = CurrentSeasonFactory(slug='lock-10', year='lock-10')
        question = SuperlativeQuestionFactory(season=season, correct_answer='', is_finalized=False)
        AnswerFactory(user=UserFactory(), question=question, answer='A Guess', points_earned=0, is_correct=None)

        assert award_predictions(_build_leaderboard(season.slug))[0]['correct_answer'] is None
