from django.db import migrations, models


def copy_award_flags(apps, schema_editor):
    Question = apps.get_model('predictions', 'Question')
    SuperlativeQuestion = apps.get_model('predictions', 'SuperlativeQuestion')
    finalized = SuperlativeQuestion.objects.filter(is_finalized=True).values_list('pk', flat=True)
    Question.objects.filter(pk__in=list(finalized)).update(is_finalized_all=True)


def copy_back(apps, schema_editor):
    Question = apps.get_model('predictions', 'Question')
    SuperlativeQuestion = apps.get_model('predictions', 'SuperlativeQuestion')
    finalized = Question.objects.filter(is_finalized_all=True).values_list('pk', flat=True)
    SuperlativeQuestion.objects.filter(pk__in=list(finalized)).update(is_finalized=True)


class Migration(migrations.Migration):
    """Move is_finalized from SuperlativeQuestion up to Question, keeping each award's flag."""

    dependencies = [
        ('predictions', '0053_head_to_head_players'),
    ]

    operations = [
        migrations.AddField(
            model_name='question',
            name='is_finalized_all',
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(copy_award_flags, copy_back),
        # The live (old) code keeps reading this column until traffic switches,
        # so it leaves Django's state now and the table later. The default lets
        # new code insert awards without naming it.
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveField(model_name='superlativequestion', name='is_finalized'),
            ],
            database_operations=[
                migrations.RunSQL(
                    'ALTER TABLE predictions_superlativequestion ALTER COLUMN is_finalized SET DEFAULT false',
                    'ALTER TABLE predictions_superlativequestion ALTER COLUMN is_finalized DROP DEFAULT',
                ),
            ],
        ),
        migrations.RenameField(
            model_name='question',
            old_name='is_finalized_all',
            new_name='is_finalized',
        ),
    ]
