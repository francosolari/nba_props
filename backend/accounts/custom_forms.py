from django import forms
from django.contrib.auth.models import User
# from django_cf_turnstile.fields import TurnstileCaptchaField
from disposable_email_domains import blocklist

class CustomSignupForm(forms.Form):
    # Turnstile captcha temporarily disabled - will enable after debugging
    # captcha = TurnstileCaptchaField()
    username = forms.CharField(
        max_length=30,
        label="Username",
        required=True,
        help_text="This will be your display name on leaderboards (letters, numbers, and @/./+/-/_ only)",
        widget=forms.TextInput(attrs={
            'placeholder': 'Choose a username',
            'autocomplete': 'username'
        })
    )
    first_name = forms.CharField(
        max_length=30,
        label="First Name",
        required=True,
        widget=forms.TextInput(attrs={
            'placeholder': 'Your first name',
            'autocomplete': 'given-name'
        })
    )
    last_name = forms.CharField(
        max_length=30,
        label="Last Name",
        required=True,
        widget=forms.TextInput(attrs={
            'placeholder': 'Your last name',
            'autocomplete': 'family-name'
        })
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Override password fields from allauth to ensure proper autocomplete
        if 'password1' in self.fields:
            self.fields['password1'].widget.attrs.update({
                'autocomplete': 'new-password',
                'placeholder': 'Create a password'
            })
        if 'password2' in self.fields:
            self.fields['password2'].widget.attrs.update({
                'autocomplete': 'new-password',
                'placeholder': 'Confirm your password'
            })
        if 'email' in self.fields:
            self.fields['email'].widget.attrs.update({
                'autocomplete': 'email',
                'placeholder': 'your.email@example.com'
            })

    def clean_username(self):
        """Validate that username is unique"""
        username = self.cleaned_data['username']
        if User.objects.filter(username__iexact=username).exists():
            raise forms.ValidationError("This username is already taken. Please choose another.")
        return username

    def clean(self):
        """Additional validation including disposable email check"""
        cleaned_data = super().clean()

        # Check for disposable email domains
        # Note: email field comes from allauth's BaseSignupForm
        email = cleaned_data.get('email')
        if email:
            domain = email.split('@')[-1].lower()
            if domain in blocklist:
                raise forms.ValidationError(
                    "Please use a permanent email address. Temporary/disposable email addresses are not allowed."
                )

        return cleaned_data

    def signup(self, request, user):
        """Save the username, first name and last name to the user model"""
        user.username = self.cleaned_data['username']
        user.first_name = self.cleaned_data['first_name']
        user.last_name = self.cleaned_data['last_name']
        user.save()
        return user