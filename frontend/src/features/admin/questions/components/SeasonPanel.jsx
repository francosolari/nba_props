import React from 'react';
import SelectComponent from '../../../../components/SelectComponent';
import { formatDate, formatDateTime } from '../adminPanelStyles';
import { DateInput, TextInput } from './AdminFormPrimitives';

const SeasonPanel = ({
  seasonOptions,
  activeSeason,
  setActiveSeason,
  seasonMeta,
  showSeasonForm,
  setShowSeasonForm,
  seasonForm,
  onSeasonField,
  onSeasonCreate,
  onCancelSeasonForm,
  createSeason,
  classes,
  themeStyles,
}) => (
  <section id="season" className="space-y-6">
    <div className={classes.themeCardClass}>
      <p className={`text-xs uppercase tracking-[0.3em] ${themeStyles.subtle}`}>Current season</p>
      <div className="mt-3">
        <SelectComponent
          options={seasonOptions}
          value={seasonOptions.find((option) => option.value === activeSeason) || null}
          onChange={(option) => setActiveSeason(option ? option.value : "")}
          placeholder="Select season"
          mode={themeStyles.mode}
        />
      </div>
      {seasonMeta && (
        <div className={`mt-4 space-y-1 text-sm ${themeStyles.textSecondary}`}>
          <p>{seasonMeta.year}</p>
          <p className={`text-sm ${themeStyles.muted}`}>
            {formatDate(seasonMeta.start_date)} → {formatDate(seasonMeta.end_date)}
          </p>
          <p className={`text-sm ${themeStyles.muted}`}>
            Submissions {formatDateTime(seasonMeta.submission_start_date)} →{" "}
            {formatDateTime(seasonMeta.submission_end_date)}
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setShowSeasonForm((open) => !open)}
        className={`${classes.secondaryButtonClass} mt-6 w-full justify-center font-medium`}
      >
        {showSeasonForm ? "Close season creator" : "Create new season"}
      </button>
    </div>

    {showSeasonForm && (
      <div className={`${classes.themeCardClass}`}>
        <h2 className={`text-lg font-semibold tracking-wide ${themeStyles.heading}`}>
          Create a new season
        </h2>
        <p className={`mt-1 text-sm ${themeStyles.subtle}`}>
          Define the dates and submission window. The slug is generated automatically.
        </p>
        <form onSubmit={onSeasonCreate} className="mt-6 grid gap-6 lg:grid-cols-2">
          <TextInput
            label="Display year"
            value={seasonForm.year}
            onChange={(value) => onSeasonField("year", value)}
            placeholder="2025-26"
            required
            labelClass={classes.labelClass}
            inputClass={classes.inputClass}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <DateInput
              label="Season starts"
              value={seasonForm.start_date}
              onChange={(e) => onSeasonField("start_date", e.target.value)}
              required
              labelClass={classes.labelClass}
              inputClass={classes.inputClass}
            />
            <DateInput
              label="Season ends"
              value={seasonForm.end_date}
              onChange={(e) => onSeasonField("end_date", e.target.value)}
              required
              labelClass={classes.labelClass}
              inputClass={classes.inputClass}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <DateInput
              label="Submissions open"
              value={seasonForm.submission_start_date}
              onChange={(e) => onSeasonField("submission_start_date", e.target.value)}
              required
              type="datetime-local"
              step="60"
              labelClass={classes.labelClass}
              inputClass={classes.inputClass}
            />
            <DateInput
              label="Submissions close"
              value={seasonForm.submission_end_date}
              onChange={(e) => onSeasonField("submission_end_date", e.target.value)}
              required
              type="datetime-local"
              step="60"
              labelClass={classes.labelClass}
              inputClass={classes.inputClass}
            />
          </div>
          <div className="flex items-center justify-end gap-3 lg:col-span-2">
            <button
              type="button"
              onClick={onCancelSeasonForm}
              className={classes.secondaryButtonClass}
            >
              Cancel
            </button>
            <button type="submit" disabled={createSeason.isPending} className={classes.primaryButtonClass}>
              {createSeason.isPending ? "Creating…" : "Save season"}
            </button>
          </div>
        </form>
      </div>
    )}
  </section>
);

export default SeasonPanel;
