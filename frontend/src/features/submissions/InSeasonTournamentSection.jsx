import React from 'react';
import ISTFinalsPicks from './ISTFinalsPicks';
import ISTGroupPicks from './ISTGroupPicks';
import useIstSubmissionData from './useIstSubmissionData';

const InSeasonTournamentSection = ({
  questions,
  answers,
  onAnswerChange,
  isReadOnly,
  teamOptions,
  loadingAuxData,
  istStandings,
  loadingIstStandings,
  istStandingsError,
}) => {
  const data = useIstSubmissionData({
    questions,
    answers,
    onAnswerChange,
    isReadOnly,
    teamOptions,
    istStandings,
  });

  return (
    <div className="space-y-10">
      <div className="border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/15 px-4 py-4 text-sm text-amber-800 dark:text-amber-300">
        <p className="font-semibold uppercase tracking-wide">Supplementary NBA Cup pool</p>
        <p className="mt-1">The NBA Cup prediction winner receives a supplementary pool of $50 following the Championship Game. It does not count toward the season point total.</p>
      </div>
      {loadingIstStandings && <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Loading NBA Cup groups…</div>}
      {istStandingsError && !loadingIstStandings && <div className="border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/15 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">{istStandingsError}</div>}
      <ISTGroupPicks
        groupQuestions={data.groupQuestions}
        wildcardQuestions={data.wildcardQuestions}
        teamsForQuestion={data.teamsForQuestion}
        answers={answers}
        onAnswerChange={onAnswerChange}
        isReadOnly={isReadOnly}
      />
      <ISTFinalsPicks
        finals={data.finals}
        scores={data.scores}
        optionSets={data.optionSets}
        selected={data.selected}
        scoreValues={data.scoreValues}
        extras={data.scores.extras}
        answers={answers}
        onAnswerChange={onAnswerChange}
        isReadOnly={isReadOnly}
        loading={loadingAuxData}
      />
    </div>
  );
};

export default InSeasonTournamentSection;
