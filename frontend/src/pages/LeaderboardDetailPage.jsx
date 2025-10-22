import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import useLeaderboard from '../hooks/useLeaderboard';
import { ChevronLeft, Grid, Expand, Minimize2, X, Search, AlertTriangle, Pin, PinOff, Trophy, Award, Target, CheckCircle2, XCircle, Lock, Calendar } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';


function LeaderboardDetailPage({ seasonSlug: initialSeasonSlug = 'current' }) {
  const paramsRoot = document.getElementById('leaderboard-detail-root');
  const initialSection = paramsRoot?.getAttribute('data-initial-section') || 'standings';
  const initialUserId = paramsRoot?.getAttribute('data-initial-user-id') || '';
  const loggedInUsername = paramsRoot?.getAttribute('data-logged-in-username') || null;

  // State for selected season
  const [selectedSeason, setSelectedSeason] = useState(initialSeasonSlug);

  // Fetch seasons where the user has participated (has submissions)
  const { data: seasonsData } = useQuery({
    queryKey: ['seasons', 'user-participated'],
    queryFn: async () => {
      const res = await axios.get('/api/v2/seasons/user-participated');
      return res.data;
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  const { data: leaderboardData, season: seasonInfo, isLoading, error } = useLeaderboard(selectedSeason);

  const [section, setSection] = useState(initialSection); // 'standings' | 'awards' | 'props'
  const [mode, setMode] = useState('compare'); // 'showcase' | 'compare'
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
  const [pinPulseId, setPinPulseId] = useState(null);
  const [showManagePlayers, setShowManagePlayers] = useState(false);
  const [manageQuery, setManageQuery] = useState('');
  

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
  // Auto-pin and include logged-in user by default (without overriding explicit URL selections)
  useEffect(() => {
    if (!loggedInUserId) return;
    setPinnedUserIds(prev => (prev.includes(loggedInUserId) ? prev : [...prev, loggedInUserId]));
    try {
      const sp = new URLSearchParams(window.location.search);
      const usersParam = sp.get('users');
      if (!usersParam) {
        setSelectedUserIds(prev => (prev.map(String).includes(loggedInUserId) ? prev : [loggedInUserId, ...prev]));
      }
    } catch (_) { /* no-op */ }
  }, [loggedInUserId]);

  // Fallback: if no logged-in user was resolved but we have an initialUserId, pin/select it.
  useEffect(() => {
    if (loggedInUserId) return; // primary handler above
    if (!initialUserId) return;
    const id = String(initialUserId);
    setPinnedUserIds(prev => (prev.map(String).includes(id) ? prev : [...prev, id]));
    try {
      const sp = new URLSearchParams(window.location.search);
      const usersParam = sp.get('users');
      if (!usersParam) {
        setSelectedUserIds(prev => (prev.map(String).includes(id) ? prev : [id, ...prev]));
      }
    } catch (_) { /* no-op */ }
  }, [loggedInUserId, initialUserId]);

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

  const togglePin = (id) => {
    if (!id) return;
    setPinnedUserIds(prev => prev.includes(String(id)) ? prev.filter(x => String(x)!==String(id)) : [...prev, String(id)]);
    setPinPulseId(String(id));
    window.setTimeout(() => setPinPulseId(null), 350);
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

  // Mobile UI is handled by CSS responsive design instead of JavaScript
  const shouldShowMobileUI = false; // Disabled - using responsive CSS instead

  if (!isLoading && !error && shouldShowMobileUI) {
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
    <>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-3 overflow-x-hidden no-scrollbar">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <a href={`/page/${seasonSlug}/`} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
              <ChevronLeft className="w-4 h-4" /> Back
            </a>
            <div className="text-xs text-slate-500 dark:text-slate-400">Season {seasonSlug.replace('-', '–')}</div>
          </div>

          {/* Section tabs: segmented control with sliding highlight */}
          {(() => {
            const sections = ['standings','awards','props'];
            const activeIdx = Math.max(0, sections.indexOf(section));
            const segWidth = `${100/sections.length}%`;
            return (
              <div className="relative flex overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                <div
                  className="absolute top-0 bottom-0 left-0 rounded-lg bg-white dark:bg-slate-700 shadow transition-transform duration-200 will-change-transform"
                  style={{ width: segWidth, transform: `translateX(${activeIdx * 100}%)` }}
                />
                {sections.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSection(s)}
                    className={`relative z-10 flex-1 basis-0 text-center px-3 py-1.5 text-sm transition-colors duration-200 ${section===s? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    {fromSectionKey(s)}
                  </button>
                ))}
              </div>
            );
          })()}

          {/* User chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {(mobileDisplayedUsers || []).map(e => (
              <span key={`chip-${e.user.id}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                {e.user.display_name || e.user.username}
                {!showAll && (<button onClick={()=> setSelectedUserIds(prev => prev.filter(id => String(id)!==String(e.user.id)))} className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"><X className="w-3.5 h-3.5"/></button>)}
              </span>
            ))}
            <button onClick={()=> setShowManagePlayers(true)} className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-300">Manage</button>
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
                    <div className="flex items-start gap-2 mb-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">{idx+1}</span>
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{text}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {mobileDisplayedUsers.map(e => {
                        const preds = e.user.categories?.[catKey]?.predictions || [];
                        const p = preds.find(x => String(x.question_id) === String(id));
                        const pts = p?.points || 0;
                        const ansRaw = (p?.answer || '').toString();
                        const ans = ansRaw || '—';
                        const isYes = /^yes$/i.test(ansRaw);
                        const isNo = /^no$/i.test(ansRaw);
                        const isWrong = p?.correct === false;
                        const color = isWrong
                          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
                          : (pts > 0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600');
                        return (
                          <span key={`mq-${id}-${e.user.id}`} className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs ${color} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm`}>
                            {(e.user.display_name || e.user.username).slice(0,8)}:
                            {isYes && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {isNo && <XCircle className="w-3.5 h-3.5" />}
                            <span className="truncate max-w-[160px]">{ans}</span>
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
      {/* Manage Players modal (mobile) */}
      {showManagePlayers && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm">
          <div className="absolute inset-x-0 bottom-0 top-[10%] bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl flex flex-col">
            <div className="px-4 pt-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700 mb-3" />
              <div className="flex items-center justify-between mb-3">
                <div className="text-base font-bold text-slate-800 dark:text-slate-200">Manage Players</div>
                <button onClick={()=> setShowManagePlayers(false)} className="px-3 py-1.5 rounded-lg border border-slate-200/60 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 text-xs font-medium transition-colors">Done</button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={manageQuery} onChange={(e)=> setManageQuery(e.target.value)} placeholder="Search players" className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200/60 bg-white text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-teal-500/20 transition-all" />
                </div>
                <button onClick={()=> {
                  const ids = (withSimTotals||[])
                    .filter(e => !manageQuery.trim() || (e.user.display_name||e.user.username).toLowerCase().includes(manageQuery.toLowerCase()))
                    .map(e => String(e.user.id));
                  setSelectedUserIds(prev => Array.from(new Set([...prev.map(String), ...ids])));
                }} className="text-xs font-medium px-3 py-2 rounded-lg border border-slate-200/60 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 transition-colors shrink-0">All</button>
                <button onClick={()=> {
                  const ids = new Set((withSimTotals||[])
                    .filter(e => !manageQuery.trim() || (e.user.display_name||e.user.username).toLowerCase().includes(manageQuery.toLowerCase()))
                    .map(e => String(e.user.id)));
                  setSelectedUserIds(prev => prev.filter(id => !ids.has(String(id))));
                }} className="text-xs font-medium px-3 py-2 rounded-lg border border-slate-200/60 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 transition-colors shrink-0">Clear</button>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Selected {selectedUserIds.length}{pinnedUserIds.length? ` • Pinned ${pinnedUserIds.length}`:''}</div>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 grid grid-cols-1 gap-2">
              {(withSimTotals||[])
                .filter(e => !manageQuery.trim() || (e.user.display_name||e.user.username).toLowerCase().includes(manageQuery.toLowerCase()))
                .map(e => {
                  const id = String(e.user.id);
                  const isSel = selectedUserIds.map(String).includes(id);
                  const isPin = pinnedUserIds.map(String).includes(id);
                  return (
                    <div key={`mrow-${id}`} className={`flex items-center justify-between rounded-xl border transition-all duration-200 ${isSel? 'border-emerald-300/80 bg-emerald-50/70 dark:border-emerald-700/60 dark:bg-emerald-900/30':'border-slate-200/60 bg-white dark:border-slate-800 dark:bg-slate-900'} px-3 py-2.5 hover:shadow-sm`}>
                      <label className="flex items-center gap-3 min-w-0 cursor-pointer">
                        <input type="checkbox" className="accent-emerald-600 w-4 h-4" checked={isSel} onChange={(ev)=> {
                          if (ev.target.checked) addUser(id); else setSelectedUserIds(prev => prev.filter(x => String(x)!==id));
                        }} />
                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold shrink-0">
                          {(e.user.display_name || e.user.username).slice(0,2).toUpperCase()}
                        </div>
                        <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{e.user.display_name || e.user.username}</span>
                      </label>
                      <button type="button" onClick={()=> togglePin(id)} title={isPin? 'Unpin':'Pin'} className={`px-2 py-1.5 rounded-lg border transition-all ${isPin? 'border-emerald-400/80 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300':'border-slate-300/60 bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700'} ${pinPulseId===id? 'pin-pulse':''}`}>
                        {isPin ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </>
    );
  }

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center text-slate-500 dark:text-slate-400">Loading…</div>;
  }
  if (error) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center text-rose-600 dark:text-rose-400">{String(error)}</div>;
  }

  // Check if submissions are still open
  const submissionsOpen = seasonInfo?.submissions_open ?? false;
  const submissionEndDate = seasonInfo?.submission_end_date;

  // Format submission end date
  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return isoString;
    }
  };

  // If submissions are still open, show locked message
  if (submissionsOpen && submissionEndDate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-3 md:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Back button and Season Selector */}
          <div className="flex items-center justify-between">
            <a href={`/leaderboard/${selectedSeason}/`} className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back
            </a>
            {seasonsData && seasonsData.length > 1 && (
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium shadow-sm hover:border-slate-400 dark:hover:border-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {seasonsData.map((season) => (
                  <option key={season.slug} value={season.slug}>
                    {season.year}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Locked Message */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br from-white via-white to-slate-50/30 dark:from-slate-800/90 dark:via-slate-800/80 dark:to-slate-900/50 shadow-lg backdrop-blur-sm">
            <div className="relative px-6 py-12 md:px-12 md:py-16 text-center">
              <div className="flex flex-col items-center gap-6">
                <div className="p-4 rounded-full bg-gradient-to-br from-amber-50 to-amber-100/50 text-amber-600 border border-amber-200/60 dark:from-amber-400/10 dark:to-amber-500/5 dark:text-amber-300 dark:border-amber-500/30">
                  <Lock className="w-12 h-12" />
                </div>

                <div className="space-y-3">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Leaderboard Locked
                  </h1>
                  <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
                    The detailed leaderboard will open when submissions close to ensure fair play and prevent any competitive advantages.
                  </p>
                </div>

                <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900/40 backdrop-blur border border-slate-200/60 dark:border-slate-700/40 shadow-sm">
                  <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  <div className="text-left">
                    <div className="text-xs uppercase tracking-wider font-medium text-slate-500 dark:text-slate-400">Opens on</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(submissionEndDate)}</div>
                  </div>
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
                  Check back after the submission deadline to see the rankings!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sectionTitle = fromSectionKey(section);
  const teamSlug = (name='') => name.toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-');
  // Keep a fixed width to avoid column misalignment when toggling user count
  const teamColWidth = 160; // px

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-3 md:p-4">
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <a href={`/leaderboard/${selectedSeason}/`} className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </a>
          <div className="flex items-center gap-3">
            {seasonsData && seasonsData.length > 1 && (
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium shadow-sm hover:border-slate-400 dark:hover:border-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {seasonsData.map((season) => (
                  <option key={season.slug} value={season.slug}>
                    {season.year}
                  </option>
                ))}
              </select>
            )}
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Season {seasonInfo?.year || selectedSeason.replace('-', '–')}</div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center gap-2 shrink-0">
          {/* Segmented control for sections with sliding highlight */}
          {(() => {
            const sections = ['standings','awards','props'];
            const activeIdx = Math.max(0, sections.indexOf(section));
            const iconFor = (s) => (s==='standings'? Trophy : (s==='awards'? Award : Target));
            const segWidth = `${100/sections.length}%`;
            return (
              <div className="relative flex overflow-hidden rounded-lg border border-slate-200/60 dark:border-slate-700/50 bg-slate-100/80 dark:bg-slate-800/60 w-full md:w-auto">
                <div
                  className="absolute top-0 bottom-0 left-0 rounded-md bg-white dark:bg-slate-700 shadow-sm transition-transform duration-200 will-change-transform"
                  style={{ width: segWidth, transform: `translateX(${activeIdx * 100}%)` }}
                />
                {sections.map((s) => {
                  const Icon = iconFor(s);
                  const label = fromSectionKey(s);
                  return (
                    <button
                      key={s}
                      onClick={() => setSection(s)}
                      className={`relative z-10 flex-1 basis-0 text-center px-2 py-1.5 text-[10px] md:text-xs font-semibold inline-flex items-center justify-center gap-1 transition-colors duration-200 ${section===s? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                      <Icon className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}
          <div className="hidden md:block h-5 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />
          <div className="flex items-center gap-2 w-full md:w-auto">
          {['showcase','compare'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 md:flex-initial px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${mode===m? 'bg-emerald-600 text-white border-emerald-600 shadow-sm dark:bg-emerald-500 dark:border-emerald-500':'bg-white text-slate-700 border-slate-200/60 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/50 dark:hover:bg-slate-700'}`}>
              {m === 'showcase' ? 'Showcase' : 'Compare'}
            </button>
          ))}
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto md:ml-auto flex-wrap">
            <div className="relative flex-1 md:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
              <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search" className="w-full pl-7 pr-2 py-1.5 rounded-lg border border-slate-200/60 bg-white text-xs dark:bg-slate-800 dark:border-slate-700/50 dark:text-slate-300 dark:placeholder-slate-500 transition-colors md:w-32 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <select className="text-xs font-medium border border-slate-200/60 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 dark:border-slate-700/50 dark:text-slate-300 transition-colors flex-1 md:flex-initial" value={sortBy} onChange={(e)=>setSortBy(e.target.value)}>
              <option value="standings">Standings pts</option>
              <option value="total">Total pts</option>
              <option value="name">Name</option>
            </select>
            {mode==='compare' && (
              <button onClick={()=>setShowAll(v=>!v)} className="text-xs font-semibold inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200/60 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700/50 dark:hover:bg-slate-700 dark:text-slate-300 transition-all whitespace-nowrap">
                {showAll ? (<><Minimize2 className="w-3.5 h-3.5" /> Collapse</>) : (<><Expand className="w-3.5 h-3.5" /> All</>)}
              </button>
            )}
            <label className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-2.5 py-1.5 border transition-all whitespace-nowrap ${section==='standings' ? (whatIfEnabled ? 'bg-slate-900 text-white border-slate-900 shadow-sm dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200' : 'bg-white text-slate-700 border-slate-200/60 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/50') : 'bg-slate-100 text-slate-400 border-slate-200/60 cursor-not-allowed dark:bg-slate-800/50 dark:text-slate-500 dark:border-slate-700/50'}`} title={section==='standings' ? 'Simulate by dragging rows in the grid' : 'What‑If available in Regular Season Standings tab'}>
              <input type="checkbox" className="accent-slate-700 w-3 h-3" checked={whatIfEnabled && section==='standings'} onChange={(e)=> setWhatIfEnabled(e.target.checked)} disabled={section!=='standings'} /> What‑If
            </label>
            {section==='standings' && whatIfEnabled && (
              <button className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200/60 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700/50 dark:hover:bg-slate-700 dark:text-slate-300 transition-all whitespace-nowrap" onClick={()=>{ setWhatIfEnabled(false); setWestOrder([]); setEastOrder([]); }} title="Reset to actual">
                Reset
              </button>
            )}
          </div>
        </div>
        {/* Showcase mode */}
        {mode === 'showcase' && (
          <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-white/90 dark:bg-slate-800/80 shadow-lg overflow-hidden transition-shadow hover:shadow-xl flex flex-col md:block flex-1 md:flex-initial overflow-y-auto md:overflow-visible">
            {/* Hero */}
            <div className="px-4 py-4 bg-gradient-to-r from-emerald-50/60 to-sky-50/60 dark:from-emerald-900/10 dark:to-sky-900/10 border-b border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-sm">
                  {(primaryUser?.user?.display_name || primaryUser?.user?.username || '?').slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div className="text-base font-bold text-slate-900 dark:text-white">{primaryUser?.user?.display_name || primaryUser?.user?.username || 'Select a player'}</div>
                  {primaryUser && (
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Rank #{primaryUser.rank} • {primaryUser.user.total_points} pts</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select className="text-xs font-medium border border-slate-200/60 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300" onChange={(e)=>setSelectedUserIds([String(e.target.value)])} value={primaryUserId || ''}>
                  <option value="">Select…</option>
                  {(leaderboardData||[]).map(e => (
                    <option key={e.user.id} value={e.user.id}>{e.user.display_name || e.user.username}</option>
                  ))}
                </select>
                {loggedInUserId && (
                  <button
                    onClick={()=>{ setSelectedUserIds([loggedInUserId]); setMode('showcase'); }}
                    className="text-xs font-semibold inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-300/60 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700/50 dark:bg-emerald-900/50 dark:text-emerald-300 dark:hover:bg-emerald-900 transition-all"
                    disabled={primaryUserId === loggedInUserId}
                    title="Focus on me"
                  >
                    Me
                  </button>
                )}
                <button onClick={()=>setMode('compare')} className="text-xs font-semibold inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200/60 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700/50 dark:hover:bg-slate-700 dark:text-slate-300 transition-all">Compare</button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
              {!primaryUser && (
                <div className="lg:col-span-3 rounded-lg border border-slate-200/60 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-5 text-center">
                  <div className="text-slate-800 dark:text-slate-200 font-bold mb-1">No player selected</div>
                  <div className="text-slate-600 dark:text-slate-400 text-xs">Use the selector above to pick a player to showcase.</div>
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
                  <div key={catKey} className="rounded-lg border border-slate-200/60 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/60 p-3.5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 text-slate-700 border border-slate-200/60 dark:from-slate-700 dark:to-slate-800 dark:text-slate-300 dark:border-slate-600">
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                  <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{catKey}</div>
                      </div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold">{pts}/{max} • {pct}%</div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mb-2.5">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-500" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400 mb-1 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Wins</div>
                        <ul className="space-y-1">
                          {rights.length===0 && <li className="text-[10px] text-slate-500 dark:text-slate-400 italic">None yet</li>}
                          {rights.map((p,i)=> (
                            <li key={`r-${i}`} className="text-[10px] text-emerald-900 bg-emerald-50/70 border border-emerald-200/60 dark:text-emerald-200 dark:bg-emerald-900/40 dark:border-emerald-800/50 rounded px-1.5 py-1 truncate leading-tight" title={`+${p.points || 0}`}>
                              {(p.question || p.team || '').toString()}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-rose-600 dark:text-rose-400 mb-1 inline-flex items-center gap-1"><XCircle className="w-3 h-3" /> Misses</div>
                        <ul className="space-y-1">
                          {wrongs.length===0 && <li className="text-[10px] text-slate-500 dark:text-slate-400 italic">None yet</li>}
                          {wrongs.map((p,i)=> (
                            <li key={`w-${i}`} className="text-[10px] text-rose-900 bg-rose-50/70 border border-rose-200/60 dark:text-rose-200 dark:bg-rose-900/40 dark:border-rose-800/50 rounded px-1.5 py-1 truncate leading-tight" title={`+${p.points || 0}`}>
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
              <div className="lg:col-span-3 grid md:grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200/60 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/60 p-3.5 shadow-sm">
                  <div className="text-xs font-bold text-slate-900 dark:text-white mb-2">Recent Highlights</div>
                  <ul className="space-y-1.5">
                    {(() => {
                      const all = ['Regular Season Standings','Player Awards','Props & Yes/No']
                        .flatMap(k => primaryUser?.user?.categories?.[k]?.predictions || [])
                        .filter(Boolean)
                        .filter(p => (p.points||0) > 0)
                        .slice(0,8);
                      if (all.length === 0) return [<li key="empty" className="text-xs text-slate-500 dark:text-slate-400 italic">No highlights yet</li>];
                      return all.map((p, i) => (
                        <li key={`hi-${i}`} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate text-slate-800 dark:text-slate-200 leading-tight">{(p.question || p.team || '').toString()}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">+{p.points || 0}</span>
                        </li>
                      ));
                    })()}
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-200/60 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/60 p-3.5 shadow-sm">
                  <div className="text-xs font-bold text-slate-900 dark:text-white mb-2">Missed Opportunities</div>
                  <ul className="space-y-1.5">
                    {(() => {
                      const all = ['Regular Season Standings','Player Awards','Props & Yes/No']
                        .flatMap(k => primaryUser?.user?.categories?.[k]?.predictions || [])
                        .filter(Boolean)
                        .filter(p => p.correct === false || (p.points||0) === 0)
                        .slice(0,8);
                      if (all.length === 0) return [<li key="empty" className="text-xs text-slate-500 dark:text-slate-400 italic">Nothing here — nice!</li>];
                      return all.map((p, i) => (
                        <li key={`mi-${i}`} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate text-slate-800 dark:text-slate-200 leading-tight">{(p.question || p.team || '').toString()}</span>
                          <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px]">{p.points ? `+${p.points}` : '0'}</span>
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
                  <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-white/90 dark:bg-slate-800/80 shadow-lg transition-shadow hover:shadow-xl">
            <div className="px-3 py-3 md:px-4 md:py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Grid className="w-4 h-4" />
                <div className="text-sm font-bold">Regular Season Standings</div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select className="text-xs font-medium border border-slate-200/60 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300" onChange={(e)=>addUser(e.target.value)} value="">
                  <option value="">Add…</option>
                  {(withSimTotals||[])
                    .filter(e => !selectedUserIds.map(String).includes(String(e.user.id)))
                    .map(e => (
                      <option key={e.user.id} value={e.user.id}>{e.user.display_name || e.user.username}</option>
                  ))}
                </select>
                {loggedInUserId && (
                  <span className={pinPulseId===loggedInUserId? 'pin-pulse' : ''}>
                    <button
                      onClick={()=> {
                        if (!selectedUserIds.map(String).includes(loggedInUserId)) addUser(loggedInUserId);
                        togglePin(loggedInUserId);
                      }}
                      className={`text-xs font-semibold inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-all ${pinnedUserIds.includes(loggedInUserId)?'border-emerald-400/60 bg-emerald-50 text-emerald-700 dark:border-emerald-600/50 dark:bg-emerald-900/50 dark:text-emerald-300':'border-slate-200/60 bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700/50 dark:hover:bg-slate-700 dark:text-slate-300'}`}
                      title={pinnedUserIds.includes(loggedInUserId) ? 'Unpin my column' : (selectedUserIds.map(String).includes(loggedInUserId) ? 'Pin my column' : 'Add and pin my column')}
                    >
                      {pinnedUserIds.includes(loggedInUserId) ? 'Unpin Me' : 'Pin Me'}
                    </button>
                  </span>
                )}
                <button onClick={()=> setShowManagePlayers(true)} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200/60 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700/50 dark:hover:bg-slate-700 dark:text-slate-300 transition-all">Manage</button>
                <button onClick={()=>setShowAll(v=>!v)} className="text-xs font-semibold inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200/60 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700/50 dark:hover:bg-slate-700 dark:text-slate-300 transition-all">
                  {showAll ? (<><Minimize2 className="w-3.5 h-3.5" /> Collapse</>) : (<><Expand className="w-3.5 h-3.5" /> All</>)}
                </button>
              </div>
            </div>

            {/* Desktop Grid */}
            <div className="overflow-auto hidden md:block">
               <table className="min-w-full border-t border-slate-200 dark:border-slate-700" style={{ tableLayout: 'fixed' }}>
                 <colgroup>
                   <col style={{ width: `${teamColWidth}px` }} />
                   <col style={{ width: '72px' }} />
                   {displayedUsers.map((_, idx) => (
                     <col key={`u-${idx}`} style={{ width: '108px' }} />
                   ))}
                 </colgroup>
                 <thead className="bg-slate-50/95 dark:bg-slate-800/95 sticky top-0 z-20">
                   <tr>
                     <th className="sticky left-0 z-30 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm px-3 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-700/60" style={{ minWidth: `${teamColWidth}px`, width: `${teamColWidth}px` }}>Team</th>
                     <th className="sticky left-0 z-30 text-left text-xs font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-700/60 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm px-2.5 py-2.5" style={{ left: `${teamColWidth}px`, minWidth: '72px', width: '72px' }}>Pos</th>
                    {displayedUsers.map((e, index) => {
                      const standPts = e.user.categories?.['Regular Season Standings']?.points || 0;
                      const totalPts = e.user.total_points || 0;
                      const isPinned = pinnedUserIds.includes(String(e.user.id));
                      const leftPos = teamColWidth + 72 + (index * 108);
                      return (
                        <th key={`h-${e.user.id}`} className={`px-2.5 py-2.5 text-center text-xs font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-700/60 align-top transition-all duration-200 ${isPinned ? 'sticky z-30 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-sm' : ''}`} style={isPinned ? { left: `${leftPos}px`, minWidth: '108px', width: '108px' } : { minWidth: '108px', width: '108px' }} title={`Stand: ${standPts} • Total: ${totalPts}`}>
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <span className="truncate max-w-[60px]">{e.user.display_name || e.user.username}</span>
                            <div className="flex items-center gap-1">
                              <button onClick={()=> togglePin(e.user.id)} title={isPinned ? 'Unpin column':'Pin column'} className={`transition-all duration-200 ${isPinned ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'} ${pinPulseId===String(e.user.id)?'pin-pulse':''}`}>
                                {isPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
                              </button>
                              {!showAll && (
                                <button onClick={()=>setSelectedUserIds(prev => prev.filter(id => String(id)!==String(e.user.id)))} title="Remove from comparison" className="text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 transition-colors">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="mt-1.5 flex flex-col gap-0.5 text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                            <span className="inline-flex items-center justify-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {standPts}</span>
                            <span className="inline-flex items-center justify-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span> {totalPts}</span>
                          </div>
                        </th>
                      );
                    })}
                   </tr>
                 </thead>
                 <tbody>
                {/* West header */}
                <tr>
                  <td className="sticky left-0 z-20 bg-rose-50/80 dark:bg-rose-400/15 backdrop-blur-sm px-3 py-2.5 text-[11px] uppercase tracking-wide text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-semibold" colSpan={2+displayedUsers.length}>
                    <button onClick={()=>setCollapsedWest(v=>!v)} className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 transition-colors">
                      <span className={`inline-block transition-transform duration-200 ${collapsedWest? '-rotate-90' : 'rotate-0'}`}>▾</span>
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
                              <tr ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} className={`${isChanged ? 'bg-amber-50/80 dark:bg-amber-400/10' : (index % 2 === 0 ? 'bg-white/80 dark:bg-slate-800/60' : 'bg-white/50 dark:bg-slate-800/40')} transition-colors duration-200`}>
                                <td className="sticky left-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/50" style={{ minWidth: `${teamColWidth}px`, width: `${teamColWidth}px` }}>
                                  <div className="flex items-center gap-2.5">
                                    <span className="inline-flex w-1.5 h-1.5 rounded-full shrink-0" style={{backgroundColor:'#ef4444'}}/>
                                    {isChanged && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="What‑If moved" />}
                                    <img
                                      src={`/static/img/teams/${teamSlug(row.team)}.png`}
                                      alt=""
                                      title={`slug: ${teamSlug(row.team)}`}
                                      className="w-5 h-5 object-contain shrink-0"
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
                                    <span className="transition-colors duration-200 truncate">{row.team}</span>
                                 </div>
                               </td>
                                <td className="sticky z-20 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm font-medium" style={{ left: `${teamColWidth}px`, minWidth: '72px', width: '72px' }}>{whatIfEnabled ? (simActualMap.get(row.team) ?? row.actual_position ?? '—') : (row.actual_position ?? '—')}</td>
                                {displayedUsers.map((e, userIndex) => {
                                  const isPinned = pinnedUserIds.includes(String(e.user.id));
                                  const preds = e.user.categories?.['Regular Season Standings']?.predictions || [];
                                  const p = preds.find(x => x.team === row.team);
                                  const pts = whatIfEnabled ? standingPoints(p?.predicted_position, simActualMap.get(row.team)) : (p?.points || 0);
                                  const predPos = p?.predicted_position ?? '—';
                                  const color = pts >= 3 ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30' : pts >= 1 ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
                                  const leftPos = teamColWidth + 72 + (userIndex * 108);
                                  return (
                                    <td key={`c-${e.user.id}-${row.team}`} className={`px-3 py-2.5 border-b border-slate-100 dark:border-slate-700/50 ${isPinned ? 'sticky z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-sm' : ''}`} style={isPinned ? { left: `${leftPos}px`, minWidth: '108px', width: '108px' } : { minWidth: '108px', width: '108px' }}>
                                      <div className="flex justify-center">
                                        <div className="relative inline-block group">
                                          <span className={`inline-block min-w-[80px] text-center px-2.5 py-1.5 rounded-md border text-xs font-medium ${color}` } title={`Pred: ${predPos}`}>{predPos}</span>
                                          {pts > 0 && (
                                            <span className={`absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-md border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${pts>=3 ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-800 dark:text-emerald-200 dark:border-emerald-700' : 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-800 dark:text-amber-200 dark:border-amber-700'}`}>+{pts}</span>
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
                  <td className="sticky left-0 z-20 bg-sky-50/80 dark:bg-sky-400/15 backdrop-blur-sm px-3 py-2.5 text-[11px] uppercase tracking-wide text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-semibold" colSpan={2+displayedUsers.length}>
                    <button onClick={()=>setCollapsedEast(v=>!v)} className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 transition-colors">
                      <span className={`inline-block transition-transform duration-200 ${collapsedEast? '-rotate-90' : 'rotate-0'}`}>▾</span>
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
                              <tr ref={prov.innerRef} {...prov.dragHandleProps} {...prov.draggableProps} className={`${isChanged ? 'bg-amber-50/80 dark:bg-amber-400/10' : (index % 2 === 0 ? 'bg-white/80 dark:bg-slate-800/60' : 'bg-white/50 dark:bg-slate-800/40')} transition-colors duration-200`}>
                                <td className="sticky left-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/50" style={{ minWidth: `${teamColWidth}px`, width: `${teamColWidth}px` }}>
                                  <div className="flex items-center gap-2.5">
                                    <span className="inline-flex w-1.5 h-1.5 rounded-full shrink-0" style={{backgroundColor:'#0ea5e9'}}/>
                                    {isChanged && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="What‑If moved" />}
                                    <img
                                      src={`/static/img/teams/${teamSlug(row.team)}.png`}
                                      alt=""
                                      title={`slug: ${teamSlug(row.team)}`}
                                      className="w-5 h-5 object-contain shrink-0"
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
                                    <span className="transition-colors duration-200 truncate">{row.team}</span>
                                  </div>
                                </td>
                                <td className="sticky z-20 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm font-medium" style={{ left: `${teamColWidth}px`, minWidth: '72px', width: '72px' }}>{whatIfEnabled ? (simActualMap.get(row.team) ?? row.actual_position ?? '—') : (row.actual_position ?? '—')}</td>
                                {displayedUsers.map((e, userIndex) => {
                                  const isPinned = pinnedUserIds.includes(String(e.user.id));
                                  const preds = e.user.categories?.['Regular Season Standings']?.predictions || [];
                                  const p = preds.find(x => x.team === row.team);
                                  const pts = whatIfEnabled ? standingPoints(p?.predicted_position, simActualMap.get(row.team)) : (p?.points || 0);
                                  const predPos = p?.predicted_position ?? '—';
                                  const color = pts >= 3 ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30' : pts >= 1 ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
                                  const leftPos = teamColWidth + 72 + (userIndex * 108);
                                  return (
                                    <td key={`c-${e.user.id}-${row.team}`} className={`px-3 py-2.5 border-b border-slate-100 dark:border-slate-700/50 ${isPinned ? 'sticky z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-sm' : ''}`} style={isPinned ? { left: `${leftPos}px`, minWidth: '108px', width: '108px' } : { minWidth: '108px', width: '108px' }}>
                                      <div className="flex justify-center">
                                        <div className="relative inline-block group">
                                          <span className={`inline-block min-w-[80px] text-center px-2.5 py-1.5 rounded-md border text-xs font-medium ${color}`} title={`Pred: ${predPos}`}>{predPos}</span>
                                          {pts > 0 && (
                                            <span className={`absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-md border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${pts>=3 ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-800 dark:text-emerald-200 dark:border-emerald-700' : 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-800 dark:text-amber-200 dark:border-amber-700'}`}>+{pts}</span>
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

            {/* Mobile Grid - Users as rows, Teams as columns */}
            <div className="md:hidden max-h-[60vh] overflow-y-auto">
              {/* West Conference */}
              {(() => {
                const westTeams = westOrder.length
                  ? westOrder.map(it => ({ team: it.team, conference: 'West', actual_position: standingsTeams.find(r => r.team === it.team)?.actual_position }))
                  : standingsTeams.filter(r => (r.conference || '').toLowerCase().startsWith('w'));

                return (
                  <div className="border-t border-slate-200 dark:border-slate-700">
                    <div className="sticky top-0 z-10 bg-rose-50/95 dark:bg-rose-400/15 backdrop-blur-sm px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                      <button onClick={() => setCollapsedWest(v => !v)} className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-700 dark:text-slate-300 font-semibold">
                        <span className={`inline-block transition-transform duration-200 ${collapsedWest ? '-rotate-90' : 'rotate-0'}`}>▾</span>
                        Western Conference
                      </button>
                    </div>
                    {!collapsedWest && (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-50/95 dark:bg-slate-800/95">
                            <tr>
                              <th className="sticky left-0 z-20 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm px-2 py-2 text-left text-[10px] font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-700/60 w-[80px]">User</th>
                              <th className="px-1 py-2 text-center text-[10px] font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-700/60 w-[32px]">Pts</th>
                              {westTeams.map((row, idx) => (
                                <th key={`mobile-west-h-${row.team}`} className="px-1 py-2 text-center border-b border-slate-200/80 dark:border-slate-700/60 w-[48px]">
                                  <div className="flex flex-col items-center gap-0.5">
                                    <img
                                      src={`/static/img/teams/${teamSlug(row.team)}.png`}
                                      alt={row.team}
                                      className="w-6 h-6 object-contain"
                                      onError={(e) => {
                                        const img = e.currentTarget;
                                        const slug = teamSlug(row.team);
                                        const step = parseInt(img.dataset.step || '0', 10);
                                        if (step === 0) { img.dataset.step = '1'; img.src = `/static/img/teams/${slug}.svg`; return; }
                                        if (step === 1) { img.dataset.step = '2'; img.src = `/static/img/teams/${slug}.PNG`; return; }
                                        if (step === 2) { img.dataset.step = '3'; img.src = `/static/img/teams/${slug}.SVG`; return; }
                                        img.onerror = null; img.src = '/static/img/teams/unknown.svg';
                                      }}
                                    />
                                    <span className="text-[9px] text-slate-600 dark:text-slate-400 font-medium">
                                      {whatIfEnabled ? (simActualMap.get(row.team) ?? row.actual_position ?? '—') : (row.actual_position ?? '—')}
                                    </span>
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {displayedUsers.map((e, userIdx) => {
                              const preds = e.user.categories?.['Regular Season Standings']?.predictions || [];
                              const standPts = e.user.categories?.['Regular Season Standings']?.points || 0;
                              return (
                                <tr key={`mobile-west-u-${e.user.id}`} className={userIdx % 2 === 0 ? 'bg-white/80 dark:bg-slate-800/60' : 'bg-white/50 dark:bg-slate-800/40'}>
                                  <td className="sticky left-0 z-10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm px-2 py-2 border-b border-slate-100 dark:border-slate-700/50 w-[80px]">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                        {(e.user.display_name || e.user.username).slice(0, 2).toUpperCase()}
                                      </div>
                                      <span className="text-[10px] font-medium text-slate-800 dark:text-slate-200 truncate">
                                        {(e.user.display_name || e.user.username).slice(0, 10)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-1 py-2 text-center text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 border-b border-slate-100 dark:border-slate-700/50 w-[32px]">
                                    {standPts}
                                  </td>
                                  {westTeams.map(row => {
                                    const p = preds.find(x => x.team === row.team);
                                    const pts = whatIfEnabled ? standingPoints(p?.predicted_position, simActualMap.get(row.team)) : (p?.points || 0);
                                    const predPos = p?.predicted_position ?? '—';
                                    const color = pts >= 3 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-300' : pts >= 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/30 dark:text-amber-300' : 'bg-slate-50 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400';
                                    return (
                                      <td key={`mobile-west-c-${e.user.id}-${row.team}`} className="px-1 py-2 border-b border-slate-100 dark:border-slate-700/50">
                                        <div className="flex justify-center">
                                          <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${color}`}>
                                            {predPos}
                                          </span>
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* East Conference */}
              {(() => {
                const eastTeams = eastOrder.length
                  ? eastOrder.map(it => ({ team: it.team, conference: 'East', actual_position: standingsTeams.find(r => r.team === it.team)?.actual_position }))
                  : standingsTeams.filter(r => (r.conference || '').toLowerCase().startsWith('e'));

                return (
                  <div className="border-t border-slate-200 dark:border-slate-700">
                    <div className="sticky top-0 z-10 bg-sky-50/95 dark:bg-sky-400/15 backdrop-blur-sm px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                      <button onClick={() => setCollapsedEast(v => !v)} className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-700 dark:text-slate-300 font-semibold">
                        <span className={`inline-block transition-transform duration-200 ${collapsedEast ? '-rotate-90' : 'rotate-0'}`}>▾</span>
                        Eastern Conference
                      </button>
                    </div>
                    {!collapsedEast && (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-50/95 dark:bg-slate-800/95">
                            <tr>
                              <th className="sticky left-0 z-20 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm px-2 py-2 text-left text-[10px] font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-700/60 w-[80px]">User</th>
                              <th className="px-1 py-2 text-center text-[10px] font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-700/60 w-[32px]">Pts</th>
                              {eastTeams.map((row, idx) => (
                                <th key={`mobile-east-h-${row.team}`} className="px-1 py-2 text-center border-b border-slate-200/80 dark:border-slate-700/60 w-[48px]">
                                  <div className="flex flex-col items-center gap-0.5">
                                    <img
                                      src={`/static/img/teams/${teamSlug(row.team)}.png`}
                                      alt={row.team}
                                      className="w-6 h-6 object-contain"
                                      onError={(e) => {
                                        const img = e.currentTarget;
                                        const slug = teamSlug(row.team);
                                        const step = parseInt(img.dataset.step || '0', 10);
                                        if (step === 0) { img.dataset.step = '1'; img.src = `/static/img/teams/${slug}.svg`; return; }
                                        if (step === 1) { img.dataset.step = '2'; img.src = `/static/img/teams/${slug}.PNG`; return; }
                                        if (step === 2) { img.dataset.step = '3'; img.src = `/static/img/teams/${slug}.SVG`; return; }
                                        img.onerror = null; img.src = '/static/img/teams/unknown.svg';
                                      }}
                                    />
                                    <span className="text-[9px] text-slate-600 dark:text-slate-400 font-medium">
                                      {whatIfEnabled ? (simActualMap.get(row.team) ?? row.actual_position ?? '—') : (row.actual_position ?? '—')}
                                    </span>
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {displayedUsers.map((e, userIdx) => {
                              const preds = e.user.categories?.['Regular Season Standings']?.predictions || [];
                              const standPts = e.user.categories?.['Regular Season Standings']?.points || 0;
                              return (
                                <tr key={`mobile-east-u-${e.user.id}`} className={userIdx % 2 === 0 ? 'bg-white/80 dark:bg-slate-800/60' : 'bg-white/50 dark:bg-slate-800/40'}>
                                  <td className="sticky left-0 z-10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm px-2 py-2 border-b border-slate-100 dark:border-slate-700/50 w-[80px]">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                        {(e.user.display_name || e.user.username).slice(0, 2).toUpperCase()}
                                      </div>
                                      <span className="text-[10px] font-medium text-slate-800 dark:text-slate-200 truncate">
                                        {(e.user.display_name || e.user.username).slice(0, 10)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-1 py-2 text-center text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 border-b border-slate-100 dark:border-slate-700/50 w-[32px]">
                                    {standPts}
                                  </td>
                                  {eastTeams.map(row => {
                                    const p = preds.find(x => x.team === row.team);
                                    const pts = whatIfEnabled ? standingPoints(p?.predicted_position, simActualMap.get(row.team)) : (p?.points || 0);
                                    const predPos = p?.predicted_position ?? '—';
                                    const color = pts >= 3 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-300' : pts >= 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/30 dark:text-amber-300' : 'bg-slate-50 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400';
                                    return (
                                      <td key={`mobile-east-c-${e.user.id}-${row.team}`} className="px-1 py-2 border-b border-slate-100 dark:border-slate-700/50">
                                        <div className="flex justify-center">
                                          <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${color}`}>
                                            {predPos}
                                          </span>
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Bottom what-if lists removed; main grid supports What‑If reordering */}

            {showWhatIfConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-5 transform-gpu transition-transform duration-200">
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
          <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-white/90 dark:bg-slate-800/80 shadow-lg transition-shadow hover:shadow-xl">
            <div className="px-3 py-3 md:px-4 md:py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Grid className="w-4 h-4" />
                <div className="text-sm font-bold">{fromSectionKey(section)}</div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select className="text-xs font-medium border border-slate-200/60 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300" onChange={(e)=>addUser(e.target.value)} value="">
                  <option value="">Add…</option>
                  {(withSimTotals||[])
                    .filter(e => !selectedUserIds.map(String).includes(String(e.user.id)))
                    .map(e => (
                      <option key={e.user.id} value={e.user.id}>{e.user.display_name || e.user.username}</option>
                  ))}
                </select>
                {loggedInUserId && (
                  <span className={pinPulseId===loggedInUserId? 'pin-pulse' : ''}>
                    <button
                      onClick={()=> {
                        if (!selectedUserIds.map(String).includes(loggedInUserId)) addUser(loggedInUserId);
                        togglePin(loggedInUserId);
                      }}
                      className={`text-xs font-semibold inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-all ${pinnedUserIds.includes(loggedInUserId)?'border-emerald-400/60 bg-emerald-50 text-emerald-700 dark:border-emerald-600/50 dark:bg-emerald-900/50 dark:text-emerald-300':'border-slate-200/60 bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700/50 dark:hover:bg-slate-700 dark:text-slate-300'}`}
                      title={pinnedUserIds.includes(loggedInUserId) ? 'Unpin my column' : (selectedUserIds.map(String).includes(loggedInUserId) ? 'Pin my column' : 'Add and pin my column')}
                    >
                      {pinnedUserIds.includes(loggedInUserId) ? 'Unpin Me' : 'Pin Me'}
                    </button>
                  </span>
                )}
                <button onClick={()=> setShowManagePlayers(true)} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200/60 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700/50 dark:hover:bg-slate-700 dark:text-slate-300 transition-all">Manage</button>
                <button onClick={()=>setShowAll(v=>!v)} className="text-xs font-semibold inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200/60 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700/50 dark:hover:bg-slate-700 dark:text-slate-300 transition-all">
                  {showAll ? (<><Minimize2 className="w-3.5 h-3.5" /> Collapse</>) : (<><Expand className="w-3.5 h-3.5" /> All</>)}
                </button>
              </div>
            </div>

            {/* Desktop Grid */}
            <div className="overflow-auto hidden md:block">
              <table className="min-w-full border-t border-slate-200 dark:border-slate-700" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '320px' }} />
                  {displayedUsers.map((_, idx) => (
                    <col key={`qa-${idx}`} style={{ width: '160px' }} />
                  ))}
                </colgroup>
                <thead className="bg-slate-50/95 dark:bg-slate-800/95 sticky top-0 z-20">
                  <tr>
                    <th className="sticky left-0 z-30 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm px-3 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-700/60" style={{minWidth:'320px', width: '320px'}}>Question</th>
                    {displayedUsers.map((e, index) => {
                      const catKey = fromSectionKey(section);
                      const catPts = e.user.categories?.[catKey]?.points || 0;
                      const totalPts = e.user.total_points || 0;
                      const isPinned = pinnedUserIds.includes(String(e.user.id));
                      const leftPos = 320 + (index * 160);
                      return (
                        <th key={`h2-${e.user.id}`} className={`px-2.5 py-2.5 text-center text-xs font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-700/60 align-top transition-all duration-200 ${isPinned ? 'sticky z-30 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-sm' : ''}`} style={isPinned ? { left: `${leftPos}px`, minWidth: '160px', width: '160px' } : { minWidth: '160px', width: '160px' }}>
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <span className="truncate max-w-[80px]">{e.user.display_name || e.user.username}</span>
                            <div className="flex items-center gap-1">
                              <button onClick={()=> togglePin(e.user.id)} title={isPinned? 'Unpin column':'Pin column'} className={`transition-all duration-200 ${isPinned ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'} ${pinPulseId===String(e.user.id)?'pin-pulse':''}`}>
                                {isPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
                              </button>
                              {!showAll && (
                                <button onClick={()=>setSelectedUserIds(prev => prev.filter(id => String(id)!==String(e.user.id)))} title="Remove from comparison" className="text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 transition-colors">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="mt-1.5 flex flex-col gap-0.5 text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                            <span className="inline-flex items-center justify-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {catPts}</span>
                            <span className="inline-flex items-center justify-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span> {totalPts}</span>
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
                        if (!qMap.has(p.question_id)) qMap.set(p.question_id, { id: p.question_id, text: p.question, is_finalized: p.is_finalized });
                      });
                    });
                    const qArr = Array.from(qMap.values()).sort((a,b)=> a.text.localeCompare(b.text));
                    return qArr.map((q, idx) => (
                      <tr key={`q-${q.id}`} className="odd:bg-white/80 even:bg-white/50 dark:odd:bg-slate-800/60 dark:even:bg-slate-800/40">
                        <td className="sticky left-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200" style={{ minWidth: '320px', width: '320px' }}>
                          <div className="flex items-center gap-2.5">
                            <span className="inline-flex items-center justify-center w-6 h-6 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 shrink-0">{idx+1}</span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200/60 bg-white text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 truncate" title={q.text}>
                              {q.text}
                              {q.is_finalized && <Lock className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0" title="Finalized" />}
                            </span>
                          </div>
                        </td>
                        {displayedUsers.map((e, userIndex) => {
                          const isPinned = pinnedUserIds.includes(String(e.user.id));
                          const preds = e.user.categories?.[catKey]?.predictions || [];
                          const p = preds.find(x => String(x.question_id) === String(q.id));
                          const pts = p?.points || 0;
                          const answerRaw = (p?.answer || '').toString();
                          const answer = answerRaw || '—';
                          const isYes = /^yes$/i.test(answerRaw);
                          const isNo = /^no$/i.test(answerRaw);
                          const isWrong = p?.correct === false;
                          const color = isWrong
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
                            : (pts > 0
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600');
                          const leftPos = 320 + (userIndex * 160);
                          return (
                        <td key={`q-${q.id}-${e.user.id}`} className={`px-3 py-2.5 ${isPinned ? 'sticky z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-sm' : ''}`} style={isPinned ? { left: `${leftPos}px`, minWidth: '160px', width: '160px' } : { minWidth: '160px', width: '160px' }}>
                          <div className="flex justify-center">
                            <div className="relative inline-block group">
                          <span className={`inline-flex items-center gap-1.5 max-w-[140px] truncate text-center px-2.5 py-1.5 rounded-md border text-xs font-medium ${color}`} title={`${answer}`}>
                                {isYes && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                                {isNo && <XCircle className="w-3.5 h-3.5 shrink-0" />}
                                <span className="truncate">{answer}</span>
                              </span>
                              {pts > 0 && (
                                <span
                                  className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-md border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-800 dark:text-emerald-200 dark:border-emerald-700"
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

            {/* Mobile Grid - Users as rows, Questions as columns */}
            <div className="md:hidden max-h-[60vh] overflow-y-auto">
              <div className="overflow-x-auto overflow-y-visible">
              {(() => {
                const catKey = fromSectionKey(section);
                const qMap = new Map();
                (displayedUsers || []).forEach(e => {
                  const preds = e.user.categories?.[catKey]?.predictions || [];
                  preds.forEach(p => {
                    if (!p.question_id) return;
                    if (!qMap.has(p.question_id)) qMap.set(p.question_id, { id: p.question_id, text: p.question, is_finalized: p.is_finalized });
                  });
                });
                const questions = Array.from(qMap.values()).sort((a, b) => a.text.localeCompare(b.text));

                return (
                  <table className="min-w-full border-t border-slate-200 dark:border-slate-700">
                    <thead className="bg-slate-50/95 dark:bg-slate-800/95 sticky top-0 z-10">
                      <tr>
                        <th className="sticky left-0 z-20 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm px-2 py-2 text-left text-[10px] font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-700/60 min-w-[80px]">User</th>
                        <th className="px-1 py-2 text-center text-[10px] font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-700/60 min-w-[32px]">Pts</th>
                        {questions.map((q, idx) => (
                          <th key={`mobile-q-h-${q.id}`} className="px-2 py-2 text-center border-b border-slate-200/80 dark:border-slate-700/60 min-w-[100px] max-w-[120px]">
                            <div className="flex flex-col items-center gap-1">
                              <span className="inline-flex items-center justify-center w-5 h-5 text-[9px] font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">
                                {idx + 1}
                              </span>
                              <span className="text-[9px] text-slate-600 dark:text-slate-400 font-medium text-center line-clamp-2" title={q.text}>
                                {q.text}
                              </span>
                              {q.is_finalized && (
                                <Lock className="w-3 h-3 text-amber-500 dark:text-amber-400" title="Finalized" />
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayedUsers.map((e, userIdx) => {
                        const preds = e.user.categories?.[catKey]?.predictions || [];
                        const catPts = e.user.categories?.[catKey]?.points || 0;
                        return (
                          <tr key={`mobile-qa-u-${e.user.id}`} className={userIdx % 2 === 0 ? 'bg-white/80 dark:bg-slate-800/60' : 'bg-white/50 dark:bg-slate-800/40'}>
                            <td className="sticky left-0 z-10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm px-2 py-2 border-b border-slate-100 dark:border-slate-700/50">
                              <div className="flex items-center gap-1.5 min-w-[80px]">
                                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                  {(e.user.display_name || e.user.username).slice(0, 2).toUpperCase()}
                                </div>
                                <span className="text-[10px] font-medium text-slate-800 dark:text-slate-200 truncate">
                                  {(e.user.display_name || e.user.username).slice(0, 10)}
                                </span>
                              </div>
                            </td>
                            <td className="px-1 py-2 text-center text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 border-b border-slate-100 dark:border-slate-700/50">
                              {catPts}
                            </td>
                            {questions.map(q => {
                              const p = preds.find(x => String(x.question_id) === String(q.id));
                              const pts = p?.points || 0;
                              const answerRaw = (p?.answer || '').toString();
                              const answer = answerRaw || '—';
                              const isYes = /^yes$/i.test(answerRaw);
                              const isNo = /^no$/i.test(answerRaw);
                              const isWrong = p?.correct === false;
                              const color = isWrong
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/30 dark:text-rose-300'
                                : (pts > 0
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-300'
                                  : 'bg-slate-50 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400');
                              return (
                                <td key={`mobile-qa-c-${e.user.id}-${q.id}`} className="px-1 py-2 border-b border-slate-100 dark:border-slate-700/50">
                                  <div className="flex justify-center">
                                    <span className={`inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-1 rounded max-w-[100px] truncate ${color}`} title={answer}>
                                      {isYes && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                                      {isNo && <XCircle className="w-3 h-3 shrink-0" />}
                                      <span className="truncate">{answer}</span>
                                    </span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Floating Top 3 card (simple) with delta */}
      {showManagePlayers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200/60 dark:border-slate-700 w-full max-w-lg p-0 max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-bold text-slate-800 dark:text-slate-200">Manage Players</div>
                <button onClick={()=> setShowManagePlayers(false)} className="px-3 py-1.5 rounded-lg border border-slate-200/60 bg-white hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 text-xs font-medium transition-colors">Close</button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={manageQuery} onChange={(e)=> setManageQuery(e.target.value)} placeholder="Search players" className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200/60 bg-white text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-teal-500/20 transition-all" />
                </div>
                <button onClick={()=> {
                  const ids = (withSimTotals||[])
                    .filter(e => !manageQuery.trim() || (e.user.display_name||e.user.username).toLowerCase().includes(manageQuery.toLowerCase()))
                    .map(e => String(e.user.id));
                  setSelectedUserIds(prev => Array.from(new Set([...prev.map(String), ...ids])));
                }} className="text-xs font-medium px-3 py-2 rounded-lg border border-slate-200/60 bg-white hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 transition-colors shrink-0">All</button>
                <button onClick={()=> {
                  const ids = new Set((withSimTotals||[])
                    .filter(e => !manageQuery.trim() || (e.user.display_name||e.user.username).toLowerCase().includes(manageQuery.toLowerCase()))
                    .map(e => String(e.user.id)));
                  setSelectedUserIds(prev => prev.filter(id => !ids.has(String(id))));
                }} className="text-xs font-medium px-3 py-2 rounded-lg border border-slate-200/60 bg-white hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 transition-colors shrink-0">Clear</button>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Selected {selectedUserIds.length}{pinnedUserIds.length? ` • Pinned ${pinnedUserIds.length}`:''}</div>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar p-3 grid grid-cols-1 gap-2">
              {(withSimTotals||[])
                .filter(e => !manageQuery.trim() || (e.user.display_name||e.user.username).toLowerCase().includes(manageQuery.toLowerCase()))
                .map(e => {
                  const id = String(e.user.id);
                  const isSel = selectedUserIds.map(String).includes(id);
                  const isPin = pinnedUserIds.map(String).includes(id);
                  return (
                    <div key={`drow-${id}`} className={`flex items-center justify-between rounded-xl border transition-all duration-200 ${isSel? 'border-emerald-300/80 bg-emerald-50/70 dark:border-emerald-700/60 dark:bg-emerald-900/30':'border-slate-200/60 bg-white dark:border-slate-800 dark:bg-slate-900'} px-3 py-2.5 hover:shadow-sm`}>
                      <label className="flex items-center gap-3 min-w-0 cursor-pointer">
                        <input type="checkbox" className="accent-emerald-600 w-4 h-4" checked={isSel} onChange={(ev)=> {
                          if (ev.target.checked) addUser(id); else setSelectedUserIds(prev => prev.filter(x => String(x)!==id));
                        }} />
                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold shrink-0">
                          {(e.user.display_name || e.user.username).slice(0,2).toUpperCase()}
                        </div>
                        <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{e.user.display_name || e.user.username}</span>
                      </label>
                      <button type="button" onClick={()=> togglePin(id)} title={isPin? 'Unpin':'Pin'} className={`px-2 py-1.5 rounded-lg border transition-all ${isPin? 'border-emerald-400/80 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300':'border-slate-300/60 bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700'} ${pinPulseId===id? 'pin-pulse':''}`}>
                        {isPin ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
      <div className="hidden md:block fixed bottom-4 right-4 z-40">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 backdrop-blur shadow-xl p-3 w-72 transition-shadow duration-200 hover:shadow-2xl">
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
