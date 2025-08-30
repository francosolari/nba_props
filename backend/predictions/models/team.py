from django.db import models
from django.contrib.auth.models import User
from django.db.models import Q, F
from django.utils.text import slugify

class Team(models.Model):
    name = models.CharField(max_length=100)
    abbreviation = models.CharField(default='', max_length=3, null=True)
    conference = models.CharField(max_length=4)  # "East" or "West"

    def __str__(self):
        return self.name