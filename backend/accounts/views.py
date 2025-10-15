"""
Views for user onboarding flow.
"""
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth.models import User
from .models import UserOnboarding


@login_required
def onboarding_welcome(request):
    """
    Welcome screen - first step of onboarding.
    """
    try:
        onboarding = request.user.onboarding
    except UserOnboarding.DoesNotExist:
        # Create onboarding if it doesn't exist
        onboarding = UserOnboarding.objects.create(user=request.user)

    # If already completed this step, redirect to next
    if onboarding.completed_welcome and not onboarding.onboarding_complete:
        return redirect('onboarding_profile')

    # If onboarding is complete, redirect to home
    if onboarding.onboarding_complete:
        return redirect('predictions_views:home')

    if request.method == 'POST':
        onboarding.completed_welcome = True
        onboarding.save()
        return redirect('onboarding_profile')

    context = {
        'onboarding': onboarding,
        'current_step': 1,
        'total_steps': 3,
    }
    return render(request, 'accounts/onboarding/welcome.html', context)


@login_required
def onboarding_profile(request):
    """
    Profile setup - second step of onboarding.
    """
    try:
        onboarding = request.user.onboarding
    except UserOnboarding.DoesNotExist:
        onboarding = UserOnboarding.objects.create(user=request.user)

    # If haven't completed welcome, redirect there
    if not onboarding.completed_welcome:
        return redirect('onboarding_welcome')

    # If already completed this step, redirect to next
    if onboarding.completed_profile_setup and not onboarding.onboarding_complete:
        return redirect('onboarding_tutorial')

    # If onboarding is complete, redirect to home
    if onboarding.onboarding_complete:
        return redirect('predictions_views:home')

    if request.method == 'POST':
        # Get form data
        username = request.POST.get('username', '').strip()
        first_name = request.POST.get('first_name', '').strip()
        last_name = request.POST.get('last_name', '').strip()

        # Validate username if changed
        if username and username != request.user.username:
            # Check if username looks auto-generated and needs to be changed
            if onboarding.needs_username:
                if User.objects.filter(username=username).exclude(id=request.user.id).exists():
                    messages.error(request, 'That username is already taken. Please choose another.')
                    context = {
                        'onboarding': onboarding,
                        'current_step': 2,
                        'total_steps': 3,
                    }
                    return render(request, 'accounts/onboarding/profile.html', context)
                request.user.username = username

        # Update user profile
        if first_name:
            request.user.first_name = first_name
        if last_name:
            request.user.last_name = last_name

        request.user.save()

        # Mark step complete
        onboarding.completed_profile_setup = True
        onboarding.save()

        return redirect('onboarding_tutorial')

    context = {
        'onboarding': onboarding,
        'current_step': 2,
        'total_steps': 3,
    }
    return render(request, 'accounts/onboarding/profile.html', context)


@login_required
def onboarding_tutorial(request):
    """
    Tutorial/walkthrough - third step of onboarding.
    """
    try:
        onboarding = request.user.onboarding
    except UserOnboarding.DoesNotExist:
        onboarding = UserOnboarding.objects.create(user=request.user)

    # If haven't completed previous steps, redirect
    if not onboarding.completed_welcome:
        return redirect('onboarding_welcome')
    if not onboarding.completed_profile_setup:
        return redirect('onboarding_profile')

    # If onboarding is complete, redirect to home
    if onboarding.onboarding_complete:
        return redirect('predictions_views:home')

    if request.method == 'POST':
        # Mark tutorial complete and finish onboarding
        onboarding.completed_tutorial = True
        onboarding.mark_complete()
        messages.success(request, 'Welcome to NBA Predictions! You\'re all set to start making predictions.')
        return redirect('predictions_views:home')

    context = {
        'onboarding': onboarding,
        'current_step': 3,
        'total_steps': 3,
    }
    return render(request, 'accounts/onboarding/tutorial.html', context)


@login_required
def skip_onboarding(request):
    """
    Allow users to skip the onboarding process.
    """
    if request.method == 'POST':
        try:
            onboarding = request.user.onboarding
            onboarding.skipped = True
            onboarding.mark_complete()
            messages.info(request, 'Onboarding skipped. You can always access the tutorial later from your profile.')
            return redirect('predictions_views:home')
        except UserOnboarding.DoesNotExist:
            # Create and skip
            onboarding = UserOnboarding.objects.create(user=request.user, skipped=True)
            onboarding.mark_complete()
            return redirect('predictions_views:home')

    return redirect('onboarding_welcome')
