"""
Homepage API Endpoints

This module handles all homepage-related API endpoints including:
- Random predictions for ticker
- Random props/questions for ticker  
- Combined homepage data (mini leaderboard + standings)

Endpoints:
- GET /random-predictions - Get random user predictions for ticker
- GET /random-props - Get random props/questions for ticker
- GET /data - Get all homepage data in one call

Per-user prediction analysis lives in `user_insights.py`.

The NBA schedule feed lives in `schedule.py`; the crawler itself is
`predictions.services.nba_schedule`.
"""

import logging
import random
from typing import List, Optional

from ninja import Router
from django.contrib.auth import get_user_model
from django.db.models import Sum
from django.http import JsonResponse
from django.utils import timezone
from pydantic import BaseModel, Field

from predictions.models import (
    Prediction, Answer, Season, UserStats,
    RegularSeasonStandings, InSeasonTournamentStandings
)
from predictions.api.v2.utils import results_visible
from predictions.api.v2.schemas import (
    RandomPredictionsResponseSchema, RandomPropsResponseSchema,
    ErrorSchema
)

logger = logging.getLogger(__name__)

# Create router for homepage endpoints
router = Router(tags=["Homepage"])


def _display_name(user):
    """
    Return a user's display name the way the leaderboard does.

    Most accounts predate UserProfile, so fall back to the "First L." form built
    from the user's own name fields before dropping to the username.
    """
    profile = getattr(user, 'userprofile', None)
    name = getattr(profile, 'display_name', None)
    if name and name != user.username:
        return name
    if user.first_name and user.last_name:
        return f"{user.first_name} {user.last_name[0].upper()}."
    return user.first_name or user.username


def _resolve_season(season_slug):
    """Resolve an explicit slug, falling back to the most recent season."""
    if season_slug and season_slug not in ('current', 'latest'):
        return Season.objects.filter(slug=season_slug).first()
    return Season.objects.order_by('-start_date').first()


@router.get(
    "/random-predictions",
    response={200: RandomPredictionsResponseSchema, 500: ErrorSchema},
    summary="Get Random Predictions",
    description="""
    Retrieve random user predictions for the homepage ticker.

    Returns 10 random predictions from the current season with formatted
    messages suitable for display in a ticker/carousel format.
    """
)
def get_random_predictions(request):
    """Get random user predictions for the ticker"""
    try:
        # Get random predictions with user info
        predictions = Prediction.objects.select_related('user', 'user__userprofile').filter(
            season=Season.objects.get(is_current=True)
        ).order_by('?')[:10]  # Get 10 random predictions

        ticker_items = []
        for pred in predictions:
            display_name = _display_name(pred.user)

            # Create ticker message based on prediction type
            if hasattr(pred, 'standingprediction'):
                standing_pred = pred.standingprediction
                message = f"{display_name} predicts {standing_pred.team.name} will finish #{standing_pred.predicted_position}"
            elif hasattr(pred, 'playoffprediction'):
                playoff_pred = pred.playoffprediction
                message = f"{display_name} predicts {playoff_pred.team.name} will make the playoffs"
            else:
                message = f"{display_name} made a prediction"

            ticker_items.append({
                'message': message,
                'user': display_name,
                'type': 'prediction'
            })

        return {'ticker_items': ticker_items}

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@router.get(
    "/random-props",
    response={200: RandomPropsResponseSchema, 500: ErrorSchema},
    summary="Get Random Props",
    description="""
    Retrieve random user answers to props/questions for the homepage ticker.

    Returns 10 random answers with formatted messages suitable for 
    display in a ticker/carousel format.
    """
)
def get_random_props(request):
    """Get random props/questions for the ticker"""
    try:
        # Get random answers with their questions
        answers = Answer.objects.select_related('user', 'user__userprofile').order_by('?')[:10]

        ticker_items = []
        for answer in answers:
            display_name = _display_name(answer.user)

            # Create different message formats
            message_formats = [
                f"{display_name} says {answer.question.question_text}: {answer.answer_text}",
                f"'{answer.answer_text}' - {display_name} on {answer.question.question_text}",
                f"{display_name}: {answer.answer_text} ({answer.question.question_text})"
            ]

            ticker_items.append({
                'message': random.choice(message_formats),
                'user': display_name,
                'type': 'prop',
                'question': answer.question.question_text,
                'answer': answer.answer_text
            })

        return {'ticker_items': ticker_items}

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


class HomepagePlayerSchema(BaseModel):
    """A pool participant as the homepage displays them."""
    id: int
    username: str
    display_name: str
    points: float = 0.0
    rank: int = 0


class HomepageStandingSchema(BaseModel):
    team: str
    wins: int
    losses: int
    position: Optional[int] = None
    # Feeds the homepage's finish projection, which weights recent games more
    # heavily than the season-long record. Null on rows written before the
    # column existed; the projection falls back to the season rate.
    last_ten_wins: Optional[int] = None


