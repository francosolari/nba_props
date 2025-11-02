# Onboarding Flow - Implementation Guide

## ✅ What's Already Implemented

### 1. UserOnboarding Model
**Location:** `/backend/accounts/models.py:28-87`

Features:
- Tracks completion of welcome, profile setup, and tutorial steps
- Auto-creates for every new user (via signal)
- Calculates progress percentage
- Detects if Google OAuth users need to set a username
- Includes skip option

### 2. Database Migration
- ✅ Migration created and applied
- All existing and new users will have a UserOnboarding record

## 🔧 How to Complete the Onboarding Flow

The model is ready! Now you need to add:
1. Views to handle each onboarding step
2. Templates for each step
3. URL patterns
4. Middleware to redirect new users
5. Signal handler to redirect after email confirmation

### Step 1: Create Onboarding Views

Create `/backend/accounts/views.py`:

```python
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.urls import reverse
from .models import UserOnboarding
from django import forms


class UsernameSetupForm(forms.Form):
    """Form for Google OAuth users to set their username"""
    username = forms.CharField(
        max_length=30,
        label="Choose your username",
        help_text="This will be displayed on leaderboards",
        widget=forms.TextInput(attrs={
            'class': 'block w-full px-3 py-2 border border-gray-300 rounded-lg',
            'placeholder': 'your_username'
        })
    )

    def clean_username(self):
        from django.contrib.auth.models import User
        username = self.cleaned_data['username']
        if User.objects.filter(username__iexact=username).exists():
            raise forms.ValidationError("This username is already taken.")
        return username


@login_required
def onboarding_welcome(request):
    """Welcome screen - first step of onboarding"""
    onboarding, created = UserOnboarding.objects.get_or_create(user=request.user)

    # If already completed, skip to next step or home
    if onboarding.completed_welcome:
        return redirect('onboarding_profile_setup')

    if request.method == 'POST':
        # Mark welcome as complete and move to next step
        onboarding.completed_welcome = True
        onboarding.save()
        return redirect('onboarding_profile_setup')

    context = {
        'onboarding': onboarding,
    }
    return render(request, 'accounts/onboarding/welcome.html', context)


@login_required
def onboarding_profile_setup(request):
    """Profile setup - set username if needed"""
    onboarding, created = UserOnboarding.objects.get_or_create(user=request.user)

    # If already completed, skip to next step
    if onboarding.completed_profile_setup:
        return redirect('onboarding_tutorial')

    needs_username = onboarding.needs_username
    form = UsernameSetupForm(request.POST or None) if needs_username else None

    if request.method == 'POST':
        if needs_username and form.is_valid():
            # Update username
            request.user.username = form.cleaned_data['username']
            request.user.save()
            messages.success(request, f"Username set to @{request.user.username}!")

        # Mark profile setup as complete
        onboarding.completed_profile_setup = True
        onboarding.save()
        return redirect('onboarding_tutorial')

    context = {
        'onboarding': onboarding,
        'needs_username': needs_username,
        'form': form,
    }
    return render(request, 'accounts/onboarding/profile_setup.html', context)


@login_required
def onboarding_tutorial(request):
    """Tutorial explaining how the game works"""
    onboarding, created = UserOnboarding.objects.get_or_create(user=request.user)

    if request.method == 'POST':
        # Mark tutorial as complete and finish onboarding
        onboarding.completed_tutorial = True
        onboarding.mark_complete()
        messages.success(request, "Welcome to NBA Predictions! Ready to make your predictions?")
        return redirect('predictions_views:submit_predictions_view', season_slug='2024-25')

    context = {
        'onboarding': onboarding,
    }
    return render(request, 'accounts/onboarding/tutorial.html', context)


@login_required
def onboarding_skip(request):
    """Allow users to skip onboarding"""
    onboarding, created = UserOnboarding.objects.get_or_create(user=request.user)
    onboarding.skipped = True
    onboarding.mark_complete()
    messages.info(request, "You can always find help in the tutorial section.")
    return redirect('/')
```

### Step 2: Create URL Patterns

