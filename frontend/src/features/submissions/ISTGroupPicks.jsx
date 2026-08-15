import React from 'react';
import TeamLogo from '../../components/TeamLogo';
import {
  buildRecordSummary,
  extractGroupMeta,
  getConferenceTheme,
} from './istSubmissionUtils';

const TeamChoice = ({ question, team, answer, onAnswerChange, isReadOnly, compact = false }) => {
  const selected = String(answer) === String(team.id);
  const theme = getConferenceTheme(question.ist_group);
  return (
    <button
      type="button"
      onClick={() => onAnswerChange(question.id, team.id)}
      disabled={isReadOnly}
      className={`${compact ? 'flex w-full items-center justify-between px-4 py-2.5' : 'flex min-h-[140px] flex-col items-center justify-center gap-3 px-4 py-5'} border text-sm font-semibold ${selected ? theme.selected : `border-slate-200 bg-white ${theme.idle}`}`}
      aria-pressed={selected}
    >
      <span className={`flex ${compact ? 'flex-1' : 'flex-col'} items-center gap-3`}>
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center bg-white">
          <TeamLogo teamName={team.name} alt={`${team.name} logo`} className="h-10 w-10 object-contain" />
        </span>
        <span className={`${compact ? 'items-start' : 'items-center'} flex flex-col`}>
          <span>{team.name}</span>
          {buildRecordSummary(team) && <small className="text-slate-500">{buildRecordSummary(team)}</small>}
        </span>
      </span>
      {selected && compact && <span className="text-xs uppercase">Selected</span>}
    </button>
  );
};

const GroupCard = ({ question, teams, answers, onAnswerChange, isReadOnly }) => {
  const meta = extractGroupMeta(question.ist_group);
  return (
    <div className="flex h-full flex-col border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-slate-900 text-base font-bold text-white">{meta.short || '?'}</div>
          <div><span className="text-xs font-semibold uppercase tracking-wide">{meta.conference || 'Group'}</span><h4 className="text-sm font-semibold">{question.text}</h4></div>
        </div>
        <span className="bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">{question.point_value} pts</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {teams.map((team) => <TeamChoice key={team.id} question={question} team={team} answer={answers[question.id]} onAnswerChange={onAnswerChange} isReadOnly={isReadOnly} />)}
        {teams.length === 0 && <p className="col-span-full text-sm text-slate-500">Team list unavailable right now.</p>}
      </div>
    </div>
  );
};

const WildcardCard = ({ question, teams, answers, onAnswerChange, isReadOnly }) => {
  const conference = extractGroupMeta(question.ist_group).conference || question.ist_group || '';
  return (
    <div className="flex h-full flex-col border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div><span className="text-xs font-semibold uppercase tracking-wide">{conference} Wildcard</span><h4 className="text-sm font-semibold">{question.text}</h4></div>
        <span className="bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">{question.point_value} pts</span>
      </div>
      <div className="mt-4 space-y-2">
        {teams.map((team) => <TeamChoice key={team.id} compact question={question} team={team} answer={answers[question.id]} onAnswerChange={onAnswerChange} isReadOnly={isReadOnly} />)}
        {teams.length === 0 && <p className="text-sm text-slate-500">Team data unavailable for this conference.</p>}
      </div>
    </div>
  );
};

const ISTGroupPicks = ({ groupQuestions, wildcardQuestions, teamsForQuestion, answers, onAnswerChange, isReadOnly }) => (
  <>
    {groupQuestions.length > 0 && (
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {groupQuestions.map((question) => <GroupCard key={question.id} question={question} teams={teamsForQuestion(question)} answers={answers} onAnswerChange={onAnswerChange} isReadOnly={isReadOnly} />)}
      </div>
    )}
    {wildcardQuestions.length > 0 && (
      <div className="space-y-6"><h3 className="text-lg font-semibold">Wildcards</h3><div className="grid gap-5 md:grid-cols-2">
        {wildcardQuestions.map((question) => <WildcardCard key={question.id} question={question} teams={teamsForQuestion(question)} answers={answers} onAnswerChange={onAnswerChange} isReadOnly={isReadOnly} />)}
      </div></div>
    )}
  </>
);

export default ISTGroupPicks;
