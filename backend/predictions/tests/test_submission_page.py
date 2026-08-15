"""Regression tests for the public submissions-page shell."""

from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from predictions.models.season import Season


class SubmissionPageAccessTests(TestCase):
    """Ensure guests can reach React before authentication is required."""

    @classmethod
    def setUpTestData(cls):
        """Create an active season used by the public route."""
        now = timezone.now()
        cls.season = Season.objects.create(
            year="2025-26",
            slug="2025-26",
            start_date=now.date() - timedelta(days=30),
            end_date=now.date() + timedelta(days=150),
            submission_start_date=now - timedelta(days=7),
            submission_end_date=now + timedelta(days=21),
        )

    def test_guest_can_open_submissions_page(self):
        """Anonymous visitors should see the submissions mount, not a login redirect."""
        response = self.client.get(reverse(
            "predictions_views:submit_predictions_view",
            kwargs={"season_slug": self.season.slug},
        ))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="submissions-root"')
        self.assertContains(response, 'data-season-slug="2025-26"')