Add to `/backend/accounts/urls.py` (create if doesn't exist):

```python
from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('onboarding/welcome/', views.onboarding_welcome, name='onboarding_welcome'),
    path('onboarding/profile-setup/', views.onboarding_profile_setup, name='onboarding_profile_setup'),
    path('onboarding/tutorial/', views.onboarding_tutorial, name='onboarding_tutorial'),
    path('onboarding/skip/', views.onboarding_skip, name='onboarding_skip'),
]
```

Then include in main URLs (`/backend/nba_predictions/urls.py`):

```python
urlpatterns = [
    # ... existing patterns ...
    path('accounts/', include('allauth.urls')),
    path('account/', include('accounts.urls')),  # Add this
    # ... rest of patterns ...
]
```

### Step 3: Create Onboarding Templates

Create `/backend/predictions/templates/accounts/onboarding/welcome.html`:

```html
{% extends "predictions/base.html" %}

{% block content %}
<div class="max-w-4xl mx-auto py-12 px-4">
    <div class="text-center mb-12">
        <div class="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
            <svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/>
            </svg>
        </div>
        <h1 class="text-4xl font-bold text-gray-900 mb-4">Welcome to NBA Predictions!</h1>
        <p class="text-xl text-gray-600">Thanks for joining {{ user.first_name }}. Let's get you started!</p>
    </div>

    <div class="bg-white rounded-lg shadow-lg p-8 mb-8">
        <h2 class="text-2xl font-semibold mb-6">What is NBA Predictions?</h2>

        <div class="space-y-6">
            <div class="flex items-start">
                <div class="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <span class="text-blue-600 font-bold text-lg">1</span>
                </div>
                <div>
                    <h3 class="font-semibold text-lg mb-2">Make Your Predictions</h3>
                    <p class="text-gray-600">Before the season starts, predict conference standings, awards, and more.</p>
                </div>
            </div>

            <div class="flex items-start">
                <div class="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                    <span class="text-green-600 font-bold text-lg">2</span>
                </div>
                <div>
                    <h3 class="font-semibold text-lg mb-2">Earn Points</h3>
                    <p class="text-gray-600">As the season unfolds, earn points for correct predictions.</p>
                </div>
            </div>

            <div class="flex items-start">
                <div class="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                    <span class="text-purple-600 font-bold text-lg">3</span>
                </div>
                <div>
                    <h3 class="font-semibold text-lg mb-2">Compete on the Leaderboard</h3>
                    <p class="text-gray-600">Climb the rankings and prove you're the best NBA predictor!</p>
                </div>
            </div>
        </div>
    </div>

    <div class="flex justify-between items-center">
        <a href="{% url 'accounts:onboarding_skip' %}" class="text-gray-600 hover:text-gray-800">
            Skip tutorial
        </a>
        <form method="post">
            {% csrf_token %}
            <button type="submit" class="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200">
                Next: Set Up Your Profile →
            </button>
        </form>
    </div>

    <!-- Progress indicator -->
    <div class="mt-8">
        <div class="flex items-center justify-center space-x-2">
            <div class="w-3 h-3 rounded-full bg-blue-600"></div>
            <div class="w-3 h-3 rounded-full bg-gray-300"></div>
            <div class="w-3 h-3 rounded-full bg-gray-300"></div>
        </div>
        <p class="text-center text-sm text-gray-500 mt-2">Step 1 of 3</p>
    </div>
</div>
{% endblock %}
```

Create `/backend/predictions/templates/accounts/onboarding/profile_setup.html`:

```html
{% extends "predictions/base.html" %}

{% block content %}
<div class="max-w-2xl mx-auto py-12 px-4">
    <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">Set Up Your Profile</h1>
        <p class="text-xl text-gray-600">Let's personalize your account</p>
    </div>

    <div class="bg-white rounded-lg shadow-lg p-8 mb-8">
        {% if needs_username %}
        <div class="mb-8">
            <h2 class="text-2xl font-semibold mb-4">Choose Your Username</h2>
            <p class="text-gray-600 mb-6">This will be your display name on leaderboards and throughout the site.</p>

            <form method="post" class="space-y-4">
                {% csrf_token %}
                <div>
                    <label for="id_username" class="block text-sm font-medium text-gray-700 mb-2">
                        Username
                    </label>
                    {{ form.username }}
                    {% if form.username.errors %}
                        <p class="mt-1 text-sm text-red-600">{{ form.username.errors.0 }}</p>
                    {% endif %}
                    <p class="mt-1 text-sm text-gray-500">{{ form.username.help_text }}</p>
                </div>

                <button type="submit" class="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200">
                    Continue →
                </button>
            </form>
        </div>
        {% else %}
        <div class="text-center py-8">
            <div class="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
            </div>
            <h2 class="text-2xl font-semibold mb-2">Profile Looks Good!</h2>
            <p class="text-gray-600 mb-6">Your username is set to <strong>@{{ user.username }}</strong></p>

            <form method="post">
                {% csrf_token %}
                <button type="submit" class="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200">
                    Continue to Tutorial →
                </button>
            </form>
        </div>
        {% endif %}
    </div>

    <div class="flex justify-between items-center mb-8">
        <a href="{% url 'accounts:onboarding_welcome' %}" class="text-gray-600 hover:text-gray-800">
            ← Back
        </a>
        <a href="{% url 'accounts:onboarding_skip' %}" class="text-gray-600 hover:text-gray-800">
            Skip tutorial
        </a>
    </div>

    <!-- Progress indicator -->
    <div class="mt-8">
        <div class="flex items-center justify-center space-x-2">
            <div class="w-3 h-3 rounded-full bg-green-600"></div>
            <div class="w-3 h-3 rounded-full bg-blue-600"></div>
            <div class="w-3 h-3 rounded-full bg-gray-300"></div>
        </div>
        <p class="text-center text-sm text-gray-500 mt-2">Step 2 of 3</p>
    </div>
</div>
{% endblock %}
```

Create `/backend/predictions/templates/accounts/onboarding/tutorial.html`:

```html
{% extends "predictions/base.html" %}

{% block content %}
<div class="max-w-4xl mx-auto py-12 px-4">
    <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">How It Works</h1>
        <p class="text-xl text-gray-600">Everything you need to know to compete</p>
    </div>

    <div class="bg-white rounded-lg shadow-lg p-8 mb-8 space-y-8">
        <div>
            <h2 class="text-2xl font-semibold mb-4 flex items-center">
                <span class="bg-blue-100 text-blue-600 w-10 h-10 rounded-full flex items-center justify-center mr-3 text-lg font-bold">📋</span>
                Prediction Categories
            </h2>
            <ul class="space-y-2 text-gray-700 ml-13">
                <li>• <strong>Conference Standings:</strong> Predict the final order (1-15) for East and West</li>
                <li>• <strong>Awards:</strong> MVP, Defensive Player, Rookie of the Year, and more</li>
                <li>• <strong>NBA Finals:</strong> Which two teams will make it?</li>
                <li>• <strong>Season Stats:</strong> Points leader, assists leader, etc.</li>
            </ul>
        </div>

        <div>
            <h2 class="text-2xl font-semibold mb-4 flex items-center">
                <span class="bg-green-100 text-green-600 w-10 h-10 rounded-full flex items-center justify-center mr-3 text-lg font-bold">🎯</span>
                Scoring System
            </h2>
            <p class="text-gray-700 ml-13 mb-3">Points are awarded based on accuracy:</p>
            <ul class="space-y-2 text-gray-700 ml-13">
                <li>• Exact standing position: Higher points</li>
                <li>• Off by 1-2 spots: Partial points</li>
                <li>• Correct award winner: Bonus points</li>
                <li>• Perfect category: Extra bonus!</li>
            </ul>
        </div>

        <div>
            <h2 class="text-2xl font-semibold mb-4 flex items-center">
                <span class="bg-purple-100 text-purple-600 w-10 h-10 rounded-full flex items-center justify-center mr-3 text-lg font-bold">🏆</span>
                Important Dates
            </h2>
            <ul class="space-y-2 text-gray-700 ml-13">
                <li>• <strong>Submission Deadline:</strong> Before the season starts</li>
                <li>• <strong>Season Duration:</strong> October - April</li>
                <li>• <strong>Scoring Updates:</strong> Weekly throughout the season</li>
                <li>• <strong>Final Results:</strong> After NBA Finals</li>
            </ul>
        </div>
    </div>

    <form method="post">
        {% csrf_token %}
        <div class="flex justify-between items-center mb-8">
            <a href="{% url 'accounts:onboarding_profile_setup' %}" class="text-gray-600 hover:text-gray-800">
                ← Back
            </a>
            <button type="submit" class="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 text-lg">
                Start Making Predictions! 🏀
            </button>
        </div>
    </form>

    <!-- Progress indicator -->
    <div class="mt-8">
        <div class="flex items-center justify-center space-x-2">
            <div class="w-3 h-3 rounded-full bg-green-600"></div>
            <div class="w-3 h-3 rounded-full bg-green-600"></div>
            <div class="w-3 h-3 rounded-full bg-blue-600"></div>
        </div>
        <p class="text-center text-sm text-gray-500 mt-2">Step 3 of 3</p>
    </div>
</div>
{% endblock %}
```

### Step 4: Add Middleware to Redirect New Users

Create `/backend/accounts/middleware.py`:

```python
from django.shortcuts import redirect
from django.urls import reverse
from accounts.models import UserOnboarding


class OnboardingMiddleware:
    """
    Redirect users who haven't completed onboarding to the onboarding flow.
    """

    EXEMPT_PATHS = [
        '/accounts/',  # Allow allauth URLs (login, signup, etc.)
        '/account/onboarding/',  # Allow onboarding URLs
        '/admin/',  # Allow admin
        '/static/',  # Allow static files
        '/api/',  # Allow API calls
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Skip if user is not authenticated
        if not request.user.is_authenticated:
            return self.get_response(request)

        # Skip if path is exempt
        if any(request.path.startswith(path) for path in self.EXEMPT_PATHS):
            return self.get_response(request)

        # Check if user needs onboarding
        try:
            onboarding = UserOnboarding.objects.get(user=request.user)
            if not onboarding.onboarding_complete and not onboarding.skipped:
                # Redirect to appropriate onboarding step
                if not onboarding.completed_welcome:
                    if request.path != reverse('accounts:onboarding_welcome'):
                        return redirect('accounts:onboarding_welcome')
                elif not onboarding.completed_profile_setup:
                    if request.path != reverse('accounts:onboarding_profile_setup'):
                        return redirect('accounts:onboarding_profile_setup')
                elif not onboarding.completed_tutorial:
                    if request.path != reverse('accounts:onboarding_tutorial'):
                        return redirect('accounts:onboarding_tutorial')
        except UserOnboarding.DoesNotExist:
            # Create onboarding record if it doesn't exist
            UserOnboarding.objects.create(user=request.user)

        return self.get_response(request)
```

Add to `settings.py`:

```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    "allauth.account.middleware.AccountMiddleware",
    "accounts.middleware.OnboardingMiddleware",  # Add this
]
```

## 🎯 How It Works

1. **User signs up** (regular or Google OAuth)
2. **UserOnboarding created** automatically (via signal)
3. **Middleware redirects** to welcome page
4. **User goes through** welcome → profile setup → tutorial
5. **Onboarding marked complete**
6. **User redirected** to make predictions

## 🧪 Testing

1. Create a test account
2. You'll automatically be redirected to `/account/onboarding/welcome/`
3. Follow the flow through all 3 steps
4. After completing, you'll go to predictions page
5. Try the "Skip tutorial" link to test that flow

## 📝 Next Steps

After implementing the basic flow above, you can enhance it with:
- Profile photo upload
- Display preferences (email notifications, etc.)
- Social sharing (invite friends)
- Achievement badges for completing onboarding
- A/B testing different onboarding flows

The foundation is built - just add the views, templates, and middleware above!
