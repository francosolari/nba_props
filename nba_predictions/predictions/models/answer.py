from django.db import models
from django.contrib.auth.models import User
from ..models import Question

class Answer(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    answer = models.CharField(max_length=255, blank=True, null=True)
    points_earned = models.FloatField(default=0.0, blank=True, null=True)
    submission_date = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"{self.user.username}'s answer to '{self.question.text}'"