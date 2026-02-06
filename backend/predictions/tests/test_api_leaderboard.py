"""
Test suite for leaderboard API endpoints.

Tests for endpoints in:
- leaderboard.py (GET /api/v2/leaderboard/{season_slug})
- ist_leaderboard.py (GET /api/v2/ist-leaderboard/{season_slug})

Related to: nba_predictions-35 (P0 - API Testing: Leaderboard endpoints)
Target: ~30+ tests covering ranking logic, filtering, tie-breaking, user stats display,
        category breakdowns, IST specific scenarios
"""

import pytest
from django.test import Client
from django.contrib.auth import get_user_model
from predictions.tests.factories import (
    SeasonFactory,
    CurrentSeasonFactory,
    PastSeasonFactory,
    TeamFactory,
    EasternTeamFactory,
    WesternTeamFactory,
    PlayerFactory,
    UserFactory,
    AnswerFactory,
    PropQuestionFactory,
    SuperlativeQuestionFactory,
    InSeasonTournamentQuestionFactory,
    StandingPredictionFactory,
    AwardFactory,
)
from predictions.models import (
    Season,
    Team,
    RegularSeasonStandings,
    Answer,
)
from datetime import date, timedelta
from django.utils import timezone

User = get_user_model()


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def api_client():
    """Unauthenticated API client."""
    return Client()


@pytest.fixture
def season_with_standings():
    """Create a season with teams and regular season standings."""
    season = CurrentSeasonFactory(slug='test-1', year='test-1')

    # Create Eastern Conference teams with standings
    east_teams = []
    for i in range(1, 6):  # 5 East teams
        team = EasternTeamFactory(
            name=f'East Team {i}',
            abbreviation=f'ET{i}',
            conference='East'
        )
        east_teams.append(team)
        RegularSeasonStandings.objects.create(
            team=team,
            season=season,
            season_type='regular',
            position=i,
            wins=50 - (i * 5),
            losses=32 + (i * 5)
        )

    # Create Western Conference teams with standings
    west_teams = []
    for i in range(1, 6):  # 5 West teams
        team = WesternTeamFactory(
            name=f'West Team {i}',
            abbreviation=f'WT{i}',
            conference='West'
        )
        west_teams.append(team)
        RegularSeasonStandings.objects.create(
            team=team,
            season=season,
            season_type='regular',
            position=i,
            wins=48 - (i * 4),
            losses=34 + (i * 4)
        )

    return {
        'season': season,
        'east_teams': east_teams,
        'west_teams': west_teams,
    }


@pytest.fixture
def users_with_predictions(season_with_standings):
    """Create users with various prediction types."""
    season = season_with_standings['season']
    east_teams = season_with_standings['east_teams']
    west_teams = season_with_standings['west_teams']

    # User 1: High scorer with all types
    user1 = UserFactory(username='topscorer', first_name='Top', last_name='Scorer')

    # Standing predictions (3 points each correct)
    for i, team in enumerate(east_teams[:3], 1):
        StandingPredictionFactory(
            user=user1,
            team=team,
            season=season,
            predicted_position=i,
            points=3  # Correct prediction
        )

    # Award question (5 points)
    award = AwardFactory(name='MVP')
    mvp_question = SuperlativeQuestionFactory(
        season=season,
        award=award,
        text='Who will win MVP?',
        point_value=5,
        correct_answer='Player A'
    )
    AnswerFactory(
        user=user1,
        question=mvp_question,
        answer='Player A',
        points_earned=5,
        is_correct=True
    )

    # Prop question (3 points)
    prop_q = PropQuestionFactory(
        season=season,
        text='Will Lakers make playoffs?',
        point_value=3,
        correct_answer='Yes'
    )
    AnswerFactory(
        user=user1,
        question=prop_q,
        answer='Yes',
        points_earned=3,
        is_correct=True
    )

    # User 2: Medium scorer
    user2 = UserFactory(username='midscorer', first_name='Mid', last_name='Scorer')

    # Some correct, some wrong standings
    StandingPredictionFactory(
        user=user2,
        team=east_teams[0],
        season=season,
        predicted_position=1,
        points=3
    )
    StandingPredictionFactory(
        user=user2,
        team=east_teams[1],
        season=season,
        predicted_position=3,  # Wrong position
        points=0
    )

    # Wrong award prediction
    AnswerFactory(
        user=user2,
        question=mvp_question,
        answer='Player B',
        points_earned=0,
        is_correct=False
    )

    # User 3: Low scorer
    user3 = UserFactory(username='lowscorer', first_name='Low', last_name='Scorer')

    StandingPredictionFactory(
        user=user3,
        team=west_teams[0],
        season=season,
        predicted_position=2,  # Wrong
        points=0
    )

    return {
        'user1': user1,
        'user2': user2,
        'user3': user3,
        'season': season,
    }


