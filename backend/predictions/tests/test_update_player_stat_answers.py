from types import SimpleNamespace

from predictions.management.commands.update_player_stat_answers import (
    h2h_answer,
    h2h_stat_column,
    SPLIT_PATTERN,
    opponent_abbreviation,
    totals_from_games,
    prop_answer,
)

ROW = {'GP': 2, 'PTS': 40, 'REB': 10, 'AST': 26, 'STL': 2, 'BLK': 0,
       'FG3M': 7, 'FG_PCT': 0.45, 'FG3_PCT': 0.38}


def test_h2h_stat_read_from_question_text():
    assert h2h_stat_column('Who makes more threes, LaMelo or Ant?') == 'FG3M'
    assert h2h_stat_column('More 3-pointers made: LaMelo vs Ant') == 'FG3M'
    assert h2h_stat_column('LaMelo vs Ant 3s made') == 'FG3M'
    assert h2h_stat_column('Who averages more assists?') == 'AST'
    assert h2h_stat_column('Who scores more points?') == 'PTS'
    assert h2h_stat_column('Who wins MVP?') is None


def test_prop_answer_uses_per_game_for_averages():
    assert prop_answer('assists', 11.5, ROW) == ('Over', 13.0)
    assert prop_answer('points', 21.5, ROW) == ('Under', 20.0)
    assert prop_answer('threes', 7, ROW) == (None, 7)  # push on the line
    assert prop_answer('technicals', 5, ROW) == (None, None)
    assert prop_answer('assists', 11.5, None) == (None, None)


def test_h2h_answer_picks_leader_and_ties_clear():
    melo, ant = SimpleNamespace(name='LaMelo Ball'), SimpleNamespace(name='Anthony Edwards')
    assert h2h_answer('FG3M', melo, {'FG3M': 5}, ant, {'FG3M': 9}) == ('Anthony Edwards', 5, 9)
    assert h2h_answer('FG3M', melo, {'FG3M': 5}, ant, None) == ('LaMelo Ball', 5, 0)
    assert h2h_answer('FG3M', melo, {'FG3M': 5}, ant, {'FG3M': 5}) == (None, 5, 5)


def test_split_props_are_detected():
    assert SPLIT_PATTERN.search('Chet points per game against the San Antonio Spurs')
    assert not SPLIT_PATTERN.search('Trae Young assists per game (season)')


TEAMS = [{'nickname': 'Spurs', 'abbreviation': 'SAS'}, {'nickname': 'Trail Blazers', 'abbreviation': 'POR'}]


def test_opponent_read_from_prop_text():
    assert opponent_abbreviation('Chet average points per game against the San Antonio Spurs this season', TEAMS) == 'SAS'
    assert opponent_abbreviation('Rebounds vs. the Trail Blazers', TEAMS) == 'POR'
    assert opponent_abbreviation('Trae Young assists per game (season)', TEAMS) is None


def test_totals_from_games_feeds_prop_answer():
    game = {'PTS': 14, 'REB': 8, 'AST': 2, 'STL': 1, 'BLK': 3, 'FG3M': 1, 'FGM': 6, 'FGA': 12, 'FG3A': 4}
    row = totals_from_games([game, {**game, 'PTS': 8}])
    assert row['GP'] == 2 and row['FG_PCT'] == 0.5
    assert prop_answer('points', 10.6, row) == ('Over', 11.0)
