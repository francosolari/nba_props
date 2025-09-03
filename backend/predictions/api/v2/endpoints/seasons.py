from ninja import Router
from django.shortcuts import get_object_or_404
from predictions.models import Season

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
