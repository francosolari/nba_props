"""
API root URLs - Creates namespace structure for nested API versions
File: predictions/api/urls.py

This creates the 'api' namespace that contains 'v1' as a nested namespace.
"""
from django.urls import include, path

app_name = 'api'

urlpatterns = [
    path('v1/', include('predictions.api.v1.urls', namespace='v1')),
]
