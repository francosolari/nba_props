import React from 'react';
import SelectComponent from '../../../../components/SelectComponent';
import { GlassFormCard, Textarea, NumberInput } from './AdminFormPrimitives';

const PropForm = ({
  form,
  setForm,
  playerOptions,
  defaultPointValue,
  activeSeason,
  ensureSeasonSelected,
  handleMutation,
  createProp,
  classes,
  themeStyles,
}) => (
  <GlassFormCard
    title="Prop"
    subtitle="Binary & over/under"
    isSubmitting={createProp.isPending}
    onSubmit={(event) => {
      event.preventDefault();
      if (!ensureSeasonSelected()) return;
      handleMutation(
        createProp,
        {
          season_slug: activeSeason,
          text: form.text.trim(),
          point_value: Number(form.pointValue || defaultPointValue),
          outcome_type: form.outcomeType,
          related_player_id: form.relatedPlayerId ? Number(form.relatedPlayerId) : undefined,
          line:
            form.outcomeType === "over_under" && form.line !== ""
              ? Number(form.line)
              : undefined,
        },
        "Prop question created.",
      );
      setForm({
        text: "",
        pointValue: defaultPointValue,
        outcomeType: "over_under",
        line: "",
        relatedPlayerId: null,
      });
    }}
    themeStyles={themeStyles}
    primaryButtonClass={classes.primaryButtonClass}
  >
    <Textarea
      label="Question"
      value={form.text}
      onChange={(value) => setForm((prev) => ({ ...prev, text: value }))}
      placeholder="Does Luka average 32.5 PPG?"
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
        Outcome type
        <select
          value={form.outcomeType}
          onChange={(e) => setForm((prev) => ({ ...prev, outcomeType: e.target.value }))}
          className={classes.selectClass}
        >
          <option value="over_under">Over / Under</option>
          <option value="yes_no">Yes / No</option>
        </select>
      </label>
    </div>
    {form.outcomeType === "over_under" && (
      <NumberInput
        label="Line"
        value={form.line}
        onChange={(value) => setForm((prev) => ({ ...prev, line: value }))}
        step="0.1"
        required
        labelClass={classes.labelClass}
        inputClass={classes.inputClass}
      />
    )}
    <SelectComponent
      options={playerOptions}
      value={playerOptions.find((option) => option.value === form.relatedPlayerId) || null}
      onChange={(option) =>
        setForm((prev) => ({ ...prev, relatedPlayerId: option ? option.value : null }))
      }
      placeholder="Search related player"
      isClearable
      mode={themeStyles.mode}
    />
  </GlassFormCard>
);

export default PropForm;
