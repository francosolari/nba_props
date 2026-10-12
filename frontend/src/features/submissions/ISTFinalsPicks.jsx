import React from 'react';
import SelectComponent from '../../components/SelectComponent';
import TeamLogo from '../../components/TeamLogo';

const FinalistPick = ({ label, question, selected, options, scoreQuestion, scoreValue, onAnswerChange, isReadOnly, loading }) => {
  if (!question) return null;
  return (
    <div className="cup-pick-sheet">
      <header className="cup-pick-sheet__header"><h4>{label}</h4><span className="finals-step__chip">{question.point_value} {Number(question.point_value) === 1 ? 'pt' : 'pts'}</span></header>
      <div className="cup-pick-sheet__body">
        <SelectComponent options={options} value={selected} onChange={(option) => onAnswerChange(question.id, option ? option.value : '')} placeholder={loading ? 'Loading teams…' : `Pick the ${label.toLowerCase()}`} aria-label={label} isDisabled={isReadOnly || loading || options.length === 0} mode="light" />
        {scoreQuestion && <label className="cup-score-input">{label} points scored<span className="finals-step__chip">Tiebreaker</span><input type="number" inputMode="numeric" min="0" step="1" value={scoreValue} onChange={(event) => onAnswerChange(scoreQuestion.id, event.target.value)} disabled={isReadOnly} placeholder="e.g. 110" /></label>}
      </div>
    </div>
  );
};

/** The Cup is a single championship game; score estimates break prediction ties. */
const ISTFinalsPicks = ({ finals, scores, optionSets, selected, scoreValues, extras, answers, onAnswerChange, isReadOnly, loading }) => {
  if (!finals.east && !finals.west && !finals.champion && extras.length === 0) return null;
  const bothFinalists = selected.east && selected.west;
  return (
    <section className="cup-pick-stage">
      <h3>Championship game</h3><p>Pick both finalists, then your champion. Points scored break ties.</p>
      <div className="cup-finals-picks">
        <FinalistPick label="East finalist" question={finals.east} selected={selected.east} options={optionSets.east} scoreQuestion={scores.east} scoreValue={scoreValues.east} onAnswerChange={onAnswerChange} isReadOnly={isReadOnly} loading={loading} />
        <FinalistPick label="West finalist" question={finals.west} selected={selected.west} options={optionSets.west} scoreQuestion={scores.west} scoreValue={scoreValues.west} onAnswerChange={onAnswerChange} isReadOnly={isReadOnly} loading={loading} />
        {finals.champion && <div className="cup-pick-sheet cup-champion-pick">
          <header className="cup-pick-sheet__header"><h4>NBA Cup champion</h4><span className="finals-step__chip">{finals.champion.point_value} {Number(finals.champion.point_value) === 1 ? 'pt' : 'pts'}</span></header>
          <div className="cup-pick-sheet__body">
            {bothFinalists ? <div className="finals-champion" role="group" aria-label="NBA Cup champion">{[selected.east, selected.west].map((team) => (
              <button key={team.value} type="button" aria-pressed={String(selected.champion?.value) === String(team.value)} className={String(selected.champion?.value) === String(team.value) ? 'is-selected' : ''} disabled={isReadOnly} onClick={() => onAnswerChange(finals.champion.id, team.value)}>
                <TeamLogo teamName={team.label} alt="" className="finals-champion__logo" /><span>{team.label}</span>
              </button>
            ))}</div> : <p className="finals-step__hint">Pick both finalists first. Your champion is one of those two teams.</p>}
            {selected.champion && !bothFinalists && <p className="finals-step__hint">Saved champion: {selected.champion.label}</p>}
            <p className="finals-step__hint">Once both scores are entered, the higher-scoring finalist becomes your champion. Equal scores keep your choice.</p>
          </div>
        </div>}
      </div>
      {extras.map((question) => <label key={question.id} className="cup-score-input cup-extra-score">{question.text}<span className="finals-step__chip">Tiebreaker</span><input type="number" inputMode="numeric" min="0" step="1" value={answers[question.id] ?? ''} onChange={(event) => onAnswerChange(question.id, event.target.value)} disabled={isReadOnly} placeholder="Enter your tiebreaker" /></label>)}
    </section>
  );
};

export default ISTFinalsPicks;
