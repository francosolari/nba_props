from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('predictions', '0046_add_ist_champion_field'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AlterUniqueTogether(
                    name='odds',
                    unique_together=set(),
                ),
            ],
        ),
        migrations.AddField(
            model_name='question',
            name='answer_point_values',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Optional mapping of answer text to points, e.g. {'yes': 3, 'no': 1}.",
            ),
        ),
    ]