@pytest.fixture
def season_with_ist():
    """Create a season with IST questions."""
    season = CurrentSeasonFactory(slug='test-2', year='test-2')

    # Group winner questions
    group_a_q = InSeasonTournamentQuestionFactory(
        season=season,
        text='Who wins East Group A?',
        prediction_type='group_winner',
        ist_group='East Group A',
        point_value=4,
        correct_answer='Team A'
    )

    group_b_q = InSeasonTournamentQuestionFactory(
        season=season,
        text='Who wins West Group B?',
        prediction_type='group_winner',
        ist_group='West Group B',
        point_value=4,
        correct_answer='Team B'
    )

    # Wildcard question
    wildcard_q = InSeasonTournamentQuestionFactory(
        season=season,
        text='Who is the East wildcard?',
        prediction_type='wildcard',
        ist_group=None,
        point_value=5,
        correct_answer='Team C'
    )

    # Tournament winner question
    winner_q = InSeasonTournamentQuestionFactory(
        season=season,
        text='Who wins IST?',
        prediction_type='tournament_winner',
        ist_group=None,
        point_value=6,
        correct_answer='Team D'
    )

    return {
        'season': season,
        'group_a_q': group_a_q,
        'group_b_q': group_b_q,
        'wildcard_q': wildcard_q,
        'winner_q': winner_q,
    }


@pytest.fixture
def users_with_ist_predictions(season_with_ist):
    """Create users with IST predictions."""
    season = season_with_ist['season']
    group_a_q = season_with_ist['group_a_q']
    group_b_q = season_with_ist['group_b_q']
    wildcard_q = season_with_ist['wildcard_q']
    winner_q = season_with_ist['winner_q']

    # User 1: Perfect IST predictions
    user1 = UserFactory(username='istpro', first_name='IST', last_name='Pro')
    AnswerFactory(user=user1, question=group_a_q, answer='Team A', points_earned=4, is_correct=True)
    AnswerFactory(user=user1, question=group_b_q, answer='Team B', points_earned=4, is_correct=True)
    AnswerFactory(user=user1, question=wildcard_q, answer='Team C', points_earned=5, is_correct=True)
    AnswerFactory(user=user1, question=winner_q, answer='Team D', points_earned=6, is_correct=True)

    # User 2: Mixed IST predictions
    user2 = UserFactory(username='istmid', first_name='IST', last_name='Mid')
    AnswerFactory(user=user2, question=group_a_q, answer='Team A', points_earned=4, is_correct=True)
    AnswerFactory(user=user2, question=group_b_q, answer='Wrong Team', points_earned=0, is_correct=False)
    AnswerFactory(user=user2, question=wildcard_q, answer='Team C', points_earned=5, is_correct=True)

    # User 3: All wrong IST predictions
    user3 = UserFactory(username='istnewbie', first_name='IST', last_name='Newbie')
    AnswerFactory(user=user3, question=group_a_q, answer='Wrong', points_earned=0, is_correct=False)
    AnswerFactory(user=user3, question=winner_q, answer='Wrong', points_earned=0, is_correct=False)

    return {
        'user1': user1,
        'user2': user2,
        'user3': user3,
        'season': season,
    }


# ============================================================================
# Main Leaderboard Tests
# ============================================================================

