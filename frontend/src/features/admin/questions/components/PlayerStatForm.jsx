import React from 'react';
import { GlassFormCard, Textarea, NumberInput, TextInput } from './AdminFormPrimitives';

const PlayerStatForm = ({
  form,
  setForm,
  defaultPointValue,
  activeSeason,
  ensureSeasonSelected,
  setError,
  handleMutation,
  createPlayerStat,
  classes,
  themeStyles,
}) => (
  <GlassFormCard
    title="Player Stat"
    subtitle="Projection vs. stat benchmark"
    isSubmitting={createPlayerStat.isPending}
    onSubmit={(event) => {
      event.preventDefault();
      if (!ensureSeasonSelected()) return;
      if (!form.playerStatId) {
        setError("Provide the player stat ID for this question.");
        return;
      }
      handleMutation(
        createPlayerStat,
        {
          season_slug: activeSeason,
          text: form.text.trim(),
          point_value: Number(form.pointValue || defaultPointValue),
          player_stat_id: Number(form.playerStatId),
          stat_type: form.statType.trim(),
          fixed_value: form.fixedValue !== "" ? Number(form.fixedValue) : undefined,
        },
        "Player stat question created.",
      );
      setForm({ text: "", pointValue: defaultPointValue, playerStatId: "", statType: "", fixedValue: "" });
    }}
    themeStyles={themeStyles}
    primaryButtonClass={classes.primaryButtonClass}
  >
    <Textarea
      label="Question"
      value={form.text}
      onChange={(value) => setForm((prev) => ({ ...prev, text: value }))}
      placeholder="Who leads the league in assists?"
      required
      labelClass={classes.labelClass}
      textareaClass={classes.textareaClass}
    />
    <div className="grid gap-4 sm:grid-cols-2">
      <NumberInput
        label="Point value"
        value={form.pointValue}
        onChange={(value) => setForm((prev) => ({ ...prev, pointValue: value }))}
        step="0.5"
        min="0"
        labelClass={classes.labelClass}
        inputClass={classes.inputClass}
      />
      <TextInput
        label="Stat type"
        value={form.statType}
        onChange={(value) => setForm((prev) => ({ ...prev, statType: value }))}
        placeholder="assists"
        required
        labelClass={classes.labelClass}
        inputClass={classes.inputClass}
      />
    </div>
    <NumberInput
      label="Player stat ID"
      value={form.playerStatId}
      onChange={(value) => setForm((prev) => ({ ...prev, playerStatId: value }))}
      required
      labelClass={classes.labelClass}
      inputClass={classes.inputClass}
    />
    <NumberInput
      label="Fixed value (optional)"
      value={form.fixedValue}
      onChange={(value) => setForm((prev) => ({ ...prev, fixedValue: value }))}
      step="0.1"
      labelClass={classes.labelClass}
      inputClass={classes.inputClass}
    />
  </GlassFormCard>
);

export default PlayerStatForm;
