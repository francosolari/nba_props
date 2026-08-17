import React, { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import NBAGames from '../../../components/nba/NBAGames';

const DAY_LABEL = { weekday: 'short', month: 'numeric', day: 'numeric' };

const dayKey = (iso) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-CA');
};

/** "Tonight" for the first slate, then short weekday labels. */
function labelFor(iso, index) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return `Day ${index + 1}`;
  const today = new Date().toLocaleDateString('en-CA');
  if (date.toLocaleDateString('en-CA') === today) return 'Tonight';
  return date.toLocaleDateString(undefined, DAY_LABEL);
}

/**
 * Tonight's slate, and the nights after it.
 *
 * A full NBA night runs to a dozen games, so the rail groups by date and shows
 * one night at a time rather than truncating mid-slate. Calls are held by game
 * id across every night, so switching tabs never discards one — the count of
 * calls made elsewhere stays visible on the tabs that hold them.
 */
export default function FixtureRail({ games, picks, onPick, onReset, projecting }) {
  const days = useMemo(() => {
    const grouped = new Map();
    (games || []).forEach((game) => {
      const key = dayKey(game.tipoff);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(game);
    });
    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, dayGames], index) => ({
        key,
        games: dayGames,
        label: labelFor(dayGames[0]?.tipoff, index),
        called: dayGames.filter((game) => picks?.has(game.game_id ?? game.id)).length,
      }));
  }, [games, picks]);

  const [activeKey, setActiveKey] = useState(null);
  if (!days.length) return null;
  const active = days.find((day) => day.key === activeKey) || days[0];

  return (
    <div className="next-play-fixtures">
      <NBAGames
        games={active.games}
        variant="rail"
        title="Next up"
        caption="Call a winner and see how the standings change."
        pickable
        picks={picks}
        onPick={onPick}
        action={(
          <button type="button" className="next-play-reset" onClick={onReset} disabled={!projecting}>
            <RotateCcw aria-hidden="true" /> Reset
          </button>
        )}
        beforeRows={days.length > 1 ? (
          <div className="next-play-days" role="tablist" aria-label="Game day">
            {days.map((day) => (
              <button
                type="button"
                role="tab"
                key={day.key}
                className={`next-play-days__tab${day.key === active.key ? ' is-active' : ''}`}
                aria-selected={day.key === active.key}
                onClick={() => setActiveKey(day.key)}
              >
                {day.label}
                <span>{day.games.length}</span>
                {day.called ? <i aria-label={`${day.called} called`}>{day.called}</i> : null}
              </button>
            ))}
          </div>
        ) : null}
      />
    </div>
  );
}
