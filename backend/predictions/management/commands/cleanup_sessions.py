"""
Django management command to clean up expired sessions with enhanced monitoring.

This command extends Django's built-in clearsessions to provide better logging
and monitoring for production use with scheduled tasks.
"""
from django.core.management.base import BaseCommand
from django.contrib.sessions.models import Session
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Deletes expired sessions from the database with detailed logging'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)

        # Get current time
        now = timezone.now()

        # Count total sessions before cleanup
        total_sessions = Session.objects.count()

        # Find expired sessions
        expired_sessions = Session.objects.filter(expire_date__lt=now)
        expired_count = expired_sessions.count()

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN: Would delete {expired_count} expired sessions '
                    f'out of {total_sessions} total sessions'
                )
            )
            return

        # Delete expired sessions
        if expired_count > 0:
            deleted_count, _ = expired_sessions.delete()
            remaining_sessions = Session.objects.count()

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully deleted {deleted_count} expired sessions. '
                    f'Remaining: {remaining_sessions} sessions'
                )
            )

            logger.info(
                f'Session cleanup completed: deleted {deleted_count} expired sessions, '
                f'{remaining_sessions} sessions remaining'
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'No expired sessions to delete. Total sessions: {total_sessions}'
                )
            )

            logger.info(f'Session cleanup: no expired sessions found. Total: {total_sessions}')
