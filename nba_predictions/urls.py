"""
URL configuration for nba_predictions project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from predictions.api.v2.api import api as api_v2

urlpatterns = [
    # Include predictions-related URLs
    # path('', include('predictions.urls')),  # Root includes all your app-level routes
    path('admin/', admin.site.urls),
    # path('accounts/', include('django.contrib.auth.urls')),
    path('accounts/', include('allauth.urls')),
    path('api/v1/', include('predictions.api.v1.urls')),  # Legacy REST API
    path('api/v2/', api_v2.urls),  # Modern Ninja API
    path('api/', include('predictions.api.v1.urls')),
    path('', include('predictions.routing.view_urls')),  # React frontend and Django views

]
