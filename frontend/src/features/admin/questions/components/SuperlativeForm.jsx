import React from 'react';
import SelectComponent from '../../../../components/SelectComponent';
import { GlassFormCard, Textarea, NumberInput } from './AdminFormPrimitives';

const SuperlativeForm = ({
  form,
  setForm,
  awardOptions,
  defaultPointValue,
  activeSeason,
  ensureSeasonSelected,
  setError,
  handleMutation,
  createSuperlative,
  classes,
  themeStyles,
}) => (
  <GlassFormCard
    title="Superlative"
    subtitle="Players pick any player: an award winner, or any player-pick question."
    isSubmitting={createSuperlative.isPending}
    onSubmit={(event) => {
      event.preventDefault();
      if (!ensureSeasonSelected()) return;
      handleMutation(
        createSuperlative,
        {
          season_slug: activeSeason,
          text: form.text.trim(),
          point_value: Number(form.pointValue || defaultPointValue),
          award_id: form.awardId ? Number(form.awardId) : null,
        },
        "Superlative question created.",
      ).then((created) => {
        // Keep the draft when the save fails so nothing typed is lost.
        if (created) setForm({ text: "", awardId: "", pointValue: defaultPointValue });
      });
    }}
    themeStyles={themeStyles}
    primaryButtonClass={classes.primaryButtonClass}
  >
    <Textarea
      label="Question"
      value={form.text}
      onChange={(value) => setForm((prev) => ({ ...prev, text: value }))}
      placeholder="Who wins Sixth Man of the Year?"
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
    <div className="court-admin-field">
      Award (optional)
      <span>Leave empty for a player pick like "Name a first-time All-Star". You can mark several correct players when grading.</span>
      <SelectComponent
        options={awardOptions}
        value={awardOptions.find((option) => option.value === form.awardId) || null}
        onChange={(option) =>
          setForm((prev) => ({ ...prev, awardId: option ? option.value : "" }))
        }
        placeholder="No award"
        isClearable
        mode={themeStyles.mode}
      />
    </div>
  </GlassFormCard>
);

export default SuperlativeForm;
