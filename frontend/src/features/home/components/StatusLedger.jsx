import React from 'react';
import ActionLink from './ActionLink';

/**
 * Where the entry lands if the season keeps going the way it is going.
 *
 * Deliberately not shaped like the tiles above it. The graded score is the one
 * that pays; this is a forecast that will be wrong, and the two must never be
 * mistaken for each other on a glance — so it sits apart, in smaller type, and
 * says what it is on its own line.
 */
function ForecastStrip({ forecast }) {
  if (!forecast) return null;

  return (
    <div className="next-play-forecast" aria-label="Projected finish">
      <span className="next-play-forecast__tag">Projected finish</span>
      <p className="next-play-forecast__line">
        <strong>{forecast.points.toLocaleString()}</strong> pts
        {forecast.rank ? <> · <strong>#{forecast.rank}</strong></> : null}
      </p>
      <small>
        If the season plays out on current form. Not your score — the pool is
        graded on the real final standings.
        {forecast.live
          ? ` ${forecast.live} of your ${forecast.live + forecast.settled} standings calls can still change.`
          : ' Every standings call is decided.'}
      </small>
    </div>
  );
}

/** Once picks lock, rank and score are the whole story and get the ledger back. */
export function StatusLedger({ me, action, hasSubmission, seasonLabel, projecting = false, forecast = null }) {
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
      <ForecastStrip forecast={forecast} />
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
