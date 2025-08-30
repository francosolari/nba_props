from django.urls import path
from .api import api

app_name = 'api-v2'

urlpatterns = [
    path('', api.urls),
]