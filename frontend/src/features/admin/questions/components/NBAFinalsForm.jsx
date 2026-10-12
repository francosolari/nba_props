import React from 'react';
import CourtSelect from '../../../../components/CourtSelect';
import { GlassFormCard, Textarea, NumberInput } from './AdminFormPrimitives';
import { FINALS_ROLES } from '../../../submissions/finalsRoles';

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
      ).then((created) => {
        // Keep the draft when the save fails so nothing typed is lost.
        if (created) setForm({ text: "", pointValue: defaultPointValue, groupName: "" });
      });
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
      <div className="court-admin-field">
        Role
        <CourtSelect
          label="Role"
          showLabel={false}
          value={form.groupName || ''}
          onChange={(e) => {
            const role = FINALS_ROLES.find((r) => r.value === e.target.value);
            // Fill the standard wording for the role unless something was typed.
            setForm((prev) => ({ ...prev, groupName: e.target.value, text: prev.text.trim() ? prev.text : (role ? role.text : '') }));
          }}
        >
          <option value="">Pick a role</option>
          {FINALS_ROLES.map((role) => (
            <option key={role.value} value={role.value}>{role.label}</option>
          ))}
        </CourtSelect>
      </div>
    </div>
  </GlassFormCard>
);

export default NBAFinalsForm;
