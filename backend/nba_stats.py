import json
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nba_predictions.settings')
import django

django.setup()
import pandas as pd
from nba_api.stats.endpoints import playercareerstats
from nba_api.live.nba.endpoints import scoreboard
from nba_api.stats.static import teams, players
from nba_api.stats.endpoints import \
    leaguestandingsv3, \
    leaguedashplayerstats, \
    leaguegamelog, \
    commonplayoffseries, \
    iststandings

from predictions.models import Team, Season, Player, \
    RegularSeasonStandings, \
    InSeasonTournamentStandings, PostSeasonStandings


# Nikola Jokić
# career = playercareerstats.PlayerCareerStats(player_id='203999')
def update_standings(df_standings, season_slug):
    """

    :return:
    """
    season = Season.objects.get(slug=season_slug)
    for index, row in df_standings.iterrows():
        team_name = f"{row['TeamCity']} {row['TeamName']}"
        # abbreviation = row['TeamAbbreviation']
        conference = row['Conference']

        try:
            team = Team.objects.get(name=team_name)
            # team.abbreviation = abbreviation
            team.conference = conference
            team.save()
        except Team.DoesNotExist:
            team = Team.objects.create(name=team_name,
                                       # abbreviation=abbreviation,
                                       conference=conference)

        stats, created = RegularSeasonStandings.objects.get_or_create(
            team=team,
            season=season,  # Reference the season year
            defaults={
                'wins': row['WINS'],
                'losses': row['LOSSES'],
                'position': row['PlayoffRank'],
            }
        )
        if not created:
            # Update the existing TeamSeasonStats
            stats.wins = row['WINS']
            stats.losses = row['LOSSES']
            stats.position = row['PlayoffRank']
            stats.save()


def fetch_nba_teams():
    """
    Small function to retrieve all teams in NBA
    :return:
    """
    return teams.get_teams()


def fetch_nba_standings(season):
    # print({leaguestandingsv3.LeagueStandingsV3(season='2024-25').get_json()})
    # save_file = open("savedata.json", "w")
    # save_file.close()
    standings_data = leaguestandingsv3.LeagueStandingsV3(season=season).get_data_frames()[0]
    update_standings(standings_data, season)
    return standings_data


def update_finals_standings(season, finals):
    """
    Function to update finals standing objects
    to be run after finals are completed?
    :param season:
    :param finals:
    :return:
    """
    season_obj = Season.objects.get(slug=season)
    winning_team = Team.objects.get(name=finals['winning_team']['team_name'])
    losing_team = Team.objects.get(name=finals['losing_team']['team_name'])
    PostSeasonStandings.objects.update_or_create(
        team=winning_team,
        season=season_obj,
        season_type='post',  # Assuming 'post' for post-season
        round=4,
        defaults={
            'wins': finals['winning_team']['wins'],
            'losses': finals['losing_team']['wins'],
            'opponent_team': losing_team,
        }
    )


def fetch_finals_record(season):
    """
    Simple function to retrieve the record and winner of finals
    Required for tiebreaker and prediction
    :return:
    """
    game_log = leaguegamelog.LeagueGameLog(season=season,
                                           season_type_all_star='Playoffs').get_data_frames()[0]
    last_game = game_log.max()['GAME_ID']
    playoff_series = commonplayoffseries.CommonPlayoffSeries(season=season).get_data_frames()[0]
    finals = {'winning_team': {}, 'losing_team': {}}
    print(game_log.loc[
          game_log['GAME_ID'] == last_game, :].columns)
    finals['winning_team']['team_name'] = game_log.loc[
                                          game_log['GAME_ID'] == last_game, :].query("WL in 'W'").TEAM_NAME.values[0]
    finals['losing_team']['team_name'] = game_log.loc[
                                         game_log['GAME_ID'] == last_game, :].query("WL in 'L'").TEAM_NAME.values[0]

    finals['winning_team']['wins'] = 4
    try:
        finals['losing_team']['wins'] = (playoff_series.loc[playoff_series['GAME_ID'] == last_game]['GAME_NUM'].values[
            0]) - 4
    except IndexError:
        finals['losing_team']['wins'] = 0
    update_finals_standings(season, finals)
    print(finals)
    return finals


