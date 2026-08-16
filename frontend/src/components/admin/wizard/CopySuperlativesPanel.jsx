import React, { useMemo, useState } from 'react';
import { useAdminQuestions } from '../../../hooks';
import { cardClass, subtleTextClass, labelTextClass, buttonMutedClass, primaryButtonClass } from './wizardStyles';

// Lets an admin pull last year's superlative (award) questions straight into
// the current batch as pre-filled drafts, since most award questions repeat
// season over season with only the text/point value changing.
const CopySuperlativesPanel = ({ seasons, currentSeasonSlug, onAddDrafts }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sourceSeasonSlug, setSourceSeasonSlug] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const sourceSeasonOptions = useMemo(
    () => seasons.filter((season) => season.slug !== currentSeasonSlug),
    [seasons, currentSeasonSlug]
  );

  const { data: sourceQuestions = [], isLoading } = useAdminQuestions(sourceSeasonSlug);

  const superlativeQuestions = useMemo(
    () => sourceQuestions.filter((question) => question.question_type === 'superlative'),
    [sourceQuestions]
  );

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.size === superlativeQuestions.length
        ? new Set()
        : new Set(superlativeQuestions.map((question) => question.id))
    );
  };

  const handleSourceSeasonChange = (slug) => {
    setSourceSeasonSlug(slug);
    setSelectedIds(new Set());
  };

  const handleAddSelected = () => {
    const selected = superlativeQuestions.filter((question) => selectedIds.has(question.id));
    if (!selected.length) return;
    onAddDrafts(
      selected.map((question) => ({
        type: 'superlative',
        text: question.text,
        pointValue: question.point_value,
        data: { awardId: question.award_id },
      }))
    );
    setSelectedIds(new Set());
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`rounded px-4 py-2 text-sm font-medium transition ${buttonMutedClass}`}
      >
        Copy superlatives from a previous season
      </button>
    );
  }

  return (
    <div className={`${cardClass} p-6 space-y-4`}>
      <div className="flex items-center justify-between gap-4">
        <p className={`text-xs uppercase tracking-[0.3em] ${subtleTextClass}`}>
          Copy superlatives from a previous season
        </p>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className={`rounded px-3 py-1 text-xs transition ${buttonMutedClass}`}
        >
          Close
        </button>
      </div>

      <label className={`flex flex-col gap-2 text-sm ${labelTextClass}`}>
        Source season
        <select
          value={sourceSeasonSlug}
          onChange={(event) => handleSourceSeasonChange(event.target.value)}
          className="w-full court-admin-input w-full text-sm"
        >
          <option value="">Select a season…</option>
          {sourceSeasonOptions.map((season) => (
            <option key={season.slug} value={season.slug}>
              {season.year}
            </option>
          ))}
        </select>
      </label>

      {sourceSeasonSlug && (
        <div className="space-y-3">
          {isLoading && <p className={`text-sm ${subtleTextClass}`}>Loading questions…</p>}
          {!isLoading && superlativeQuestions.length === 0 && (
            <p className={`text-sm ${subtleTextClass}`}>No superlative questions found for that season.</p>
          )}
          {!isLoading && superlativeQuestions.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[var(--court-steel)]">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === superlativeQuestions.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded-[2px] border-2 border-[var(--court-rule)] bg-[var(--court-paper)] text-[var(--court-blue)] focus:ring-0"
                  />
                  Select all ({superlativeQuestions.length})
                </label>
                <span className={`text-xs ${subtleTextClass}`}>{selectedIds.size} selected</span>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {superlativeQuestions.map((question) => (
                  <label
                    key={question.id}
                    className="flex items-start gap-3 border-2 border-[var(--court-rule-soft)] bg-[var(--court-paper)] p-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(question.id)}
                      onChange={() => toggleSelected(question.id)}
                      className="mt-1 h-4 w-4 rounded-[2px] border-2 border-[var(--court-rule)] bg-[var(--court-paper)] text-[var(--court-blue)] focus:ring-0"
                    />
                    <span>
                      <span className="block text-[var(--court-ink)]">{question.text}</span>
                      <span className="block text-xs text-[var(--court-steel)]">
                        {question.award_name} • {Number(question.point_value)} pts
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddSelected}
                  disabled={selectedIds.size === 0}
                  className={`rounded px-5 py-2 text-sm font-semibold transition ${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  Add {selectedIds.size || ''} question{selectedIds.size === 1 ? '' : 's'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CopySuperlativesPanel;
