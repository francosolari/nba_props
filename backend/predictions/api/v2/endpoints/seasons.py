from ninja import Router
from ninja.errors import HttpError
from predictions.models import Season
from ..schemas import SeasonCreateSchema
from ..utils import admin_required

router = Router(tags=["seasons"])


@router.get("/", response=list[dict], summary="List seasons (desc)")
def list_seasons(request):
    seasons = Season.objects.order_by('-start_date').values('slug', 'year', 'start_date', 'end_date', 'submission_start_date', 'submission_end_date')
    return [
        {
            'slug': s['slug'],
            'year': s['year'],
            'start_date': s['start_date'],
            'end_date': s['end_date'],
            'submission_start_date': s['submission_start_date'],
            'submission_end_date': s['submission_end_date'],
        }
        for s in seasons
    ]


@router.get("/latest", response=dict, summary="Get latest season")
def latest_season(request):
    season = Season.objects.order_by('-start_date').only('slug').first()
    return {'slug': season.slug if season else None}


@router.post("/", response=dict, summary="Create new season")
@admin_required
def create_season(request, payload: SeasonCreateSchema):
    """
    Create a new Season record. Requires admin privileges.
    """
    if Season.objects.filter(year=payload.year).exists():
        raise HttpError(400, "A season with this year already exists.")

    if payload.submission_start_date > payload.submission_end_date:
        raise HttpError(400, "Submission start date must be on or before submission end date.")

    if payload.start_date > payload.end_date:
        raise HttpError(400, "Season start date must be on or before season end date.")

    season = Season.objects.create(
        year=payload.year,
        start_date=payload.start_date,
        end_date=payload.end_date,
        submission_start_date=payload.submission_start_date,
        submission_end_date=payload.submission_end_date,
    )

    return {
        'slug': season.slug,
        'year': season.year,
        'start_date': season.start_date,
        'end_date': season.end_date,
        'submission_start_date': season.submission_start_date,
        'submission_end_date': season.submission_end_date,
    }
