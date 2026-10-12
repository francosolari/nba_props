import React, { useMemo } from 'react';
import SelectComponent from '../../components/SelectComponent';
import TeamLogo from '../../components/TeamLogo';
import { SERIES_SCORES, finalsRole } from './finalsRoles';

const conferenceTeams = (teamOptions, name) => teamOptions
  .filter((team) => (team.conference || '').toLowerCase().includes(name))
  .map((team) => ({ value: team.value, label: team.label }))
  .sort((a, b) => a.label.localeCompare(b.label));

const pts = (value) => `${value} pt${Number(value) === 1 ? '' : 's'}`;

const Step = ({ number, title, chip, children, muted }) => (
  <li className={`finals-step${muted ? ' is-muted' : ''}`}>
    <header>
      <span className="finals-step__number" aria-hidden="true">{number}</span>
      <h4>{title}</h4>
      {chip && <span className="finals-step__chip">{chip}</span>}
    </header>
    <div className="finals-step__body">{children}</div>
  </li>
);

// The NBA Finals as one small bracket: a finalist from each conference, then
// which of those two wins, then the series score as the tiebreaker.
const NBAFinalsSection = ({
  questions,
  answers,
  onAnswerChange,
  isReadOnly,
  teamOptions,
  loadingAuxData,
}) => {
  const byRole = useMemo(() => {
    const roles = {};
    questions.forEach((question) => { roles[finalsRole(question)] ??= question; });
    return roles;
  }, [questions]);
  const { east_finalist: east, west_finalist: west, champion, series_score: series } = byRole;

  const eastTeams = useMemo(() => conferenceTeams(teamOptions, 'east'), [teamOptions]);
  const westTeams = useMemo(() => conferenceTeams(teamOptions, 'west'), [teamOptions]);

  const pick = (options, question) => (question
    ? options.find((option) => String(option.value) === String(answers[question.id])) || null
    : null);
  const eastPick = pick(eastTeams, east);
  const westPick = pick(westTeams, west);
  const championPick = champion ? String(answers[champion.id] ?? '') : '';

  // Changing a finalist clears a champion pick that's no longer one of the two.
  const chooseFinalist = (question, otherPick) => (option) => {
    const value = option ? option.value : '';
    onAnswerChange(question.id, value);
    if (champion && championPick && championPick !== String(value) && championPick !== String(otherPick?.value ?? '')) {
      onAnswerChange(champion.id, '');
    }
  };

  const finalist = (question, label, options, selected, otherPick, number) => (question ? (
    <Step number={number} title={label} chip={pts(question.point_value)}>
      <SelectComponent
        options={options}
        value={selected}
        onChange={chooseFinalist(question, otherPick)}
        placeholder={loadingAuxData ? 'Loading teams…' : `Pick the ${label.toLowerCase()}`}
        isDisabled={isReadOnly || loadingAuxData || options.length === 0}
        mode="light"
      />
    </Step>
  ) : null);

  const bothFinalists = eastPick && westPick;

  return (
    <div className="finals-bracket">
      <p className="finals-bracket__how">
        Pick the team from each conference that reaches the Finals, then which of your two wins it.
        The series score only breaks ties.
      </p>
      <ol className="finals-steps">
        {finalist(east, 'East finalist', eastTeams, eastPick, westPick, 1)}
        {finalist(west, 'West finalist', westTeams, westPick, eastPick, 2)}
        {champion && (
          <Step number={3} title="Champion" chip={pts(champion.point_value)} muted={!bothFinalists}>
            {bothFinalists ? (
              <div className="finals-champion" role="radiogroup" aria-label="NBA Finals champion">
                {[eastPick, westPick].map((team) => {
                  const on = championPick === String(team.value);
                  return (
                    <button
                      key={team.value}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      className={on ? 'is-selected' : ''}
                      disabled={isReadOnly}
                      onClick={() => onAnswerChange(champion.id, String(team.value))}
                    >
                      <TeamLogo teamName={team.label} alt="" className="finals-champion__logo" />
                      <span>{team.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="finals-step__hint">Pick both finalists first. The champion is one of your two.</p>
            )}
          </Step>
        )}
        {series && (
          <Step number={4} title="Series score" chip="Tiebreaker">
            <p className="finals-step__hint">How many games does the champion need?</p>
            <div className="finals-series" role="radiogroup" aria-label="NBA Finals series score">
              {SERIES_SCORES.map((score) => {
                const on = String(answers[series.id] ?? '') === score;
                return (
                  <button
                    key={score}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={on ? 'is-selected' : ''}
                    disabled={isReadOnly}
                    onClick={() => onAnswerChange(series.id, score)}
                  >
                    {score}
                  </button>
                );
              })}
            </div>
          </Step>
        )}
      </ol>
    </div>
  );
};

export default NBAFinalsSection;
