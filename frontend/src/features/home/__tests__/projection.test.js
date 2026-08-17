import {
  expectedPoints,
  pickOutlook,
  projectBoard,
  projectFinish,
  projectLeaderboardFinish,
} from '../projection';
import { teamKey } from '../whatIf';

/**
 * A conference of `count` teams `played` games in, laid out on an even ladder
 * of win rates from .650 down to .350 so the gaps stay proportional whatever
 * point of the season the fixture describes.
 */
const conference = (count, played) => (
  Array.from({ length: count }, (_, i) => {
    const rate = 0.65 - (0.3 * i) / Math.max(1, count - 1);
    const wins = Math.round(played * rate);
    return { position: i + 1, team: `Team ${i + 1}`, wins, losses: played - wins };
  })
);

describe('projectFinish', () => {
  test('gives every team a distribution that sums to one', () => {
    const finish = projectFinish({ eastern: conference(5, 20), western: [] });
    finish.forEach((team) => {
      const total = team.chance.reduce((sum, p) => sum + p, 0);
      expect(total).toBeCloseTo(1, 6);
    });
  });

  test('is deterministic: the same table projects the same way twice', () => {
    const standings = { eastern: conference(8, 30), western: conference(8, 30) };
    const a = projectFinish(standings);
    const b = projectFinish(standings);
    a.forEach((team, key) => expect(team.chance).toEqual(b.get(key).chance));
  });

  test('collapses onto the real table once every game is played', () => {
    const done = {
      eastern: [
        { position: 1, team: 'Boston Celtics', wins: 60, losses: 22 },
        { position: 2, team: 'New York Knicks', wins: 50, losses: 32 },
      ],
      western: [],
    };
    const finish = projectFinish(done);
    expect(finish.get(teamKey('Boston Celtics')).chance[1]).toBe(1);
    expect(finish.get(teamKey('New York Knicks')).chance[2]).toBe(1);
  });

  test('narrows as the season runs out', () => {
    // The same one-game gaps, read in November and then in April.
    const early = projectFinish({ eastern: conference(10, 15), western: [] });
    const late = projectFinish({ eastern: conference(10, 75), western: [] });
    const certainty = (finish) => finish.get(teamKey('Team 1')).chance[1];

    expect(certainty(late)).toBeGreaterThan(certainty(early));
  });
});

describe('recency', () => {
  const rateFor = (lastTenWins) => {
    const rows = conference(6, 50);
    rows[3] = { ...rows[3], last_ten_wins: lastTenWins };
    return projectFinish({ eastern: rows, western: [] }).get(teamKey(rows[3].team)).rate;
  };

  test('a hot streak raises the projected rate and a cold streak lowers it', () => {
    expect(rateFor(9)).toBeGreaterThan(rateFor(undefined));
    expect(rateFor(1)).toBeLessThan(rateFor(undefined));
  });

  test('is deliberately mild — ten games cannot drag a .500 team to .900', () => {
    expect(rateFor(9) - rateFor(undefined)).toBeLessThan(0.1);
  });

  test('falls back to the season rate when the feed carries no last ten', () => {
    const finish = projectFinish({
      eastern: [{ position: 1, team: 'A', wins: 30, losses: 20 }],
      western: [],
    });
    // 30 wins in 50, shrunk toward .500 by the 12-game prior.
    expect(finish.get(teamKey('A')).rate).toBeCloseTo((30 + 6) / (50 + 12), 9);
  });

  test('down-weighting history costs effective sample size', () => {
    const finish = projectFinish({
      eastern: [{ position: 1, team: 'A', wins: 30, losses: 20, last_ten_wins: 6 }],
      western: [],
    });
    expect(finish.get(teamKey('A')).weight).toBeLessThan(50);
  });

  test('a hot team is projected to finish higher', () => {
    const cold = conference(8, 50).map((row) => ({ ...row, last_ten_wins: 2 }));
    const hot = cold.map((row, i) => (i === 5 ? { ...row, last_ten_wins: 9 } : row));
    const place = (rows) => projectFinish({ eastern: rows, western: [] })
      .get(teamKey(rows[5].team)).expectedPosition;

    expect(place(hot)).toBeLessThan(place(cold));
  });

  test('matches the Python twin on a shared fixture', () => {
    // Pinned from backend/predictions/services/standings_projection.py. The two
    // models must agree: the homepage and the digest describe the same season.
    const finish = projectFinish({
      eastern: [{ position: 1, team: 'A', wins: 30, losses: 20, last_ten_wins: 8 }],
      western: [],
    });
    // 8 of the last 10, 22 of the 40 before at 0.6 weight: (8 + 13.2 + 6) / (34 + 12).
    expect(finish.get(teamKey('A')).rate).toBeCloseTo(0.591304, 6);
    expect(finish.get(teamKey('A')).weight).toBeCloseTo(47.377, 3);
  });
});

