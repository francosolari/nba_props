import React from 'react';

export const choicesForOutcome = (outcomeType) => (
  outcomeType === 'over_under' ? ['Over', 'Under'] : ['Yes', 'No']
);

const hasSplit = (pointsIfCorrect) => Object.keys(pointsIfCorrect || {}).length > 0;

// Points for a two-way prop: one value for either answer, or a value per
// answer ("3 if yes, 1 if no") that is paid only when that answer is correct.
// Emits { pointValue, pointsIfCorrect }; pointValue tracks the larger side so
// lists that show a single "worth" read sensibly.
const AnswerPoints = ({ outcomeType, pointValue, pointsIfCorrect, onChange, idPrefix }) => {
  const choices = choicesForOutcome(outcomeType);
  const split = hasSplit(pointsIfCorrect);

  const setSplit = (next) => {
    if (!next) {
      onChange({ pointValue, pointsIfCorrect: {} });
      return;
    }
    const seeded = Object.fromEntries(choices.map((choice) => [choice, String(pointValue ?? '')]));
    onChange({ pointValue, pointsIfCorrect: seeded });
  };

  const setSide = (choice, value) => {
    const next = { ...pointsIfCorrect, [choice]: value };
    const max = Math.max(...choices.map((c) => Number(next[c]) || 0));
    onChange({ pointValue: String(max), pointsIfCorrect: next });
  };

  return (
    <fieldset className="court-admin-points">
      <legend>Points if correct</legend>
      {split ? (
        <div className="court-admin-points__sides">
          {choices.map((choice) => (
            <label key={choice} className="court-admin-field">
              {choice}
              <input
                id={`${idPrefix}-points-${choice.toLowerCase()}`}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                required
                value={pointsIfCorrect?.[choice] ?? ''}
                onChange={(e) => setSide(choice, e.target.value)}
                className="court-admin-input w-full"
              />
            </label>
          ))}
        </div>
      ) : (
        <input
          id={`${idPrefix}-points`}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.5"
          aria-label="Points if correct"
          value={pointValue ?? ''}
          onChange={(e) => onChange({ pointValue: e.target.value, pointsIfCorrect: {} })}
          className="court-admin-input court-admin-points__single"
        />
      )}
      <label className="court-admin-points__toggle">
        <input
          type="checkbox"
          checked={split}
          onChange={(e) => setSplit(e.target.checked)}
        />
        Different points for {choices[0]} and {choices[1]}
      </label>
    </fieldset>
  );
};

// Numeric map for the API, dropping blank sides.
export const pointsPayload = (pointsIfCorrect) => Object.fromEntries(
  Object.entries(pointsIfCorrect || {})
    .filter(([, value]) => value !== '' && value != null && !Number.isNaN(Number(value)))
    .map(([answer, value]) => [answer, Number(value)]),
);

export default AnswerPoints;
