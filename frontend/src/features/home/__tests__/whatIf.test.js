import {
  pointsAvailable,
  projectLeaderboard,
  projectStandings,
  scorePosition,
} from '../whatIf';

const standings = {
  eastern: [
    { position: 1, team: 'Boston Celtics', wins: 50, losses: 20 },
    { position: 2, team: 'New York Knicks', wins: 50, losses: 21 },
    { position: 3, team: 'Milwaukee Bucks', wins: 40, losses: 30 },
  ],
  western: [
    { position: 1, team: 'Oklahoma City Thunder', wins: 55, losses: 15 },
    { position: 2, team: 'Denver Nuggets', wins: 45, losses: 25 },
  ],
};

describe('scorePosition', () => {
  test('matches the grading command: 3 on the nose, 1 either side, 0 beyond', () => {
    expect(scorePosition(4, 4)).toBe(3);
    expect(scorePosition(4, 5)).toBe(1);
    expect(scorePosition(4, 3)).toBe(1);
    expect(scorePosition(4, 6)).toBe(0);
  });

  test('scores nothing when either position is missing', () => {
    expect(scorePosition(undefined, 3)).toBe(0);
    expect(scorePosition(3, undefined)).toBe(0);
  });

  test('reports what an exact call would still add', () => {
    expect(pointsAvailable(4, 4)).toBe(0);
    expect(pointsAvailable(4, 5)).toBe(2);
    expect(pointsAvailable(4, 9)).toBe(3);
  });
});

describe('projectStandings', () => {
  test('leaves the table untouched when nothing is called', () => {
    const projected = projectStandings(standings, []);
    expect(projected.eastern.map((row) => row.team)).toEqual([
      'Boston Celtics', 'New York Knicks', 'Milwaukee Bucks',
    ]);
    expect(projected.eastern[0].wins).toBe(50);
  });

  test('swaps two teams when one result closes the gap', () => {
    const projected = projectStandings(standings, [
      { winner: 'New York Knicks', loser: 'Boston Celtics' },
    ]);

    expect(projected.eastern.map((row) => row.team)).toEqual([
      'New York Knicks', 'Boston Celtics', 'Milwaukee Bucks',
    ]);
    expect(projected.eastern[0]).toMatchObject({ position: 1, wins: 51, losses: 21 });
    // The old position rides along so the table can show what moved.
    expect(projected.eastern[0].actualPosition).toBe(2);
  });

  test('holds the current order when a result leaves teams tied', () => {
    const tied = {
      eastern: [
        { position: 1, team: 'Boston Celtics', wins: 50, losses: 21 },
        { position: 2, team: 'New York Knicks', wins: 49, losses: 21 },
      ],
      western: [],
    };
    const projected = projectStandings(tied, [
      { winner: 'New York Knicks', loser: 'Milwaukee Bucks' },
    ]);
    expect(projected.eastern.map((row) => row.team)).toEqual(['Boston Celtics', 'New York Knicks']);
  });
});

describe('projectLeaderboard', () => {
  const entry = (id, name, total, points, picks) => ({
    rank: 0,
    user: {
      id,
      display_name: name,
      total_points: total,
      categories: { 'Regular Season Standings': { points, predictions: picks } },
    },
  });

  const pick = (team, predicted_position) => ({ team, predicted_position });

  test('re-scores only the standings category and re-ranks on the new totals', () => {
    // Ada called the Knicks 2nd (currently exact, 3 points). Bo called them 1st.
    const entries = [
      entry(1, 'Ada', 20, 3, [pick('New York Knicks', 2)]),
      entry(2, 'Bo', 19, 1, [pick('New York Knicks', 1)]),
    ];

    // The Knicks win and take 1st: Ada's exact call becomes off-by-one, Bo's
    // off-by-one becomes exact, and that two-point swing flips the table.
    const projected = projectLeaderboard(
      entries,
      projectStandings(standings, [{ winner: 'New York Knicks', loser: 'Boston Celtics' }]),
    );

    expect(projected.map((row) => row.user.display_name)).toEqual(['Bo', 'Ada']);
    expect(projected[0]).toMatchObject({ rank: 1, standingsDelta: 2 });
    expect(projected[0].user.total_points).toBe(21);
    expect(projected[1]).toMatchObject({ rank: 2, standingsDelta: -2 });
    expect(projected[1].user.total_points).toBe(18);
  });

  test('carries entries with no standings board through untouched', () => {
    const entries = [entry(1, 'Ada', 20, 0, [])];
    const projected = projectLeaderboard(entries, standings);
    expect(projected[0]).toMatchObject({ standingsDelta: 0 });
    expect(projected[0].user.total_points).toBe(20);
  });
});
