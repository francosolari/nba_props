# Generated by Django 4.2.6 on 2024-11-30 18:44

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('predictions', '0038_remove_answer_correct_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='inseasontournamentstandings',
            name='ist_clinch_group',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='inseasontournamentstandings',
            name='ist_clinch_knockout',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='inseasontournamentstandings',
            name='ist_clinch_wildcard',
            field=models.BooleanField(default=False),
        ),
    ]