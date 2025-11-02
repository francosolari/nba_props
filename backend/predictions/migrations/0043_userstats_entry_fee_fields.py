from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('predictions', '0042_alter_season_submission_end_date_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='userstats',
            name='entry_fee_paid',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='userstats',
            name='entry_fee_paid_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
