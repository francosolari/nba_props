import React from 'react';
import { Check } from 'lucide-react';
import TeamLogo from '../../components/TeamLogo';
import SelectComponent from '../../components/SelectComponent';
import { buildRecordSummary, extractGroupMeta, getConferenceTheme } from './istSubmissionUtils';

/** Compact, touch-friendly rows keep every team in a Cup group together. */
const GroupCard = ({ question, teams, answers, onAnswerChange, isReadOnly }) => {
  const meta = extractGroupMeta(question.ist_group);
  const theme = getConferenceTheme(question.ist_group);
  return (
    <div className="cup-pick-sheet">
      <header className="cup-pick-sheet__header">
        <span aria-label={`${meta.label || 'NBA Cup group'} marker`} className={`ist-group-marker ${theme.marker}`}>{meta.short || '?'}</span>
        <h4>{meta.label || question.text}<small>Pick the group winner</small></h4>
        <span className="finals-step__chip">{question.point_value} {Number(question.point_value) === 1 ? 'pt' : 'pts'}</span>
      </header>
      <div className="cup-team-list" role="group" aria-label={question.text}>
        {teams.map((team) => {
          const selected = String(answers[question.id]) === String(team.id);
          return (
            <button key={team.id} type="button" disabled={isReadOnly} aria-pressed={selected}
              className={`cup-team-choice ${selected ? theme.selected : theme.idle}`}
              onClick={() => onAnswerChange(question.id, team.id)}>
              <TeamLogo teamName={team.name} alt="" className="cup-team-choice__logo" />
              <span className="cup-team-choice__name">{team.name}</span>
              {buildRecordSummary(team) && <small>{buildRecordSummary(team)}</small>}
              <span className="cup-team-choice__check" aria-hidden="true">{selected && <Check size={16} />}</span>
            </button>
          );
        })}
        {teams.length === 0 && <p className="cup-pick-empty">Group teams are unavailable right now. Try reloading the page.</p>}
      </div>
    </div>
  );
};

/** Search the conference instead of scrolling through fifteen large tiles. */
const WildcardCard = ({ question, teams, answers, onAnswerChange, isReadOnly }) => {
  const conference = extractGroupMeta(question.ist_group).conference || question.ist_group || '';
  const options = teams.map((team) => ({ value: team.id, label: team.name }));
  const selected = options.find((option) => String(option.value) === String(answers[question.id])) || null;
  return (
    <div className="cup-pick-sheet cup-wildcard-pick">
      <header className="cup-pick-sheet__header"><h4>{conference} wildcard<small>One extra team advances from each conference</small></h4><span className="finals-step__chip">{question.point_value} {Number(question.point_value) === 1 ? 'pt' : 'pts'}</span></header>
      <div className="cup-pick-sheet__body">
        <SelectComponent options={options} value={selected} onChange={(option) => onAnswerChange(question.id, option ? option.value : '')}
          placeholder={`Pick the ${conference.toLowerCase()} wildcard`} aria-label={`${conference} wildcard`}
          isDisabled={isReadOnly || options.length === 0} mode="light" />
        {teams.length === 0 && <p className="cup-pick-empty">Conference teams are unavailable right now.</p>}
      </div>
    </div>
  );
};

const ISTGroupPicks = ({ groupQuestions, wildcardQuestions, teamsForQuestion, answers, onAnswerChange, isReadOnly }) => (
  <>
    {groupQuestions.length > 0 && <section className="cup-pick-stage"><h3>Group winners</h3><p>Choose one team from each group to reach the knockout round.</p><div className="cup-group-picks">
      {groupQuestions.map((question) => <GroupCard key={question.id} question={question} teams={teamsForQuestion(question)} answers={answers} onAnswerChange={onAnswerChange} isReadOnly={isReadOnly} />)}
    </div></section>}
    {wildcardQuestions.length > 0 && <section className="cup-pick-stage"><h3>Wildcards</h3><p>Pick the best remaining team in each conference.</p><div className="cup-wildcard-picks">
      {wildcardQuestions.map((question) => <WildcardCard key={question.id} question={question} teams={teamsForQuestion(question)} answers={answers} onAnswerChange={onAnswerChange} isReadOnly={isReadOnly} />)}
    </div></section>}
  </>
);

export default ISTGroupPicks;