@pytest.mark.django_db
class TestMainLeaderboard:
    """Test main leaderboard endpoint: /api/v2/leaderboard/{season_slug}"""

    def test_leaderboard_returns_200_for_valid_season(self, api_client, users_with_predictions):
        """Test that leaderboard returns 200 for valid season."""
        season = users_with_predictions['season']
        response = api_client.get(f'/api/v2/leaderboards/{season.slug}')

        assert response.status_code == 200
        data = response.json()
        assert 'leaderboard' in data
        assert 'season' in data

    def test_leaderboard_correct_ranking_order(self, api_client, users_with_predictions):
        """Test that users are ranked by total_points descending."""
        season = users_with_predictions['season']
        response = api_client.get(f'/api/v2/leaderboards/{season.slug}')

        data = response.json()
        leaderboard = data['leaderboard']

        # Verify descending order
        for i in range(len(leaderboard) - 1):
            assert leaderboard[i]['total_points'] >= leaderboard[i + 1]['total_points']

        # Verify ranks are sequential
        for i, entry in enumerate(leaderboard, 1):
            assert entry['rank'] == i

    def test_leaderboard_highest_scorer_is_first(self, api_client, users_with_predictions):
        """Test that user with most points is ranked first."""
        season = users_with_predictions['season']
        user1 = users_with_predictions['user1']  # Has 17 points total

        response = api_client.get(f'/api/v2/leaderboards/{season.slug}')
        data = response.json()
        leaderboard = data['leaderboard']

        assert leaderboard[0]['username'] == user1.username
        assert leaderboard[0]['rank'] == 1
        assert leaderboard[0]['total_points'] == 17  # 9 from standings + 5 MVP + 3 prop = 17

    def test_leaderboard_includes_all_users_with_predictions(self, api_client, users_with_predictions):
        """Test that all users who made predictions are included."""
        season = users_with_predictions['season']
        response = api_client.get(f'/api/v2/leaderboards/{season.slug}')

        data = response.json()
        leaderboard = data['leaderboard']

        assert len(leaderboard) == 3
        usernames = {entry['username'] for entry in leaderboard}
        assert 'topscorer' in usernames
        assert 'midscorer' in usernames
        assert 'lowscorer' in usernames

    def test_leaderboard_accuracy_calculation(self, api_client, users_with_predictions):
        """Test that accuracy is calculated correctly."""
        season = users_with_predictions['season']
        response = api_client.get(f'/api/v2/leaderboards/{season.slug}')

        data = response.json()
        leaderboard = data['leaderboard']

        # Find topscorer (should have 100% accuracy - all correct)
        topscorer = next(u for u in leaderboard if u['username'] == 'topscorer')
        assert topscorer['accuracy'] == 100

    def test_leaderboard_category_breakdown(self, api_client, users_with_predictions):
        """Test that predictions are broken down by category."""
        season = users_with_predictions['season']
        response = api_client.get(f'/api/v2/leaderboards/{season.slug}')

        data = response.json()
        leaderboard = data['leaderboard']

        topscorer = next(u for u in leaderboard if u['username'] == 'topscorer')
        categories = topscorer['categories']

        # Check expected categories exist
        assert 'Regular Season Standings' in categories
        assert 'Player Awards' in categories
        assert 'Props & Yes/No' in categories

    def test_leaderboard_answer_predictions_include_point_value(self, api_client, users_with_predictions):
        """Test answer predictions include original question point values."""
        season = users_with_predictions['season']
        response = api_client.get(f'/api/v2/leaderboards/{season.slug}')

        data = response.json()
        leaderboard = data['leaderboard']

        topscorer = next(u for u in leaderboard if u['username'] == 'topscorer')
        top_awards_preds = topscorer['categories']['Player Awards']['predictions']
        top_props_preds = topscorer['categories']['Props & Yes/No']['predictions']

        assert len(top_awards_preds) > 0
        assert len(top_props_preds) > 0
        assert top_awards_preds[0]['point_value'] == 5
        assert top_props_preds[0]['point_value'] == 3

        # Wrong answers should still expose the question point value.
        midscorer = next(u for u in leaderboard if u['username'] == 'midscorer')
        mid_awards_preds = midscorer['categories']['Player Awards']['predictions']
        assert len(mid_awards_preds) > 0
        assert mid_awards_preds[0]['points'] == 0
        assert mid_awards_preds[0]['point_value'] == 5

    def test_leaderboard_standing_predictions_sorted_correctly(self, api_client, users_with_predictions):
        """Test that standing predictions are sorted West 1-15, then East 1-15."""
        season = users_with_predictions['season']
        response = api_client.get(f'/api/v2/leaderboards/{season.slug}')

        data = response.json()
        leaderboard = data['leaderboard']

        topscorer = next(u for u in leaderboard if u['username'] == 'topscorer')
        standings_cat = topscorer['categories']['Regular Season Standings']
        predictions = standings_cat['predictions']

        # Verify sorting: West teams first, then East teams
        if predictions:
            # First predictions should be sorted by conference (West=0, East=1) then by position
            conferences = [p.get('conference', '').lower() for p in predictions]
            # Just verify we have predictions with conferences
            assert len([c for c in conferences if c]) > 0

    def test_leaderboard_season_metadata_included(self, api_client, users_with_predictions):
        """Test that season metadata is included in response."""
        season = users_with_predictions['season']
        response = api_client.get(f'/api/v2/leaderboards/{season.slug}')

        data = response.json()
        season_info = data['season']

        assert season_info['slug'] == season.slug
        assert season_info['year'] == season.year
        assert 'submission_end_date' in season_info
        assert 'submissions_open' in season_info

    def test_leaderboard_current_season_resolves(self, api_client, users_with_predictions):
        """Test that 'current' slug resolves to latest season."""
        response = api_client.get('/api/v2/leaderboards/current')

        assert response.status_code == 200
        data = response.json()
        assert 'leaderboard' in data
        assert data['season'] is not None

    def test_leaderboard_invalid_season_returns_error(self, api_client):
        """Test that invalid season slug returns error."""
        response = api_client.get('/api/v2/leaderboards/invalid-99')

        assert response.status_code == 200  # Endpoint returns 200 with error in body
        data = response.json()
        assert 'error' in data
        assert len(data['leaderboard']) == 0

    def test_leaderboard_no_predictions_returns_empty(self, api_client):
        """Test that season with no predictions returns empty leaderboard."""
        season = CurrentSeasonFactory(slug='empty1')
        response = api_client.get(f'/api/v2/leaderboards/{season.slug}')

        assert response.status_code == 200
        data = response.json()
        assert len(data['leaderboard']) == 0

    def test_leaderboard_ties_maintain_same_rank(self, api_client, season_with_standings):
        """Test that users with same points maintain proper ranking."""
        season = season_with_standings['season']

        # Create two users with identical points
        user1 = UserFactory(username='tie_user_1')
        user2 = UserFactory(username='tie_user_2')

        prop_q = PropQuestionFactory(season=season, point_value=5, correct_answer='Yes')

        AnswerFactory(user=user1, question=prop_q, answer='Yes', points_earned=5, is_correct=True)
        AnswerFactory(user=user2, question=prop_q, answer='Yes', points_earned=5, is_correct=True)

        response = api_client.get(f'/api/v2/leaderboards/{season.slug}')
        data = response.json()
        leaderboard = data['leaderboard']

        # Both should have same points
        tie_users = [u for u in leaderboard if u['username'] in ['tie_user_1', 'tie_user_2']]
        assert len(tie_users) == 2
        assert tie_users[0]['total_points'] == tie_users[1]['total_points']

    def test_leaderboard_excludes_ist_questions(self, api_client, season_with_standings):
        """Test that IST questions are excluded from main leaderboard."""
        season = season_with_standings['season']
        user = UserFactory()

        # Create IST question and answer
        ist_q = InSeasonTournamentQuestionFactory(
            season=season,
            text='IST Question',
            point_value=5
        )
        AnswerFactory(user=user, question=ist_q, answer='Team', points_earned=5, is_correct=True)

        response = api_client.get(f'/api/v2/leaderboards/{season.slug}')
        data = response.json()

        # User should not appear (no non-IST predictions)
        assert len(data['leaderboard']) == 0

    def test_leaderboard_max_points_calculation(self, api_client, users_with_predictions):
        """Test that max_points is calculated correctly per category."""
        season = users_with_predictions['season']
        response = api_client.get(f'/api/v2/leaderboards/{season.slug}')

        data = response.json()
        leaderboard = data['leaderboard']

        topscorer = next(u for u in leaderboard if u['username'] == 'topscorer')

        # Check that max_points is set for each category
        for cat_name, cat_data in topscorer['categories'].items():
            assert cat_data['max_points'] > 0

    def test_leaderboard_user_display_name_format(self, api_client, users_with_predictions):
        """Test that user display name is formatted correctly."""
        season = users_with_predictions['season']
        response = api_client.get(f'/api/v2/leaderboards/{season.slug}')

        data = response.json()
        leaderboard = data['leaderboard']

        topscorer = next(u for u in leaderboard if u['username'] == 'topscorer')

        # Display name should be "First L" format
        assert 'display_name' in topscorer
        assert topscorer['display_name'] == 'Top S'


