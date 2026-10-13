from django.test import TestCase, override_settings

BEACON = 'static.cloudflareinsights.com/beacon.min.js'


# Plain static storage, so the page renders without a collectstatic manifest.
@override_settings(STATICFILES_STORAGE='django.contrib.staticfiles.storage.StaticFilesStorage')
class WebAnalyticsBeaconTest(TestCase):
    """The cookieless Cloudflare beacon loads only in production, and only with a token."""

    @override_settings(IS_DEVELOPMENT=False, CF_WEB_ANALYTICS_TOKEN='abc123')
    def test_beacon_in_production_with_token(self):
        html = self.client.get('/accounts/login/').content.decode()
        self.assertIn(BEACON, html)
        self.assertIn('"token": "abc123"', html)

    @override_settings(IS_DEVELOPMENT=False, CF_WEB_ANALYTICS_TOKEN='')
    def test_no_beacon_without_token(self):
        self.assertNotIn(BEACON, self.client.get('/accounts/login/').content.decode())

    @override_settings(IS_DEVELOPMENT=True, CF_WEB_ANALYTICS_TOKEN='abc123')
    def test_no_beacon_in_development(self):
        self.assertNotIn(BEACON, self.client.get('/accounts/login/').content.decode())
