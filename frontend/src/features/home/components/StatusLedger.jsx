import React from 'react';
import ActionLink from './ActionLink';

/** Once picks lock, rank and score are the whole story and get the ledger back. */
export function StatusLedger({ me, action, hasSubmission, seasonLabel, projecting = false }) {
  const totalPoints = me?.user?.total_points;
  const swing = projecting ? me?.standingsDelta || 0 : 0;
  const categories = me?.user?.categories || {};
  const leader = Object.entries(categories)
    .sort(([, a], [, b]) => (b?.points || 0) - (a?.points || 0))[0];

  return (
    <aside className={`next-play-ledger next-play-ledger--player${projecting ? ' is-projecting' : ''}`} aria-label="Your season status">
      <header className="next-play-ledger__mast">
        <span>Your season</span>
        <strong>{projecting ? 'Projected' : 'Picks locked'}</strong>
      </header>
      <div className="next-play-player-grid">
        <div>
          <span>Rank</span>
          <strong>{me?.rank ? `#${me.rank}` : '—'}</strong>
          <small>
            {projecting && me?.actualRank && me.actualRank !== me.rank
              ? `Now #${me.actualRank}`
              : me ? 'Overall position' : 'Awaiting first grade'}
          </small>
        </div>
        <div>
          <span>Total score</span>
          <strong>{Number.isFinite(totalPoints) ? totalPoints.toLocaleString() : hasSubmission ? '0' : '—'}</strong>
          <small>{swing ? `${swing > 0 ? '+' : ''}${swing} from your calls` : 'Points earned'}</small>
        </div>
        <div>
          <span>Best category</span>
          <strong className="next-play-player-grid__status">{leader?.[0] || '—'}</strong>
          <small>{leader ? `${leader[1]?.points || 0} points so far` : 'Nothing graded yet'}</small>
        </div>
        <div>
          <span>Entry</span>
          <strong className="next-play-player-grid__deadline">{hasSubmission ? 'Locked in' : 'No entry'}</strong>
          <small>{hasSubmission ? 'Picks are final for the season' : 'The window has closed'}</small>
        </div>
      </div>
      <div className="next-play-ledger__next">
        <div>
          <strong>Your picks</strong>
          <small>See every call you made and how it graded.</small>
        </div>
        <ActionLink href={action.href}>{action.label}</ActionLink>
      </div>
    </aside>
  );
}

export default StatusLedger;
