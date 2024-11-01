from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import Season, Team, PlayoffPrediction, StandingPrediction, \
    RegularSeasonStandings, PostSeasonStandings, Player, \
    InSeasonTournamentStandings, Question, Answer, \
    SuperlativeQuestion, PropQuestion, PlayerStatPredictionQuestion, \
    Award, HeadToHeadQuestion, InSeasonTournamentQuestion, NBAFinalsPredictionQuestion
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

#
@admin.register(Question)
class QuestionAdmin(PolymorphicParentModelAdmin):
    base_model = Question
    list_display = ('text', 'season', 'point_value', 'is_manual', 'last_updated')
    list_filter = ('season', 'is_manual', 'last_updated')
    search_fields = ('text',)
    # base_form =
    child_models = (SuperlativeQuestion,PropQuestion,PlayerStatPredictionQuestion)
    # list_filter = (PolymorphicChildModelFilter,)

@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ('name',)  # Customize as necessary


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

class NBAFinalsPredictionQuestionAdmin(admin.ModelAdmin):
    search_fields = ('text',)

class AnswerAdmin(admin.ModelAdmin):
    list_display = ('user', 'question', 'answer', 'points_earned')
    search_fields = ('text',)

admin.site.register(Season, SeasonAdmin)
# admin.site.register(Season)
admin.site.register(Team)
# admin.site.register(Prediction)
admin.site.register(StandingPrediction)
admin.site.register(PlayoffPrediction, PlayoffPredictionAdmin)
# admin.site.register(Question)
admin.site.register(Answer, AnswerAdmin)
# admin.site.register(RegularSeasonStandings)
admin.site.register(PostSeasonStandings, PostSeasonStandingsAdmin)
admin.site.register(InSeasonTournamentStandings, InSeasonTournamentStandingsAdmin)
admin.site.register(InSeasonTournamentQuestion, InSeasonTournamentQuestionAdmin)
admin.site.register(NBAFinalsPredictionQuestion, NBAFinalsPredictionQuestionAdmin)


# Add filter by user or season want to clean up this view
# class StandingPredictionAdmin(admin.ModelAdmin):
#     list_display = ('team', 'get_conference', 'season', 'wins', 'losses', 'win_percentage', 'position')
#
#     def get_conference(self, obj):
#         return obj.team.conference
#
#     get_conference.admin_order_field = 'team__conference'  # Allows column order sorting
#     get_conference.short_description = 'Conference'  # Renames column head
#
#     list_filter = ('season', 'team__conference',)
#     search_fields = ('team__name',)
