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
    <div className="cup-picks">
      <div className="cup-payout">
        <strong>$50</strong><div><h3>Mid-season payout</h3><p>The Cup prediction winner gets paid after the final. Scored separately from your season total.</p></div>
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
