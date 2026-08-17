import { isLockedPrediction, lockedPoints } from '../utils/helpers';

/**
 * The scoring rule the board simulates: a question resolves to one winner and,
 * on superlatives, one runner-up who takes partial credit. Naming a winner
 * awards it full points, the runner-up takes the partial award, and every other
 * answer scores nothing. Clearing the override hands the question back to the
 * real result — which mid-season is the current favourite, not a final answer.
 *
 * This mirrors toggleWhatIfAnswer and applyAnswerOverrides in
 * LeaderboardDetailPage so the rule is pinned somewhere cheap to read.
 */
const toAnswerKey = (answer) => String(answer ?? '').trim().toLowerCase();

const OPPOSITE_ANSWER = { over: 'under', under: 'over', yes: 'no', no: 'yes' };

const FULL = 5;
const PARTIAL = 2.5;

/** First tap on an answer hands it the win; tapping it again walks it round
 *  winner -> out -> runner-up -> winner. Mirrors toggleWhatIfAnswer. */
const cast = (override, answerKey, real) => {
  const current = override || { winner: real.winner, partial: real.partial, touched: [] };
  const touched = current.touched || [];

  const shown = current.winner === answerKey ? 'winner'
    : current.partial === answerKey ? 'partial'
      : 'out';

  const target = !real.hasRunnerUp
    ? (shown === 'winner' ? 'flip' : 'winner')
    : (!touched.includes(answerKey) && shown !== 'winner') ? 'winner'
      : shown === 'winner' ? 'out'
        : shown === 'out' ? 'partial'
          : 'winner';

  let winner = current.winner;
  let partial = current.partial;
  if (target === 'flip') {
    const others = [...(real.answers || [])].filter((a) => a !== answerKey);
    winner = OPPOSITE_ANSWER[answerKey] || (others.length === 1 ? others[0] : real.winner);
    partial = real.partial;
  } else if (target === 'winner') {
    partial = real.hasRunnerUp && winner && winner !== answerKey ? winner : null;
    winner = answerKey;
  } else if (target === 'partial') {
    if (winner === answerKey) winner = null;
    partial = answerKey;
  } else {
    if (winner === answerKey) winner = null;
    if (partial === answerKey) partial = null;
  }

  if (winner === real.winner && partial === real.partial) return null;
  return { winner, partial, touched: touched.includes(answerKey) ? touched : [...touched, answerKey] };
};

const state = (override, key) => (override?.winner === key ? 'green'
  : override?.partial === key ? 'yellow' : 'red');

const simulate = (predictions, override) => predictions.map((prediction) => {
  const realStatus = prediction.score_status;
  if (!override) return { ...prediction, score_status: realStatus, __what_if_state: undefined };
  const key = toAnswerKey(prediction.answer);
  const isWinner = key === override.winner;
  const isRunnerUp = !isWinner && key === override.partial;
  const scoreStatus = isWinner ? 'correct' : isRunnerUp ? 'partial' : 'incorrect';
  return {
    ...prediction,
    points: isWinner ? FULL : isRunnerUp ? PARTIAL : 0,
    correct: isWinner,
    score_status: scoreStatus,
    __what_if_state: isWinner ? 'winner'
      : isRunnerUp ? 'partial'
        : (scoreStatus === realStatus ? undefined : 'changed'),
  };
});

// Defensive Player of the Year, mid-season: Wembanyama leads the odds, so the
// picks that named him are provisionally scoring.
const dpoy = () => ([
  { answer: 'Victor Wembanyama', point_value: 5, points: 5, correct: true, score_status: 'correct', is_finalized: false },
  { answer: 'Evan Mobley', point_value: 5, points: 0, correct: false, score_status: 'incorrect', is_finalized: false },
  { answer: 'Dyson Daniels', point_value: 5, points: 0, correct: false, score_status: 'incorrect', is_finalized: false },
]);

// Mid-season the leader and runner-up are the top two in the odds.
const REAL = { winner: 'victor wembanyama', partial: 'dyson daniels', hasRunnerUp: true };

