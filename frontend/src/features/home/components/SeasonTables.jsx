import React from 'react';
import { ArrowRight } from 'lucide-react';
import useReorderAnimation from '../../../hooks/useReorderAnimation';
import { pointsAvailable, scorePosition, teamKey } from '../whatIf';

export function LeaderboardLedger({ entries, leaderboardUrl, currentUserId, skipTop = 0, limit = 6, projecting = false }) {
  const rows = entries.slice(skipTop, skipTop + limit);
  if (!rows.length) return null;

  const isMine = (entry) => Boolean(currentUserId) && String(entry.user?.id) === String(currentUserId);
  const renderRow = (entry, pinned) => (
    <a
      className={`next-play-leaders__row${isMine(entry) ? ' is-current' : ''}${pinned ? ' is-pinned' : ''}`}
      href={leaderboardUrl || '#'}
      key={`${pinned ? 'pinned-' : ''}${entry.rank}-${entry.user?.id || entry.user?.username}`}
    >
      <strong>
        #{entry.rank ?? '—'}
        {projecting && entry.actualRank && entry.actualRank !== entry.rank ? (
          <u className={entry.actualRank > entry.rank ? 'is-up' : 'is-down'}>
            {entry.actualRank > entry.rank ? '▲' : '▼'}{Math.abs(entry.actualRank - entry.rank)}
          </u>
        ) : null}
      </strong>
      <span>{entry.user?.display_name || entry.user?.username || 'Player'}{isMine(entry) ? ' (You)' : ''}</span>
      <strong>{entry.user?.total_points ?? entry.points ?? 0}</strong>
    </a>
  );

  // A mid-pack player would otherwise see only strangers, so their own line is
  // pinned under the visible window rather than left off the page entirely.
  const mine = currentUserId ? entries.find(isMine) : null;
  const pinned = mine && !rows.some(isMine) ? mine : null;

  return (
    <section className="next-play-leaders" aria-labelledby="leaders-title">
      <header className="next-play-section-head">
        <div><h2 id="leaders-title">Leaderboard</h2><p>{skipTop ? 'The rest of the table.' : 'Top of the pool this season.'}</p></div>
        {leaderboardUrl ? <a href={leaderboardUrl}>Full table <ArrowRight aria-hidden="true" /></a> : null}
      </header>
      <div className="next-play-leaders__table">
        <div className="next-play-leaders__row is-head"><span>Rank</span><span>Player</span><span>Points</span></div>
        {rows.map((entry) => renderRow(entry, false))}
        {pinned ? renderRow(pinned, true) : null}
      </div>
    </section>
  );
}

/**
 * One conference, every team, against the order this entry called.
 *
 * The columns answer the only question a standings pick raises: where the team
 * sits, where you put them, and what that is worth right now. Points are the
 * scoring band itself (3 on the nose, 1 either side), so "how far off am I" and
 * "how much is it worth" are the same glance.
 */
function ConferenceLadder({ name, teams, picks, projecting }) {
  const scored = Boolean(picks?.size);
  const registerRow = useReorderAnimation();
  const totals = teams.reduce((sum, team) => {
    const predicted = picks?.get(teamKey(team.team));
    return {
      points: sum.points + scorePosition(predicted, team.position),
      available: sum.available + (predicted ? pointsAvailable(predicted, team.position) : 0),
    };
  }, { points: 0, available: 0 });

  return (
    <div className={`next-play-conference is-${name.toLowerCase()}${scored ? ' is-scored' : ''}`}>
      <header>
        <span>{name}{scored ? ' · your call' : ''}</span>
        <span>W–L</span>
        {scored ? <span>Pts</span> : null}
      </header>
      {teams.map((team) => {
        const predicted = picks?.get(teamKey(team.team));
        const points = scorePosition(predicted, team.position);
        const moved = projecting && team.actualPosition ? team.actualPosition - team.position : 0;
        const gap = predicted ? Math.abs(predicted - team.position) : null;

        return (
          <div
            className={[
              points ? `is-scoring is-band-${points}` : '',
              // A team whose record this projection actually moved.
              team.gainedWins || team.gainedLosses ? 'is-called' : '',
            ].filter(Boolean).join(' ') || undefined}
            key={`${name}-${team.team}`}
            ref={registerRow(`${name}-${team.team}`)}
          >
            <strong>
              {team.position}
              {moved ? <u className={moved > 0 ? 'is-up' : 'is-down'}>{moved > 0 ? '▲' : '▼'}{Math.abs(moved)}</u> : null}
            </strong>
            {scored ? (
              <span
                className="next-play-conference__call"
                title={predicted
                  ? `You called them ${predicted}${gap ? `, ${gap} place${gap === 1 ? '' : 's'} away` : ' — exact'}`
                  : 'No pick on this team'}
              >
                {predicted || '–'}
              </span>
            ) : null}
            <span className="next-play-conference__team">{team.team}</span>
            {/* The called result is marked on the half of the record it moved. */}
            <b>
              <span className={team.gainedWins ? 'is-gained' : undefined}>{team.wins}</span>
              –
              <span className={team.gainedLosses ? 'is-dropped' : undefined}>{team.losses}</span>
            </b>
            {scored ? <em className="next-play-conference__pts">{predicted ? points : '–'}</em> : null}
          </div>
        );
      })}
      {scored ? (
        <p className="next-play-conference__total">
          <span>{totals.points} pts banked</span>
          <span>{totals.available} still reachable</span>
        </p>
      ) : null}
    </div>
  );
}

export function StandingsPulse({ standings, predictions, projecting = false }) {
  if (!standings?.eastern?.length && !standings?.western?.length) return null;
  const scored = Boolean(predictions?.east?.size || predictions?.west?.size);

  return (
    <section className="next-play-pulse" aria-labelledby="pulse-title">
      <header className="next-play-section-head">
        <div>
          <h2 id="pulse-title">{projecting ? 'Projected standings' : 'NBA standings'}</h2>
          <p>
            {projecting
              ? 'If the games go the way you called them.'
              : scored
                ? 'Your call next to the real order. An exact call is worth 3 points, one place off is worth 1.'
                : 'The full table in both conferences.'}
          </p>
        </div>
      </header>
      <div className="next-play-pulse__grid">
        <ConferenceLadder name="East" teams={standings.eastern || []} picks={predictions?.east} projecting={projecting} />
        <ConferenceLadder name="West" teams={standings.western || []} picks={predictions?.west} projecting={projecting} />
      </div>
    </section>
  );
}
