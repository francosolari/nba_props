import React from 'react';
import { FlaskConical, MousePointerClick, Move, Pin, RotateCcw } from 'lucide-react';
import { lockedPoints } from '../utils/helpers';

const formatPoints = (value) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return '0';
  return Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1).replace(/\.0$/, '');
};

/** The share of a total that is already settled. Shown at rest only: during a
 *  scenario the band is describing a hypothetical, and "locked" is a claim about
 *  what actually happened. */
const Banked = ({ entry }) => {
  const total = Number(entry.user.total_points || 0);
  const locked = lockedPoints(entry);
  if (!total) return null;
  const share = Math.max(0, Math.min(100, Math.round((locked / total) * 100)));
  const summary = `${formatPoints(locked)} of ${formatPoints(total)} points locked, ${formatPoints(Math.max(0, total - locked))} still in play`;
  return (
    <span
      className="court-adv-entry__banked"
      style={{ '--locked-share': `${share}%` }}
      title={summary}
    >
      <span className="sr-only">{summary}</span>
    </span>
  );
};

const Delta = ({ value }) => {
  if (!value) return null;
  const up = value > 0;
  return (
    <span className={`court-adv-delta ${up ? 'is-up' : 'is-down'}`}>
      {up ? '+' : '−'}{formatPoints(Math.abs(value))}
      <span className="sr-only"> points {up ? 'gained' : 'lost'} in this scenario</span>
    </span>
  );
};

/**
 * Score band — the whole field in rank order, held above the ledger so the
 * standing is readable however deep into the table you have scrolled, and so a
 * What-If move shows its effect on real totals without scrolling back up.
 *
 * Your own cell is pinned to the left edge while the rest scrolls, which keeps
 * the leaders first in reading order and your position permanently in view.
 * What-If lives here rather than in the chrome because this band is the thing
 * it changes.
 */
export const LeaderboardPodium = ({
  whatIfEnabled,
  withSimTotals,
  loggedInUserId,
  isPinMePinned,
  onTogglePinMe,
  onToggleWhatIf,
  section,
}) => {
  const entries = withSimTotals || [];
  const meIndex = loggedInUserId
    ? entries.findIndex((entry) => String(entry.user.id) === String(loggedInUserId))
    : -1;
  const me = meIndex >= 0 ? entries[meIndex] : null;

  // Every player, in rank order. Your own cell is lifted out and pinned left.
  const field = entries.filter((entry) => !me || String(entry.user.id) !== String(me.user.id));

  const meDelta = me && whatIfEnabled && me.__orig_total_points != null
    ? me.user.total_points - me.__orig_total_points
    : 0;

  return (
    <>
      <div className={`court-adv-band ${whatIfEnabled ? 'is-simulating' : ''}`}>
        {me && (
          <button
            type="button"
            onClick={onTogglePinMe}
            aria-pressed={Boolean(isPinMePinned)}
            className="court-adv-entry court-adv-entry--me"
            aria-label={`You, rank ${meIndex + 1}, ${formatPoints(me.user.total_points)} points. ${
              isPinMePinned ? 'Unpin yourself from' : 'Pin yourself to'
            } the front of the comparison.`}
            title={isPinMePinned ? 'Unpin yourself from the front of the comparison' : 'Pin yourself to the front of the comparison'}
          >
            <span className="court-adv-entry__rank">{meIndex + 1}</span>
            <span className="court-adv-entry__body">
              <span className="court-adv-entry__name">You</span>
              <span className="court-adv-entry__score">
                {formatPoints(me.user.total_points)}
                <small>PTS</small>
                <Delta value={meDelta} />
              </span>
              {!whatIfEnabled && <Banked entry={me} />}
            </span>
            <span className="court-adv-entry__pin" aria-hidden="true">
              <Pin className="w-3.5 h-3.5" />
            </span>
          </button>
        )}

        <div className="court-adv-band__scroll" aria-label="Every player by rank">
          {field.map((entry) => {
            const rank = entries.findIndex((c) => String(c.user.id) === String(entry.user.id)) + 1;
            const delta = whatIfEnabled && entry.__orig_total_points != null
              ? entry.user.total_points - entry.__orig_total_points
              : 0;
            return (
              <div key={entry.user.id} className="court-adv-entry">
                <span className={`court-adv-entry__rank ${rank === 1 ? 'is-leader' : ''}`}>{rank || '—'}</span>
                <span className="court-adv-entry__body">
                  <span className="court-adv-entry__name">{entry.user.display_name || entry.user.username}</span>
                  <span className="court-adv-entry__score">
                    {formatPoints(entry.user.total_points)}
                    <small>PTS</small>
                    <Delta value={delta} />
                  </span>
                  {!whatIfEnabled && <Banked entry={entry} />}
                </span>
              </div>
            );
          })}
        </div>

        <div className="court-adv-band__whatif">
          <button
            type="button"
            onClick={onToggleWhatIf}
            className={`court-adv-whatif ${whatIfEnabled ? 'is-on court-adv-whatif--reset' : ''}`}
            aria-pressed={Boolean(whatIfEnabled)}
          >
            {whatIfEnabled
              ? <RotateCcw className="w-4 h-4" aria-hidden="true" />
              : <FlaskConical className="w-4 h-4" aria-hidden="true" />}
            <span>{whatIfEnabled ? 'Reset What-If' : 'What-If'}</span>
          </button>
        </div>
      </div>

      {whatIfEnabled && (
        <p className="court-adv-note" role="status">
          {section === 'standings'
            ? <Move aria-hidden="true" />
            : <MousePointerClick aria-hidden="true" />}
          <span>
            <b>What-If</b>{' '}
            {section === 'standings'
              ? 'Drag a team to a new finishing position and every total above updates.'
              : 'Tap an answer to give it the win. The leader it displaces drops to runner-up.'}{' '}
            Nothing here is saved — Reset What-If returns the real table.
          </span>
        </p>
      )}
    </>
  );
};
