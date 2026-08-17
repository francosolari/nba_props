/**
 * Where the season is heading, and what that is worth.
 *
 * A standings pick pays 3 on the nose and 1 either side, so a board's score only
 * moves when a team crosses a position boundary. In December that almost never
 * happens, and the number a player checks in on has not moved for weeks.
 *
 * The obvious fix — run each team's win pace out to 82 games and score the board
 * against the table that produces — does nothing at all. Multiplying every
 * team's win percentage by the same 82 preserves the order exactly, so the
 * "projected" ladder is the current ladder and the projected score is the
 * current score. Pace alone cannot move a number that only responds to order.
 *
 * What does move is the *uncertainty*. Two teams a game apart in March are far
 * more separated than the same two teams a game apart in November, because
 * November has sixty more games to reshuffle them. So instead of one projected
 * table this models many: each team's remaining games are sampled at its current
 * win rate, the conference is re-ranked on the result, and that repeats until
 * every team has a distribution over finishing positions rather than a single
 * one. A board is then scored in expectation against that distribution.
 *
 * The resulting number moves every week — early on because the spread is wide
 * and shifts easily, later because the spread collapses onto the real answer.
 * At the final buzzer every distribution is a point mass and the expected score
 * equals the graded score, so the projection and the grade can never disagree
 * about a finished season.
 *
 * It is a projection, never the score. The pool is graded on real final
 * standings by `grade_standing_predictions`, and nothing here touches that.
 */

import { EXACT_POINTS, scorePosition, teamKey } from './whatIf';

export const SEASON_GAMES = 82;

/**
 * Enough draws that the expected total is stable to well under a tenth of a
 * point, which is finer than anything the UI prints.
 */
const DRAWS = 4000;

/**
 * A pace read off very few games is mostly noise, so a team's win rate is pulled
 * toward .500 by a fixed prior. Twelve games of ballast is roughly a seventh of
 * a season: enough that an 0-3 team is not projected to lose all 82, and little
 * enough to have faded by Christmas.
 */
const PRIOR_GAMES = 12;
const PRIOR_RATE = 0.5;

/** mulberry32 — small, fast, and good enough for ranking noise. */
function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The seed is the table itself, so the same standings always produce the same
 * projection. A number that drifted on every page load would read as news when
 * nothing had happened.
 */