class HomepageStandingsSchema(BaseModel):
    eastern: List[HomepageStandingSchema] = Field(default_factory=list)
    western: List[HomepageStandingSchema] = Field(default_factory=list)


class HomepageCupSchema(BaseModel):
    """The NBA Cup result, published only once a champion has been recorded."""
    champion_team: str
    winner: Optional[HomepagePlayerSchema] = None
    tied_winners: List[HomepagePlayerSchema] = Field(default_factory=list)


class HomepageSeasonSchema(BaseModel):
    slug: str
    year: str
    complete: bool = False


class HomepageDataSchema(BaseModel):
    season: Optional[HomepageSeasonSchema] = None
    mini_leaderboard: List[HomepagePlayerSchema] = Field(default_factory=list)
    mini_standings: HomepageStandingsSchema = Field(default_factory=HomepageStandingsSchema)
    podium: List[HomepagePlayerSchema] = Field(default_factory=list)
    cup: Optional[HomepageCupSchema] = None
    results_locked: bool = False


def _ranked_players(season, limit=None):
    """Season standings for the pool itself, ranked by graded points."""
    stats = UserStats.objects.filter(
        season=season
    ).select_related('user', 'user__userprofile').order_by('-points', 'user__username')

    if limit:
        stats = stats[:limit]

    return [
        HomepagePlayerSchema(
            id=stat.user.id,
            username=stat.user.username,
            display_name=_display_name(stat.user),
            points=stat.points,
            rank=index,
        )
        for index, stat in enumerate(stats, 1)
    ]


def _cup_result(season):
    """
    The Cup honour is published only once an admin has recorded the champion
    team, which is the signal that the final has actually been played. Until
    then the pool's Cup standings are still provisional and nothing is shown.
    """
    champion = InSeasonTournamentStandings.objects.filter(
        season=season, ist_champion=True
    ).select_related('team').first()

    if not champion:
        return None

    # display_name is a profile property rather than a column, so the totals are
    # aggregated by id and the winning users are resolved afterwards.
    totals = Answer.objects.filter(
        question__season=season,
        question__polymorphic_ctype__model='inseasontournamentquestion',
    ).values('user_id').annotate(points=Sum('points_earned')).order_by('-points')

    ranked = [row for row in totals if (row['points'] or 0) > 0]
    if not ranked:
        return HomepageCupSchema(champion_team=champion.team.name)

    best = ranked[0]['points']
    winning_ids = [row['user_id'] for row in ranked if row['points'] == best]
    users = get_user_model().objects.filter(
        id__in=winning_ids
    ).select_related('userprofile').order_by('username')

    leaders = [
        HomepagePlayerSchema(
            id=user.id,
            username=user.username,
            display_name=_display_name(user),
            points=best,
            rank=1,
        )
        for user in users
    ]

    return HomepageCupSchema(
        champion_team=champion.team.name,
        winner=leaders[0] if len(leaders) == 1 else None,
        tied_winners=leaders if len(leaders) > 1 else [],
    )


@router.get(
    "/data",
    response={200: HomepageDataSchema, 500: ErrorSchema},
    summary="Get Homepage Data",
    description="""
    Get all homepage data in a single optimized call.

    Returns the pool leaders, the conference standings, the final podium once a
    season has ended, and the NBA Cup result once a champion has been recorded.
    Pass `season_slug` to scope the response to a specific season; it defaults
    to the most recent one.
    """
)
def get_homepage_data(request, season_slug: str = None):
    """Get all homepage data in one call"""
    try:
        season = _resolve_season(season_slug)

        if not season:
            return HomepageDataSchema()

        # Standings and the season's own honours are public NBA facts, but the
        # pool's table, podium, and Cup winner are other people's entries and
        # stay sealed until the submission window closes.
        visible = results_visible(season, request.user)
        players = _ranked_players(season) if visible else []
        complete = season.end_date < timezone.localdate()

        standings = {}
        for key, conference in (('eastern', 'East'), ('western', 'West')):
            standings[key] = [
                HomepageStandingSchema(
                    team=standing.team.name,
                    wins=standing.wins,
                    losses=standing.losses,
                    position=standing.position,
                    last_ten_wins=standing.last_ten_wins,
                )
                # The whole conference, not a top five: home shows each entry's
                # board against the real ladder, and a truncated table would
                # hide exactly the misses further down that cost the most.
                for standing in RegularSeasonStandings.objects.filter(
                    season=season, team__conference=conference
                ).select_related('team').order_by('position')
            ]

        return HomepageDataSchema(
            season=HomepageSeasonSchema(slug=season.slug, year=season.year, complete=complete),
            mini_leaderboard=players[:5],
            mini_standings=HomepageStandingsSchema(**standings),
            podium=players[:3] if complete else [],
            cup=_cup_result(season) if visible else None,
            results_locked=not visible,
        )

    except Exception as e:
        logger.exception("Failed to build homepage data")
        return JsonResponse({'error': str(e)}, status=500)