def fetch_ist_standings(season):
    """
    Function to fetch and update in season tournament standings
    :return:
    """
    season = Season.objects.get(slug=season)  # Assuming 'name' is the field that stores the season name
    ist_standings = {}
    ist = iststandings.ISTStandings(season=season).get_data_frames()[0]

    for team in ist['teamName'].unique():
        team_name = f"{ist.loc[ist['teamName'] == team, 'teamCity'].values[0]}" \
                    f" {ist.loc[ist['teamName'] == team, 'teamName'].values[0]}"
        team_object = Team.objects.get(name=team_name)
        team_ist_stats = {
            'ist_group': ist.loc[ist['teamName'] == team, 'istGroup'].values[0],
            'wins': ist.loc[ist['teamName'] == team, 'wins'].values[0],
            'losses': ist.loc[ist['teamName'] == team, 'losses'].values[0],
            'ist_differential': ist.loc[ist['teamName'] == team, 'diff'].values[0],
            'ist_points': ist.loc[ist['teamName'] == team, 'pts'].values[0],
            'ist_group_rank': ist.loc[ist['teamName'] == team, 'istGroupRank'].values[0],
            'ist_group_gb': ist.loc[ist['teamName'] == team, 'istGroupGb'].values[0],
            'ist_wildcard_rank': ist.loc[ist['teamName'] == team, 'istWildcardRank'].values[0],
            'ist_wildcard_gb': ist.loc[ist['teamName'] == team, 'istWildcardGb'].fillna(0).values[0],
            'ist_knockout_rank': ist.loc[ist['teamName'] == team, 'istKnockoutRank'].fillna(0).values[0],
            'ist_clinch_knockout': ist.loc[ist['teamName'] == team, 'clinchedIstKnockout'].fillna(0).values[0],
            'ist_clinch_group': ist.loc[ist['teamName'] == team, 'clinchedIstGroup'].fillna(0).values[0],
            'ist_clinch_wildcard': ist.loc[ist['teamName'] == team, 'clinchedIstWildcard'].fillna(0).values[0]
        }
        ist_standings[team_name] = team_ist_stats
        # Update or create the InSeasonTournamentStandings object for the team
        InSeasonTournamentStandings.objects.update_or_create(
            team=team_object,
            season=season,
            season_type='ist',
            defaults=team_ist_stats
        )

    print(ist_standings)
    return ist_standings


def update_active_players(nba_players):
    """
    Updating database of active players
    :return:
    """
    for row in nba_players:
        print(row)
        name = row['full_name']

        try:
            player = Player.objects.get(name=name)
            player.save()
        except Player.DoesNotExist:
            player = Player.objects.create(name=name)

        player_obj, created = Player.objects.get_or_create(
            name=name,
        )
        if not created:
            # Update the existing TeamSeasonStats
            player_obj.name = row['full_name']
            player_obj.save()


def fetch_active_players():
    # get_players returns a list of dictionaries, each representing a player.
    nba_players = players.get_active_players()
    print(nba_players)
    update_active_players(nba_players)


ist_standings = fetch_ist_standings("2025-26")
# exit(0)
# fetch_finals_record(season="2021-22")
# exit(0)
# print(f"nba teams:{fetch_nba_teams()}")

standings = fetch_nba_standings("2025-26")
print(f"standings: {standings}")
standings = standings[[
    'TeamCity',
    'TeamName',
    'Conference',
    'PlayoffRank',
    'WINS',
    'LOSSES',
    'Record',
    'HOME',
    'ROAD',
    'L10',
    'LongWinStreak',
    'strCurrentStreak',
    'ConferenceGamesBack',
    'ClinchedPlayoffBirth',
    'ClinchedPlayIn',
    'EliminatedConference'
]]
standings_east = standings.query("Conference in 'East'").reset_index(drop=True)
standings_west = standings.query("Conference in 'West'").reset_index(drop=True)
# standings_east.to_csv('standings_east.csv')
# standings_west.to_csv('standings_west.csv')