function seedFrom(rows) {
  let hash = 0x811c9dc5;
  rows.forEach((row) => {
    const source = `${row.team}|${row.wins}|${row.losses}`;
    for (let i = 0; i < source.length; i += 1) {
      hash ^= source.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
  });
  return hash >>> 0;
}

/** Box–Muller, one value per call; the discarded pair costs less than caching it. */
function standardNormal(random) {
  const u = Math.max(random(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

function outlookFor(row) {
  const wins = row.wins || 0;
  const losses = row.losses || 0;
  const played = Math.min(wins + losses, SEASON_GAMES);
  const remaining = Math.max(0, SEASON_GAMES - played);
  const rate = (wins + PRIOR_RATE * PRIOR_GAMES) / (played + PRIOR_GAMES);

  return {
    team: row.team,
    key: teamKey(row.team),
    position: row.position,
    wins,
    losses,
    remaining,
    rate,
    projectedWins: Math.round(wins + remaining * rate),
  };
}

/**
 * One conference, sampled forward. Each draw gives every team a final win total
 * and re-ranks on it; ties break on the team's current position so an untouched
 * table keeps its order.
 */
function distributionFor(rows) {
  const teams = (rows || []).map(outlookFor);
  if (!teams.length) return [];

  const size = teams.length;
  const counts = teams.map(() => new Array(size).fill(0));

  // A finished conference has nothing to sample: every team is already where it
  // will end, and the distribution is a point mass on the real position.
  if (teams.every((team) => team.remaining === 0)) {
    teams.forEach((team, index) => {
      counts[index][Math.min(size, Math.max(1, team.position || index + 1)) - 1] = DRAWS;
    });
  } else {
    const random = makeRandom(seedFrom(rows));
    // Remaining wins are a sum of independent games, so the normal approximation
    // is well behaved for anything but the last handful of a season — and by
    // then the spread is small enough that the shape hardly matters.
    const spread = teams.map((team) => (
      Math.sqrt(team.remaining * team.rate * (1 - team.rate))
    ));
    const draw = teams.map(() => ({ index: 0, finalWins: 0, position: 0 }));

    for (let d = 0; d < DRAWS; d += 1) {
      for (let i = 0; i < size; i += 1) {
        const team = teams[i];
        const sampled = team.remaining * team.rate + spread[i] * standardNormal(random);
        draw[i].index = i;
        draw[i].finalWins = team.wins + Math.min(Math.max(sampled, 0), team.remaining);
        draw[i].position = team.position || i + 1;
      }
      draw.sort((a, b) => b.finalWins - a.finalWins || a.position - b.position);
      for (let rank = 0; rank < size; rank += 1) {
        counts[draw[rank].index][rank] += 1;
      }
    }
  }

  return teams.map((team, index) => {
    const chance = counts[index].map((count) => count / DRAWS);
    return {
      ...team,
      // Indexed from 1 so a lookup reads as a position, not an offset.
      chance: [0, ...chance],
      expectedPosition: chance.reduce((sum, p, i) => sum + p * (i + 1), 0),
    };
  });
}

/**
 * @param {object} standings { eastern: [], western: [] } as the homepage serves it.
 * @returns {Map} team key to that team's finishing-position distribution.
 */
export function projectFinish(standings) {
  const index = new Map();
  [
    ...distributionFor(standings?.eastern),
    ...distributionFor(standings?.western),
  ].forEach((team) => index.set(team.key, team));
  return index;
}

/**
 * What one pick is worth against a distribution rather than a position: the
 * scoring rule applied to every finish the team might reach, weighted by how
 * often it reaches it.
 */
export function expectedPoints(predicted, outlook) {
  if (!predicted || !outlook) return 0;
  return outlook.chance.reduce(
    (sum, chance, position) => sum + chance * scorePosition(predicted, position),
    0,
  );
}

/**
 * A pick reads as settled once one payout is all but certain — 3, 1, or nothing.
 * Note that this is a question about the score, not about the table: a team
 * certain to finish either side of a called position is not settled at all,
 * because 1 and 3 are different answers. Everything short of a near-certain
 * payout is still live, and that is where the season is.
 */
const SETTLED = 0.95;

export function pickOutlook(predicted, outlook) {
  const payouts = new Map();
  (outlook?.chance || []).forEach((chance, position) => {
    const points = scorePosition(predicted, position);
    payouts.set(points, (payouts.get(points) || 0) + chance);
  });

  return {
    expected: expectedPoints(predicted, outlook),
    // How sure the biggest single payout is; 0 without any outlook at all.
    confidence: Math.max(0, ...payouts.values()),
    settled: Math.max(0, ...payouts.values()) >= SETTLED,
  };
}

/**
 * A whole board in expectation, plus how much of it is still in play. `picks` is
 * the `{ east, west }` shape `buildPredictionIndex` returns.
 */
export function projectBoard(picks, finish) {
  const entries = [
    ...(picks?.east ? picks.east.entries() : []),
    ...(picks?.west ? picks.west.entries() : []),
  ];

  return entries.reduce((totals, [key, predicted]) => {
    const { expected, settled } = pickOutlook(predicted, finish.get(key));
    return {
      points: totals.points + expected,
      settled: totals.settled + (settled ? 1 : 0),
      live: totals.live + (settled ? 0 : 1),
      ceiling: totals.ceiling + EXACT_POINTS,
    };
  }, { points: 0, settled: 0, live: 0, ceiling: 0 });
}

/**
 * Re-score and re-rank the pool in expectation. Only the standings category can
 * move — every other category is graded on events the standings do not touch —
 * so each total shifts by the difference on that category alone, exactly as the
 * what-if projection does.
 */
export function projectLeaderboardFinish(entries, finish) {
  const STANDINGS = 'Regular Season Standings';

  return (entries || [])
    .map((entry) => {
      const category = entry.user?.categories?.[STANDINGS];
      const board = category?.predictions || [];
      if (!board.length) return { ...entry, projectedTotal: entry.user?.total_points || 0 };

      const expected = board.reduce(
        (sum, pick) => sum + expectedPoints(pick.predicted_position, finish.get(teamKey(pick.team))),
        0,
      );
      return {
        ...entry,
        projectedTotal: (entry.user?.total_points || 0) - (category.points || 0) + expected,
      };
    })
    .sort((a, b) => b.projectedTotal - a.projectedTotal)
    .map((entry, index) => ({ ...entry, projectedRank: index + 1 }));
}
