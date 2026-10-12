import React from 'react';
import { Plus, X } from 'lucide-react';
import CourtSelect from '../../../../components/CourtSelect';
import { formatDate, formatDateTime } from '../adminPanelStyles';
import { DateInput, TextInput } from './AdminFormPrimitives';

// Submission window state, written out so it never depends on color alone.
const windowStatus = (seasonMeta, now = new Date()) => {
  const opens = seasonMeta?.submission_start_date ? new Date(seasonMeta.submission_start_date) : null;
  const closes = seasonMeta?.submission_end_date ? new Date(seasonMeta.submission_end_date) : null;
  if (!opens || !closes) return { tone: "neutral", text: "No pick window set" };
  if (now < opens) return { tone: "warning", text: `Picks open ${formatDateTime(opens)}` };
  if (now <= closes) return { tone: "success", text: `Picks open until ${formatDateTime(closes)}` };
  return { tone: "neutral", text: `Picks closed ${formatDate(closes)}` };
};

const SeasonPanel = ({
  seasonOptions,
  activeSeason,
  setActiveSeason,
  seasonMeta,
  questionCount,
  showSeasonForm,
  setShowSeasonForm,
  seasonForm,
  onSeasonField,
  onSeasonCreate,
  onCancelSeasonForm,
  createSeason,
  classes,
  themeStyles,
}) => {
  const status = windowStatus(seasonMeta);
  return (
    <section id="season" className="court-admin-seasonbar" aria-label="Season">
      <div className="court-admin-seasonbar__row">
        <div className="court-admin-seasonbar__select">
          <CourtSelect
            label="Season"
            showLabel={false}
            value={activeSeason}
            onChange={(event) => setActiveSeason(event.target.value)}
          >
            {seasonOptions.length === 0 && <option value="">No seasons yet</option>}
            {seasonOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </CourtSelect>
        </div>
        {seasonMeta && (
          <div className="court-admin-seasonbar__meta">
            <span className={`court-admin-badge court-admin-badge--${status.tone}`}>{status.text}</span>
            <span>
              {questionCount} question{questionCount === 1 ? "" : "s"}
              {" · "}
              {formatDate(seasonMeta.start_date)} – {formatDate(seasonMeta.end_date)}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowSeasonForm((open) => !open)}
          aria-expanded={showSeasonForm}
          className="court-admin-chip-btn court-admin-seasonbar__new"
        >
          {showSeasonForm ? <X aria-hidden="true" className="h-4 w-4" /> : <Plus aria-hidden="true" className="h-4 w-4" />}
          {showSeasonForm ? "Close" : "New season"}
        </button>
      </div>

      {showSeasonForm && (
        <div className="court-admin-seasonbar__form">
          <h2 className="court-admin-sheet-title">New season</h2>
          <p className={`mt-1 text-sm ${themeStyles.subtle}`}>
            Set the season dates and the pick window. The URL slug is generated from the year.
          </p>
          <form onSubmit={onSeasonCreate} className="mt-5 grid gap-5 lg:grid-cols-2">
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
};

export default SeasonPanel;