describe('what-if outcome cycle', () => {
  test('first tap hands an answer the win and drops the leader to runner-up', () => {
    const override = cast(null, 'evan mobley', REAL);
    expect(override).toMatchObject({ winner: 'evan mobley', partial: 'victor wembanyama' });

    const result = simulate(dpoy(), override);
    expect(result.find((p) => p.answer === 'Evan Mobley')).toMatchObject({ points: FULL, score_status: 'correct' });
    expect(result.find((p) => p.answer === 'Victor Wembanyama')).toMatchObject({ points: PARTIAL, score_status: 'partial' });
    // Whoever held second is pushed out.
    expect(result.find((p) => p.answer === 'Dyson Daniels').score_status).toBe('incorrect');
  });

  test('tapping the same answer again walks it green, red, yellow, green', () => {
    let override = cast(null, 'evan mobley', REAL);
    expect(state(override, 'evan mobley')).toBe('green');

    override = cast(override, 'evan mobley', REAL);
    expect(state(override, 'evan mobley')).toBe('red');

    override = cast(override, 'evan mobley', REAL);
    expect(state(override, 'evan mobley')).toBe('yellow');

    override = cast(override, 'evan mobley', REAL);
    expect(state(override, 'evan mobley')).toBe('green');
  });

  test('ruling out the winner leaves nobody winning that question', () => {
    let override = cast(null, 'evan mobley', REAL);
    override = cast(override, 'evan mobley', REAL);

    const result = simulate(dpoy(), override);
    expect(result.filter((p) => p.score_status === 'correct')).toHaveLength(0);
    expect(result.find((p) => p.answer === 'Evan Mobley').score_status).toBe('incorrect');
    // The displaced leader keeps the runner-up slot it was given.
    expect(result.find((p) => p.answer === 'Victor Wembanyama').score_status).toBe('partial');
  });

  test('a first tap on the real runner-up promotes it and swaps the pair', () => {
    const override = cast(null, 'dyson daniels', REAL);
    expect(override).toMatchObject({ winner: 'dyson daniels', partial: 'victor wembanyama' });
  });

  test('tapping the answer that already leads rules it out rather than doing nothing', () => {
    const override = cast(null, 'victor wembanyama', REAL);
    expect(state(override, 'victor wembanyama')).toBe('red');
    // The real runner-up is untouched by that.
    expect(override.partial).toBe('dyson daniels');
  });

  test('only one answer holds each slot', () => {
    let override = cast(null, 'evan mobley', REAL);
    override = cast(override, 'dyson daniels', REAL);
    expect(override).toMatchObject({ winner: 'dyson daniels', partial: 'evan mobley' });

    const result = simulate(dpoy(), override);
    expect(result.filter((p) => p.score_status === 'correct')).toHaveLength(1);
    expect(result.filter((p) => p.score_status === 'partial')).toHaveLength(1);
  });

  test('tapping the side that already holds a prop gives the result to the other', () => {
    // The bug this covers: tapping the answer that was already correct did
    // nothing at all, because reverting to reality was a no-op.
    const prop = { winner: 'under', partial: null, hasRunnerUp: false, answers: new Set(['under', 'over']) };

    let override = cast(null, 'under', prop);
    expect(override).toMatchObject({ winner: 'over' });

    override = cast(override, 'under', prop);
    expect(override).toBeNull(); // under is right again, which is reality

    override = cast(override, 'under', prop);
    expect(override).toMatchObject({ winner: 'over' }); // and it flips back
  });

  test('a prop toggles from either side', () => {
    const prop = { winner: 'under', partial: null, hasRunnerUp: false, answers: new Set(['under', 'over']) };

    let override = cast(null, 'over', prop);
    expect(override).toMatchObject({ winner: 'over' });

    override = cast(override, 'over', prop);
    expect(override).toBeNull();
  });

  test('a yes/no prop flips the same way', () => {
    const prop = { winner: 'yes', partial: null, hasRunnerUp: false, answers: new Set(['yes', 'no']) };
    expect(cast(null, 'yes', prop)).toMatchObject({ winner: 'no' });
  });

  test('a prop never hands out partial credit', () => {
    const prop = { winner: 'over', partial: null, hasRunnerUp: false, answers: new Set(['over', 'under']) };
    let override = cast(null, 'under', prop);
    for (let i = 0; i < 5; i += 1) {
      override = cast(override, 'under', prop);
      expect(override?.partial ?? null).toBeNull();
    }
  });

  test('only the cells the scenario moved carry the simulated mark', () => {
    const result = simulate(dpoy(), cast(null, 'evan mobley', REAL));

    expect(result.find((p) => p.answer === 'Evan Mobley').__what_if_state).toBe('winner');
    expect(result.find((p) => p.answer === 'Victor Wembanyama').__what_if_state).toBe('partial');
    // Wrong before, wrong now — nothing about this cell changed.
    expect(result.find((p) => p.answer === 'Dyson Daniels').__what_if_state).toBeUndefined();
  });

  test('with no override the real result stands', () => {
    const result = simulate(dpoy(), null);
    expect(result[0]).toMatchObject({ points: FULL, score_status: 'correct' });
    expect(result[1].points).toBe(0);
  });
});

describe('locked versus in play', () => {
  test('a settled seed and an awarded award are locked; a provisional one is not', () => {
    expect(isLockedPrediction({ is_locked: true })).toBe(true);
    expect(isLockedPrediction({ is_finalized: true })).toBe(true);
    expect(isLockedPrediction({ is_finalized: false })).toBe(false);
    // Question types with no finalization flag report null — unknown is never
    // treated as a promise that the points are safe.
    expect(isLockedPrediction({ is_finalized: null, points: 3 })).toBe(false);
    expect(isLockedPrediction(undefined)).toBe(false);
  });

  test('banked points count only the results that can no longer move', () => {
    const entry = {
      user: {
        total_points: 14,
        categories: {
          'Regular Season Standings': {
            predictions: [
              { points: 3, is_locked: true },
              { points: 3, is_locked: false },
            ],
          },
          'Player Awards': {
            predictions: [
              { points: 5, is_finalized: true },
              { points: 3, is_finalized: false },
            ],
          },
        },
      },
    };

    expect(lockedPoints(entry)).toBe(8);
  });
});
