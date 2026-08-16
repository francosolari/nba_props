import React, { useEffect, useState } from 'react';
import { ArrowRight, Trophy } from 'lucide-react';

/**
 * The finished season's honour board. Three engraved plinths rather than a bar
 * chart: the ranks are the point, and the heights only rank them. The plinths
 * are the page's one authored motion, rising once on arrival.
 */
export function Podium({ players, seasonLabel, leaderboardUrl }) {
  const [raised, setRaised] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setRaised(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (players.length < 3) return null;
  // Read 2 · 1 · 3 across, the way a podium actually stands.
  const order = [players[1], players[0], players[2]];

  return (
    <section className="next-play-podium" aria-labelledby="podium-title">
      <header className="next-play-section-head">
        <div>
          <h2 id="podium-title">{seasonLabel ? `${seasonLabel} final standings` : 'Final standings'}</h2>
          <p>The season is graded and the pool is settled.</p>
        </div>
        {leaderboardUrl ? <a href={leaderboardUrl}>Full table <ArrowRight aria-hidden="true" /></a> : null}
      </header>
      <ol className={`next-play-podium__stand${raised ? ' is-raised' : ''}`}>
        {order.map((player) => (
          <li className={`next-play-podium__place is-rank-${player.rank}`} key={player.id}>
            <div className="next-play-podium__name">
              {player.rank === 1 ? <Trophy aria-hidden="true" /> : null}
              <strong>{player.display_name}</strong>
              <span>{player.points} pts</span>
            </div>
            <div className="next-play-podium__block">
              <b>{player.rank}</b>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default Podium;
