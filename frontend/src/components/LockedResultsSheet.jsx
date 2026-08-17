import React from 'react';
import { Calendar, Lock } from 'lucide-react';
import CourtSelect from './CourtSelect';
import { formatDate } from '../features/leaderboard/utils/helpers';

/**
 * The sealed-entries notice, shared by every surface that would otherwise expose
 * one participant's picks to another.
 *
 * Entries stay private while the submission window is open: anyone who has
 * already submitted would be exposed to whoever submits after them, who could
 * copy the leading entry. The API enforces this and returns nothing — this is
 * what the participant reads instead of an empty board.
 */
export const LockedResultsSheet = ({
  title,
  description,
  submissionEndDate,
  seasonsData,
  selectedSeason,
  setSelectedSeason,
}) => (
  <div className="min-h-screen bg-[var(--court-paper)] p-4 flex items-center justify-center">
    <div className="court-locked-sheet max-w-xl w-full text-center relative">
      <div className="court-locked-sheet__body">
        <Lock className="court-locked-sheet__watermark" aria-hidden="true" />

        <div className="court-locked-sheet__badge">
          <Lock className="w-8 h-8" aria-hidden="true" />
        </div>

        <h1 className="court-display text-2xl mb-2">{title}</h1>
        <p className="text-[var(--court-steel)] mb-8 max-w-sm mx-auto">{description}</p>

        {submissionEndDate && (
          <div className="court-locked-sheet__chip">
            <Calendar className="w-4 h-4" aria-hidden="true" />
            <span>Reveals {formatDate(submissionEndDate)}</span>
          </div>
        )}

        {seasonsData && seasonsData.length > 1 && setSelectedSeason && (
          <div className="court-locked-sheet__seasons">
            <div className="flex justify-center items-center gap-2 text-sm">
              <span className="text-[var(--court-steel)]">Past seasons:</span>
              <CourtSelect
                label="Past season"
                showLabel={false}
                className="court-select--compact"
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
              >
                {seasonsData.map((s) => (
                  <option key={s.slug} value={s.slug}>{s.year}</option>
                ))}
              </CourtSelect>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default LockedResultsSheet;
