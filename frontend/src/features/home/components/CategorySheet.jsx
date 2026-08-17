import React from 'react';
import { ClipboardList, Medal, Target, Trophy, Users } from 'lucide-react';

/**
 * Both guests and half-finished entrants need the same thing: the concrete
 * list of what an entry actually contains, in the pool's own words.
 */
export function CategorySheet({ superlativeCount }) {
  const categories = [
    [ClipboardList, 'Conference standings', 'Order all 15 teams in the East and all 15 in the West, 1 through 15.'],
    [Trophy, 'Season superlatives', superlativeCount
      ? `${superlativeCount} calls this season: MVP, Rookie of the Year, and the rest of the hardware.`
      : 'MVP, Rookie of the Year, and the rest of the hardware.'],
    [Target, 'Props and over/unders', 'Team win totals, player milestones, and yes/no outcomes.'],
    [Medal, 'NBA Cup', 'Call the in-season tournament. It carries its own mid-season payout.'],
    [Users, 'Playoffs and Finals', 'Who comes out of each conference, and who lifts the trophy.'],
  ];

  return (
    <section className="next-play-categories" aria-labelledby="categories-title">
      <header className="next-play-section-head">
        <div>
          <h2 id="categories-title">What one entry covers</h2>
          <p>Five categories, one score. Every call below is worth points.</p>
        </div>
      </header>
      <div className="next-play-categories__rows">
        {categories.map(([Icon, label, detail]) => (
          <div key={label}>
            <Icon aria-hidden="true" />
            <div>
              <strong>{label}</strong>
              <span>{detail}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default CategorySheet;
