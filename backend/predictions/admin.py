from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.core.cache import cache
from .models import Season, Team, PlayoffPrediction, StandingPrediction, \
    RegularSeasonStandings, PostSeasonStandings, Player, \
    InSeasonTournamentStandings, Question, Answer, \
    SuperlativeQuestion, PropQuestion, PlayerStatPredictionQuestion, \
    Award, HeadToHeadQuestion, InSeasonTournamentQuestion, NBAFinalsPredictionQuestion
from predictions.api.common.services.answer_lookup_service import AnswerLookupService
from polymorphic.admin import PolymorphicParentModelAdmin, PolymorphicChildModelAdmin, PolymorphicChildModelFilter


# Should we move to a different py file?
class LatestSeasonFilter(admin.SimpleListFilter):
    title = _('season')
    parameter_name = 'season'

    def lookups(self, request, model_admin):
        # This method is used to populate the filter options.
        seasons = Season.objects.all().order_by('-end_date')
        return [(season.slug, str(season.year)) for season in seasons]

    def queryset(self, request, queryset):
        # This method filters the queryset based on the selected filter option.
        if self.value():
            return queryset.filter(season__slug=self.value())
        return queryset

    def choices(self, changelist):
        # This method adds a default filter option.
        all_choices = super().choices(changelist)
        if not self.value():
            latest_season = Season.objects.latest('end_date')
            self.used_parameters[self.parameter_name] = latest_season.slug
        return all_choices


@admin.register(RegularSeasonStandings)
class RegularSeasonStandings(admin.ModelAdmin):
    list_display = ('team', 'get_conference', 'season', 'wins', 'losses', 'win_percentage', 'position')

    def get_conference(self, obj):
        return obj.team.conference

    get_conference.admin_order_field = 'team__conference'  # Allows column order sorting
    get_conference.short_description = 'Conference'  # Renames column head

    list_filter = (LatestSeasonFilter, 'team__conference',)
    search_fields = ('team__name',)

    def rounded_win_percentage(self, obj):
        return round(obj.win_percentage, 3)

    ordering = ('-season','team__conference', 'position',)  # Order by conference then position


class PostSeasonStandingsAdmin(admin.ModelAdmin):
    list_display = ('season', 'round', 'team', 'opponent_team', 'wins', 'losses')
    list_filter = (LatestSeasonFilter,)
    search_fields = ('team__name', 'opponent_team__name')
    ordering = ('-season',)

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related('team', 'opponent_team')

class InSeasonTournamentStandingsAdmin(admin.ModelAdmin):
    list_display = ('season', 'team','ist_group','wins', 'losses', 'ist_group_rank',
                    'ist_group_gb', 'ist_wildcard_rank', 'ist_knockout_rank',
                    'ist_wildcard_gb'
                    )
    list_filter = (LatestSeasonFilter,)
    search_fields = ('team__name',)
    ordering = ('-season',)

class PlayoffPredictionAdmin(admin.ModelAdmin):
    list_display = ('user', 'season', 'round', 'team', 'conference', 'wins', 'losses')
    list_filter = (LatestSeasonFilter,)
    search_fields = (['team__name'])
    ordering = ('-season', 'user')

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related('team')

    def conference(self, obj):
        return obj.team.conference

@admin.register(Award)
class Award(admin.ModelAdmin):
    base_model = PropQuestion

@admin.register(SuperlativeQuestion)
class SuperlativeQuestionAdmin(PolymorphicChildModelAdmin):
    base_model = SuperlativeQuestion
    list_display = ('text', 'award', 'is_finalized')
    list_filter = ('award', 'is_finalized')
    search_fields = ('text',)
    # Define your admin options here

@admin.register(PropQuestion)
class PropQuestionAdmin(PolymorphicChildModelAdmin):
    list_display = ('text', 'outcome_type', 'line')
    list_filter = ('outcome_type',)
    search_fields = ('text',)
    base_model = PropQuestion
    # Define your admin options here

@admin.register(HeadToHeadQuestion)
class HeadToHeadQuestionAdmin(PolymorphicChildModelAdmin):
    base_model = HeadToHeadQuestion
    list_display = ('text', 'team1', 'team2')
    list_filter = ('team1', 'team2')
    search_fields = ('text',)
    # Define your admin options here