describe('expectedPoints', () => {
  const settled = { chance: [0, 0, 1, 0] };

  test('reduces to the grading rule when the finish is certain', () => {
    expect(expectedPoints(2, settled)).toBe(3);
    expect(expectedPoints(1, settled)).toBe(1);
    expect(expectedPoints(3, settled)).toBe(1);
  });

  test('weights each reachable finish by how often it happens', () => {
    // Half the time 2nd (an exact call, 3), half the time 4th (nothing).
    const split = { chance: [0, 0, 0.5, 0, 0.5] };
    expect(expectedPoints(2, split)).toBeCloseTo(1.5, 6);
  });

  test('scores nothing without a pick or without an outlook', () => {
    expect(expectedPoints(undefined, settled)).toBe(0);
    expect(expectedPoints(2, undefined)).toBe(0);
  });
});

describe('pickOutlook', () => {
  test('settles on a certain payout, whether that payout is 3 or nothing', () => {
    expect(pickOutlook(2, { chance: [0, 0, 1, 0, 0] }).settled).toBe(true);
    expect(pickOutlook(9, { chance: [0, 0, 1, 0, 0] }).settled).toBe(true);
  });

  test('settles when different finishes happen to pay the same', () => {
    // Certain to finish either side of the call, and both sides pay 1.
    expect(pickOutlook(2, { chance: [0, 0.5, 0, 0.5, 0] }).settled).toBe(true);
  });

  test('stays live when the team is in the band but the payout is not fixed', () => {
    // A coin flip between the exact call and one place off: 3 or 1.
    expect(pickOutlook(2, { chance: [0, 0.5, 0.5, 0, 0] }).settled).toBe(false);
  });

  test('stays live while the team could still fall out of the band', () => {
    expect(pickOutlook(2, { chance: [0, 0, 0.5, 0, 0.5] }).settled).toBe(false);
  });
});

describe('projectBoard', () => {
  test('totals a board in expectation and counts what is still live', () => {
    const finish = new Map([
      ['a', { chance: [0, 1, 0, 0] }],
      ['b', { chance: [0, 0, 0.5, 0.5] }],
    ]);
    const board = projectBoard(
      { east: new Map([['a', 1]]), west: new Map([['b', 3]]) },
      finish,
    );

    expect(board.points).toBeCloseTo(3 + (0.5 * 1 + 0.5 * 3), 6);
    expect(board.settled).toBe(1);
    expect(board.live).toBe(1);
    expect(board.ceiling).toBe(6);
  });
});

describe('projectLeaderboardFinish', () => {
  const entry = (id, name, total, points, picks) => ({
    rank: 0,
    user: {
      id,
      display_name: name,
      total_points: total,
      categories: { 'Regular Season Standings': { points, predictions: picks } },
    },
  });

  test('re-ranks on the expected total, leaving other categories alone', () => {
    // Boston is certain to finish 1st. Ada called it 1st, Bo called it 5th, and
    // Bo's two-point lead comes from categories the standings cannot touch.
    const finish = new Map([[teamKey('Boston Celtics'), { chance: [0, 1, 0, 0, 0, 0] }]]);
    const projected = projectLeaderboardFinish([
      entry(1, 'Ada', 20, 0, [{ team: 'Boston Celtics', predicted_position: 1 }]),
      entry(2, 'Bo', 22, 0, [{ team: 'Boston Celtics', predicted_position: 5 }]),
    ], finish);

    expect(projected.map((row) => row.user.display_name)).toEqual(['Ada', 'Bo']);
    expect(projected[0]).toMatchObject({ projectedRank: 1, projectedTotal: 23 });
    expect(projected[1]).toMatchObject({ projectedRank: 2, projectedTotal: 22 });
  });

  test('carries an entry with no standings board through at its graded total', () => {
    const projected = projectLeaderboardFinish([entry(1, 'Ada', 20, 0, [])], new Map());
    expect(projected[0].projectedTotal).toBe(20);
  });
});
