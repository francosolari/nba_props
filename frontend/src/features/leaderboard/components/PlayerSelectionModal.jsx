import React from 'react';
import { X, Search, Check } from 'lucide-react';

/**
 * The comparison roster. "Selected / Everyone" lives here rather than in the
 * page chrome because it is the same decision as picking names off this list.
 */
export const PlayerSelectionModal = ({
  show,
  onClose,
  manageQuery,
  setManageQuery,
  withSimTotals,
  selectedUserIds,
  setSelectedUserIds,
  addUser,
  showAll,
  setShowAll,
}) => {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    if (!show) {
      setIsReady(false);
      return undefined;
    }
    const frame = window.requestAnimationFrame(() => setIsReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, [show]);

  React.useEffect(() => {
    if (!show) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [show, onClose]);

  if (!show) return null;

  const roster = withSimTotals || [];
  const filtered = roster.filter((e) => !manageQuery.trim()
    || (e.user.display_name || e.user.username).toLowerCase().includes(manageQuery.toLowerCase()));

  return (
    <div className={`court-modal-backdrop fixed inset-0 z-[100] flex items-end md:items-center justify-center transition-opacity duration-200 ${isReady ? 'opacity-100' : 'opacity-0'}`}>
      <section
        className={`court-roster-sheet w-full md:max-w-2xl max-h-[94dvh] md:max-h-[82vh] flex flex-col overflow-hidden transition-transform duration-200 ${isReady ? 'translate-y-0' : 'translate-y-4'}`}
        aria-modal="true"
        role="dialog"
        aria-labelledby="roster-title"
      >
        <header className="court-sheet-header">
          <div>
            <h3 id="roster-title">Who is on the sheet</h3>
            <p>{showAll ? `All ${roster.length} players` : `${selectedUserIds.length} selected`} · compared column by column</p>
          </div>
          <button onClick={onClose} className="court-icon-button" aria-label="Close roster">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="court-roster-scope" role="group" aria-label="Comparison scope">
          <button
            type="button"
            onClick={() => setShowAll(false)}
            aria-pressed={!showAll}
            className={!showAll ? 'is-active' : ''}
          >
            Selected
          </button>
          <button
            type="button"
            onClick={() => setShowAll(true)}
            aria-pressed={showAll}
            className={showAll ? 'is-active' : ''}
          >
            Everyone
          </button>
        </div>

        {showAll && (
          <p className="court-roster-scope__note">
            The board is showing every player in the season. Switch back to Selected to compare just the names you tick below.
          </p>
        )}

        <div className="court-roster-tools">
          <div className="court-search-field">
            <Search className="w-4 h-4" />
            <input
              value={manageQuery}
              onChange={(e) => setManageQuery(e.target.value)}
              placeholder="Find a player"
              aria-label="Find a player"
            />
          </div>
          <button onClick={() => setSelectedUserIds(roster.map((e) => String(e.user.id)))}>Select all</button>
          <button onClick={() => setSelectedUserIds([])}>Clear</button>
        </div>

        <div className="court-roster-column-head" aria-hidden="true"><span>Rank / player</span><span>On sheet</span></div>

        <div className="court-roster-list flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="court-roster-scope__note">No player matches “{manageQuery}”.</p>
          )}
          {filtered.map((e) => {
            const id = String(e.user.id);
            const isSel = selectedUserIds.includes(id);
            return (
              <label key={id} className={`court-roster-row ${isSel ? 'is-selected' : ''}`}>
                <span className="court-roster-rank">{e.rank ?? '—'}</span>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={isSel}
                  onChange={(ev) => (ev.target.checked ? addUser(id) : setSelectedUserIds((prev) => prev.filter((x) => x !== id)))}
                />
                <span className="court-roster-name">
                  <strong>{e.user.display_name || e.user.username}</strong>
                  <small>@{e.user.username}</small>
                </span>
                <span className="court-score-check" aria-hidden="true">{isSel && <Check className="w-4 h-4" strokeWidth={3} />}</span>
              </label>
            );
          })}
        </div>

        <footer className="court-sheet-footer">
          <span>{showAll ? 'Showing everyone' : `${selectedUserIds.length} players ready`}</span>
          <button onClick={onClose}>Update comparison</button>
        </footer>
      </section>
    </div>
  );
};
