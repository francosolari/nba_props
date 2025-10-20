# Generated migration for Odds and SuperlativeQuestion enhancements

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('predictions', '0044_payment'),
    ]

    operations = [
        # Drop the old unique_together constraint manually
        migrations.RunSQL(
            sql='ALTER TABLE predictions_odds DROP CONSTRAINT IF EXISTS "idx_16526_predictions_odds_player_id_award_id_timestamp_ef4d457";',
            reverse_sql=migrations.RunSQL.noop,
        ),

        # Add new fields to Odds
        migrations.AddField(
            model_name='odds',
            name='decimal_odds',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='odds',
            name='implied_probability',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
        migrations.AddField(
            model_name='odds',
            name='odds_value',
            field=models.CharField(default='+100', max_length=10),
        ),
        migrations.AddField(
            model_name='odds',
            name='rank',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='odds',
            name='scraped_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name='odds',
            name='season',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='predictions.season'),
        ),
        migrations.AddField(
            model_name='odds',
            name='source',
            field=models.CharField(default='DraftKings', max_length=50),
        ),

        # Add new fields to SuperlativeQuestion
        migrations.AddField(
            model_name='superlativequestion',
            name='current_leader',
            field=models.ForeignKey(blank=True, help_text='Player currently leading in betting odds', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='leading_awards', to='predictions.player'),
        ),
        migrations.AddField(
            model_name='superlativequestion',
            name='current_leader_odds',
            field=models.CharField(blank=True, help_text='Current betting odds for leader (e.g., +150)', max_length=10, null=True),
        ),
        migrations.AddField(
            model_name='superlativequestion',
            name='current_runner_up',
            field=models.ForeignKey(blank=True, help_text='Player currently second in betting odds', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='runner_up_awards', to='predictions.player'),
        ),
        migrations.AddField(
            model_name='superlativequestion',
            name='current_runner_up_odds',
            field=models.CharField(blank=True, help_text='Current betting odds for runner-up (e.g., +300)', max_length=10, null=True),
        ),
        migrations.AddField(
            model_name='superlativequestion',
            name='last_odds_update',
            field=models.DateTimeField(blank=True, null=True),
        ),

        # Update legacy fields
        migrations.AlterField(
            model_name='odds',
            name='timestamp',
            field=models.DateField(blank=True, help_text='Deprecated - use scraped_at', null=True),
        ),
        migrations.AlterField(
            model_name='odds',
            name='value',
            field=models.DecimalField(blank=True, decimal_places=2, help_text='Deprecated - use odds_value', max_digits=5, null=True),
        ),

        # Update Meta options
        migrations.AlterModelOptions(
            name='odds',
            options={'ordering': ['-scraped_at', 'rank'], 'verbose_name_plural': 'Odds'},
        ),

        # Add indexes
        migrations.AddIndex(
            model_name='odds',
            index=models.Index(fields=['award', 'season', '-scraped_at'], name='predictions_award_i_e6d927_idx'),
        ),
        migrations.AddIndex(
            model_name='odds',
            index=models.Index(fields=['player', 'award', 'season'], name='predictions_player__1b0512_idx'),
        ),
    ]
