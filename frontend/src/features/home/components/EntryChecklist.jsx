import React from 'react';
import { Check } from 'lucide-react';
import ActionLink from './ActionLink';
import { ENTRY_FEE } from '../entryState';

/**
 * While the window is open the only number that matters is how much of the
 * entry is still unfilled, so the ledger becomes a checklist of the real
 * categories rather than a rank and score that cannot exist yet.
 */
export function EntryChecklist({ rows, entry, action, deadline, loading }) {
  const { saved, total, picksComplete, paid, paidAt } = entry;
  const percent = total > 0 ? Math.round((saved / total) * 100) : 0;

  return (
    <aside className="next-play-ledger next-play-ledger--entry" aria-label="Your entry checklist">
      <header className="next-play-ledger__mast">
        <span>Your entry</span>
        <strong>{deadline ? `Locks ${deadline}` : 'Window open'}</strong>
      </header>

      <div className="next-play-checklist">
        {loading && !rows.length ? (
          <p className="next-play-checklist__loading">Loading your entry…</p>
        ) : rows.map(({ label, saved: done, total: needed }) => {
          const state = needed > 0 && done >= needed ? 'done' : done > 0 ? 'part' : 'todo';
          return (
            <div className={`next-play-checklist__row is-${state}`} key={label}>
              <span className="next-play-checklist__mark" aria-hidden="true">
                {state === 'done' ? <Check /> : null}
              </span>
              <span className="next-play-checklist__label">{label}</span>
              <span className="next-play-checklist__count">
                {done}<i>/{needed}</i>
              </span>
            </div>
          );
        })}
      </div>

      {/*
        An entry is picks plus payment. Both halves are stamped separately so a
        full set of saved picks never reads as a finished entry on its own.
      */}
      <div className={`next-play-entry-state${paid ? ' is-paid' : ' is-unpaid'}`}>
        <div className="next-play-entry-state__half">
          <span>Picks</span>
          <strong>{picksComplete ? 'All saved' : `${saved} of ${total} saved`}</strong>
          <span
            className="next-play-progress__track"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Picks saved"
          >
            <i style={{ '--fill': total > 0 ? saved / total : 0 }} />
          </span>
        </div>
        <div className="next-play-entry-state__half">
          <span>Entry fee</span>
          <strong>{paid ? 'Paid' : `${ENTRY_FEE} due`}</strong>
          <small>
            {paid
              ? paidAt ? `Received ${paidAt}` : 'Your entry counts.'
              : 'Your entry does not count until this is paid.'}
          </small>
        </div>
      </div>

      <div className="next-play-ledger__next">
        <div>
          <strong>{action.status}</strong>
          <small>{action.detail}</small>
        </div>
        <ActionLink href={action.href}>{action.label}</ActionLink>
      </div>
    </aside>
  );
}

export default EntryChecklist;