@admin.register(PlayerStatPredictionQuestion)
class PlayerStatPredictionQuestionAdmin(PolymorphicChildModelAdmin):
    base_model = PlayerStatPredictionQuestion
    list_display = ('text', 'player_stat', 'stat_type', 'fixed_value')
    list_filter = ('stat_type',)
    search_fields = ('text',)
    # Define your admin options here

@admin.register(NBAFinalsPredictionQuestion)
class NBAFinalsPredictionQuestionAdmin(PolymorphicChildModelAdmin):
    base_model = NBAFinalsPredictionQuestion
    list_display = ('text', 'season', 'point_value', 'is_manual', 'last_updated')
    list_filter = ('season', 'is_manual', 'last_updated')
    search_fields = ('text',)
    # Define your admin options here
#
@admin.register(Question)
class QuestionAdmin(PolymorphicParentModelAdmin):
    base_model = Question
    list_display = ('text', 'season', 'point_value', 'is_manual', 'last_updated')
    list_filter = ('season', 'is_manual', 'last_updated')
    search_fields = ('text',)
    # base_form =
    child_models = (SuperlativeQuestion,PropQuestion,PlayerStatPredictionQuestion, NBAFinalsPredictionQuestion)
    # list_filter = (PolymorphicChildModelFilter,)

@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ('name',)  # Display the player name in the list view
    search_fields = ('name',)  # Enable live search filtering by name


# class QuestionAdmin(admin.ModelAdmin):
#     list_display = ('text', 'line', 'value', 'answer_type', 'correct_answer', 'point_value')
#     list_filter = (LatestSeasonFilter,)
#
#
#     def get_queryset(self, request):
#         qs = super().get_queryset(request)
#         latest_season = Season.objects.latest('year')
#         return qs.filter(season__year=latest_season)
#     ordering = (['season'])
#
#     def get_queryset(self, request):
#         queryset = super().get_queryset(request)
#         return queryset.select_related('team')


class SeasonAdmin(admin.ModelAdmin):
    list_display = ('year', 'slug', 'start_date', 'end_date', 'submission_start_date', 'submission_end_date')
    ordering = ['-year', ]
    # Other configurations

class InSeasonTournamentQuestionAdmin(admin.ModelAdmin):
    list_display = ('text', 'prediction_type', 'ist_group')
    list_filter = ('prediction_type', 'ist_group')
    search_fields = ('text',)

# class NBAFinalsPredictionQuestionAdmin(admin.ModelAdmin):
#     search_fields = ('text',)

