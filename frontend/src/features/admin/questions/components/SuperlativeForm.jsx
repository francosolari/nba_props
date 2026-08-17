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
    subtitle="Award-style predictions"
    isSubmitting={createSuperlative.isPending}
    onSubmit={(event) => {
      event.preventDefault();
      if (!ensureSeasonSelected()) return;
      if (!form.awardId) {
        setError("Select an award before creating this question.");
        return;
      }
      handleMutation(
        createSuperlative,
        {
          season_slug: activeSeason,
          text: form.text.trim(),
          point_value: Number(form.pointValue || defaultPointValue),
          award_id: Number(form.awardId),
        },
        "Superlative question created.",
      );
      setForm({ text: "", awardId: "", pointValue: defaultPointValue });
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
    <SelectComponent
      options={awardOptions}
      value={awardOptions.find((option) => option.value === form.awardId) || null}
      onChange={(option) =>
        setForm((prev) => ({ ...prev, awardId: option ? option.value : "" }))
      }
      placeholder="Select award"
      isClearable
      mode={themeStyles.mode}
    />
  </GlassFormCard>
);

export default SuperlativeForm;
