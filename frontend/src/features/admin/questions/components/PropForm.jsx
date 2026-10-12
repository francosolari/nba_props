import React from 'react';
import SelectComponent from '../../../../components/SelectComponent';
import CourtSelect from '../../../../components/CourtSelect';
import { GlassFormCard, Textarea } from './AdminFormPrimitives';
import AnswerPoints, { pointsPayload } from './AnswerPoints';
import { PROP_KINDS, STAT_OPTIONS, outcomeForKind } from '../statProps';

export const defaultPropForm = (pointValue) => ({
  kind: 'yes_no',
  text: '',
  relatedPlayerId: null,
  stat: '',
  line: '',
  pointValue,
  pointsIfCorrect: {},
});

const PLACEHOLDERS = {
  yes_no: 'Will the Knicks win 55 or more games?',
  over_under: 'Knicks regular-season wins',
  player_stat: 'Luka Dončić technical fouls (season)',
};

// One form for every prop. Yes/No and Over/Under can carry a player for the
// headshot; Player stat requires one plus the stat, and is answered over/under.
const PropForm = ({
  form,
  setForm,
  playerOptions,
  defaultPointValue,
  activeSeason,
  ensureSeasonSelected,
  setError,
  handleMutation,
  createProp,
  classes,
  themeStyles,
}) => {
  const isStat = form.kind === 'player_stat';
  const outcome = outcomeForKind(form.kind);
  const player = playerOptions.find((option) => option.value === form.relatedPlayerId) || null;

  const chooseKind = (kind) => setForm((prev) => ({
    ...prev,
    kind,
    // Yes/No and Over/Under name their answers differently, so split points restart.
    pointsIfCorrect: outcomeForKind(kind) === outcomeForKind(prev.kind) ? prev.pointsIfCorrect : {},
  }));

  return (
    <GlassFormCard
      title="Prop"
      subtitle="Yes/No, Over/Under, or a player's stat. Set different points per answer for long shots."
      isSubmitting={createProp.isPending}
      onSubmit={(event) => {
        event.preventDefault();
        if (!ensureSeasonSelected()) return;
        if (isStat && (!form.relatedPlayerId || !form.stat)) {
          setError('Pick the player and the stat.');
          return;
        }
        handleMutation(
          createProp,
          {
            season_slug: activeSeason,
            text: form.text.trim(),
            point_value: Number(form.pointValue || defaultPointValue),
            points_if_correct: pointsPayload(form.pointsIfCorrect),
            outcome_type: outcome,
            related_player_id: form.relatedPlayerId ? Number(form.relatedPlayerId) : undefined,
            line: outcome === 'over_under' && form.line !== '' ? Number(form.line) : undefined,
            stat: isStat ? form.stat : '',
          },
          'Prop question created.',
        ).then((created) => {
          // Keep the kind, stat and points so the next one is quick to add.
          if (created) setForm((prev) => ({ ...prev, text: '', relatedPlayerId: null, line: '' }));
        });
      }}
      themeStyles={themeStyles}
      primaryButtonClass={classes.primaryButtonClass}
    >
      <div className="court-admin-choice" role="radiogroup" aria-label="Prop type">
        {PROP_KINDS.map((kind) => (
          <button
            key={kind.value}
            type="button"
            role="radio"
            aria-checked={form.kind === kind.value}
            className={form.kind === kind.value ? 'is-selected' : ''}
            onClick={() => chooseKind(kind.value)}
          >
            {kind.label}
          </button>
        ))}
      </div>
      <Textarea
        label="Question"
        value={form.text}
        onChange={(value) => setForm((prev) => ({ ...prev, text: value }))}
        placeholder={PLACEHOLDERS[form.kind]}
        required
        labelClass={classes.labelClass}
        textareaClass={classes.textareaClass}
      />
      <div className="court-admin-field">
        {isStat ? 'Player' : 'Player (optional)'}
        {!isStat && <span>Adds their headshot to the pick slip.</span>}
        <SelectComponent
          options={playerOptions}
          value={player}
          onChange={(option) => setForm((prev) => ({ ...prev, relatedPlayerId: option ? option.value : null }))}
          placeholder="Search players..."
          isClearable
          mode={themeStyles.mode}
        />
      </div>
      {outcome === 'over_under' && (
        <div className={isStat ? 'grid grid-cols-[minmax(0,1fr)_120px] gap-3' : 'max-w-[160px]'}>
          {isStat && (
            <div className="court-admin-field">
              Stat
              <CourtSelect
                label="Stat"
                showLabel={false}
                value={form.stat}
                onChange={(e) => setForm((prev) => ({ ...prev, stat: e.target.value }))}
              >
                <option value="">Pick a stat</option>
                {STAT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </CourtSelect>
            </div>
          )}
          <label className="court-admin-field">
            Line
            <input
              id="prop-line"
              type="number"
              inputMode="decimal"
              step="0.5"
              required
              value={form.line}
              onChange={(e) => setForm((prev) => ({ ...prev, line: e.target.value }))}
              className="court-admin-input w-full"
            />
          </label>
        </div>
      )}
      <AnswerPoints
        idPrefix="prop"
        outcomeType={outcome}
        pointValue={form.pointValue}
        pointsIfCorrect={form.pointsIfCorrect}
        onChange={({ pointValue, pointsIfCorrect }) => setForm((prev) => ({ ...prev, pointValue, pointsIfCorrect }))}
      />
    </GlassFormCard>
  );
};

export default PropForm;
