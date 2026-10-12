import React from 'react';
import SelectComponent from '../../../../components/SelectComponent';
import { GlassFormCard, Textarea, NumberInput } from './AdminFormPrimitives';

const HeadToHeadForm = ({
  form,
  setForm,
  teamOptions,
  defaultPointValue,
  activeSeason,
  ensureSeasonSelected,
  setError,
  handleMutation,
  createHeadToHead,
  classes,
  themeStyles,
}) => (
  <GlassFormCard
    title="Head-to-Head"
    subtitle="Pick between two teams"
    isSubmitting={createHeadToHead.isPending}
    onSubmit={(event) => {
      event.preventDefault();
      if (!ensureSeasonSelected()) return;
      if (!form.team1Id || !form.team2Id || form.team1Id === form.team2Id) {
        setError("Select two different teams for the matchup.");
        return;
      }
      handleMutation(
        createHeadToHead,
        {
          season_slug: activeSeason,
          text: form.text.trim(),
          point_value: Number(form.pointValue || defaultPointValue),
          team1_id: Number(form.team1Id),
          team2_id: Number(form.team2Id),
          conference_matchup: Boolean(form.conferenceMatchup),
        },
        "Head-to-head question created.",
      ).then((created) => {
        // Keep the draft when the save fails so nothing typed is lost.
        if (created) setForm({ text: "", pointValue: defaultPointValue, team1Id: null, team2Id: null, conferenceMatchup: false });
      });
    }}
    themeStyles={themeStyles}
    primaryButtonClass={classes.primaryButtonClass}
  >
    <Textarea
      label="Question"
      value={form.text}
      onChange={(value) => setForm((prev) => ({ ...prev, text: value }))}
      placeholder="Who wins opening night?"
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
      options={teamOptions}
      value={teamOptions.find((option) => option.value === form.team1Id) || null}
      onChange={(option) => setForm((prev) => ({ ...prev, team1Id: option ? option.value : null }))}
      placeholder="Select team"
      isClearable
      mode={themeStyles.mode}
    />
    <SelectComponent
      options={teamOptions}
      value={teamOptions.find((option) => option.value === form.team2Id) || null}
      onChange={(option) => setForm((prev) => ({ ...prev, team2Id: option ? option.value : null }))}
      placeholder="Select opponent"
      isClearable
      mode={themeStyles.mode}
    />
    <label className={`mt-2 flex items-center gap-3 text-sm ${themeStyles.textSecondary}`}>
      <input
        type="checkbox"
        checked={Boolean(form.conferenceMatchup)}
        onChange={(e) => setForm((prev) => ({ ...prev, conferenceMatchup: e.target.checked }))}
        className={classes.checkboxClass}
      />
      Conference matchup (show each team's conference, e.g. Eastern vs Western)
    </label>
  </GlassFormCard>
);

export default HeadToHeadForm;
