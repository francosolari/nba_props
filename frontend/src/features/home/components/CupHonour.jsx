import React from 'react';
import { Medal } from 'lucide-react';
import TeamLogo from '../../../components/TeamLogo';

/**
 * Once the Cup final is played an admin records the champion team, and from
 * that moment the mid-season winner stays on the homepage for the rest of the
 * season as a standing honour.
 */
export function CupHonour({ cup }) {
  const winners = cup.winner ? [cup.winner] : cup.tied_winners;
  if (!winners.length) return null;

  return (
    <section className="next-play-cup" aria-labelledby="cup-title">
      <div className="next-play-cup__mast">
        <Medal aria-hidden="true" />
        <span id="cup-title">NBA Cup winner</span>
      </div>
      <div className="next-play-cup__body">
        <p className="next-play-cup__names">
          {winners.map((winner) => winner.display_name).join(' & ')}
        </p>
        <p className="next-play-cup__detail">
          {winners.length > 1 ? 'Tied on ' : ''}{winners[0].points} points on the Cup questions.
          {' '}The {cup.champion_team} lifted the trophy.
        </p>
      </div>
      <TeamLogo teamName={cup.champion_team} className="next-play-cup__logo" alt="" />
    </section>
  );
}

export default CupHonour;
