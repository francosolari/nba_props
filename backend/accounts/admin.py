from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from allauth.account.models import EmailAddress
from allauth.account.admin import EmailAddressAdmin as AllauthEmailAddressAdmin
from django.utils.html import format_html


# Extend the existing allauth EmailAddress admin
class CustomEmailAddressAdmin(AllauthEmailAddressAdmin):
    """
    Extended EmailAddress admin to add manual verification actions.
    """
    list_display = ('email', 'user', 'verified', 'primary')
    actions = ['mark_as_verified']

    def mark_as_verified(self, request, queryset):
        """Admin action to manually verify email addresses for users with issues."""
        updated = queryset.update(verified=True)
        self.message_user(request, f'{updated} email(s) successfully marked as verified.')
    mark_as_verified.short_description = 'Mark selected emails as verified'


# Unregister allauth's default and register our extended version
admin.site.unregister(EmailAddress)
admin.site.register(EmailAddress, CustomEmailAddressAdmin)


# Customize the User admin to show verification status
class CustomUserAdmin(BaseUserAdmin):
    """Extended User admin to show email verification status."""
    list_display = BaseUserAdmin.list_display + ('email_verified',)
    actions = list(BaseUserAdmin.actions) + ['verify_user_email']

    def email_verified(self, obj):
        """Show if user's email is verified."""
        email_address = EmailAddress.objects.filter(user=obj, primary=True).first()
        if email_address and email_address.verified:
            return format_html('<span style="color: green;">✓</span>')
        return format_html('<span style="color: red;">✗</span>')
    email_verified.short_description = 'Verified'

    def verify_user_email(self, request, queryset):
        """Verify emails for selected users."""
        count = 0
        for user in queryset:
            updated = EmailAddress.objects.filter(user=user).update(verified=True)
            count += updated
        self.message_user(request, f'Verified emails for {count} user(s).')
    verify_user_email.short_description = 'Verify user emails'


# Unregister the default User admin and register the custom one
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)