def get_player_with_most_fouls(season):
    # Fetch player statistics for the given season
    player_stats = \
        leaguedashplayerstats.LeagueDashPlayerStats(season=season,
                                                    measure_type_detailed_defense='Base').get_data_frames()[
            0]

    # Sort players by 'PERSONAL_FOULS' and get the top player
    sorted_players = player_stats.sort_values(by='PF', ascending=False)
    top_player = sorted_players.iloc[0]

    return top_player['PLAYER_NAME'], top_player['PF']


def get_player_with_highest_ppg(season):
    # Fetch player statistics for the given season
    player_stats = \
        leaguedashplayerstats.LeagueDashPlayerStats(season=season,
                                                    measure_type_detailed_defense='Base').get_data_frames()[
            0]

    # Check if 'PTS_PER_GAME' exists in the data, otherwise compute it
    if 'PTS_PER_GAME' in player_stats.columns:
        sorted_players = player_stats.sort_values(by='PTS_PER_GAME', ascending=False)
    else:
        player_stats['PTS_PER_GAME'] = player_stats['PTS'] / player_stats['GP']
        sorted_players = player_stats.sort_values(by='PTS_PER_GAME', ascending=False)
    top_player = sorted_players.iloc[0]

    return top_player['PLAYER_NAME'], top_player['PTS_PER_GAME']


def get_player_averages(player_name, season):
    """
    Player_name:
    @season: ex: 2022-23
    """
    # Get player stats
    player_stats = leaguedashplayerstats.LeagueDashPlayerStats(season=season).get_data_frames()[0]

    # Filter for the specific player
    player_data = player_stats[player_stats['PLAYER_NAME'] == player_name].iloc[0]
    # Calculate the averages
    ppg = player_data['PTS'] / player_data['GP']
    rpg = player_data['REB'] / player_data['GP']
    apg = player_data['AST'] / player_data['GP']
    bpg = player_data['BLK'] / player_data['GP']
    tovpg = player_data['TOV'] / player_data['GP']
    spg = player_data['STL'] / player_data['GP']

    return {
        "PPG": ppg,
        "RPB": rpg,
        "APG": apg,
        "BPG": bpg,
        "SPG": spg,
        "TOVPG": tovpg,

    }


# Example usage:
season = '2025-26'
player_name, fouls = get_player_with_most_fouls(season=season)
print(f"{player_name} has the most personal fouls with {fouls} for the {season} season.")

player_name, ppg = get_player_with_highest_ppg(season=season)
print(f"{player_name} has the highest points per game with {ppg} for the {season} season.")

player_name = "Victor Wembanyama"  # replace with the desired player's name
season = '2025-26'
averages = get_player_averages(player_name, season=season)
print(f"{player_name} {season} averages:\n{pd.Series(averages)}")
print("Updating active player list")
# fetch_ist_standings(season="2024-25")
# fetch_nba_standings(season="2024-25")
# fetch_active_players()

# Bronny james
# data = {'id': 1999503, 'full_name': 'Lebron James Jr',
#         'first_name': 'Lebron',
#         'last_name': 'James Jr',
#         'is_active': True}
# name = "Lebron James Jr"
# player = Player.objects.create(name=name)
#
# player_obj, created = Player.objects.get_or_create(
#     name=name,
# )
# if not created:
#     # Update the existing TeamSeasonStats
#     player_obj.name = name
#     player_obj.save()


# player_name = "Joel Embiid"  # replace with the desired player's name
# averages = get_player_averages(player_name, season=season)
# print(f"{player_name} {season} averages:\n{averages}")

# Today's Score Board
# games = scoreboard.ScoreBoard()
# print(games.get_dict())
