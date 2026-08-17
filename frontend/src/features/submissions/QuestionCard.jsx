import React, { useEffect, useRef } from 'react';
import { components as selectComponents } from 'react-select';
import SelectComponent from '../../components/SelectComponent';
import PlayerHeadshot from '../../components/PlayerHeadshot';

const PlayerOption = (props) => (
  <selectComponents.Option {...props}>
    <span className="flex items-center gap-2">
      <PlayerHeadshot headshotUrl={props.data.headshotUrl} name={props.data.label} size={32} />
      {props.data.label}
    </span>
  </selectComponents.Option>
);

const PlayerSingleValue = (props) => (
  <selectComponents.SingleValue {...props}>
    <span className="flex items-center gap-2">
      <PlayerHeadshot headshotUrl={props.data.headshotUrl} name={props.data.label} size={32} />
      {props.data.label}
    </span>
  </selectComponents.SingleValue>
);

const playerSelectComponents = { Option: PlayerOption, SingleValue: PlayerSingleValue };

const QuestionCard = ({
  question,
  answer,
  onChange,
  isReadOnly,
  playerOptions,
  teamOptions,
  loadingAuxData,
}) => {
  const questionTextRef = useRef(null);

  useEffect(() => {
    const resizeText = () => {
      const element = questionTextRef.current;
      if (!element) return;

      let fontSize = 18; // Starting font size in px
      element.style.fontSize = `${fontSize}px`;

      const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
      const maxHeight = lineHeight * 2;

      while (element.scrollHeight > maxHeight && fontSize > 10) {
        fontSize -= 1;
        element.style.fontSize = `${fontSize}px`;
      }
    };

    resizeText();
    window.addEventListener('resize', resizeText);
    return () => window.removeEventListener('resize', resizeText);
  }, [question.text]);

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-md hover:shadow-lg transition-all">
      <div className="mb-4">
        <h3 ref={questionTextRef} className="text-slate-900 dark:text-white font-semibold text-lg mb-2 flex items-center gap-2">
          {question.related_player_id && (
            <PlayerHeadshot
              headshotUrl={question.related_player_headshot_url}
              name={question.related_player_name}
              size={36}
            />
          )}
          {question.text}
        </h3>
        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
          <span className="bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 px-3 py-1 rounded-full">{question.point_value} pts</span>
          <span className="capitalize">
            {question.question_type === 'head_to_head' ? 'Head to Head' : question.question_type.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <QuestionInput
        question={question}
        answer={answer}
        onChange={onChange}
        isReadOnly={isReadOnly}
        playerOptions={playerOptions}
        teamOptions={teamOptions}
        loadingAuxData={loadingAuxData}
      />
    </div>
  );
};

