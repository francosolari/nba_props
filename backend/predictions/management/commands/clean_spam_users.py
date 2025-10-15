"""
Management command to identify and clean spam users.

Usage:
    python manage.py clean_spam_users --dry-run  # Preview what would be deleted
    python manage.py clean_spam_users --delete   # Actually delete spam users
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from predictions.models import Answer, StandingPrediction
from allauth.socialaccount.models import SocialAccount


class Command(BaseCommand):
    help = 'Identify and optionally delete spam users (users with no predictions)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Actually delete spam users (default is dry-run)',
        )
        parser.add_argument(
            '--min-age-days',
            type=int,
            default=7,
            help='Only consider users created at least this many days ago (default: 7)',
        )

    def handle(self, *args, **options):
        from datetime import timedelta
        from django.utils import timezone

        delete = options['delete']
        min_age_days = options['min_age_days']
        min_date = timezone.now() - timedelta(days=min_age_days)

        self.stdout.write(self.style.NOTICE(
            f"{'=' * 80}\n"
            f"{'DELETING' if delete else 'DRY RUN - Preview only'}\n"
            f"Minimum account age: {min_age_days} days\n"
            f"{'=' * 80}\n"
        ))

        # Find spam users using efficient database queries
        from django.db.models import Q, Count, Exists, OuterRef

        # Get users with social accounts
        social_user_ids = SocialAccount.objects.values_list('user_id', flat=True)

        # Find users with NO predictions and NO social accounts
        spam_users = User.objects.filter(
            date_joined__lt=min_date
        ).exclude(
            id__in=social_user_ids
        ).annotate(
            answer_count=Count('answer', distinct=True),
            standing_count=Count('standingprediction', distinct=True)
        ).filter(
            answer_count=0,
            standing_count=0
        )

        spam_count = spam_users.count()

        if spam_count == 0:
            self.stdout.write(self.style.SUCCESS("No spam users found!"))
            return

        self.stdout.write(self.style.WARNING(
            f"Found {spam_count} spam users (no predictions)\n"
        ))

        # Show sample
        self.stdout.write("\nSample spam users:")
        self.stdout.write("-" * 80)
        for user in spam_users[:20]:
            self.stdout.write(
                f"  {user.username:25} | {user.email:40} | {user.date_joined.strftime('%Y-%m-%d')}"
            )

        if spam_count > 20:
            self.stdout.write(f"  ... and {spam_count - 20} more")

        # Delete if requested
        if delete:
            self.stdout.write("\n" + "-" * 80)
            confirm = input(f"\nAre you sure you want to DELETE {spam_count} spam users? (yes/no): ")

            if confirm.lower() == 'yes':
                # Use bulk delete for efficiency
                deleted_count, _ = spam_users.delete()

                self.stdout.write(self.style.SUCCESS(
                    f"\n✓ Successfully deleted {deleted_count} spam users!"
                ))
            else:
                self.stdout.write(self.style.WARNING("\nCancelled - no users deleted"))
        else:
            self.stdout.write(self.style.NOTICE(
                f"\nThis was a DRY RUN. To actually delete these users, run:\n"
                f"  python manage.py clean_spam_users --delete\n"
            ))
