from django.db import models
from ..models import Player, Season

class Award(models.Model):
    name = models.CharField(max_length=255, unique=True)
    def __str__(self):
        return self.name

class Odds(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE)
    award = models.ForeignKey(Award, on_delete=models.CASCADE)
    season = models.ForeignKey(Season, on_delete=models.CASCADE, null=True, blank=True)

    # Legacy field - kept for backwards compatibility
    value = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Deprecated - use odds_value")
    timestamp = models.DateField(null=True, blank=True, help_text="Deprecated - use scraped_at")

    # Odds value in American format (e.g., +500, -200)
    odds_value = models.CharField(max_length=10, default='+100')

    # Decimal representation for calculations (e.g., 5.00 for +500)
    decimal_odds = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # Implied probability (0-100)
    implied_probability = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    # When this odds snapshot was taken
    scraped_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    # Source of the odds
    source = models.CharField(max_length=50, default='DraftKings')

    # Rank at time of scraping (1 = favorite, 2 = second favorite, etc.)
    rank = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ['-scraped_at', 'rank']
        indexes = [
            models.Index(fields=['award', 'season', '-scraped_at']),
            models.Index(fields=['player', 'award', 'season']),
        ]
        verbose_name_plural = 'Odds'

    def __str__(self):
        return f"{self.player.name} - {self.award.name}: {self.odds_value} ({self.scraped_at.date()})"

    def save(self, *args, **kwargs):
        """Auto-calculate decimal odds and implied probability from American odds"""
        if self.odds_value and not self.decimal_odds:
            self.decimal_odds = self.american_to_decimal(self.odds_value)
            self.implied_probability = self.calculate_implied_probability(self.odds_value)
        super().save(*args, **kwargs)

    @staticmethod
    def american_to_decimal(american_odds):
        """Convert American odds to decimal odds"""
        try:
            odds_str = str(american_odds).replace('+', '').replace(' ', '')
            odds_int = int(odds_str)

            if odds_int > 0:
                # Positive American odds: +200 = 3.00 decimal
                return (odds_int / 100) + 1
            else:
                # Negative American odds: -200 = 1.50 decimal
                return (100 / abs(odds_int)) + 1
        except (ValueError, ZeroDivisionError):
            return None

    @staticmethod
    def calculate_implied_probability(american_odds):
        """Calculate implied probability from American odds"""
        try:
            odds_str = str(american_odds).replace('+', '').replace(' ', '')
            odds_int = int(odds_str)

            if odds_int > 0:
                # Positive odds
                return (100 / (odds_int + 100)) * 100
            else:
                # Negative odds
                return (abs(odds_int) / (abs(odds_int) + 100)) * 100
        except (ValueError, ZeroDivisionError):
            return None


class AwardWinner(models.Model):
    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    award = models.ForeignKey(Award, on_delete=models.CASCADE)
    # JSON field to hold finalists after award is decided
    finalists = models.JSONField(null=True)