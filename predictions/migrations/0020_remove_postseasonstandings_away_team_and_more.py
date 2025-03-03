# Generated by Django 4.2.6 on 2024-04-05 01:46

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('predictions', '0019_playoffprediction_round_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='postseasonstandings',
            name='away_team',
        ),
        migrations.RemoveField(
            model_name='postseasonstandings',
            name='home_team',
        ),
        migrations.AddField(
            model_name='postseasonstandings',
            name='opponent_team',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='opponent_playoff', to='predictions.team'),
        ),
        migrations.AlterField(
            model_name='postseasonstandings',
            name='season_type',
            field=models.CharField(choices=[('post', 'Post Season')], default='post', max_length=50),
        ),
        migrations.AlterField(
            model_name='regularseasonstandings',
            name='season_type',
            field=models.CharField(choices=[('regular', 'Regular Season')], default='regular', max_length=50),
        ),
    ]
