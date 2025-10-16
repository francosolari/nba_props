from datetime import datetime, time
from ninja import Router
from ninja.errors import HttpError
from predictions.models import Season, Answer
from predictions.models.prediction import StandingPrediction
from ..schemas import SeasonCreateSchema
from ..utils import admin_required
from django.utils import timezone
from django.db.models import Q


def _serialize_datetime(value):
    if not value:
        return None
    if not isinstance(value, datetime):
        value = datetime.combine(value, time.min)
    if timezone.is_naive(value):
        value = timezone.make_aware(value)
    return timezone.localtime(value)

router = Router(tags=["seasons"])


@router.get("/", response=list[dict], summary="List seasons (desc)")
def list_seasons(request):
    seasons = Season.objects.order_by('-start_date').values(
        'slug',
        'year',
        'start_date',
        'end_date',
        'submission_start_date',
        'submission_end_date',
    )
    return [
        {
            'slug': s['slug'],
            'year': s['year'],
            'start_date': s['start_date'],
            'end_date': s['end_date'],
            'submission_start_date': _serialize_datetime(s['submission_start_date']),
            'submission_end_date': _serialize_datetime(s['submission_end_date']),
        }
        for s in seasons
    ]


@router.get("/latest", response=dict, summary="Get latest season")
def latest_season(request):
    season = Season.objects.order_by('-start_date').only('slug').first()
    return {'slug': season.slug if season else None}


@router.get("/user-participated", response=list[dict], summary="Get seasons user participated in")
def user_participated_seasons(request):
    """
    Get list of seasons where the current user has submitted answers or predictions.
    Returns seasons in descending order by start date.
    """
    if not request.user.is_authenticated:
        return []

    # Get seasons where user has answers
    answer_season_ids = Answer.objects.filter(user=request.user).values_list('question__season_id', flat=True).distinct()

    # Get seasons where user has standing predictions
    standing_season_ids = StandingPrediction.objects.filter(user=request.user).values_list('season_id', flat=True).distinct()

    # Combine both querysets
    season_ids = set(list(answer_season_ids) + list(standing_season_ids))

    if not season_ids:
        return []

    seasons = Season.objects.filter(id__in=season_ids).order_by('-start_date').values(
        'slug',
        'year',
        'start_date',
        'end_date',
        'submission_start_date',
        'submission_end_date',
    )

    return [
        {
            'slug': s['slug'],
            'year': s['year'],
            'start_date': s['start_date'],
            'end_date': s['end_date'],
            'submission_start_date': _serialize_datetime(s['submission_start_date']),
            'submission_end_date': _serialize_datetime(s['submission_end_date']),
        }
        for s in seasons
    ]


@router.post("/", response=dict, summary="Create new season")
@admin_required
def create_season(request, payload: SeasonCreateSchema):
    """
    Create a new Season record. Requires admin privileges.
    """
    if Season.objects.filter(year=payload.year).exists():
        raise HttpError(400, "A season with this year already exists.")

    submission_start = payload.submission_start_date
    submission_end = payload.submission_end_date

    if submission_start and submission_end and submission_start > submission_end:
        raise HttpError(400, "Submission start date must be on or before submission end date.")

    if payload.start_date > payload.end_date:
        raise HttpError(400, "Season start date must be on or before season end date.")

    season = Season.objects.create(
        year=payload.year,
        start_date=payload.start_date,
        end_date=payload.end_date,
        submission_start_date=submission_start,
        submission_end_date=submission_end,
    )

    return {
        'slug': season.slug,
        'year': season.year,
        'start_date': season.start_date,
        'end_date': season.end_date,
        'submission_start_date': _serialize_datetime(season.submission_start_date),
        'submission_end_date': _serialize_datetime(season.submission_end_date),
    }
