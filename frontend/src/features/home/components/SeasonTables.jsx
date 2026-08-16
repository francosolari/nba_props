import React from 'react';
import { ArrowRight, BarChart3, Medal } from 'lucide-react';

export function PersonalScorebook({ me, hasSubmission, leaderboardUrl }) {
  const categories = me?.user?.categories || {};
  const rows = Object.entries(categories);
  if (!rows.length) return null;

  return (
    <section className="next-play-scorebook" aria-labelledby="personal-scorebook-title">
      <header className="next-play-section-head">
        <div><h2 id="personal-scorebook-title">Your scorebook</h2><p>Category scores and overall total.</p></div>
        {leaderboardUrl ? <a href={leaderboardUrl}>Full breakdown <ArrowRight aria-hidden="true" /></a> : null}
      </header>
      <div className="next-play-scorebook__summary">
        <div><Medal aria-hidden="true" /><span>Overall rank</span><strong>{me?.rank ? `#${me.rank}` : '—'}</strong></div>
        <div><BarChart3 aria-hidden="true" /><span>Total score</span><strong>{Number.isFinite(me?.user?.total_points) ? me.user.total_points.toLocaleString() : hasSubmission ? '0' : '—'}</strong></div>
      </div>
      <div className="next-play-scorebook__rows">
        <div className="next-play-scorebook__row is-head"><span>Category</span><span>Score</span><span>Available</span></div>
        {rows.map(([label, category]) => (
          <div className="next-play-scorebook__row" key={label}>
            <span>{label}</span><strong>{category?.points || 0}</strong><span>{category?.max_points || '—'}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LeaderboardLedger({ entries, leaderboardUrl, currentUserId, skipTop = 0 }) {
  const rows = entries.slice(skipTop, skipTop + 6);
  if (!rows.length) return null;

  return (
    <section className="next-play-leaders" aria-labelledby="leaders-title">
      <header className="next-play-section-head">
        <div><h2 id="leaders-title">Leaderboard</h2><p>{skipTop ? 'The rest of the table.' : 'Top of the pool this season.'}</p></div>
        {leaderboardUrl ? <a href={leaderboardUrl}>Full table <ArrowRight aria-hidden="true" /></a> : null}
      </header>
      <div className="next-play-leaders__table">
        <div className="next-play-leaders__row is-head"><span>Rank</span><span>Player</span><span>Points</span></div>
        {rows.map((entry) => {
          const isCurrent = currentUserId && String(entry.user?.id) === String(currentUserId);
          return (
            <a className={`next-play-leaders__row${isCurrent ? ' is-current' : ''}`} href={leaderboardUrl || '#'} key={`${entry.rank}-${entry.user?.id || entry.user?.username}`}>
              <strong>#{entry.rank ?? '—'}</strong>
              <span>{entry.user?.display_name || entry.user?.username || 'Player'}{isCurrent ? ' (You)' : ''}</span>
              <strong>{entry.user?.total_points ?? entry.points ?? 0}</strong>
            </a>
          );
        })}
      </div>
    </section>
  );
}

export function StandingsPulse({ standings }) {
  if (!standings?.eastern?.length && !standings?.western?.length) return null;
  const conferences = [['East', standings.eastern || []], ['West', standings.western || []]];
  return (
    <section className="next-play-pulse" aria-labelledby="pulse-title">
      <header className="next-play-section-head"><div><h2 id="pulse-title">NBA standings</h2><p>The current top of each conference.</p></div></header>
      <div className="next-play-pulse__grid">
        {conferences.map(([name, teams]) => (
          <div className={`next-play-conference is-${name.toLowerCase()}`} key={name}>
            <header><span>{name}</span><span>W–L</span></header>
            {teams.slice(0, 4).map((team) => (
              <div key={`${name}-${team.team}`}><strong>{team.position}</strong><span>{team.team}</span><b>{team.wins}–{team.losses}</b></div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
