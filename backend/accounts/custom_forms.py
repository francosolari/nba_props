from django import forms
from django.contrib.auth.models import User

class CustomSignupForm(forms.Form):
    username = forms.CharField(
        max_length=30,
        label="Username",
        required=True,
        help_text="This will be your display name on leaderboards (letters, numbers, and @/./+/-/_ only)",
        widget=forms.TextInput(attrs={'placeholder': 'Choose a username'})
    )
    first_name = forms.CharField(
        max_length=30,
        label="First Name",
        required=True,
        widget=forms.TextInput(attrs={'placeholder': 'Your first name'})
    )
    last_name = forms.CharField(
        max_length=30,
        label="Last Name",
        required=True,
        widget=forms.TextInput(attrs={'placeholder': 'Your last name'})
    )

    def clean_username(self):
        """Validate that username is unique"""
        username = self.cleaned_data['username']
        if User.objects.filter(username__iexact=username).exists():
            raise forms.ValidationError("This username is already taken. Please choose another.")
        return username

    def signup(self, request, user):
        """Save the username, first name and last name to the user model"""
        user.username = self.cleaned_data['username']
        user.first_name = self.cleaned_data['first_name']
        user.last_name = self.cleaned_data['last_name']
        user.save()
        return user