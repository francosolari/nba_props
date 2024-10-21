from django.db import models
from django.utils.text import slugify


class Season(models.Model):
    year = models.CharField(max_length=7)
    slug = models.SlugField(max_length=7, unique=True, blank=True)  # e.g., "2023-2024"
    start_date = models.DateField()
    end_date = models.DateField()
    submission_start_date = models.DateField()
    submission_end_date = models.DateField()

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.year)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.year
