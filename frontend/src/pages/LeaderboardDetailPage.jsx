import React, { useEffect, useMemo, useRef, useState } from 'react';
import useLeaderboard from '../hooks/useLeaderboard';
import { ChevronLeft, Grid, Expand, Minimize2, X, Search, AlertTriangle, Pin, PinOff, Trophy, Award, Target, CheckCircle2, XCircle } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
 

function LeaderboardDetailPage({ seasonSlug = 'current' }) {
  const paramsRoot = document.getElementById('leaderboard-detail-root');
  const initialSection = paramsRoot?.getAttribute('data-initial-section') || 'standings';
  const initialUserId = paramsRoot?.getAttribute('data-initial-user-id') || '';
  const loggedInUsername = paramsRoot?.getAttribute('data-logged-in-username') || null;

  const { data: leaderboardData, isLoading, error } = useLeaderboard(seasonSlug);

  const [section, setSection] = useState(initialSection); // 'standings' | 'awards' | 'props'
  const [mode, setMode] = useState('showcase'); // 'showcase' | 'compare'
  const [showAll, setShowAll] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState(() => {
    const top = leaderboardData?.slice(0, 4).map(e => String(e.user.id)) || [];
    return Array.from(new Set([initialUserId, ...top])).filter(Boolean);
  });
  const [sortBy, setSortBy] = useState('standings'); // 'standings' | 'total' | 'name'
  const [query, setQuery] = useState('');
  const [whatIfEnabled, setWhatIfEnabled] = useState(false);
  const [showWhatIfConfirm, setShowWhatIfConfirm] = useState(false);
  const [pinnedUserIds, setPinnedUserIds] = useState([]);
  const [collapsedWest, setCollapsedWest] = useState(false);
  const [collapsedEast, setCollapsedEast] = useState(false);
  

  const usersMap = useMemo(() => {
    const m = new Map();
    (leaderboardData || []).forEach(e => m.set(String(e.user.id), e));
    return m;
  }, [leaderboardData]);

  // Primary user for Showcase mode
  const primaryUserId = useMemo(() => {
    if (selectedUserIds && selectedUserIds.length > 0) return String(selectedUserIds[0]);
    if (leaderboardData && leaderboardData.length > 0) return String(leaderboardData[0].user.id);
    return '';
  }, [selectedUserIds, leaderboardData]);
  const primaryUser = primaryUserId ? usersMap.get(String(primaryUserId)) : undefined;

  // Resolve logged-in user to an entry/id if present
  const loggedInEntry = useMemo(() => {
    if (!loggedInUsername) return undefined;
    return (leaderboardData || []).find(e => String(e.user.username) === String(loggedInUsername));
  }, [leaderboardData, loggedInUsername]);
  const loggedInUserId = loggedInEntry?.user?.id ? String(loggedInEntry.user.id) : null;

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
  // Initialize orders from actual only when What‑If is off and orders are empty
  if (whatIfEnabled) return;
  if (westOrder.length > 0 || eastOrder.length > 0) return;
  if (!standingsTeams || standingsTeams.length === 0) return;
  const west = standingsTeams.filter(r => (r.conference || '').toLowerCase().startsWith('w'))
    .sort((a,b) => (a.actual_position||999) - (b.actual_position||999))
    .map(r => ({ id: `W-${r.team}`, team: r.team, conference: 'West', actual_position: r.actual_position||null }));
  const east = standingsTeams.filter(r => (r.conference || '').toLowerCase().startsWith('e'))
    .sort((a,b) => (a.actual_position||999) - (b.actual_position||999))
    .map(r => ({ id: `E-${r.team}`, team: r.team, conference: 'East', actual_position: r.actual_position||null }));
  setWestOrder(west);
  setEastOrder(east);
}, [standingsTeams, whatIfEnabled, westOrder, eastOrder]);

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
        __orig_total_points: e.user.total_points,
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

  // ────────────────────────── Mobile detection ──────────────────────────
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = () => setIsMobile(!!mq.matches);
    onChange();
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else if (mq.removeListener) mq.removeListener(onChange);
    };
  }, []);

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
    // Pinned first
    const pinSet = new Set(pinnedUserIds.map(String));
    arr.sort((a,b)=> (pinSet.has(String(b.user.id))?1:0) - (pinSet.has(String(a.user.id))?1:0));
    return arr;
  }, [withSimTotals, selectedUserIds, showAll, sortBy, query, pinnedUserIds]);

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

  // URL persistence: read once
  const didReadUrlRef = useRef(false);
  useEffect(() => {
    if (didReadUrlRef.current) return;
    const sp = new URLSearchParams(window.location.search);
    const sec = sp.get('section'); if (sec && ['standings','awards','props'].includes(sec)) setSection(sec);
    const usersParam = sp.get('users'); if (usersParam) setSelectedUserIds(usersParam.split(',').filter(Boolean));
    const singleUser = sp.get('user'); if (singleUser && !usersParam) setSelectedUserIds([String(singleUser)]);
    const m = sp.get('mode'); if (m && ['showcase','compare'].includes(m)) setMode(m);
    const srt = sp.get('sortBy'); if (srt) setSortBy(srt);
    const q = sp.get('q'); if (q) setQuery(q);
    const wi = sp.get('wi'); if (wi==='1') setWhatIfEnabled(true);
    const all = sp.get('all'); if (all==='1') setShowAll(true);
    didReadUrlRef.current = true;
  }, []);

  // URL persistence: write on change (no loop risk)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    sp.set('section', section);
    sp.set('mode', mode);
    if (selectedUserIds.length) sp.set('users', selectedUserIds.join(',')); else sp.delete('users');
    // keep backward compat for single user deep links
    if (selectedUserIds.length === 1) { sp.set('user', String(selectedUserIds[0])); } else { sp.delete('user'); }
    sp.set('sortBy', sortBy);
    if (query) sp.set('q', query); else sp.delete('q');
    sp.set('wi', whatIfEnabled ? '1' : '0');
    sp.set('all', showAll ? '1' : '0');
    const url = `${window.location.pathname}?${sp.toString()}`;
    window.history.replaceState(null, '', url);
  }, [section, mode, selectedUserIds, sortBy, query, whatIfEnabled, showAll]);

  // ────────────────────────── Mobile UI ──────────────────────────
  const fromSectionKey = (s) => s === 'standings' ? 'Regular Season Standings' : s === 'awards' ? 'Player Awards' : 'Props & Yes/No';

  if (!isLoading && !error && isMobile) {
    const mobileDisplayedUsers = (() => {
      const base = showAll ? withSimTotals : selectedUserIds.map(id => withSimTotals.find(e => String(e.user.id) === String(id))).filter(Boolean);
      let arr = Array.isArray(base) ? base.slice() : [];
      if (query.trim()) {
        const q = query.toLowerCase();
        arr = arr.filter(e => (e.user.display_name||e.user.username).toLowerCase().includes(q));
      }
      return arr;
    })();

    const listFor = (conf) => (conf==='West' ? (westOrder.length? westOrder.map(it => ({ team: it.team, conference: 'West' })) : standingsTeams.filter(r=> (r.conference||'').toLowerCase().startsWith('w'))) : (eastOrder.length? eastOrder.map(it => ({ team: it.team, conference: 'East' })) : standingsTeams.filter(r=> (r.conference||'').toLowerCase().startsWith('e'))));

    const moveItem = (list, fromIndex, toIndex) => {
      const arr = Array.from(list);
      if (toIndex < 0 || toIndex >= arr.length) return arr;
      const [m] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, m);
      return arr;
    };

    return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-3">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <a href={`/page/${seasonSlug}/`} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
              <ChevronLeft className="w-4 h-4" /> Back
            </a>
            <div className="text-xs text-slate-500 dark:text-slate-400">Season {seasonSlug.replace('-', '–')}</div>
          </div>

          {/* Section tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {['standings','awards','props'].map(s => (
              <button key={s} onClick={() => setSection(s)} className={`whitespace-nowrap px-3 py-1.5 rounded-full border text-sm ${section===s? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200' : 'bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>{fromSectionKey(s)}</button>
            ))}
          </div>

          {/* User chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {(mobileDisplayedUsers || []).map(e => (
              <span key={`chip-${e.user.id}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                {e.user.display_name || e.user.username}
                {!showAll && (<button onClick={()=> setSelectedUserIds(prev => prev.filter(id => String(id)!==String(e.user.id)))} className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"><X className="w-3.5 h-3.5"/></button>)}
              </span>
            ))}
            <select className="text-sm border border-slate-300 rounded-md px-2 py-1 bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300" onChange={(ev)=> addUser(ev.target.value)} value="">
              <option value="">Add player…</option>
              {Array.isArray(withSimTotals) ? withSimTotals.map(e => (
                <option key={e.user.id} value={e.user.id}>{e.user.display_name || e.user.username}</option>
              )) : null}
            </select>
          </div>

          {section === 'standings' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Regular Season Standings</div>
                <label className={`inline-flex items-center gap-2 text-sm rounded-lg px-2 py-1 border ${whatIfEnabled ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200' : 'bg-white text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>
                  <input type="checkbox" className="accent-slate-700" checked={whatIfEnabled} onChange={(e)=> setWhatIfEnabled(e.target.checked)} /> What‑If
                </label>
              </div>
              {['West','East'].map(conf => (
                <div key={`m-${conf}`} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/70">
                  <button onClick={()=> (conf==='West'? setCollapsedWest(v=>!v) : setCollapsedEast(v=>!v))} className="w-full text-left px-3 py-2 text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                    <span className={`transition-transform ${ (conf==='West'? collapsedWest : collapsedEast) ? '-rotate-90':'rotate-0'}`}>▾</span>{conf}
                  </button>
                  <div style={{ display: (conf==='West'? collapsedWest : collapsedEast) ? 'none' : undefined }} className="divide-y divide-slate-200 dark:divide-slate-700">
                    {(listFor(conf) || []).map((row, idx) => {
                      const actualPos = standingsTeams.find(r=> r.team===row.team)?.actual_position || '—';
                      const simPos = simActualMap.get(row.team) || actualPos;
                      return (
                        <div key={`mt-${conf}-${row.team}`} className={`p-3 ${idx%2===0 ? 'bg-white/70 dark:bg-slate-800/50' : 'bg-white/40 dark:bg-slate-800/20'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                              <span className="w-6 text-slate-500 dark:text-slate-400">{whatIfEnabled ? simPos : actualPos}</span>
                              <span>{row.team}</span>
                            </div>
                            {whatIfEnabled && (
                              <div className="flex items-center gap-1">
                                <button className="px-2 py-1 rounded border border-slate-300 bg-white dark:bg-slate-700 dark:border-slate-600" onClick={() => {
                                  if (conf==='West') setWestOrder(prev => moveItem(prev.length? prev : standingsTeams.filter(r=> (r.conference||'').toLowerCase().startsWith('w')).map(r=>({id:`W-${r.team}`,team:r.team,conference:'West'})), idx, idx-1));
                                  else setEastOrder(prev => moveItem(prev.length? prev : standingsTeams.filter(r=> (r.conference||'').toLowerCase().startsWith('e')).map(r=>({id:`E-${r.team}`,team:r.team,conference:'East'})), idx, idx-1));
                                }}>↑</button>
                                <button className="px-2 py-1 rounded border border-slate-300 bg-white dark:bg-slate-700 dark:border-slate-600" onClick={() => {
                                  if (conf==='West') setWestOrder(prev => moveItem(prev.length? prev : standingsTeams.filter(r=> (r.conference||'').toLowerCase().startsWith('w')).map(r=>({id:`W-${r.team}`,team:r.team,conference:'West'})), idx, idx+1));
                                  else setEastOrder(prev => moveItem(prev.length? prev : standingsTeams.filter(r=> (r.conference||'').toLowerCase().startsWith('e')).map(r=>({id:`E-${r.team}`,team:r.team,conference:'East'})), idx, idx+1));
                                }}>↓</button>
                              </div>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {mobileDisplayedUsers.map(e => {
                              const preds = e.user.categories?.['Regular Season Standings']?.predictions || [];
                              const p = preds.find(x => x.team === row.team);
                              const pts = whatIfEnabled ? standingPoints(p?.predicted_position, simActualMap.get(row.team)) : (p?.points || 0);
                              const predPos = p?.predicted_position ?? '—';
                              const color = pts >= 3 ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30' : pts >= 1 ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
                              return (
                                <span key={`mu-${row.team}-${e.user.id}`} className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs ${color}`}>
                                  {(e.user.display_name || e.user.username).slice(0,8)}: {predPos}
                                  {pts>0 && <span className={`${pts>=3? 'text-emerald-600 dark:text-emerald-400':'text-amber-600 dark:text-amber-400'} font-semibold`}>+{pts}</span>}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {section !== 'standings' && (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{fromSectionKey(section)}</div>
              {(() => {
                const catKey = fromSectionKey(section);
                const qMap = new Map();
                (mobileDisplayedUsers||[]).forEach(e => {
                  const preds = e.user.categories?.[catKey]?.predictions || [];
                  preds.forEach(p => { if (p.question_id) qMap.set(p.question_id, p.question); });
                });
                const qArr = Array.from(qMap.entries()).sort((a,b)=> a[1].localeCompare(b[1]));
                return qArr.map(([id, text], idx) => (
                  <div key={`mq-${id}`} className={`rounded-xl border border-slate-200 dark:border-slate-700 p-3 ${idx%2===0? 'bg-white/70 dark:bg-slate-800/50':'bg-white/40 dark:bg-slate-800/20'}`}>
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">{text}</div>
                    <div className="flex flex-wrap gap-2">
                      {mobileDisplayedUsers.map(e => {
                        const preds = e.user.categories?.[catKey]?.predictions || [];
                        const p = preds.find(x => String(x.question_id) === String(id));
                        const pts = p?.points || 0;
                        const ans = (p?.answer || '').toString() || '—';
                        const color = pts > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
                        return (
                          <span key={`mq-${id}-${e.user.id}`} className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs ${color}`}>
                            {(e.user.display_name || e.user.username).slice(0,8)}: {ans}
                            {pts>0 && <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+{pts}</span>}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center text-slate-500 dark:text-slate-400">Loading…</div>;
  }
  if (error) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center text-rose-600 dark:text-rose-400">{String(error)}</div>;
  }

  const sectionTitle = fromSectionKey(section);
  const teamSlug = (name='') => name.toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-');
  // Keep a fixed width to avoid column misalignment when toggling user count
  const teamColWidth = 160; // px

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <a href={`/page/${seasonSlug}/`} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
            <ChevronLeft className="w-4 h-4" /> Back to leaderboard
          </a>
          <div className="text-sm text-slate-500 dark:text-slate-400">Season {seasonSlug.replace('-', '–')}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['standings','awards','props'].map(s => {
            const Icon = s==='standings'? Trophy : (s==='awards'? Award : Target);
            return (
              <button key={s} onClick={() => setSection(s)}
                className={`px-3 py-1.5 rounded-full border text-sm inline-flex items-center gap-2 ${section===s? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200 shadow-sm':'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'}`}>
                <Icon className="w-4 h-4" /> {fromSectionKey(s)}
              </button>
            );
          })}
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
          {['showcase','compare'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-lg border text-sm ${mode===m? 'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500 dark:border-emerald-500':'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'}`}>
              {m === 'showcase' ? 'Showcase' : 'Compare'}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
              <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search players" className="pl-7 pr-2 py-1.5 rounded-lg border border-slate-300 bg-white text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:placeholder-slate-500" />
            </div>
            <select className="text-sm border border-slate-300 rounded-md px-2 py-1 bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300" value={sortBy} onChange={(e)=>setSortBy(e.target.value)}>
              <option value="standings">Sort: Standings pts</option>
              <option value="total">Sort: Total pts</option>
              <option value="name">Sort: Name</option>
            </select>
            <label className={`inline-flex items-center gap-2 text-sm rounded-lg px-2 py-1 border ${section==='standings' ? (whatIfEnabled ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200' : 'bg-white text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700') : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800/50 dark:text-slate-500 dark:border-slate-700'}`} title={section==='standings' ? 'Simulate by dragging rows in the grid' : 'What‑If available in Regular Season Standings tab'}>
              <input type="checkbox" className="accent-slate-700" checked={whatIfEnabled && section==='standings'} onChange={(e)=> setWhatIfEnabled(e.target.checked)} disabled={section!=='standings'} /> What‑If
            </label>
            {section==='standings' && whatIfEnabled && (
              <button className="text-sm px-2 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-300" onClick={()=>{ setWhatIfEnabled(false); setWestOrder([]); setEastOrder([]); }} title="Reset to actual">
                Reset
              </button>
            )}
          </div>
        </div>
        {/* Showcase mode */}
        {mode === 'showcase' && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/70 shadow-xl overflow-hidden">
            {/* Hero */}
            <div className="px-5 py-6 bg-gradient-to-r from-emerald-50 to-sky-50 dark:from-emerald-900/20 dark:to-sky-900/20 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold">
                  {(primaryUser?.user?.display_name || primaryUser?.user?.username || '?').slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">{primaryUser?.user?.display_name || primaryUser?.user?.username || 'Select a player'}</div>
                  {primaryUser && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">Rank #{primaryUser.rank} • {primaryUser.user.total_points} pts</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select className="text-sm border border-slate-300 rounded-md px-2 py-1 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300" onChange={(e)=>setSelectedUserIds([String(e.target.value)])} value={primaryUserId || ''}>
                  <option value="">Select player…</option>
                  {(leaderboardData||[]).map(e => (
                    <option key={e.user.id} value={e.user.id}>{e.user.display_name || e.user.username}</option>
                  ))}
                </select>
                {loggedInUserId && (
                  <button
                    onClick={()=>{ setSelectedUserIds([loggedInUserId]); setMode('showcase'); }}
                    className="text-sm inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 dark:hover:bg-emerald-900"
                    disabled={primaryUserId === loggedInUserId}
                    title="Focus on me"
                  >
                    Me
                  </button>
                )}
                <button onClick={()=>setMode('compare')} className="text-sm inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-300">Enter Compare Mode</button>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
              {!primaryUser && (
                <div className="lg:col-span-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 p-6 text-center">
                  <div className="text-slate-700 dark:text-slate-200 font-semibold mb-1">No player selected</div>
                  <div className="text-slate-500 dark:text-slate-400 text-sm">Use the selector above to pick a player to showcase.</div>
                </div>
              )}
              {/* Category cards */}
              {['Regular Season Standings','Player Awards','Props & Yes/No'].map((catKey) => {
                const cat = primaryUser?.user?.categories?.[catKey] || { points: 0, max_points: 0, predictions: [] };
                const pts = cat.points || 0; const max = cat.max_points || 0; const pct = max>0 ? Math.round((pts/max)*100) : 0;
                const preds = Array.isArray(cat.predictions) ? cat.predictions : [];
                const rights = preds.filter(p => p.correct === true).slice(0,3);
                const wrongs = preds.filter(p => p.correct === false).slice(0,3);
                const Icon = catKey === 'Regular Season Standings' ? Trophy : (catKey === 'Player Awards' ? Award : Target);
                return (
                  <div key={catKey} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">
                          <Icon className="w-4 h-4" />
                        </span>
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{catKey}</div>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{pts}/{max} • {pct}%</div>
                    </div>
                    <div className="w-full h-2 rounded bg-slate-200 dark:bg-slate-700 overflow-hidden mb-3">
                      <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1 inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Notable Wins</div>
                        <ul className="space-y-1">
                          {rights.length===0 && <li className="text-xs text-slate-400 dark:text-slate-500">No wins recorded yet</li>}
                          {rights.map((p,i)=> (
                            <li key={`r-${i}`} className="text-xs text-emerald-800 bg-emerald-50/80 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/50 dark:border-emerald-800 rounded px-2 py-1 truncate" title={`+${p.points || 0}`}>
                              {(p.question || p.team || '').toString()}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1 inline-flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-rose-500" /> Tough Misses</div>
                        <ul className="space-y-1">
                          {wrongs.length===0 && <li className="text-xs text-slate-400 dark:text-slate-500">No misses yet</li>}
                          {wrongs.map((p,i)=> (
                            <li key={`w-${i}`} className="text-xs text-rose-800 bg-rose-50/80 border border-rose-200 dark:text-rose-300 dark:bg-rose-900/50 dark:border-rose-800 rounded px-2 py-1 truncate" title={`+${p.points || 0}`}>
                              {(p.question || p.team || '').toString()}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Highlights & Misses lists */}
              <div className="lg:col-span-3 grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/50 p-4">
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Recent Highlights</div>
                  <ul className="space-y-2">
                    {(() => {
                      const all = ['Regular Season Standings','Player Awards','Props & Yes/No']
                        .flatMap(k => primaryUser?.user?.categories?.[k]?.predictions || [])
                        .filter(Boolean)
                        .filter(p => (p.points||0) > 0)
                        .slice(0,8);
                      if (all.length === 0) return [<li key="empty" className="text-sm text-slate-400 dark:text-slate-500">No highlights yet</li>];
                      return all.map((p, i) => (
                        <li key={`hi-${i}`} className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate text-slate-700 dark:text-slate-300">{(p.question || p.team || '').toString()}</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">+{p.points || 0}</span>
                        </li>
                      ));
                    })()}
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/50 p-4">
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Missed Opportunities</div>
                  <ul className="space-y-2">
                    {(() => {
                      const all = ['Regular Season Standings','Player Awards','Props & Yes/No']
                        .flatMap(k => primaryUser?.user?.categories?.[k]?.predictions || [])
                        .filter(Boolean)
                        .filter(p => p.correct === false || (p.points||0) === 0)
                        .slice(0,8);
                      if (all.length === 0) return [<li key="empty" className="text-sm text-slate-400 dark:text-slate-500">Nothing here — nice!</li>];
                      return all.map((p, i) => (
                        <li key={`mi-${i}`} className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate text-slate-700 dark:text-slate-300">{(p.question || p.team || '').toString()}</span>
                          <span className="text-slate-500 dark:text-slate-400">{p.points ? `+${p.points}` : '+0'}</span>
                        </li>
                      ));
                    })()}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Compare mode */}
        {mode === 'compare' && section === 'standings' && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 shadow-xl">
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <Grid className="w-4 h-4" />
                <div className="font-semibold">Regular Season Standings — Detailed Grid</div>
              </div>
              <div className="flex items-center gap-2">
                <select className="text-sm border border-slate-300 rounded-md px-2 py-1 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300" onChange={(e)=>addUser(e.target.value)} value="">
                  <option value="">Add player…</option>
                  {(withSimTotals||[]).map(e => (
                    <option key={e.user.id} value={e.user.id}>{e.user.display_name || e.user.username}</option>
                  ))}
                </select>
                {loggedInUserId && (
                  <button
                    onClick={()=> {
                      if (!selectedUserIds.map(String).includes(loggedInUserId)) addUser(loggedInUserId);
                      setPinnedUserIds(prev => prev.includes(loggedInUserId) ? prev.filter(id => String(id)!==String(loggedInUserId)) : [...prev, loggedInUserId]);
                    }}
                    className={`text-sm inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border ${pinnedUserIds.includes(loggedInUserId)?'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300':'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-300'}`}
                    title={pinnedUserIds.includes(loggedInUserId) ? 'Unpin my column' : (selectedUserIds.map(String).includes(loggedInUserId) ? 'Pin my column' : 'Add and pin my column')}
                  >
                    {pinnedUserIds.includes(loggedInUserId) ? 'Unpin Me' : 'Pin Me'}
                  </button>
                )}
                <button onClick={()=>setShowAll(v=>!v)} className="text-sm inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-300">
                  {showAll ? (<><Minimize2 className="w-4 h-4" /> Collapse All Players</>) : (<><Expand className="w-4 h-4" /> Compare All Players</>)}
                </button>
              </div>
            </div>

            {/* Grid */}
            <div className="overflow-auto">
               <table className="min-w-full border-t border-slate-200 dark:border-slate-700" style={{ tableLayout: 'fixed' }}>
                 <colgroup>
                   <col style={{ width: teamColWidth }} />
                   <col style={{ width: 72 }} />
                   {displayedUsers.map((_, idx) => (
                     <col key={`u-${idx}`} style={{ width: 108 }} />
                   ))}
                 </colgroup>
                 <thead className="bg-slate-50/80 dark:bg-slate-800/80 sticky top-0 z-20">
                   <tr>
                     <th className="sticky left-0 z-10 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur px-3 py-2 text-left text-sm font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700" style={{ minWidth: teamColWidth, width: teamColWidth }}>Team</th>
                     <th className="text-left text-sm font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80" style={{ position:'sticky', left: teamColWidth }}>Actual</th>
                    {displayedUsers.map((e) => {
                      const standPts = e.user.categories?.['Regular Season Standings']?.points || 0;
                      const totalPts = e.user.total_points || 0;
                      return (
                        <th key={`h-${e.user.id}`} className="px-3 py-2 text-left text-sm font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 align-top" title={`Stand: ${standPts} • Total: ${totalPts}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-700 dark:text-slate-200">{e.user.display_name || e.user.username}</span>
                            <button onClick={()=> setPinnedUserIds(prev => prev.includes(String(e.user.id)) ? prev.filter(id => String(id)!==String(e.user.id)) : [...prev, String(e.user.id)])} title={pinnedUserIds.includes(String(e.user.id))? 'Unpin column':'Pin column'} className={`text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 ${pinnedUserIds.includes(String(e.user.id))?'text-emerald-600 dark:text-emerald-400':''}`}>
                              {pinnedUserIds.includes(String(e.user.id)) ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
                            </button>
                            {!showAll && (
                              <button onClick={()=>setSelectedUserIds(prev => prev.filter(id => String(id)!==String(e.user.id)))} title="Remove from comparison" className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Stand: <span className="font-semibold text-slate-700 dark:text-slate-200">{standPts}</span></span>
                            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span> Total: <span className="font-semibold text-slate-700 dark:text-slate-200">{totalPts}</span></span>
                          </div>
                        </th>
                      );
                    })}
                   </tr>
                 </thead>
                 <tbody>
                {/* West header */}
                <tr>
                  <td className="sticky left-0 z-10 bg-rose-50/60 dark:bg-rose-400/10 backdrop-blur px-3 py-2 text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700" colSpan={2+displayedUsers.length}>
                    <button onClick={()=>setCollapsedWest(v=>!v)} className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
                      <span className={`inline-block transition-transform ${collapsedWest? '-rotate-90' : 'rotate-0'}`}>▾</span>
                      West
                    </button>
                  </td>
                </tr>
                </tbody>
                <DragDropContext onDragEnd={(result)=>{
                  const {source, destination} = result; if(!destination) return; if(!whatIfEnabled){ setShowWhatIfConfirm(true); return; }
                  if(source.droppableId==='west' && destination.droppableId==='west'){
                    const arr = Array.from(westOrder); const [m]=arr.splice(source.index,1); arr.splice(destination.index,0,m); setWestOrder(arr);
                  }
                }}>
                  <Droppable droppableId="west" isDropDisabled={!whatIfEnabled}>
                    {(provided)=> (
                      <tbody ref={provided.innerRef} {...provided.droppableProps} style={{ display: collapsedWest ? 'none' : undefined }}>
                        {(westOrder.length? westOrder.map((it,idx)=>({team: it.team, conference:'West', actual_position: standingsTeams.find(r=>r.team===it.team)?.actual_position })) : standingsTeams.filter(r=> (r.conference||'').toLowerCase().startsWith('w'))).map((row, index)=> (
                          <Draggable key={`W-${row.team}`} draggableId={`W-${row.team}`} index={index} isDragDisabled={!whatIfEnabled}>
                            {(prov)=> {
                              const isChanged = whatIfEnabled && ((simActualMap.get(row.team) ?? row.actual_position) !== (row.actual_position ?? null));
                              return (
                              <tr ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} className={isChanged ? 'bg-amber-50 dark:bg-amber-400/10' : (index % 2 === 0 ? 'bg-white/70 dark:bg-slate-800/60' : 'bg-white/40 dark:bg-slate-800/40')}>
                                <td className="sticky left-0 z-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/50" style={{ minWidth: teamColWidth, width: teamColWidth }}>
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex w-1.5 h-1.5 rounded-full" style={{backgroundColor:'#ef4444'}}/>
                                    {isChanged && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" title="What‑If moved" />}
                                    <img
                                      src={`/static/img/teams/${teamSlug(row.team)}.png`}
                                      alt=""
                                      title={`slug: ${teamSlug(row.team)}`}
                                      className="w-5 h-5 object-contain"
                                      onError={(e)=>{
                                        const img = e.currentTarget;
                                        const slug = img.title.replace('slug: ','');
                                        const step = parseInt(img.dataset.step || '0', 10);
                                        console.warn('Team logo missing, attempting fallback', { src: img.src, step });
                                        if (step === 0) { img.dataset.step = '1'; img.src = `/static/img/teams/${slug}.svg`; return; }
                                        if (step === 1) { img.dataset.step = '2'; img.src = `/static/img/teams/${slug}.PNG`; return; }
                                        if (step === 2) { img.dataset.step = '3'; img.src = `/static/img/teams/${slug}.SVG`; return; }
                                        img.onerror = null; img.src = '/static/img/teams/unknown.svg';
                                      }}
                                    />
                                    <span>{row.team}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700/50 bg-white/90 dark:bg-slate-800/90" style={{ position:'sticky', left: teamColWidth }}>{whatIfEnabled ? (simActualMap.get(row.team) ?? row.actual_position ?? '—') : (row.actual_position ?? '—')}</td>
                                {displayedUsers.map((e) => {
                                  const preds = e.user.categories?.['Regular Season Standings']?.predictions || [];
                                  const p = preds.find(x => x.team === row.team);
                                  const pts = whatIfEnabled ? standingPoints(p?.predicted_position, simActualMap.get(row.team)) : (p?.points || 0);
                                  const predPos = p?.predicted_position ?? '—';
                                  const color = pts >= 3 ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30' : pts >= 1 ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
                                  return (
                                    <td key={`c-${e.user.id}-${row.team}`} className="px-3 py-2 border-b border-slate-100 dark:border-slate-700/50">
                                      <div className="flex justify-center">
                                        <div className="relative inline-block group">
                                          <span className={`inline-block min-w-[80px] text-center px-2 py-1 rounded-md border text-xs ${color}`} title={`Pred: ${predPos}`}>{predPos}</span>
                                          {pts > 0 && (
                                            <span className={`pointer-events-none absolute -top-1 -right-1 text-[10px] px-1 py-[1px] rounded border shadow-sm opacity-0 group-hover:opacity-100 ${pts>=3 ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-800 dark:text-emerald-200 dark:border-emerald-700' : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-800 dark:text-amber-200 dark:border-amber-700'}`} title={`+${pts} points`}>+{pts}</span>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                              );
                            }}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </tbody>
                    )}
                  </Droppable>
                </DragDropContext>
                {/* East header */}
                <tbody>
                <tr>
                  <td className="sticky left-0 z-10 bg-sky-50/60 dark:bg-sky-400/10 backdrop-blur px-3 py-2 text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700" colSpan={2+displayedUsers.length}>
                    <button onClick={()=>setCollapsedEast(v=>!v)} className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
                      <span className={`inline-block transition-transform ${collapsedEast? '-rotate-90' : 'rotate-0'}`}>▾</span>
                      East
                    </button>
                  </td>
                </tr>
                </tbody>
                <DragDropContext onDragEnd={(result)=>{
                  const {source, destination} = result; if(!destination) return; if(!whatIfEnabled){ setShowWhatIfConfirm(true); return; }
                  if(source.droppableId==='east' && destination.droppableId==='east'){
                    const arr = Array.from(eastOrder); const [m]=arr.splice(source.index,1); arr.splice(destination.index,0,m); setEastOrder(arr);
                  }
                }}>
                  <Droppable droppableId="east" isDropDisabled={!whatIfEnabled}>
                    {(provided)=> (
                      <tbody ref={provided.innerRef} {...provided.droppableProps} style={{ display: collapsedEast ? 'none' : undefined }}>
                        {(eastOrder.length? eastOrder.map((it,idx)=>({team: it.team, conference:'East', actual_position: standingsTeams.find(r=>r.team===it.team)?.actual_position })) : standingsTeams.filter(r=> (r.conference||'').toLowerCase().startsWith('e'))).map((row, index)=> (
                          <Draggable key={`E-${row.team}`} draggableId={`E-${row.team}`} index={index} isDragDisabled={!whatIfEnabled}>
                            {(prov)=> {
                              const isChanged = whatIfEnabled && ((simActualMap.get(row.team) ?? row.actual_position) !== (row.actual_position ?? null));
                              return (
                              <tr ref={prov.innerRef} {...prov.dragHandleProps} {...prov.draggableProps} className={isChanged ? 'bg-amber-50 dark:bg-amber-400/10' : (index % 2 === 0 ? 'bg-white/70 dark:bg-slate-800/60' : 'bg-white/40 dark:bg-slate-800/40')}>
                                <td className="sticky left-0 z-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/50" style={{ minWidth: teamColWidth, width: teamColWidth }}>
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex w-1.5 h-1.5 rounded-full" style={{backgroundColor:'#0ea5e9'}}/>
                                    {isChanged && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" title="What‑If moved" />}
                                    <img
                                      src={`/static/img/teams/${teamSlug(row.team)}.png`}
                                      alt=""
                                      title={`slug: ${teamSlug(row.team)}`}
                                      className="w-5 h-5 object-contain"
                                      onError={(e)=>{
                                        const img = e.currentTarget;
                                        const slug = img.title.replace('slug: ','');
                                        const step = parseInt(img.dataset.step || '0', 10);
                                        console.warn('Team logo missing, attempting fallback', { src: img.src, step });
                                        if (step === 0) { img.dataset.step = '1'; img.src = `/static/img/teams/${slug}.svg`; return; }
                                        if (step === 1) { img.dataset.step = '2'; img.src = `/static/img/teams/${slug}.PNG`; return; }
                                        if (step === 2) { img.dataset.step = '3'; img.src = `/static/img/teams/${slug}.SVG`; return; }
                                        img.onerror = null; img.src = '/static/img/teams/unknown.svg';
                                      }}
                                    />
                                    <span>{row.team}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700/50 bg-white/90 dark:bg-slate-800/90" style={{ position:'sticky', left: teamColWidth }}>{whatIfEnabled ? (simActualMap.get(row.team) ?? row.actual_position ?? '—') : (row.actual_position ?? '—')}</td>
                                {displayedUsers.map((e) => {
                                  const preds = e.user.categories?.['Regular Season Standings']?.predictions || [];
                                  const p = preds.find(x => x.team === row.team);
                                  const pts = whatIfEnabled ? standingPoints(p?.predicted_position, simActualMap.get(row.team)) : (p?.points || 0);
                                  const predPos = p?.predicted_position ?? '—';
                                  const color = pts >= 3 ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30' : pts >= 1 ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
                                  return (
                                    <td key={`c-${e.user.id}-${row.team}`} className="px-3 py-2 border-b border-slate-100 dark:border-slate-700/50">
                                      <div className="flex justify-center">
                                        <div className="relative inline-block group">
                                          <span className={`inline-block min-w-[80px] text-center px-2 py-1 rounded-md border text-xs ${color}`} title={`Pred: ${predPos}`}>{predPos}</span>
                                          {pts > 0 && (
                                            <span className={`pointer-events-none absolute -top-1 -right-1 text-[10px] px-1 py-[1px] rounded border shadow-sm opacity-0 group-hover:opacity-100 ${pts>=3 ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-800 dark:text-emerald-200 dark:border-emerald-700' : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-800 dark:text-amber-200 dark:border-amber-700'}`} title={`+${pts} points`}>+{pts}</span>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                              );
                            }}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </tbody>
                    )}
                  </Droppable>
                </DragDropContext>
                 
              </table>
            </div>

            {/* Bottom what-if lists removed; main grid supports What‑If reordering */}

            {showWhatIfConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-5">
                  <div className="flex items-center gap-2 mb-2 text-slate-800 dark:text-slate-200 font-semibold"><AlertTriangle className="w-4 h-4 text-amber-500"/> Enable What‑If Simulation?</div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">This lets you drag to reorder actual standings locally and simulates category and total points. It doesn’t change real data.</p>
                  <div className="flex items-center justify-end gap-2">
                    <button className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600" onClick={()=>setShowWhatIfConfirm(false)}>Cancel</button>
                    <button className="px-3 py-1.5 rounded-lg border border-emerald-600 bg-emerald-600 text-white" onClick={()=>{ setWhatIfEnabled(true); setShowWhatIfConfirm(false); }}>Enable What‑If</button>
                  </div>
                </div>
              </div>
            )}

            {/* Per-team rollups when comparing all players */}
            {showAll && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Quick rollups</div>
                <div className="grid md:grid-cols-2 gap-4">
                  {standingsTeams.slice(0,8).map(row => {
                    const whoScored = (withSimTotals||[]).map(e=>{
                      const preds = e.user.categories?.['Regular Season Standings']?.predictions || [];
                      const p = preds.find(x => x.team === row.team);
                      const pts = whatIfEnabled ? standingPoints(p?.predicted_position, simActualMap.get(row.team)) : (p?.points || 0);
                      return pts>0 ? {name: e.user.display_name || e.user.username, pts} : null;
                    }).filter(Boolean).sort((a,b)=>b.pts - a.pts).slice(0,6);
                    return (
                      <div key={`roll-${row.team}`} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white/70 dark:bg-slate-800/50">
                        <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">{row.conference} • Team</div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">{row.team}</div>
                        <div className="flex flex-wrap gap-2">
                          {whoScored.length===0 && <span className="text-xs text-slate-400 dark:text-slate-500">No points yet</span>}
                          {whoScored.map((u,i)=>(
                            <span key={`${row.team}-${i}`} className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">{u.name} +{u.pts}</span>
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

        {mode === 'compare' && section !== 'standings' && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 shadow-xl">
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <Grid className="w-4 h-4" />
                <div className="font-semibold">{fromSectionKey(section)} — Detailed Grid</div>
              </div>
              <div className="flex items-center gap-2">
                <select className="text-sm border border-slate-300 rounded-md px-2 py-1 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300" onChange={(e)=>addUser(e.target.value)} value="">
                  <option value="">Add player…</option>
                  {(withSimTotals||[]).map(e => (
                    <option key={e.user.id} value={e.user.id}>{e.user.display_name || e.user.username}</option>
                  ))}
                </select>
                {loggedInUserId && (
                  <button
                    onClick={()=> {
                      if (!selectedUserIds.map(String).includes(loggedInUserId)) addUser(loggedInUserId);
                      setPinnedUserIds(prev => prev.includes(loggedInUserId) ? prev.filter(id => String(id)!==String(loggedInUserId)) : [...prev, loggedInUserId]);
                    }}
                    className={`text-sm inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border ${pinnedUserIds.includes(loggedInUserId)?'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300':'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-300'}`}
                    title={pinnedUserIds.includes(loggedInUserId) ? 'Unpin my column' : (selectedUserIds.map(String).includes(loggedInUserId) ? 'Pin my column' : 'Add and pin my column')}
                  >
                    {pinnedUserIds.includes(loggedInUserId) ? 'Unpin Me' : 'Pin Me'}
                  </button>
                )}
                <label className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500 dark:border-slate-700" title="What‑If available in Regular Season Standings tab">What‑If</label>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="min-w-full border-t border-slate-200 dark:border-slate-700" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: Math.max(320, 12*16) }} />
                  {displayedUsers.map((_, idx) => (
                    <col key={`qa-${idx}`} style={{ width: 160 }} />
                  ))}
                </colgroup>
                <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                  <tr>
                    <th className="sticky left-0 z-10 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700" style={{minWidth:'12rem'}}>Question</th>
                    {displayedUsers.map((e) => {
                      const catKey = fromSectionKey(section);
                      const catPts = e.user.categories?.[catKey]?.points || 0;
                      const totalPts = e.user.total_points || 0;
                      return (
                        <th key={`h2-${e.user.id}`} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 align-top">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-700 dark:text-slate-200">{e.user.display_name || e.user.username}</span>
                            <button onClick={()=> setPinnedUserIds(prev => prev.includes(String(e.user.id)) ? prev.filter(id => String(id)!==String(e.user.id)) : [...prev, String(e.user.id)])} title={pinnedUserIds.includes(String(e.user.id))? 'Unpin column':'Pin column'} className={`text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 ${pinnedUserIds.includes(String(e.user.id))?'text-emerald-600 dark:text-emerald-400':''}`}>
                              {pinnedUserIds.includes(String(e.user.id)) ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
                            </button>
                            {!showAll && (
                              <button onClick={()=>setSelectedUserIds(prev => prev.filter(id => String(id)!==String(e.user.id)))} title="Remove from comparison" className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Cat: <span className="font-semibold text-slate-700 dark:text-slate-200">{catPts}</span></span>
                            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span> Total: <span className="font-semibold text-slate-700 dark:text-slate-200">{totalPts}</span></span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {(() => {
                    const catKey = fromSectionKey(section);
                    const qMap = new Map();
                    (displayedUsers||[]).forEach(e => {
                      const preds = e.user.categories?.[catKey]?.predictions || [];
                      preds.forEach(p => {
                        if (!p.question_id) return;
                        if (!qMap.has(p.question_id)) qMap.set(p.question_id, { id: p.question_id, text: p.question });
                      });
                    });
                    const qArr = Array.from(qMap.values()).sort((a,b)=> a.text.localeCompare(b.text));
                    return qArr.map(q => (
                      <tr key={`q-${q.id}`} className="odd:bg-white/70 even:bg-white/40 dark:odd:bg-slate-800/50 dark:even:bg-slate-800/20">
                        <td className="sticky left-0 z-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-200">{q.text}</td>
                        {displayedUsers.map(e => {
                          const preds = e.user.categories?.[catKey]?.predictions || [];
                          const p = preds.find(x => String(x.question_id) === String(q.id));
                          const pts = p?.points || 0;
                          const color = pts > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
                          const answer = (p?.answer || '').toString();
                          return (
                        <td key={`q-${q.id}-${e.user.id}`} className="px-3 py-2">
                          <div className="flex justify-center">
                            <div className="relative inline-block group">
                              <span className={`inline-block max-w-[160px] truncate text-center px-2 py-1 rounded-md border text-xs ${color}`} title={`${answer}`}>{answer || '—'}</span>
                              {pts > 0 && (
                                <span
                                  className="pointer-events-none absolute -top-1 -right-1 text-[9px] px-1 py-[1px] rounded bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-800 dark:text-emerald-200 dark:border-emerald-700 shadow-sm opacity-0 group-hover:opacity-100"
                                  title={`+${pts} points`}
                                >
                                  +{pts}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                          );
                        })}
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {/* Floating Top 3 card (simple) with delta */}
      <div className="fixed bottom-4 right-4 z-40">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 backdrop-blur shadow-xl p-3 w-72">
          <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">{whatIfEnabled ? 'Simulated' : 'Current'} Top 3</div>
          <ol className="space-y-1">
            {(withSimTotals||[]).slice(0,3).map((e,idx)=> {
              const medal = idx===0? 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-400/20 dark:text-yellow-300 dark:border-yellow-400/30' : idx===1? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500' : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-400/20 dark:text-amber-300 dark:border-amber-400/30';
              const delta = whatIfEnabled && typeof e.__orig_total_points === 'number' ? (e.user.total_points - e.__orig_total_points) : 0;
              return (
              <li key={`f-${e.user.id}`} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border text-[11px] ${medal}`}>{idx+1}</span>
                  {e.user.display_name || e.user.username}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">{e.user.total_points}</span>
                  {whatIfEnabled && delta !== 0 && (
                    <span className={`text-[11px] ${delta>0? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`} title="Δ vs. current">{delta>0? '+' : ''}{delta}</span>
                  )}
                </span>
              </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}

export default LeaderboardDetailPage;