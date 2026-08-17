import React from 'react';
import { GlassFormCard, Textarea, NumberInput, TextInput } from './AdminFormPrimitives';

const NBAFinalsForm = ({
  form,
  setForm,
  defaultPointValue,
  activeSeason,
  ensureSeasonSelected,
  handleMutation,
  createNBAFinals,
  classes,
  themeStyles,
}) => (
  <GlassFormCard
    title="NBA Finals"
    subtitle="Championship predictions"
    isSubmitting={createNBAFinals.isPending}
    onSubmit={(event) => {
      event.preventDefault();
      if (!ensureSeasonSelected()) return;
      handleMutation(
        createNBAFinals,
        {
          season_slug: activeSeason,
          text: form.text.trim(),
          point_value: Number(form.pointValue || defaultPointValue),
          group_name: form.groupName || undefined,
        },
        "NBA Finals question created.",
      );
      setForm({ text: "", pointValue: defaultPointValue, groupName: "" });
    }}
    themeStyles={themeStyles}
    primaryButtonClass={classes.primaryButtonClass}
  >
    <Textarea
      label="Question"
      value={form.text}
      onChange={(value) => setForm((prev) => ({ ...prev, text: value }))}
      placeholder="Who wins the NBA Finals?"
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
        label="Grouping (optional)"
        value={form.groupName}
        onChange={(value) => setForm((prev) => ({ ...prev, groupName: value }))}
        placeholder="Finals"
        labelClass={classes.labelClass}
        inputClass={classes.inputClass}
      />
    </div>
  </GlassFormCard>
);

export default NBAFinalsForm;
