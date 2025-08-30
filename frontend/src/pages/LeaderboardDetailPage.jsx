import React, { useEffect, useMemo, useState } from 'react';
import useLeaderboard from '../hooks/useLeaderboard';
import { ChevronLeft, Grid, Expand, Minimize2, X, Search, AlertTriangle } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

function LeaderboardDetailPage({ seasonSlug = 'current' }) {
  const paramsRoot = document.getElementById('leaderboard-detail-root');
  const initialSection = paramsRoot?.getAttribute('data-initial-section') || 'standings';
  const initialUserId = paramsRoot?.getAttribute('data-initial-user-id') || '';

  const { data: leaderboardData, isLoading, error } = useLeaderboard(seasonSlug);

  const [section, setSection] = useState(initialSection); // 'standings' | 'awards' | 'props'
  const [showAll, setShowAll] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState(() => {
    const top = leaderboardData?.slice(0, 4).map(e => String(e.user.id)) || [];
    return Array.from(new Set([initialUserId, ...top])).filter(Boolean);
  });
  const [sortBy, setSortBy] = useState('standings'); // 'standings' | 'total' | 'name'
  const [query, setQuery] = useState('');
  const [whatIfEnabled, setWhatIfEnabled] = useState(false);
  const [showWhatIfConfirm, setShowWhatIfConfirm] = useState(false);

  const usersMap = useMemo(() => {
    const m = new Map();
    (leaderboardData || []).forEach(e => m.set(String(e.user.id), e));
    return m;
  }, [leaderboardData]);

  const standingsTeams = useMemo(() => {
    // build ordered teams list by conference then actual position
    const catKey = 'Regular Season Standings';
    const allPreds = [];
    (leaderboardData || []).forEach(e => {
      const cat = e.user.categories?.[catKey];
      if (cat?.predictions) allPreds.push(...cat.predictions);
    });
    const byTeam = new Map();
    allPreds.forEach(p => {
      const t = p.team;
      if (!t) return;
      const prev = byTeam.get(t) || { team: t, conference: p.conference, actual_position: p.actual_position };
      // prefer smallest actual position if duplicated
      if (prev.actual_position == null || (p.actual_position && p.actual_position < prev.actual_position)) {
        prev.actual_position = p.actual_position;
      }
      byTeam.set(t, prev);
    });
    const list = Array.from(byTeam.values());
    const orderKey = (r) => [r.conference === 'West' ? 0 : 1, r.actual_position || 999, r.team];
    list.sort((a,b) => {
      const A = orderKey(a), B = orderKey(b);
      return A[0]-B[0] || A[1]-B[1] || (A[2] > B[2] ? 1 : -1);
    });
    return list;
  }, [leaderboardData]);

  // What-if orders per conference
  const [westOrder, setWestOrder] = useState([]);
  const [eastOrder, setEastOrder] = useState([]);

  useEffect(() => {
    const west = standingsTeams.filter(r => (r.conference || '').toLowerCase().startsWith('w'))
      .sort((a,b) => (a.actual_position||999) - (b.actual_position||999))
      .map(r => ({ id: `W-${r.team}`, team: r.team, conference: 'West', actual_position: r.actual_position||null }));
    const east = standingsTeams.filter(r => (r.conference || '').toLowerCase().startsWith('e'))
      .sort((a,b) => (a.actual_position||999) - (b.actual_position||999))
      .map(r => ({ id: `E-${r.team}`, team: r.team, conference: 'East', actual_position: r.actual_position||null }));
    setWestOrder(west);
    setEastOrder(east);
  }, [standingsTeams]);

  const simActualMap = useMemo(() => {
    const map = new Map();
    westOrder.forEach((it, idx) => map.set(it.team, idx + 1));
    eastOrder.forEach((it, idx) => map.set(it.team, idx + 1));
    return map;
  }, [westOrder, eastOrder]);

  const standingPoints = (pred, actual) => {
    if (actual == null || pred == null) return 0;
    if (pred === actual) return 3;
    if (Math.abs(pred - actual) === 1) return 1;
    return 0;
  };

  const withSimTotals = useMemo(() => {
    if (!leaderboardData) return [];
    if (!whatIfEnabled) return leaderboardData;
    return leaderboardData.map(e => {
      const cat = e.user.categories?.['Regular Season Standings'];
      let simStandPts = 0;
      if (cat?.predictions) {
        simStandPts = cat.predictions.reduce((sum, p) => sum + standingPoints(p.predicted_position, simActualMap.get(p.team)), 0);
      }
      const originalStandPts = cat?.points || 0;
      const otherPts = (e.user.total_points || 0) - originalStandPts;
      const newTotal = otherPts + simStandPts;
      return {
        ...e,
        user: {
          ...e.user,
          total_points: newTotal,
          categories: {
            ...e.user.categories,
            'Regular Season Standings': { ...cat, points: simStandPts }
          }
        }
      };
    }).sort((a,b)=> (b.user.total_points||0) - (a.user.total_points||0));
  }, [leaderboardData, whatIfEnabled, simActualMap]);

  const displayedUsers = useMemo(() => {
    const base = showAll ? withSimTotals : selectedUserIds.map(id => withSimTotals.find(e => String(e.user.id) === String(id))).filter(Boolean);
    let arr = base.slice();
    if (sortBy === 'total') arr.sort((a,b)=> (b.user.total_points||0) - (a.user.total_points||0));
    if (sortBy === 'standings') arr.sort((a,b)=> ((b.user.categories?.['Regular Season Standings']?.points||0) - (a.user.categories?.['Regular Season Standings']?.points||0)));
    if (sortBy === 'name') arr.sort((a,b)=> (a.user.display_name||a.user.username).localeCompare(b.user.display_name||b.user.username));
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter(e => (e.user.display_name||e.user.username).toLowerCase().includes(q));
    }
    return arr;
  }, [withSimTotals, selectedUserIds, showAll, sortBy, query]);

  const onDragEnd = (result) => {
    const { destination, source } = result;
    if (!destination) return;
    if (!whatIfEnabled) {
      setShowWhatIfConfirm(true);
      return;
    }
    const reorder = (list, startIndex, endIndex) => {
      const arr = Array.from(list);
      const [removed] = arr.splice(startIndex, 1);
      arr.splice(endIndex, 0, removed);
      return arr;
    };
    if (source.droppableId === destination.droppableId) {
      if (source.droppableId === 'west') setWestOrder(prev => reorder(prev, source.index, destination.index));
      if (source.droppableId === 'east') setEastOrder(prev => reorder(prev, source.index, destination.index));
    }
  };

  const addUser = (id) => {
    if (!id) return;
    setSelectedUserIds(prev => Array.from(new Set([...prev, String(id)])));
  };

  if (isLoading) {
    return <div className="min-h-screen p-6 flex items-center justify-center text-slate-500">Loading…</div>;
  }
  if (error) {
    return <div className="min-h-screen p-6 flex items-center justify-center text-rose-600">{String(error)}</div>;
  }

  const fromSectionKey = (s) => s === 'standings' ? 'Regular Season Standings' : s === 'awards' ? 'Player Awards' : 'Props & Yes/No';
  const sectionTitle = fromSectionKey(section);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-emerald-100 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <a href={`/page/${seasonSlug}/`} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800">
            <ChevronLeft className="w-4 h-4" /> Back to leaderboard
          </a>
          <div className="text-sm text-slate-500">Season {seasonSlug.replace('-', '–')}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['standings','awards','props'].map(s => (
            <button key={s} onClick={() => setSection(s)}
              className={`px-3 py-1.5 rounded-lg border text-sm ${section===s? 'bg-slate-900 text-white border-slate-900':'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
              {fromSectionKey(s)}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search players" className="pl-7 pr-2 py-1.5 rounded-lg border border-slate-300 bg-white text-sm" />
            </div>
            <select className="text-sm border border-slate-300 rounded-md px-2 py-1 bg-white" value={sortBy} onChange={(e)=>setSortBy(e.target.value)}>
              <option value="standings">Sort: Standings pts</option>
              <option value="total">Sort: Total pts</option>
              <option value="name">Sort: Name</option>
            </select>
            <label className={`inline-flex items-center gap-2 text-sm rounded-lg px-2 py-1 border ${section==='standings' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-400'}`} title={section==='standings' ? 'Simulate by dragging actual standings' : 'What‑If available in Regular Season Standings tab'}>
              <input type="checkbox" className="accent-emerald-600" checked={whatIfEnabled && section==='standings'} onChange={(e)=> setWhatIfEnabled(e.target.checked)} disabled={section!=='standings'} /> What‑If
            </label>
          </div>
        </div>

        {section === 'standings' && (
          <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-xl">
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-700">
                <Grid className="w-4 h-4" />
                <div className="font-semibold">Regular Season Standings — Detailed Grid</div>
              </div>
              <div className="flex items-center gap-2">
                <select className="text-sm border border-slate-300 rounded-md px-2 py-1 bg-white" onChange={(e)=>addUser(e.target.value)} value="">
                  <option value="">Add player…</option>
                  {(withSimTotals||[]).map(e => (
                    <option key={e.user.id} value={e.user.id}>{e.user.display_name || e.user.username}</option>
                  ))}
                </select>
                <button onClick={()=>setShowAll(v=>!v)} className="text-sm inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50">
                  {showAll ? (<><Minimize2 className="w-4 h-4" /> Collapse All Players</>) : (<><Expand className="w-4 h-4" /> Compare All Players</>)}
                </button>
              </div>
            </div>

            {/* Grid */}
            <div className="overflow-auto">
               <table className="min-w-full border-t border-slate-200">
                 <thead className="bg-slate-50/80">
                   <tr>
                     <th className="sticky left-0 z-10 bg-slate-50/80 backdrop-blur px-3 py-2 text-left text-xs font-semibold text-slate-500 border-b border-slate-200">Team</th>
                     <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 border-b border-slate-200">Actual</th>
                    {displayedUsers.map((e) => {
                      const standPts = e.user.categories?.['Regular Season Standings']?.points || 0;
                      const totalPts = e.user.total_points || 0;
                      return (
                        <th key={`h-${e.user.id}`} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-700">{e.user.display_name || e.user.username}</span>
                            {!showAll && (
                              <button onClick={()=>setSelectedUserIds(prev => prev.filter(id => String(id)!==String(e.user.id)))} title="Remove from comparison" className="text-slate-400 hover:text-slate-700">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Stand: <span className="font-semibold text-slate-700">{standPts}</span></span>
                            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span> Total: <span className="font-semibold text-slate-700">{totalPts}</span></span>
                          </div>
                        </th>
                      );
                    })}
                   </tr>
                 </thead>
                 <tbody>
                {/* West header */}
                <tr><td className="sticky left-0 z-10 bg-sky-50/60 backdrop-blur px-3 py-2 text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200" colSpan={2+displayedUsers.length}>West</td></tr>
                {standingsTeams.filter(r=> (r.conference||'').toLowerCase().startsWith('w')).map((row) => (
                  <tr key={row.team} className="bg-sky-50/30">
                    <td className="sticky left-0 z-10 bg-white/90 backdrop-blur px-3 py-2 text-sm font-medium text-slate-800 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex w-1.5 h-1.5 rounded-full" style={{backgroundColor: row.conference==='West'?'#06b6d4':'#10b981'}}/>
                        {row.team}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-600 border-b border-slate-100">{whatIfEnabled ? (simActualMap.get(row.team) ?? row.actual_position ?? '—') : (row.actual_position ?? '—')}</td>
                    {displayedUsers.map((e) => {
                      const preds = e.user.categories?.['Regular Season Standings']?.predictions || [];
                      const p = preds.find(x => x.team === row.team);
                      const pts = e.user.categories?.['Regular Season Standings']?.points != null && whatIfEnabled
                        ? standingPoints(p?.predicted_position, simActualMap.get(row.team))
                        : (p?.points || 0);
                      const predPos = p?.predicted_position ?? '—';
                      const color = pts >= 3 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : pts >= 1 ? 'bg-sky-100 text-sky-700 border-sky-200' : 'bg-slate-100 text-slate-600 border-slate-200';
                      return (
                        <td key={`c-${e.user.id}-${row.team}`} className="px-3 py-2 border-b border-slate-100">
                          <span className={`inline-flex items-center justify-center min-w-[44px] px-2 py-1 rounded-md border text-xs ${color}`} title={`Pred: ${predPos} • Points: ${pts}`}>
                            {predPos}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* East header */}
                <tr><td className="sticky left-0 z-10 bg-emerald-50/60 backdrop-blur px-3 py-2 text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200" colSpan={2+displayedUsers.length}>East</td></tr>
                {standingsTeams.filter(r=> (r.conference||'').toLowerCase().startsWith('e')).map((row) => (
                  <tr key={row.team} className="bg-emerald-50/30">
                    <td className="sticky left-0 z-10 bg-white/90 backdrop-blur pl-6 pr-3 py-2 text-sm font-medium text-slate-800 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex w-1.5 h-1.5 rounded-full" style={{backgroundColor: row.conference==='West'?'#06b6d4':'#10b981'}}/>
                        {row.team}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-600 border-b border-slate-100">{whatIfEnabled ? (simActualMap.get(row.team) ?? row.actual_position ?? '—') : (row.actual_position ?? '—')}</td>
                    {displayedUsers.map((e) => {
                      const preds = e.user.categories?.['Regular Season Standings']?.predictions || [];
                      const p = preds.find(x => x.team === row.team);
                      const pts = e.user.categories?.['Regular Season Standings']?.points != null && whatIfEnabled
                        ? standingPoints(p?.predicted_position, simActualMap.get(row.team))
                        : (p?.points || 0);
                      const predPos = p?.predicted_position ?? '—';
                      const color = pts >= 3 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : pts >= 1 ? 'bg-sky-100 text-sky-700 border-sky-200' : 'bg-slate-100 text-slate-600 border-slate-200';
                      return (
                        <td key={`c-${e.user.id}-${row.team}`} className="px-3 py-2 border-b border-slate-100">
                          <span className={`inline-flex items-center justify-center min-w-[44px] px-2 py-1 rounded-md border text-xs ${color}`} title={`Pred: ${predPos} • Points: ${pts}`}>
                            {predPos}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                 </tbody>
              </table>
            </div>

            {/* What-if draggable lists */}
            <div className="p-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-slate-600">Adjust actual standings to simulate outcomes</div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" className="accent-emerald-600" checked={whatIfEnabled} onChange={(e)=>setWhatIfEnabled(e.target.checked)} /> Enable What‑If
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['west','east'].map((conf) => (
                  <div key={conf} className="rounded-xl border border-slate-200 bg-white/70">
                    <div className="px-3 py-2 text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">{conf === 'west' ? 'West' : 'East'}</div>
                    <DragDropContext onDragEnd={onDragEnd} onDragStart={()=>{ if(!whatIfEnabled) setShowWhatIfConfirm(true); }}>
                      <Droppable droppableId={conf} isDropDisabled={!whatIfEnabled}>
                        {(provided) => (
                          <ul ref={provided.innerRef} {...provided.droppableProps} className="divide-y divide-slate-200">
                            {(conf==='west'? westOrder : eastOrder).map((item, index) => (
                              <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={!whatIfEnabled}>
                                {(prov, snapshot) => (
                                  <li ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} className={`px-3 py-2 text-sm flex items-center justify-between ${snapshot.isDragging? 'bg-sky-50' : 'bg-white/40'}`}>
                                    <span className="text-slate-700">{index+1}. {item.team}</span>
                                    <span className="text-xs text-slate-400">{item.conference}</span>
                                  </li>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </ul>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </div>
                ))}
              </div>
            </div>

            {showWhatIfConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
                  <div className="flex items-center gap-2 mb-2 text-slate-800 font-semibold"><AlertTriangle className="w-4 h-4 text-amber-500"/> Enable What‑If Simulation?</div>
                  <p className="text-sm text-slate-600 mb-4">This lets you drag to reorder actual standings locally and simulates category and total points. It doesn’t change real data.</p>
                  <div className="flex items-center justify-end gap-2">
                    <button className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700" onClick={()=>setShowWhatIfConfirm(false)}>Cancel</button>
                    <button className="px-3 py-1.5 rounded-lg border border-emerald-600 bg-emerald-600 text-white" onClick={()=>{ setWhatIfEnabled(true); setShowWhatIfConfirm(false); }}>Enable What‑If</button>
                  </div>
                </div>
              </div>
            )}

            {/* Per-team rollups when comparing all players */}
            {showAll && (
              <div className="p-4 border-t border-slate-200">
                <div className="text-sm font-semibold text-slate-700 mb-2">Quick rollups</div>
                <div className="grid md:grid-cols-2 gap-4">
                  {standingsTeams.slice(0,8).map(row => {
                    const whoScored = (withSimTotals||[]).map(e=>{
                      const preds = e.user.categories?.['Regular Season Standings']?.predictions || [];
                      const p = preds.find(x => x.team === row.team);
                      const pts = whatIfEnabled ? standingPoints(p?.predicted_position, simActualMap.get(row.team)) : (p?.points || 0);
                      return pts>0 ? {name: e.user.display_name || e.user.username, pts} : null;
                    }).filter(Boolean).sort((a,b)=>b.pts - a.pts).slice(0,6);
                    return (
                      <div key={`roll-${row.team}`} className="rounded-xl border border-slate-200 p-3 bg-white/70">
                        <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">{row.conference} • Team</div>
                        <div className="text-sm font-semibold text-slate-800 mb-2">{row.team}</div>
                        <div className="flex flex-wrap gap-2">
                          {whoScored.length===0 && <span className="text-xs text-slate-400">No points yet</span>}
                          {whoScored.map((u,i)=>(
                            <span key={`${row.team}-${i}`} className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{u.name} +{u.pts}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {section !== 'standings' && (
          <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-xl p-6 text-slate-500 text-sm">
            Detailed comparison for this category is coming soon. Use the tabs to switch back to Regular Season Standings.
          </div>
        )}
      </div>
      {/* Floating Top 3 */}
      <div className="fixed bottom-4 right-4 z-40">
        <div className="rounded-2xl border border-slate-200 bg-white/90 backdrop-blur shadow-xl p-3 w-64">
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">{whatIfEnabled ? 'Simulated' : 'Current'} Top 3</div>
          <ol className="space-y-1">
            {(withSimTotals||[]).slice(0,3).map((e,idx)=> (
              <li key={`f-${e.user.id}`} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{idx+1}. {e.user.display_name || e.user.username}</span>
                <span className="font-semibold text-emerald-700">{e.user.total_points}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

export default LeaderboardDetailPage;
