import React from 'react';
import SelectComponent from '../../components/SelectComponent';
import TeamLogo from '../../components/TeamLogo';

const FinalistPick = ({ label, question, selected, options, scoreQuestion, scoreValue, onAnswerChange, isReadOnly, loading }) => {
  if (!question) return <div className="border border-slate-200 bg-white p-6"><p>No {label.toLowerCase()} question configured.</p></div>;
  return (
    <div className="flex h-full flex-col border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase">{label}</span><span className="bg-sky-100 px-2 py-1 text-xs">{question.point_value} pts</span></div>
      <div className="mt-3"><SelectComponent options={options} value={selected} onChange={(option) => onAnswerChange(question.id, option ? option.value : '')} placeholder={loading ? 'Loading teams…' : `Select ${label.toLowerCase()}`} isDisabled={isReadOnly || loading || options.length === 0} mode="light" /></div>
      <div className="mt-4 border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-3"><TeamLogo teamName={selected?.label} slug={!selected ? 'unknown' : undefined} className="h-10 w-10" /><span className="font-semibold">{selected?.label || `Select the ${label}`}</span></div>
        {scoreQuestion && <label className="mt-4 block text-xs font-semibold uppercase">Points scored<input type="number" min="0" value={scoreValue} onChange={(event) => onAnswerChange(scoreQuestion.id, event.target.value)} disabled={isReadOnly} placeholder="Enter points" className="mt-2 w-full border border-slate-300 bg-white px-3 py-2 text-base" /></label>}
      </div>
    </div>
  );
};

const ChampionPick = ({ question, selected, options, onAnswerChange, isReadOnly, loading }) => {
  if (!question) return <div className="border border-slate-200 bg-white p-6">No NBA Cup champion question configured.</div>;
  return (
    <div className="flex h-full flex-col items-center justify-between border border-slate-200 bg-sky-50 px-6 py-8 text-center">
      <div><p className="text-xs font-semibold uppercase">NBA Cup Champion</p><span className="text-xs">{question.point_value} pts</span></div>
      <div className="w-full"><SelectComponent options={options} value={selected} onChange={(option) => onAnswerChange(question.id, option ? option.value : '')} placeholder={loading ? 'Loading teams…' : 'Select the champion'} isDisabled={isReadOnly || loading || options.length === 0} mode="light" /></div>
      <p className="mt-4 text-xs text-slate-500">Winner auto-updates when one finalist has a higher score. Ties leave your selection unchanged.</p>
    </div>
  );
};

const ISTFinalsPicks = ({ finals, scores, optionSets, selected, scoreValues, extras, answers, onAnswerChange, isReadOnly, loading }) => {
  if (!finals.east && !finals.west && !finals.champion && extras.length === 0) return null;
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">NBA Cup Finals</h3>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)]">
        <FinalistPick label="East Finalist" question={finals.east} selected={selected.east} options={optionSets.east} scoreQuestion={scores.east} scoreValue={scoreValues.east} onAnswerChange={onAnswerChange} isReadOnly={isReadOnly} loading={loading} />
        <ChampionPick question={finals.champion} selected={selected.champion} options={optionSets.champion} onAnswerChange={onAnswerChange} isReadOnly={isReadOnly} loading={loading} />
        <FinalistPick label="West Finalist" question={finals.west} selected={selected.west} options={optionSets.west} scoreQuestion={scores.west} scoreValue={scoreValues.west} onAnswerChange={onAnswerChange} isReadOnly={isReadOnly} loading={loading} />
      </div>
      {extras.length > 0 && <div className="grid gap-5 md:grid-cols-2">{extras.map((question) => (
        <label key={question.id} className="border border-slate-200 bg-white p-5"><span className="font-semibold">{question.text}</span><input type="number" min="0" value={answers[question.id] ?? ''} onChange={(event) => onAnswerChange(question.id, event.target.value)} disabled={isReadOnly} placeholder="Enter your tiebreaker" className="mt-4 w-full border border-slate-300 px-3 py-2" /></label>
      ))}</div>}
    </div>
  );
};

export default ISTFinalsPicks;
