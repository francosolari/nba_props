"""
URL configuration for accounts app (onboarding).
"""
from django.urls import path
from . import views

urlpatterns = [
    path('onboarding/welcome/', views.onboarding_welcome, name='onboarding_welcome'),
    path('onboarding/profile/', views.onboarding_profile, name='onboarding_profile'),
    path('onboarding/tutorial/', views.onboarding_tutorial, name='onboarding_tutorial'),
    path('onboarding/skip/', views.skip_onboarding, name='skip_onboarding'),
]