class AnswerAdmin(admin.ModelAdmin):
    list_display = ('user', 'question_text', 'question_type', 'answer_display', 'points_earned')
    list_filter = ('user', 'question__polymorphic_ctype')  # Filter by user and question type
    search_fields = ('user__username', 'question__text')
    list_per_page = 50  # Limit rows per page for faster load times
    ordering = ('-user',)

    # Cache key for player and team lookup
    CACHE_KEY = 'answer_admin_lookup_table'

    def get_lookup_tables(self):
        """
        Build or retrieve separate cached lookup tables for Player and Team IDs.
        """
        # Cache keys
        player_cache_key = 'answer_admin_player_lookup'
        team_cache_key = 'answer_admin_team_lookup'

        # Check if caches already exist
        player_lookup = cache.get(player_cache_key)
        team_lookup = cache.get(team_cache_key)

        if player_lookup is None or team_lookup is None:
            print("Building lookup table caches for Player and Team...")

            # Get all distinct numeric answer IDs
            all_answer_ids = (
                self.model.objects.filter(answer__isnull=False)
                .values_list('answer', flat=True)
                .distinct()
            )
            numeric_ids = [int(answer) for answer in all_answer_ids if str(answer).isdigit()]

            # Fetch all relevant Player and Team names
            players = Player.objects.filter(id__in=numeric_ids).values('id', 'name')
            teams = Team.objects.filter(id__in=numeric_ids).values('id', 'name')

            # Build separate lookup tables
            player_lookup = {player['id']: player['name'] for player in players}
            team_lookup = {team['id']: team['name'] for team in teams}

            # Store in cache
            cache.set(player_cache_key, player_lookup, timeout=3600)
            cache.set(team_cache_key, team_lookup, timeout=3600)

        return player_lookup, team_lookup

    def answer_display(self, obj):
        """
        Display answers dynamically, resolving Player or Team names based on question type.
        """
        question = obj.question.get_real_instance()
        return AnswerLookupService.resolve_answer(obj.answer, question)
        #
        # # Load lookup tables (cached or rebuilt)
        # player_lookup, team_lookup = self.get_lookup_tables()
        #
        # # If the answer is non-numeric, return it as-is
        # if not str(obj.answer).isdigit():
        #     return obj.answer
        #
        # # Retrieve the polymorphic question instance
        # question = obj.question.get_real_instance()
        #
        # # Handle special cases
        # if isinstance(question, InSeasonTournamentQuestion) and question.prediction_type == 'tiebreaker':
        #     return obj.answer  # Tiebreaker points are numeric and raw
        # if isinstance(question, NBAFinalsPredictionQuestion) and "How many wins?" in question.text:
        #     return obj.answer  # NBA Finals wins are numeric and raw
        #
        # # Determine whether the question relates to a Player or Team
        # answer_id = int(obj.answer)
        # if isinstance(question, (SuperlativeQuestion, PropQuestion, PlayerStatPredictionQuestion)):
        #     # Resolve as a Player
        #     return player_lookup.get(answer_id, f"Player ID {answer_id} not found")
        # elif isinstance(question, (InSeasonTournamentQuestion, HeadToHeadQuestion, NBAFinalsPredictionQuestion)):
        #     # Resolve as a Team
        #     return team_lookup.get(answer_id, f"Team ID {answer_id} not found")
        #
        # # Fallback for unsupported question types
        # return obj.answer

    def question_text(self, obj):
        return obj.question.text

    question_text.short_description = 'Question'

    def question_type(self, obj):
        return obj.question.get_real_instance_class().__name__

    question_type.short_description = 'Question Type'

    def get_queryset(self, request):
        # Optimize the base queryset by preloading relationships
        queryset = super().get_queryset(request)
        return queryset.select_related('user', 'question', 'question__polymorphic_ctype')


class StandingPredictionAdmin(admin.ModelAdmin):
    # Fields to display in the list view
    list_display = ('user', 'team_name', 'team_conference', 'season_year', 'predicted_position', 'points')

    # Fields to filter by in the list view
    list_filter = ('season__year', 'team__conference', 'user')

    # Fields to search by
    search_fields = ('user__username', 'team__name', 'season__slug')

    # Default ordering
    ordering = ('user__username', 'team__conference', 'predicted_position')

    def team_name(self, obj):
        """Display the team's name."""
        return obj.team.name

    team_name.short_description = 'Team'
    team_name.admin_order_field = 'team__name'

    def team_conference(self, obj):
        """Display the team's conference."""
        return obj.team.conference

    team_conference.short_description = 'Conference'
    team_conference.admin_order_field = 'team__conference'

    def season_year(self, obj):
        """Display the season's year."""
        return obj.season.year

    season_year.short_description = 'Season'
    season_year.admin_order_field = 'season__year'

    # Optimize the queryset
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related('user', 'team', 'season')


admin.site.register(Season, SeasonAdmin)
# admin.site.register(Season)
admin.site.register(Team)
# admin.site.register(Prediction)
admin.site.register(StandingPrediction, StandingPredictionAdmin)
admin.site.register(PlayoffPrediction, PlayoffPredictionAdmin)
# admin.site.register(Question)
admin.site.register(Answer, AnswerAdmin)
# admin.site.register(RegularSeasonStandings)
admin.site.register(PostSeasonStandings, PostSeasonStandingsAdmin)
admin.site.register(InSeasonTournamentStandings, InSeasonTournamentStandingsAdmin)
admin.site.register(InSeasonTournamentQuestion, InSeasonTournamentQuestionAdmin)
# admin.site.register(NBAFinalsPredictionQuestion, NBAFinalsPredictionQuestionAdmin)


# Add filter by user or season want to clean up this view

