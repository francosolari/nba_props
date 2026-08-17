import json
import os
import re
import time

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
from nba_api.stats.library.http import NBAStatsHTTP
from requests.exceptions import ConnectionError as RequestsConnectionError
from requests.exceptions import ReadTimeout, RequestException, Timeout

from predictions.models import Team, Season, Player, \
    RegularSeasonStandings, \
    InSeasonTournamentStandings, PostSeasonStandings


# Nikola Jokić
# career = playercareerstats.PlayerCareerStats(player_id='203999')
def _last_ten_wins(value):
    """
    The feed reports the last ten games as a ``"7-3"`` string. Only the finish
    projection reads it, so an unparseable or absent value returns None and the
    projection simply falls back to the season-long rate.
    """
    try:
        wins = int(str(value).split('-')[0])
    except (AttributeError, ValueError, IndexError, TypeError):
        return None
    return wins if 0 <= wins <= 10 else None


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

        last_ten_wins = _last_ten_wins(row.get('L10'))

        stats, created = RegularSeasonStandings.objects.get_or_create(
            team=team,
            season=season,  # Reference the season year
            defaults={
                'wins': row['WINS'],
                'losses': row['LOSSES'],
                'position': row['PlayoffRank'],
                'last_ten_wins': last_ten_wins,
            }
        )
        if not created:
            # Update the existing TeamSeasonStats
            stats.wins = row['WINS']
            stats.losses = row['LOSSES']
            stats.position = row['PlayoffRank']
            stats.last_ten_wins = last_ten_wins
            stats.save()


def fetch_nba_teams():
    """
    Small function to retrieve all teams in NBA
    :return:
    """
    return teams.get_teams()


def _result_sets_from_payload(payload):
    """Normalize standings payload to a list of result-set dictionaries."""
    if not isinstance(payload, dict):
        raise ValueError(f"Unexpected standings payload type: {type(payload).__name__}")

    if "resultSets" in payload:
        result_sets = payload["resultSets"]
    elif "resultSet" in payload:
        result_sets = payload["resultSet"]
    else:
        payload_keys = ", ".join(sorted(payload.keys())) if payload else "<empty>"
        raise ValueError(
            f"Unexpected standings payload; missing 'resultSet'/'resultSets'. Keys: {payload_keys}"
        )

    if isinstance(result_sets, dict):
        return [result_sets]
    if isinstance(result_sets, list):
        return result_sets

    raise ValueError(f"Unexpected standings result set type: {type(result_sets).__name__}")


def _extract_standings_dataframe(payload):
    """Build a standings dataframe from raw NBA API payload."""
    result_sets = _result_sets_from_payload(payload)
    dict_result_sets = [result_set for result_set in result_sets if isinstance(result_set, dict)]
    if not dict_result_sets:
        raise ValueError("Could not parse standings payload: no valid result-set dictionaries found.")

    # Prefer explicit standings data set by name.
    ordered_sets = sorted(
        dict_result_sets,
        key=lambda rs: 0 if str(rs.get("name", "")).lower() == "standings" else 1,
    )

    for result_set in ordered_sets:
        headers = result_set.get("headers")
        rows = result_set.get("rowSet")
        if headers and rows is not None:
            return pd.DataFrame(rows, columns=headers)

    raise ValueError("Could not parse standings rows from NBA API payload.")


def _get_int_env(name, default):
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _normalize_nba_season(season):
    season_str = str(season)
    if re.fullmatch(r"\d{2}-\d{2}", season_str):
        return f"20{season_str}"
    return season_str


def _fetch_standings_payload_v3(season, timeout):
    response = NBAStatsHTTP().send_api_request(
        endpoint="leaguestandingsv3",
        parameters={
            "LeagueID": "00",
            "Season": season,
            "SeasonType": "Regular Season",
            "SeasonYear": "",
        },
        timeout=timeout,
    )
    return response.get_dict()


def fetch_nba_standings(season, timeout=None, retries=None, retry_delay=None):
    api_season = _normalize_nba_season(season)
    timeout = timeout if timeout is not None else _get_int_env("NBA_API_TIMEOUT_SECONDS", 45)
    retries = retries if retries is not None else _get_int_env("NBA_API_MAX_RETRIES", 3)
    retry_delay = retry_delay if retry_delay is not None else _get_int_env("NBA_API_RETRY_DELAY_SECONDS", 2)

    retries = max(retries, 1)
    retry_delay = max(retry_delay, 0)

    last_network_error = None

    for attempt in range(1, retries + 1):
        try:
            try:
                endpoint = leaguestandingsv3.LeagueStandingsV3(season=api_season, timeout=timeout)

            except (KeyError, IndexError, TypeError, ValueError):
                standings_data = _extract_standings_dataframe(_fetch_standings_payload_v3(api_season, timeout))
            else:
                try:
                    standings_data = endpoint.get_data_frames()[0]
                except (KeyError, IndexError, TypeError, ValueError):
                    standings_data = _extract_standings_dataframe(endpoint.get_dict())

            required_columns = {"TeamCity", "TeamName", "Conference", "PlayoffRank", "WINS", "LOSSES"}
            missing_columns = required_columns.difference(standings_data.columns)
            if missing_columns:
                missing = ", ".join(sorted(missing_columns))
                raise ValueError(f"Standings payload missing required columns: {missing}")

            update_standings(standings_data, season)
            return standings_data

        except (ReadTimeout, Timeout, RequestsConnectionError, RequestException) as exc:
            last_network_error = exc
            if attempt == retries:
                break
            time.sleep(retry_delay * attempt)

    raise TimeoutError(
        f"NBA API request failed after {retries} attempts (timeout={timeout}s): {last_network_error}"
    ) from last_network_error


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
        nba_player_id = row.get('id')

        player_obj, created = Player.objects.get_or_create(
            name=name,
            defaults={'nba_player_id': nba_player_id},
        )
        if not created:
            player_obj.name = name
            if nba_player_id and player_obj.nba_player_id != nba_player_id:
                player_obj.nba_player_id = nba_player_id
            player_obj.save()


def fetch_active_players():
    # get_players returns a list of dictionaries, each representing a player.
    nba_players = players.get_active_players()
    print(nba_players)
    update_active_players(nba_players)

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


if __name__ == "__main__":
    # Manual entry point for local ad-hoc data tasks.
    season = "2025-26"
    fetch_ist_standings(season=season)
    fetch_nba_standings(season=season)
