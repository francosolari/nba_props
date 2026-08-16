import React from 'react';
import { GlassFormCard, Textarea, NumberInput, TextInput } from './AdminFormPrimitives';

const ISTForm = ({
  form,
  setForm,
  defaultPointValue,
  activeSeason,
  ensureSeasonSelected,
  handleMutation,
  createIST,
  classes,
  themeStyles,
}) => (
  <GlassFormCard
    title="In-Season Tournament"
    subtitle="Group predictions & tiebreakers"
    isSubmitting={createIST.isPending}
    onSubmit={(event) => {
      event.preventDefault();
      if (!ensureSeasonSelected()) return;
      handleMutation(
        createIST,
        {
          season_slug: activeSeason,
          text: form.text.trim(),
          point_value: Number(form.pointValue || defaultPointValue),
          prediction_type: form.predictionType,
          ist_group: form.istGroup || undefined,
          is_tiebreaker: Boolean(form.predictionType === "tiebreaker" || form.isTiebreaker),
        },
        "IST question created.",
      );
      setForm({
        text: "",
        pointValue: defaultPointValue,
        predictionType: "group_winner",
        istGroup: "",
        isTiebreaker: false,
      });
    }}
    themeStyles={themeStyles}
    primaryButtonClass={classes.primaryButtonClass}
  >
    <Textarea
      label="Question"
      value={form.text}
      onChange={(value) => setForm((prev) => ({ ...prev, text: value }))}
      placeholder="Who wins East Group A?"
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
      <label className={classes.labelClass}>
        Prediction type
        <select
          value={form.predictionType}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              predictionType: e.target.value,
              isTiebreaker: e.target.value === "tiebreaker",
            }))
          }
          className={classes.selectClass}
        >
          <option value="group_winner">Group Winner</option>
          <option value="wildcard">Wildcard</option>
          <option value="conference_winner">Conference Winner</option>
          <option value="tiebreaker">Tiebreaker</option>
        </select>
      </label>
    </div>
    <TextInput
      label="IST group (optional)"
      value={form.istGroup}
      onChange={(value) => setForm((prev) => ({ ...prev, istGroup: value }))}
      placeholder="East Group A"
      labelClass={classes.labelClass}
      inputClass={classes.inputClass}
    />
    <label className={`mt-2 flex items-center gap-3 text-sm ${themeStyles.textSecondary}`}>
      <input
        type="checkbox"
        checked={Boolean(form.isTiebreaker)}
        onChange={(e) => setForm((prev) => ({ ...prev, isTiebreaker: e.target.checked }))}
        className={classes.checkboxClass}
      />
      Tiebreaker question
    </label>
  </GlassFormCard>
);

export default ISTForm;
