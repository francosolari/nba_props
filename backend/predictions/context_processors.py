from django.conf import settings

from .models import Season


def current_season(request):
    """Expose the latest season to every template, so copy referencing
    "this season" doesn't need a hardcoded year (e.g. account pages
    rendered outside any season-scoped view, like login and onboarding).
    """
    return {'current_season': Season.objects.order_by('-start_date').first()}


def web_analytics(request):
    """The Cloudflare Web Analytics token, outside development only."""
    return {'cf_web_analytics_token': '' if settings.IS_DEVELOPMENT else settings.CF_WEB_ANALYTICS_TOKEN}
