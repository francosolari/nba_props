import React from 'react';

/**
 * What actually happened, stated beside the question.
 *
 * Without it the result can only be inferred from whoever happened to pick it,
 * which is impossible when nobody did — a leader no one backed simply has no
 * cell on the board. It sits in the fixed column rather than a column of its
 * own so it stays beside the question while the participants swipe past.
 *
 * Mid-season a superlative's result is the current odds leader, not a verdict,
 * so the label says which it is — and only an award is ever "won". A prop has
 * no winner to name, just an answer that is right.
 */
export const AnswerKey = ({ prediction, isAward, compact }) => {
  const winner = prediction?.correct_answer;
  const runnerUp = prediction?.runner_up_answer;
  if (!winner && !runnerUp) return null;

  const settled = prediction?.is_finalized === true || prediction?.is_locked === true;
  // Only an award is won. A prop has no winner, just a correct answer, so it
  // says so plainly and says "so far" while the season can still change it.
  const label = isAward
    ? (settled ? 'Won' : 'Leading')
    : (settled ? 'Correct' : 'So far');

  return (
    <span className={`court-adv-key ${compact ? 'court-adv-key--compact' : ''}`}>
      {winner && (
        <span className="court-adv-key__row">
          <span className="court-adv-key__mark is-hit">{label}</span>
          <span className="court-adv-key__name">{winner}</span>
        </span>
      )}
      {runnerUp && runnerUp !== winner && (
        <span className="court-adv-key__row">
          <span className="court-adv-key__mark is-near">2nd</span>
          <span className="court-adv-key__name">{runnerUp}</span>
        </span>
      )}
    </span>
  );
};

export default AnswerKey;
