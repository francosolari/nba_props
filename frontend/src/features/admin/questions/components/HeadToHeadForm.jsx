import React from 'react';
import SelectComponent from '../../../../components/SelectComponent';
import { GlassFormCard, Textarea, NumberInput } from './AdminFormPrimitives';

const MATCHUPS = [
  { value: 'teams', label: 'Teams' },
  { value: 'players', label: 'Players' },
];

// Two teams, or two players ("Who makes more threes, Ant or LaMelo?").
const HeadToHeadForm = ({
  form,
  setForm,
  teamOptions,
  playerOptions,
  defaultPointValue,
  activeSeason,
  ensureSeasonSelected,
  setError,
  handleMutation,
  createHeadToHead,
  classes,
  themeStyles,
}) => {
  const players = form.matchup === 'players';
  const options = players ? playerOptions : teamOptions;
  const [key1, key2] = players ? ['player1Id', 'player2Id'] : ['team1Id', 'team2Id'];
  const noun = players ? 'player' : 'team';

  return (
    <GlassFormCard
      title="Head-to-Head"
      subtitle="Pick between two teams or two players."
      isSubmitting={createHeadToHead.isPending}
      onSubmit={(event) => {
        event.preventDefault();
        if (!ensureSeasonSelected()) return;
        if (!form[key1] || !form[key2] || form[key1] === form[key2]) {
          setError(`Select two different ${noun}s for the matchup.`);
          return;
        }
        const sides = players
          ? { player1_id: Number(form.player1Id), player2_id: Number(form.player2Id) }
          : { team1_id: Number(form.team1Id), team2_id: Number(form.team2Id), conference_matchup: Boolean(form.conferenceMatchup) };
        handleMutation(
          createHeadToHead,
          {
            season_slug: activeSeason,
            text: form.text.trim(),
            point_value: Number(form.pointValue || defaultPointValue),
            ...sides,
          },
          "Head-to-head question created.",
        ).then((created) => {
          // Keep the draft when the save fails so nothing typed is lost.
          if (created) setForm((prev) => ({ ...prev, text: "", team1Id: null, team2Id: null, player1Id: null, player2Id: null, conferenceMatchup: false }));
        });
      }}
      themeStyles={themeStyles}
      primaryButtonClass={classes.primaryButtonClass}
    >
      <div className="court-admin-choice" role="radiogroup" aria-label="Matchup">
        {MATCHUPS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={(form.matchup || 'teams') === option.value}
            className={(form.matchup || 'teams') === option.value ? 'is-selected' : ''}
            onClick={() => setForm((prev) => ({ ...prev, matchup: option.value }))}
          >
            {option.label}
          </button>
        ))}
      </div>
      <Textarea
        label="Question"
        value={form.text}
        onChange={(value) => setForm((prev) => ({ ...prev, text: value }))}
        placeholder={players ? "Who will make more threes: Anthony Edwards or LaMelo Ball?" : "Who wins opening night?"}
        required
        labelClass={classes.labelClass}
        textareaClass={classes.textareaClass}
      />
      <NumberInput
        label="Point value"
        value={form.pointValue}
        onChange={(value) => setForm((prev) => ({ ...prev, pointValue: value }))}
        step="0.5"
        min="0"
        labelClass={classes.labelClass}
        inputClass={classes.inputClass}
      />
      <SelectComponent
        options={options}
        value={options.find((option) => option.value === form[key1]) || null}
        onChange={(option) => setForm((prev) => ({ ...prev, [key1]: option ? option.value : null }))}
        placeholder={`Select ${noun}`}
        isClearable
        mode={themeStyles.mode}
      />
      <SelectComponent
        options={options}
        value={options.find((option) => option.value === form[key2]) || null}
        onChange={(option) => setForm((prev) => ({ ...prev, [key2]: option ? option.value : null }))}
        placeholder={`Select ${players ? 'the other player' : 'opponent'}`}
        isClearable
        mode={themeStyles.mode}
      />
      {!players && (
        <label className={`mt-2 flex items-center gap-3 text-sm ${themeStyles.textSecondary}`}>
          <input
            type="checkbox"
            checked={Boolean(form.conferenceMatchup)}
            onChange={(e) => setForm((prev) => ({ ...prev, conferenceMatchup: e.target.checked }))}
            className={classes.checkboxClass}
          />
          Conference matchup (show each team's conference, e.g. Eastern vs Western)
        </label>
      )}
    </GlassFormCard>
  );
};

export default HeadToHeadForm;
