import React, { useLayoutEffect, useState, useRef, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { ChevronDown, Pin } from 'lucide-react';
import { standingPoints, fromSectionKey, extractLineValue } from '../utils/helpers';
import TeamLogo from '../../../components/TeamLogo';

export const LeaderboardTableMobile = ({
  section,
  displayedUsers,
  pinnedUserIds,
  togglePin,
  westOrder,
  eastOrder,
  setWestOrder,
  setEastOrder,
  whatIfEnabled,
  simActualMap,
  requestEnableWhatIf,
  toggleWhatIfAnswer,
  sortBy
}) => {
  const catKey = fromSectionKey(section);
  const isTotalSort = sortBy === 'total';
  const showTotalInPointsCell = whatIfEnabled || isTotalSort;
  const pointsColumnLabel = showTotalInPointsCell ? 'Tot' : 'Pts';
  const [collapsedSections, setCollapsedSections] = useState(new Set());
  const scrollRefs = useRef({ West: { header: null, data: null }, East: { header: null, data: null } });
  const nonStandingsScrollRefs = useRef({ header: null, data: null });
  const scrollSyncRef = useRef({
    West: { lockedTarget: null, rafId: 0, pending: null },
    East: { lockedTarget: null, rafId: 0, pending: null },
  });
  const nonStandingsSyncRef = useRef({ lockedTarget: null, rafId: 0, pending: null });
  const rowRefs = useRef(new Map());
  const previousRowPositions = useRef(new Map());
  const nonStandingsQuestions = useMemo(() => {
    const qMap = new Map();
    displayedUsers.forEach((entry) => {
      entry.user.categories?.[catKey]?.predictions?.forEach((prediction) => {
        if (!prediction.question_id) return;
        qMap.set(prediction.question_id, {
          id: prediction.question_id,
          text: prediction.question,
          is_finalized: prediction.is_finalized,
          line: prediction.line,
          outcome_type: prediction.outcome_type,
        });
      });
    });
    return Array.from(qMap.values()).sort((a, b) => a.text.localeCompare(b.text));
  }, [displayedUsers, catKey]);
  const formatPoints = (value) => {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return '0';
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
  };

  const toggleSection = (conf) => {
    const next = new Set(collapsedSections);
    if (next.has(conf)) next.delete(conf);
    else next.add(conf);
    setCollapsedSections(next);
  };

  const setRowRef = (rowKey) => (el) => {
    if (el) rowRefs.current.set(rowKey, el);
    else rowRefs.current.delete(rowKey);
  };

  useEffect(() => () => {
    ['West', 'East'].forEach((conf) => {
      const state = scrollSyncRef.current[conf];
      if (state?.rafId) window.cancelAnimationFrame(state.rafId);
    });
    if (nonStandingsSyncRef.current?.rafId) window.cancelAnimationFrame(nonStandingsSyncRef.current.rafId);
  }, []);

  const syncPairedScroll = (state, refs, source, scrollLeft) => {
    if (!state) return;

    // Ignore the mirrored scroll event we triggered ourselves.
    if (state.lockedTarget === source) {
      state.lockedTarget = null;
      return;
    }

    state.pending = { source, scrollLeft };
    if (state.rafId) return;

    state.rafId = window.requestAnimationFrame(() => {
      state.rafId = 0;
      const pending = state.pending;
      if (!pending) return;

      const targetKey = pending.source === 'header' ? 'data' : 'header';
      const target = refs?.[targetKey];
      if (!target) return;
      if (Math.abs(target.scrollLeft - pending.scrollLeft) < 0.5) return;

      state.lockedTarget = targetKey;
      target.scrollLeft = pending.scrollLeft;
    });
  };

  const syncConferenceScroll = (conf, source, scrollLeft) => {
    syncPairedScroll(scrollSyncRef.current[conf], scrollRefs.current?.[conf], source, scrollLeft);
  };

  const syncNonStandingsScroll = (source, scrollLeft) => {
    syncPairedScroll(nonStandingsSyncRef.current, nonStandingsScrollRefs.current, source, scrollLeft);
  };

  useLayoutEffect(() => {
    const nextPositions = new Map();
    rowRefs.current.forEach((node, key) => {
      if (!node) return;
      const rect = node.getBoundingClientRect();
      nextPositions.set(key, rect);
      const prev = previousRowPositions.current.get(key);
      if (!prev) return;
      const deltaY = prev.top - rect.top;
      if (Math.abs(deltaY) < 0.5) return;
      node.style.transition = 'none';
      node.style.transform = `translateY(${deltaY}px)`;
      window.requestAnimationFrame(() => {
        node.style.transition = 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)';
        node.style.transform = 'translateY(0)';
      });
    });
    previousRowPositions.current = nextPositions;
  }, [displayedUsers, pinnedUserIds, section]);

  const handleDragEnd = (res, conf) => {
    if (!res.destination) return;
    if (!whatIfEnabled) {
      requestEnableWhatIf();
      return;
    }
    const reorder = (list, from, to) => {
      const arr = Array.from(list);
      const [rem] = arr.splice(from, 1);
      arr.splice(to, 0, rem);
      return arr;
    };
    if (conf === 'West') setWestOrder(prev => reorder(prev, res.source.index, res.destination.index));
    else setEastOrder(prev => reorder(prev, res.source.index, res.destination.index));
  };

  return (
    <div className="md:hidden flex-1 min-h-0 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
      {section === 'standings' ? (
        <div className="space-y-6">
          {['West', 'East'].map(conf => {
            const teams = conf === 'West' ? westOrder : eastOrder;
            const isCollapsed = collapsedSections.has(conf);
            return (
              <div key={`m-${conf}`} className="relative">
                {/* Glass Sticky Conference Header - Buttons sticky to top */}
                <button
                  onClick={() => toggleSection(conf)}
                  className="sticky left-0 top-0 z-30 h-[44px] px-4 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between min-w-full shadow-sm w-full transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="flex items-center gap-2.5">
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                    <div className="flex items-center gap-2.5">
                      <div className={`w-1 h-3.5 rounded-full ${conf === 'West' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.4)]'}`} />
                      <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${conf === 'West' ? 'text-rose-600 dark:text-rose-400' : 'text-sky-600 dark:text-sky-400'}`}>{conf}ern Conference</span>
                    </div>
                  </div>
                  {!isCollapsed && <span className="text-[9px] text-slate-400 font-bold lowercase italic opacity-60">scroll &rarr;</span>}
                </button>

                <div
                  className={`transition-[max-height,opacity] duration-300 ease-out ${isCollapsed ? 'max-h-0 opacity-0 overflow-hidden pointer-events-none' : 'max-h-[9999px] opacity-100'}`}
                  aria-hidden={isCollapsed}
                >
                  <DragDropContext onDragEnd={(res) => handleDragEnd(res, conf)}>
                    <Droppable droppableId={`mobile-${conf.toLowerCase()}`} direction="horizontal">
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps}>
                          {/* Sticky team-logo header — lives OUTSIDE the overflow-x container
                              so that sticky top-[44px] resolves against the outer overflow-y-auto */}
                          <div className="sticky top-[44px] z-20">
                            <div className="relative bg-white/95 dark:bg-slate-950/95 border-b border-slate-200 dark:border-slate-800">
                              {/* Absolute overlay: Player + Pts labels — never scroll */}
                              <div className="absolute left-0 top-0 bottom-0 z-40 flex">
                                <div className="w-[100px] bg-white/95 dark:bg-slate-950/95 px-3 py-3 backdrop-blur-sm">
                                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Player</span>
                                  <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-slate-100 dark:bg-slate-800" />
                                </div>
                                <div className="w-[42px] bg-slate-50/95 dark:bg-slate-900/95 px-1 py-3 text-center backdrop-blur-sm shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                  <div className="flex flex-col items-center">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{pointsColumnLabel}</span>
                                    <div className="h-[14px]" />
                                  </div>
                                </div>
                              </div>
                              {/* Scrollable team logos — spacers keep teams aligned past the overlay */}
                              <div
                                ref={(el) => { scrollRefs.current[conf].header = el; }}
                                className="overflow-x-auto no-scrollbar overscroll-x-contain [-webkit-overflow-scrolling:touch]"
                                onScroll={(e) => {
                                  syncConferenceScroll(conf, 'header', e.currentTarget.scrollLeft);
                                }}
                              >
                                <div className="flex">
                                  <div className="flex-shrink-0 w-[100px]" />
                                  <div className="flex-shrink-0 w-[42px]" />
                                  {/* Draggable team columns */}
                                  {teams.map((row, idx) => {
                                  const isMoved = whatIfEnabled && simActualMap.has(row.team) && simActualMap.get(row.team) !== row.actual_position;
                                  return (
                                    <Draggable key={row.id} draggableId={`mobile-${row.id}`} index={idx} isDragDisabled={!whatIfEnabled}>
                                      {(prov, snap) => (
                                        <div
                                          ref={prov.innerRef}
                                          {...prov.draggableProps}
                                          {...prov.dragHandleProps}
                                          className={`flex-shrink-0 w-14 px-1 py-3 text-center transition-all backdrop-blur-sm ${
                                            snap.isDragging
                                              ? 'bg-sky-50 dark:bg-sky-900/40 shadow-xl z-[60] scale-105 rounded-lg border-2 border-sky-400'
                                              : isMoved
                                              ? 'bg-amber-50 dark:bg-amber-900/15'
                                              : 'bg-white/95 dark:bg-slate-950/95'
                                          }`}
                                        >
                                          <div className="flex flex-col items-center gap-1">
                                            <div className="w-6 h-6 flex items-center justify-center bg-white dark:bg-slate-900 rounded-md shadow-sm border border-slate-100 dark:border-slate-800">
                                              <TeamLogo className="w-5 h-5 object-contain" teamName={row.team} />
                                            </div>
                                            <span className="text-[9px] font-black text-slate-400 leading-none">
                                              {whatIfEnabled ? (simActualMap.get(row.team) || row.actual_position) : (row.actual_position || '—')}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                })}
                                {provided.placeholder}
                              </div>
                            </div>
                            </div>
                          </div>

                          {/* Scrollable player rows — syncs scrollLeft with the header above */}
                          <div
                            ref={(el) => { scrollRefs.current[conf].data = el; }}
                            className="overflow-x-auto no-scrollbar overscroll-x-contain [-webkit-overflow-scrolling:touch]"
                            onScroll={(e) => {
                              syncConferenceScroll(conf, 'data', e.currentTarget.scrollLeft);
                            }}
                          >
                            <div className="min-w-max">
                              {displayedUsers.map(e => {
                                const totalPoints = Number(e.user.total_points || 0);
                                const sectionPoints = Number(e.user.categories?.[catKey]?.points || 0);
                                const pointsDisplay = showTotalInPointsCell ? totalPoints : sectionPoints;
                                const totalDelta = whatIfEnabled && e.__orig_total_points != null
                                  ? totalPoints - Number(e.__orig_total_points || 0)
                                  : 0;
                                return (
                                  <div
                                    key={e.user.id}
                                    ref={setRowRef(`${conf}-${e.user.id}`)}
                                    className="flex border-b border-slate-100 dark:border-slate-800 will-change-transform"
                                  >
                                    {/* Sticky player name + pin */}
                                    <div className="flex-shrink-0 sticky left-0 z-10 w-[100px] px-2 py-2 border-r border-slate-100 dark:border-slate-800 flex items-center gap-1 bg-white dark:bg-slate-950">
                                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate flex-1 min-w-0">{e.user.display_name || e.user.username}</span>
                                      <button onClick={() => togglePin(e.user.id)} className={`flex-shrink-0 transition-all duration-200 ${pinnedUserIds.includes(String(e.user.id)) ? 'text-sky-500 scale-110' : 'text-slate-200 dark:text-slate-700 active:scale-95'}`}>
                                        <Pin className="w-3 h-3" />
                                      </button>
                                    </div>
                                    {/* Sticky category points */}
                                    <div className="flex-shrink-0 sticky left-[100px] z-10 w-[42px] bg-slate-50/95 dark:bg-slate-900/95 text-center px-1 py-2 border-r border-slate-100 dark:border-slate-800 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] flex items-center justify-center relative">
                                      <span className="text-[11px] font-black text-sky-600 dark:text-sky-400">{formatPoints(pointsDisplay)}</span>
                                      {whatIfEnabled && totalDelta !== 0 && (
                                        <span className={`absolute top-[2px] right-[2px] leading-none text-[8px] font-black ${totalDelta > 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                                          {totalDelta > 0 ? '▲' : '▼'}{formatPoints(Math.abs(totalDelta))}
                                        </span>
                                      )}
                                    </div>
                                    {/* Prediction cells */}
                                    {teams.map(row => {
                                      const p = e.user.categories?.[catKey]?.predictions?.find(x => x.team === row.team);
                                      const pts = whatIfEnabled ? standingPoints(p?.predicted_position, simActualMap.get(row.team)) : (p?.points || 0);
                                      const predPos = p?.predicted_position ?? '—';
                                      const isMoved = whatIfEnabled && simActualMap.has(row.team) && simActualMap.get(row.team) !== row.actual_position;

                                      let colorClass = "text-slate-400 dark:text-slate-600";
                                      if (pts === 3) colorClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20";
                                      if (pts === 1) colorClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20";
                                      if (pts === 0 && p) colorClass = "bg-rose-500/5 text-rose-500/70 dark:text-rose-400/70 ring-1 ring-inset ring-rose-500/10";

                                      return (
                                        <div key={row.id} className={`flex-shrink-0 w-14 px-1 py-1.5 text-center border-r border-slate-50 dark:border-slate-800/50 last:border-r-0 flex items-center justify-center ${isMoved ? 'bg-amber-50 dark:bg-amber-900/15' : ''}`}>
                                          <div className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-[10px] font-black transition-all duration-200 ${colorClass}`}>
                                            {predPos}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Awards / Props Transposed Mobile View */
        <div className="relative">
          {whatIfEnabled && (
            <div className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 z-40 rounded-full bg-slate-800/90 dark:bg-slate-200/90 px-3.5 py-1.5 text-[9px] font-semibold tracking-wide text-white dark:text-slate-900 shadow-lg backdrop-blur-sm animate-fade-in-up">
              Tap any answer to toggle correct / incorrect / reset
            </div>
          )}
          <div className="sticky top-0 z-30">
            <div className="relative bg-white/95 dark:bg-slate-950/95 border-b border-slate-200 dark:border-slate-800 backdrop-blur-sm">
              <div className="absolute left-0 top-0 bottom-0 z-40 flex">
                <div className="w-[100px] bg-white/95 dark:bg-slate-950/95 px-3 py-3 backdrop-blur-sm">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Player</span>
                  <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="w-[42px] bg-slate-50/95 dark:bg-slate-900/95 px-1 py-3 text-center backdrop-blur-sm shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{pointsColumnLabel}</span>
                </div>
              </div>
              <div
                ref={(el) => { nonStandingsScrollRefs.current.header = el; }}
                className="overflow-x-auto no-scrollbar overscroll-x-contain [-webkit-overflow-scrolling:touch]"
                onScroll={(e) => {
                  syncNonStandingsScroll('header', e.currentTarget.scrollLeft);
                }}
              >
                <div className="flex min-w-max">
                  <div className="flex-shrink-0 w-[100px]" />
                  <div className="flex-shrink-0 w-[42px]" />
                  {nonStandingsQuestions.map((q, idx) => (
                    <div key={q.id} className="flex-shrink-0 w-[160px] px-2 py-2.5 border-r border-slate-200 dark:border-slate-800 text-center bg-white/95 dark:bg-slate-950/95">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[8px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 rounded px-1.5 py-0.5 uppercase">Q{idx + 1}</span>
                        <span className="text-[9px] font-black text-slate-400 line-clamp-2 h-[26px] leading-tight uppercase tracking-tight">{q.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div
            ref={(el) => { nonStandingsScrollRefs.current.data = el; }}
            className="overflow-x-auto no-scrollbar relative overscroll-x-contain [-webkit-overflow-scrolling:touch]"
            onScroll={(e) => {
              syncNonStandingsScroll('data', e.currentTarget.scrollLeft);
            }}
          >
            <div className="min-w-max">
              {displayedUsers.map(e => {
                const totalPoints = Number(e.user.total_points || 0);
                const sectionPoints = Number(e.user.categories?.[catKey]?.points || 0);
                const pointsDisplay = showTotalInPointsCell ? totalPoints : sectionPoints;
                const totalDelta = whatIfEnabled && e.__orig_total_points != null
                  ? totalPoints - Number(e.__orig_total_points || 0)
                  : 0;
                return (
                  <div key={e.user.id} ref={setRowRef(`non-${e.user.id}`)} className="flex border-b border-slate-100 dark:border-slate-800 will-change-transform">
                    <div className="flex-shrink-0 sticky left-0 z-10 w-[100px] bg-white dark:bg-slate-950 px-2 py-2 border-r border-slate-100 dark:border-slate-800 flex items-center gap-1">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate flex-1 min-w-0">{e.user.display_name || e.user.username}</span>
                      <button onClick={() => togglePin(e.user.id)} className={`flex-shrink-0 transition-all duration-200 ${pinnedUserIds.includes(String(e.user.id)) ? 'text-sky-500 scale-110' : 'text-slate-200 dark:text-slate-700 active:scale-95'}`}>
                        <Pin className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex-shrink-0 sticky left-[100px] z-10 w-[42px] bg-slate-50/95 dark:bg-slate-900/95 text-center px-1 py-2 border-r border-slate-100 dark:border-slate-800 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] flex items-center justify-center relative">
                      <span className="text-[11px] font-black text-sky-600 dark:text-sky-400">{formatPoints(pointsDisplay)}</span>
                      {whatIfEnabled && totalDelta !== 0 && (
                        <span className={`absolute top-[2px] right-[2px] leading-none text-[8px] font-black ${totalDelta > 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                          {totalDelta > 0 ? '▲' : '▼'}{formatPoints(Math.abs(totalDelta))}
                        </span>
                      )}
                    </div>
                    {nonStandingsQuestions.map(q => {
                      const p = e.user.categories?.[catKey]?.predictions?.find(x => x.question_id === q.id);
                      const ans = p?.answer || '—';
                      const isCorrect = p?.correct === true;
                      const isWrong = p?.correct === false;
                      const isInteractive = whatIfEnabled && p?.question_id && ans !== '—';
                      const simulatedState = p?.__what_if_state;
                      const lineValue = extractLineValue(p, q.text);
                      const answerDisplay = lineValue && ans !== '—'
                        ? (String(ans).toLowerCase() === 'over' || String(ans).toLowerCase() === 'under'
                          ? `${ans} ${lineValue}`
                          : `${ans} (${lineValue})`)
                        : ans;

                      let color = "text-slate-400 dark:text-slate-600";
                      if (isCorrect) color = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20";
                      if (isWrong) color = "bg-rose-500/5 text-rose-500/70 dark:text-rose-400/70 ring-1 ring-inset ring-rose-500/10";

                      return (
                        <div key={q.id} className="flex-shrink-0 w-[160px] px-1 py-1.5 text-center border-r border-slate-50 dark:border-slate-800/50 last:border-r-0 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => isInteractive && toggleWhatIfAnswer(p.question_id, p.answer)}
                            className={`inline-flex items-center justify-center w-full px-2 py-1 rounded-md text-[10px] font-black transition-all ${color} whitespace-normal break-words line-clamp-2 max-h-[34px] ${
                              isInteractive ? 'cursor-pointer hover:brightness-95 hover:shadow-[inset_0_0_0_1px_rgba(148,163,184,0.35)] active:scale-[0.98]' : 'cursor-default'
                            } ${
                              simulatedState === 'correct'
                                ? 'ring-2 ring-emerald-400/50'
                                : simulatedState === 'incorrect'
                                ? 'ring-2 ring-rose-400/40'
                                : ''
                            }`}
                            title={isInteractive ? 'What-If: tap to toggle correct / incorrect / reset' : undefined}
                          >
                            {answerDisplay}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
