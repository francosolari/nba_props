import React, { useMemo } from 'react';
import SelectComponent from '../../components/SelectComponent';
import TeamLogo from '../../components/TeamLogo';

// NBA Finals Section Component
const NBAFinalsSection = ({
  questions,
  answers,
  onAnswerChange,
  isReadOnly,
  teamOptions,
  loadingAuxData,
}) => {
  const eastFinalistQuestion = useMemo(
    () => questions.find((q) => {
      const text = (q.text || '').toLowerCase();
      return text.includes('east') && !text.includes('champion');
    }),
    [questions],
  );
  const westFinalistQuestion = useMemo(
    () => questions.find((q) => {
      const text = (q.text || '').toLowerCase();
      return text.includes('west') && !text.includes('champion');
    }),
    [questions],
  );
  const championQuestion = useMemo(
    () => questions.find((q) => {
      const text = (q.text || '').toLowerCase();
      return text.includes('champion') || (!text.includes('east') && !text.includes('west'));
    }),
    [questions],
  );

  const eastTeams = useMemo(() => {
    return teamOptions
      .filter((team) => {
        const conf = (team.conference || '').toLowerCase();
        return conf.includes('east');
      })
      .map((team) => ({
        value: team.value,
        label: team.label,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [teamOptions]);

  const westTeams = useMemo(() => {
    return teamOptions
      .filter((team) => {
        const conf = (team.conference || '').toLowerCase();
        return conf.includes('west');
      })
      .map((team) => ({
        value: team.value,
        label: team.label,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [teamOptions]);

  const championOptions = useMemo(
    () =>
      teamOptions
        .map((team) => ({
          value: team.value,
          label: team.label,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [teamOptions],
  );

  const getSelectedOption = (options, answer) =>
    options.find((option) => String(option.value) === String(answer)) || null;

  const eastSelected = eastFinalistQuestion
    ? getSelectedOption(eastTeams, answers[eastFinalistQuestion.id])
    : null;
  const westSelected = westFinalistQuestion
    ? getSelectedOption(westTeams, answers[westFinalistQuestion.id])
    : null;
  const championSelected = championQuestion
    ? getSelectedOption(championOptions, answers[championQuestion.id])
    : null;

  const renderFinalistColumn = (
    label,
    question,
    selectedOption,
    options,
    sideKey,
  ) => {
    if (!question) {
      return (
        <div className="flex h-full flex-col rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400">No {label.toLowerCase()} question configured.</p>
        </div>
      );
    }

    const selectedTeamName = selectedOption?.label || `Select the ${label}`;

    return (
      <div className="flex h-full flex-col rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
          <span className="inline-flex items-center rounded-full bg-sky-100 dark:bg-sky-900/50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
            {question.point_value} pts
          </span>
        </div>
        <div className="mt-3">
          <SelectComponent
            options={options}
            value={selectedOption}
            onChange={(option) => onAnswerChange(question.id, option ? option.value : '')}
            placeholder={loadingAuxData ? 'Loading teams…' : `Select ${label.toLowerCase()}`}
            isDisabled={isReadOnly || loadingAuxData || options.length === 0}
            mode="light"
          />
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-700/70 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-600 shadow-inner">
              <TeamLogo
                teamName={selectedOption?.label}
                slug={!selectedOption ? 'unknown' : undefined}
                alt={`${selectedTeamName} logo`}
                className="h-10 w-10 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{selectedTeamName}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderChampionColumn = () => {
    if (!championQuestion) {
      return (
        <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-8 text-center shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400">No NBA Finals champion question configured.</p>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col items-center justify-between rounded-3xl border border-slate-200 dark:border-slate-700 bg-gradient-to-b from-white via-sky-50/60 to-white dark:from-slate-800 dark:via-sky-900/20 dark:to-slate-800 px-6 py-8 text-center shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">NBA Finals Champion</p>
          <span className="mt-1 inline-flex items-center rounded-full bg-sky-100 dark:bg-sky-900/50 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300">
            {championQuestion.point_value} pts
          </span>
        </div>
        <div className="w-full">
          <SelectComponent
            options={championOptions}
            value={championSelected}
            onChange={(option) =>
              onAnswerChange(championQuestion.id, option ? option.value : '')
            }
            placeholder={loadingAuxData ? 'Loading teams…' : 'Select the champion'}
            isDisabled={isReadOnly || loadingAuxData || championOptions.length === 0}
            mode="light"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)]">
        {renderFinalistColumn(
          'East Finalist',
          eastFinalistQuestion,
          eastSelected,
          eastTeams,
          'East',
        )}
        {renderChampionColumn()}
        {renderFinalistColumn(
          'West Finalist',
          westFinalistQuestion,
          westSelected,
          westTeams,
          'West',
        )}
      </div>
    </div>
  );
};

export default NBAFinalsSection;