// Question Input Component (handles different question types)
const QuestionInput = ({
  question,
  answer,
  onChange,
  isReadOnly,
  playerOptions,
  teamOptions,
  loadingAuxData,
}) => {
  switch (question.question_type) {
    case 'superlative': {
      const sortedPlayerOptions = [...playerOptions].sort((a, b) => (a.label || '').localeCompare(b.label || ''));
      const selectedPlayer =
        sortedPlayerOptions.find((option) => String(option.value) === String(answer)) || null;

      return (
        <div className="space-y-2">
          <SelectComponent
            options={sortedPlayerOptions}
            value={selectedPlayer}
            onChange={(option) => onChange(option ? option.value : '')}
            placeholder={loadingAuxData ? 'Loading players...' : 'Select a player'}
            isDisabled={isReadOnly || loadingAuxData || sortedPlayerOptions.length === 0}
            mode="light"
            components={playerSelectComponents}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">Runner-up selections earn half points.</p>
        </div>
      );
    }


    case 'prop': {
      if (question.outcome_type === 'over_under') {
        const numericLine = Number(question.line);
        const hasNumericLine = Number.isFinite(numericLine);
        const formattedLine = hasNumericLine
          ? (Math.abs(numericLine) % 1 === 0 ? numericLine.toFixed(0) : numericLine.toFixed(1))
          : question.line ?? '—';
        const scaleStateClass =
          answer === 'over'
            ? ' overunder-scale--over'
            : answer === 'under'
              ? ' overunder-scale--under'
              : '';
        const disabledClass = isReadOnly ? ' overunder-scale--disabled' : '';

        return (
          <div
            className={`overunder-scale${scaleStateClass}${disabledClass}`}
            role="group"
            aria-label={`Choose over or under for line ${formattedLine}`}
          >
            <span className="overunder-indicator" aria-hidden="true" />
            <button
              type="button"
              className={`overunder-choice overunder-choice--under ${answer === 'under' ? 'is-selected' : ''
                } ${isReadOnly ? 'is-disabled' : ''}`}
              onClick={() => onChange('under')}
              disabled={isReadOnly}
              aria-pressed={answer === 'under'}
              aria-label={`Under ${formattedLine}`}
            >
              <span className="overunder-choice-label">Under</span>
            </button>
            <div className="overunder-divider">
              <span className="overunder-divider-label">Line</span>
              <span className="overunder-divider-value">{formattedLine}</span>
            </div>
            <button
              type="button"
              className={`overunder-choice overunder-choice--over ${answer === 'over' ? 'is-selected' : ''
                } ${isReadOnly ? 'is-disabled' : ''}`}
              onClick={() => onChange('over')}
              disabled={isReadOnly}
              aria-pressed={answer === 'over'}
              aria-label={`Over ${formattedLine}`}
            >
              <span className="overunder-choice-label">Over</span>
            </button>
          </div>
        );
      } else { // 'yes_no'
        const scaleStateClass =
          answer === 'yes'
            ? ' yesno-scale--yes'
            : answer === 'no'
              ? ' yesno-scale--no'
              : '';
        const disabledClass = isReadOnly ? ' yesno-scale--disabled' : '';

        return (
          <div
            className={`yesno-scale${scaleStateClass}${disabledClass}`}
            role="group"
            aria-label="Choose yes or no"
          >
            <span className="yesno-indicator" aria-hidden="true" />
            <button
              type="button"
              className={`yesno-choice yesno-choice--yes ${answer === 'yes' ? 'is-selected' : ''}`}
              onClick={() => onChange('yes')}
              disabled={isReadOnly}
              aria-pressed={answer === 'yes'}
            >
              Yes
            </button>
            <button
              type="button"
              className={`yesno-choice yesno-choice--no ${answer === 'no' ? 'is-selected' : ''}`}
              onClick={() => onChange('no')}
              disabled={isReadOnly}
              aria-pressed={answer === 'no'}
            >
              No
            </button>
          </div>
        );
      }
    }

    case 'head_to_head': {
      const team1Selected = String(answer) === String(question.team1_id);
      const team2Selected = String(answer) === String(question.team2_id);
      const scaleStateClass = team1Selected
        ? ' head-to-head-scale--team1'
        : team2Selected
          ? ' head-to-head-scale--team2'
          : '';
      const disabledClass = isReadOnly ? ' head-to-head-scale--disabled' : '';

      return (
        <div
          className={`head-to-head-scale${scaleStateClass}${disabledClass}`}
          role="group"
          aria-label="Choose team"
        >
          <span className="head-to-head-indicator" aria-hidden="true" />
          <button
            type="button"
            className={`head-to-head-choice head-to-head-choice--team1 ${team1Selected ? 'is-selected' : ''} ${isReadOnly ? 'is-disabled' : ''}`}
            onClick={() => onChange(String(question.team1_id))}
            disabled={isReadOnly}
            aria-pressed={team1Selected}
            aria-label={question.team1_name}
          >
            {question.team1_logo && (
              <img
                src={question.team1_logo}
                alt={`${question.team1_name} logo`}
                className="head-to-head-logo"
              />
            )}
            <span className="head-to-head-name">{question.team1_name}</span>
          </button>
          <button
            type="button"
            className={`head-to-head-choice head-to-head-choice--team2 ${team2Selected ? 'is-selected' : ''} ${isReadOnly ? 'is-disabled' : ''}`}
            onClick={() => onChange(String(question.team2_id))}
            disabled={isReadOnly}
            aria-pressed={team2Selected}
            aria-label={question.team2_name}
          >
            {question.team2_logo && (
              <img
                src={question.team2_logo}
                alt={`${question.team2_name} logo`}
                className="head-to-head-logo"
              />
            )}
            <span className="head-to-head-name">{question.team2_name}</span>
          </button>
        </div>
      );
    }

    case 'player_stat':
      return (
        <div className="space-y-3">
          {(question.current_leaders || question.top_performers) && (
            <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-md p-3 space-y-2">
              {question.current_leaders && (
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Current Leaders</p>
                  <pre className="whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-400">
                    {JSON.stringify(question.current_leaders, null, 2)}
                  </pre>
                </div>
              )}
              {question.top_performers && (
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Top Performers</p>
                  <pre className="whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-400">
                    {JSON.stringify(question.top_performers, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          <input
            type="number"
            value={answer ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={isReadOnly}
            placeholder="Enter your prediction"
            step="0.1"
            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400 dark:focus:ring-sky-500 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      );

    case 'ist': {
      if (question.prediction_type === 'tiebreaker') {
        return (
          <input
            type="number"
            value={answer ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={isReadOnly}
            placeholder="Enter tiebreaker points"
            min="0"
            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400 dark:focus:ring-sky-500 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        );
      }

      const isEastGroup =
        typeof question.ist_group === 'string' && question.ist_group.toLowerCase().includes('east');
      const filteredTeams = (
        teamOptions.filter((team) =>
          question.prediction_type === 'group_winner'
            ? isEastGroup
              ? team.conference === 'Eastern'
              : team.conference === 'Western'
            : true,
        ) || []
      ).sort((a, b) => (a.label || '').localeCompare(b.label || ''));
      const selectedTeam =
        filteredTeams.find((option) => String(option.value) === String(answer)) || null;

      return (
        <SelectComponent
          options={filteredTeams}
          value={selectedTeam}
          onChange={(option) => onChange(option ? option.value : '')}
          placeholder={
            loadingAuxData ? 'Loading teams...' : filteredTeams.length ? 'Select a team' : 'No teams available'
          }
          isDisabled={isReadOnly || loadingAuxData || filteredTeams.length === 0}
          mode="light"
        />
      );
    }

    case 'nba_finals': {
      const sortedTeamOptions = [...teamOptions].sort((a, b) => (a.label || '').localeCompare(b.label || ''));
      const selectedTeam =
        sortedTeamOptions.find((option) => String(option.value) === String(answer)) || null;

      return (
        <SelectComponent
          options={sortedTeamOptions}
          value={selectedTeam}
          onChange={(option) => onChange(option ? option.value : '')}
          placeholder={loadingAuxData ? 'Loading teams...' : 'Select a team'}
          isDisabled={isReadOnly || loadingAuxData || sortedTeamOptions.length === 0}
          mode="light"
        />
      );
    }

    default:
      return (
        <input
          type="text"
          value={answer ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={isReadOnly}
          placeholder="Enter your answer..."
          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400 dark:focus:ring-sky-500 disabled:opacity-60 disabled:cursor-not-allowed"
        />
      );
  }
};

export default QuestionCard;

