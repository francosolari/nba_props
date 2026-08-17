from .models import Season


def current_season(request):
    """Expose the latest season to every template, so copy referencing
    "this season" doesn't need a hardcoded year (e.g. account pages
    rendered outside any season-scoped view, like login and onboarding).
    """
    return {'current_season': Season.objects.order_by('-start_date').first()}