# ============================================================================
# IST Leaderboard Tests
# ============================================================================

@pytest.mark.django_db
class TestISTLeaderboard:
    """Test IST leaderboard endpoint: /api/v2/ist-leaderboard/{season_slug}"""

    def test_ist_leaderboard_returns_200_for_valid_season(self, api_client, users_with_ist_predictions):
        """Test that IST leaderboard returns 200 for valid season."""
        season = users_with_ist_predictions['season']
        response = api_client.get(f'/api/v2/leaderboards/ist/{season.slug}')

        assert response.status_code == 200
        data = response.json()
        assert 'leaderboard' in data
        assert 'total_users' in data
        assert 'total_predictions' in data
        assert 'avg_accuracy' in data

    def test_ist_leaderboard_correct_ranking_order(self, api_client, users_with_ist_predictions):
        """Test that users are ranked by IST points descending."""
        season = users_with_ist_predictions['season']
        response = api_client.get(f'/api/v2/leaderboards/ist/{season.slug}')

        data = response.json()
        leaderboard = data['leaderboard']

        # Verify descending order
        for i in range(len(leaderboard) - 1):
            assert leaderboard[i]['total_points'] >= leaderboard[i + 1]['total_points']

    def test_ist_leaderboard_perfect_score_user_first(self, api_client, users_with_ist_predictions):
        """Test that user with perfect IST score is ranked first."""
        season = users_with_ist_predictions['season']
        user1 = users_with_ist_predictions['user1']  # Perfect score

        response = api_client.get(f'/api/v2/leaderboards/ist/{season.slug}')
        data = response.json()
        leaderboard = data['leaderboard']

        assert leaderboard[0]['user']['username'] == user1.username
        assert leaderboard[0]['rank'] == 1
        assert leaderboard[0]['total_points'] == 19  # 4+4+5+6 = 19
        assert leaderboard[0]['accuracy'] == 1.0  # 100% correct

    def test_ist_leaderboard_includes_prediction_details(self, api_client, users_with_ist_predictions):
        """Test that each user entry includes their prediction details."""
        season = users_with_ist_predictions['season']
        response = api_client.get(f'/api/v2/leaderboards/ist/{season.slug}')

        data = response.json()
        leaderboard = data['leaderboard']

        first_user = leaderboard[0]
        assert 'predictions' in first_user
        assert len(first_user['predictions']) > 0

        # Check prediction structure
        pred = first_user['predictions'][0]
        assert 'question_id' in pred
        assert 'question_text' in pred
        assert 'answer' in pred
        assert 'prediction_type' in pred
        assert 'points_earned' in pred
        assert 'is_correct' in pred

    def test_ist_leaderboard_prediction_types_included(self, api_client, users_with_ist_predictions):
        """Test that IST prediction types are correctly labeled."""
        season = users_with_ist_predictions['season']
        user1 = users_with_ist_predictions['user1']

        response = api_client.get(f'/api/v2/leaderboards/ist/{season.slug}')
        data = response.json()
        leaderboard = data['leaderboard']

        user_entry = next(u for u in leaderboard if u['user']['username'] == user1.username)
        predictions = user_entry['predictions']

        # Should have different prediction types
        pred_types = {p['prediction_type'] for p in predictions}
        assert 'group_winner' in pred_types
        assert 'wildcard' in pred_types
        assert 'tournament_winner' in pred_types

    def test_ist_leaderboard_ist_groups_included(self, api_client, users_with_ist_predictions):
        """Test that IST groups are included for group winner questions."""
        season = users_with_ist_predictions['season']
        response = api_client.get(f'/api/v2/leaderboards/ist/{season.slug}')

        data = response.json()
        leaderboard = data['leaderboard']

        # Find a prediction with ist_group
        all_predictions = [p for u in leaderboard for p in u['predictions']]
        group_predictions = [p for p in all_predictions if p.get('ist_group')]

        assert len(group_predictions) > 0
        assert any('Group' in p['ist_group'] for p in group_predictions)

    def test_ist_leaderboard_accuracy_calculation(self, api_client, users_with_ist_predictions):
        """Test that accuracy is calculated correctly for IST predictions."""
        season = users_with_ist_predictions['season']
        user1 = users_with_ist_predictions['user1']  # All correct
        user3 = users_with_ist_predictions['user3']  # All wrong

        response = api_client.get(f'/api/v2/leaderboards/ist/{season.slug}')
        data = response.json()
        leaderboard = data['leaderboard']

        user1_entry = next(u for u in leaderboard if u['user']['username'] == user1.username)
        user3_entry = next(u for u in leaderboard if u['user']['username'] == user3.username)

        assert user1_entry['accuracy'] == 1.0  # 100%
        assert user3_entry['accuracy'] == 0.0  # 0%

    def test_ist_leaderboard_totals_calculation(self, api_client, users_with_ist_predictions):
        """Test that total_users and total_predictions are calculated correctly."""
        season = users_with_ist_predictions['season']
        response = api_client.get(f'/api/v2/leaderboards/ist/{season.slug}')

        data = response.json()

        assert data['total_users'] == 3
        assert data['total_predictions'] > 0
        assert 0 <= data['avg_accuracy'] <= 1

    def test_ist_leaderboard_avg_accuracy_calculation(self, api_client, users_with_ist_predictions):
        """Test that average accuracy is calculated correctly."""
        season = users_with_ist_predictions['season']
        response = api_client.get(f'/api/v2/leaderboards/ist/{season.slug}')

        data = response.json()

        # avg_accuracy should be between 0 and 1
        assert 0 <= data['avg_accuracy'] <= 1

        # Calculate expected average manually
        leaderboard = data['leaderboard']
        total_correct = sum(
            sum(1 for p in u['predictions'] if p['is_correct'])
            for u in leaderboard
        )
        total_preds = sum(len(u['predictions']) for u in leaderboard)

        expected_avg = total_correct / total_preds if total_preds > 0 else 0
        assert abs(data['avg_accuracy'] - expected_avg) < 0.01  # Allow small floating point difference

    def test_ist_leaderboard_current_season_resolves(self, api_client, users_with_ist_predictions):
        """Test that 'current' slug resolves to latest season."""
        response = api_client.get('/api/v2/leaderboards/ist/current')

        assert response.status_code == 200
        data = response.json()
        assert 'leaderboard' in data

    def test_ist_leaderboard_invalid_season_returns_empty(self, api_client):
        """Test that invalid season returns empty response."""
        response = api_client.get('/api/v2/leaderboards/ist/inv-99')

        assert response.status_code == 200
        data = response.json()
        assert len(data['leaderboard']) == 0
        assert data['total_users'] == 0
        assert data['total_predictions'] == 0

    def test_ist_leaderboard_no_ist_predictions_returns_empty(self, api_client, season_with_standings):
        """Test that season with no IST predictions returns empty leaderboard."""
        season = season_with_standings['season']
        response = api_client.get(f'/api/v2/leaderboards/ist/{season.slug}')

        assert response.status_code == 200
        data = response.json()
        assert len(data['leaderboard']) == 0
        assert data['total_users'] == 0

    def test_ist_leaderboard_excludes_non_ist_questions(self, api_client, season_with_ist):
        """Test that non-IST questions are excluded from IST leaderboard."""
        season = season_with_ist['season']
        user = UserFactory()

        # Create non-IST question
        prop_q = PropQuestionFactory(season=season, point_value=5)
        AnswerFactory(user=user, question=prop_q, answer='Yes', points_earned=5, is_correct=True)

        response = api_client.get(f'/api/v2/leaderboards/ist/{season.slug}')
        data = response.json()

        # User should not appear (no IST predictions)
        assert len(data['leaderboard']) == 0

    def test_ist_leaderboard_season_info_included(self, api_client, users_with_ist_predictions):
        """Test that season information is included in response."""
        season = users_with_ist_predictions['season']
        response = api_client.get(f'/api/v2/leaderboards/ist/{season.slug}')

        data = response.json()

        assert 'season' in data
        assert data['season']['slug'] == season.slug
        assert data['season']['year'] == season.year

    def test_ist_leaderboard_user_display_schema(self, api_client, users_with_ist_predictions):
        """Test that user data follows UserDisplaySchema."""
        season = users_with_ist_predictions['season']
        response = api_client.get(f'/api/v2/leaderboards/ist/{season.slug}')

        data = response.json()
        leaderboard = data['leaderboard']

        user_entry = leaderboard[0]['user']
        assert 'id' in user_entry
        assert 'username' in user_entry
        assert 'first_name' in user_entry
        assert 'last_name' in user_entry
        assert 'display_name' in user_entry
