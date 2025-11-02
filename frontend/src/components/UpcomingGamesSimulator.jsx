import React, { useMemo, useState } from 'react';

/*
  UpcomingGamesSimulator
  - Reusable component to show upcoming games (e.g., next 7 days)
  - Lets the user pick winners and emits a simulation payload

  Props:
  - games: Array<{ id, date, homeTeam, awayTeam, startTime }>
  - onSimulate: (payload: { picks: Record<gameId, 'home'|'away'> }) => void
  - onChange?: (picks) => void
  - title?: string

  Expected integration:
  - Backend endpoint fetches weekly schedule via nba_api (server-side), UI passes data here.
  - onSimulate can drive a callback that recalculates standings or point deltas using existing logic.
*/

function UpcomingGamesSimulator({ games = [], onSimulate, onChange, title = 'Upcoming Games (7 days)' }) {
  const [picks, setPicks] = useState({});

  const byDate = useMemo(() => {
    const map = new Map();
    (games || []).forEach(g => {
      const d = (g.date || '').slice(0, 10);
      if (!map.has(d)) map.set(d, []);
      map.get(d).push(g);
    });
    // sort dates ascending
    return Array.from(map.entries()).sort((a,b)=> a[0].localeCompare(b[0]));
  }, [games]);

  const setPick = (gameId, winner) => {
    setPicks(prev => {
      const next = { ...prev, [gameId]: winner };
      onChange && onChange(next);
      return next;
    });
  };

  const applySim = () => {
    onSimulate && onSimulate({ picks });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <button
          className="text-sm px-3 py-1.5 rounded-lg border border-emerald-600 bg-emerald-600 text-white disabled:opacity-50"
          onClick={applySim}
          disabled={!Object.keys(picks).length}
        >Apply What‑If</button>
      </div>

      <div className="p-3">
        {byDate.length === 0 && (
          <div className="text-sm text-slate-500">No upcoming games.</div>
        )}
        {byDate.map(([date, items]) => (
          <div key={date} className="mb-4">
            <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">{date}</div>
            <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 overflow-hidden">
              {items.map(g => (
                <div key={g.id} className="flex items-center justify-between bg-white/70">
                  <div className="px-3 py-2 text-sm text-slate-700">
                    <span className="font-medium">{g.awayTeam}</span>
                    <span className="mx-1 text-slate-400">@</span>
                    <span className="font-medium">{g.homeTeam}</span>
                    {g.startTime && <span className="ml-2 text-xs text-slate-400">{g.startTime}</span>}
                  </div>
                  <div className="px-3 py-2 flex items-center gap-4 text-sm">
                    <label className="inline-flex items-center gap-1">
                      <input type="radio" name={`pick-${g.id}`} checked={picks[g.id]==='away'} onChange={()=>setPick(g.id, 'away')} className="accent-sky-600" />
                      {g.awayTeam}
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <input type="radio" name={`pick-${g.id}`} checked={picks[g.id]==='home'} onChange={()=>setPick(g.id, 'home')} className="accent-emerald-600" />
                      {g.homeTeam}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UpcomingGamesSimulator;

