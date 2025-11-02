"""
Management command to mark all existing users as email verified.
This grandfathers in users who signed up before email verification was enabled.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from allauth.account.models import EmailAddress
from accounts.models import UserOnboarding


class Command(BaseCommand):
    help = 'Mark all existing users as email verified (grandfather existing users)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        users_without_email = []
        users_to_verify = []
        already_verified = []
        onboarding_completed = []

        for user in User.objects.all():
            if not user.email:
                users_without_email.append(user.username)
                continue

            # Get or create EmailAddress record
            email_address, created = EmailAddress.objects.get_or_create(
                user=user,
                email=user.email.lower(),
                defaults={
                    'verified': True,
                    'primary': True,
                }
            )

            if created:
                users_to_verify.append(user.email)
                self.stdout.write(
                    self.style.SUCCESS(f"{'[DRY RUN] ' if dry_run else ''}Created and verified: {user.username} ({user.email})")
                )
            elif not email_address.verified:
                if not dry_run:
                    email_address.verified = True
                    email_address.primary = True
                    email_address.save()
                users_to_verify.append(user.email)
                self.stdout.write(
                    self.style.SUCCESS(f"{'[DRY RUN] ' if dry_run else ''}Verified: {user.username} ({user.email})")
                )
            else:
                already_verified.append(user.email)

            # Mark onboarding as complete for existing users
            try:
                onboarding = user.onboarding
                if not onboarding.onboarding_complete:
                    if not dry_run:
                        onboarding.mark_complete()
                    onboarding_completed.append(user.username)
                    self.stdout.write(
                        self.style.SUCCESS(f"{'[DRY RUN] ' if dry_run else ''}Marked onboarding complete: {user.username}")
                    )
            except UserOnboarding.DoesNotExist:
                # Create and mark complete
                if not dry_run:
                    onboarding = UserOnboarding.objects.create(user=user)
                    onboarding.mark_complete()
                onboarding_completed.append(user.username)
                self.stdout.write(
                    self.style.SUCCESS(f"{'[DRY RUN] ' if dry_run else ''}Created and completed onboarding: {user.username}")
                )

        # Summary
        self.stdout.write(self.style.SUCCESS('\n--- Summary ---'))
        self.stdout.write(f"Total users: {User.objects.count()}")
        self.stdout.write(f"Already verified: {len(already_verified)}")
        self.stdout.write(f"Newly verified: {len(users_to_verify)}")
        self.stdout.write(f"Onboarding completed: {len(onboarding_completed)}")
        self.stdout.write(f"Users without email: {len(users_without_email)}")

        if users_without_email:
            self.stdout.write(self.style.WARNING(f"\nUsers without email addresses: {', '.join(users_without_email)}"))

        if dry_run:
            self.stdout.write(self.style.WARNING('\nThis was a dry run. Use without --dry-run to apply changes.'))
        else:
            self.stdout.write(self.style.SUCCESS('\nAll existing users have been grandfathered in with verified emails and completed onboarding!'))
