import React, { useState, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { ChevronDown, ChevronRight, FlaskConical, Pin } from 'lucide-react';
import { standingPoints, fromSectionKey } from '../utils/helpers';
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
  const [collapsedSections, setCollapsedSections] = useState(new Set());
  const scrollRefs = useRef({ West: { header: null, data: null }, East: { header: null, data: null } });

  const toggleSection = (conf) => {
    const next = new Set(collapsedSections);
    if (next.has(conf)) next.delete(conf);
    else next.add(conf);
    setCollapsedSections(next);
  };

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
    <div className="md:hidden flex-1 min-h-0 overflow-y-auto">
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
                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
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
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{isTotalSort ? 'Tot' : 'Pts'}</span>
                                    <div className="h-[14px]" />
                                  </div>
                                </div>
                              </div>
                              {/* Scrollable team logos — spacers keep teams aligned past the overlay */}
                              <div
                                ref={(el) => { scrollRefs.current[conf].header = el; }}
                                className="overflow-x-auto no-scrollbar"
                                onScroll={(e) => {
                                  const data = scrollRefs.current[conf].data;
                                  if (data && data.scrollLeft !== e.target.scrollLeft) data.scrollLeft = e.target.scrollLeft;
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
                            className="overflow-x-auto no-scrollbar"
                            onScroll={(e) => {
                              const header = scrollRefs.current[conf].header;
                              if (header && header.scrollLeft !== e.target.scrollLeft) header.scrollLeft = e.target.scrollLeft;
                            }}
                          >
                            <div className="min-w-max">
                              {displayedUsers.map(e => {
                                const pointsDisplay = isTotalSort ? (e.user.total_points || 0) : (e.user.categories?.[catKey]?.points || 0);
                                return (
                                  <div key={e.user.id} className="flex border-b border-slate-100 dark:border-slate-800">
                                    {/* Sticky player name + pin */}
                                    <div className="flex-shrink-0 sticky left-0 z-10 w-[100px] px-2 py-2 border-r border-slate-100 dark:border-slate-800 flex items-center gap-1 bg-white dark:bg-slate-950">
                                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate flex-1 min-w-0">{e.user.display_name || e.user.username}</span>
                                      <button onClick={() => togglePin(e.user.id)} className={`flex-shrink-0 transition-colors ${pinnedUserIds.includes(String(e.user.id)) ? 'text-sky-500' : 'text-slate-200 dark:text-slate-700'}`}>
                                        <Pin className="w-3 h-3" />
                                      </button>
                                    </div>
                                    {/* Sticky category points */}
                                    <div className="flex-shrink-0 sticky left-[100px] z-10 w-[42px] bg-slate-50/95 dark:bg-slate-900/95 text-center px-1 py-2 border-r border-slate-100 dark:border-slate-800 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] flex items-center justify-center">
                                      <span className="text-[11px] font-black text-sky-600 dark:text-sky-400">{pointsDisplay}</span>
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
                                          <div className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-[10px] font-black transition-all ${colorClass}`}>
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
        <div className="overflow-x-auto no-scrollbar">
          {whatIfEnabled && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700/80 dark:text-amber-300/80 bg-amber-50/70 dark:bg-amber-900/10 border-b border-amber-100/70 dark:border-amber-800/40">
              <FlaskConical className="w-3 h-3" />
              <span>Scenario Mode: Tap an answer to simulate it</span>
            </div>
          )}
          <div className="min-w-max px-0">
            {(() => {
              const qMap = new Map();
              displayedUsers.forEach(e => {
                e.user.categories?.[catKey]?.predictions?.forEach(p => {
                  if (p.question_id) qMap.set(p.question_id, { id: p.question_id, text: p.question, is_finalized: p.is_finalized });
                });
              });
              const questions = Array.from(qMap.values()).sort((a, b) => a.text.localeCompare(b.text));

              return (
                <table className="border-separate border-spacing-0">
                  <thead className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm">
                    <tr>
                      <th className="sticky left-0 z-40 bg-white/95 dark:bg-slate-950/95 px-3 py-3 text-left border-b border-slate-200 dark:border-slate-800 w-[100px] backdrop-blur-sm">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Player</span>
                        <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-slate-100 dark:bg-slate-800" />
                      </th>
                      <th className="sticky left-[100px] z-30 bg-slate-50/95 dark:bg-slate-900/95 px-1 py-3 border-b border-slate-200 dark:border-slate-800 w-[42px] text-center shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] backdrop-blur-sm">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{isTotalSort ? 'Tot' : 'Pts'}</span>
                      </th>
                      {questions.map((q, idx) => (
                        <th key={q.id} className="z-30 bg-white/95 dark:bg-slate-950/95 px-2 py-3 border-b border-slate-200 dark:border-slate-800 w-[160px] text-center backdrop-blur-sm">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[8px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 rounded px-1.5 py-0.5 uppercase">Q{idx + 1}</span>
                            <span className="text-[9px] font-black text-slate-400 line-clamp-2 h-[26px] leading-tight uppercase tracking-tight">{q.text}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {displayedUsers.map(e => {
                      const pointsDisplay = isTotalSort ? (e.user.total_points || 0) : (e.user.categories?.[catKey]?.points || 0);
                      return (
                        <tr key={e.user.id}>
                          <td className="sticky left-0 z-10 bg-white dark:bg-slate-950 px-2 py-2 border-r border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate flex-1 min-w-0">{e.user.display_name || e.user.username}</span>
                              <button onClick={() => togglePin(e.user.id)} className={`flex-shrink-0 transition-colors ${pinnedUserIds.includes(String(e.user.id)) ? 'text-sky-500' : 'text-slate-200 dark:text-slate-700'}`}>
                                <Pin className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="sticky left-[100px] z-10 bg-slate-50/95 dark:bg-slate-900/95 text-center px-1 py-2 border-r border-slate-100 dark:border-slate-800 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                            <span className="text-[11px] font-black text-sky-600 dark:text-sky-400">{pointsDisplay}</span>
                          </td>
                          {questions.map(q => {
                            const p = e.user.categories?.[catKey]?.predictions?.find(x => x.question_id === q.id);
                            const ans = p?.answer || '—';
                            const isCorrect = p?.correct === true;
                            const isWrong = p?.correct === false;
                            const isInteractive = whatIfEnabled && p?.question_id && ans !== '—';
                            const simulatedState = p?.__what_if_state;

                            let color = "text-slate-400 dark:text-slate-600";
                            if (isCorrect) color = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20";
                            if (isWrong) color = "bg-rose-500/5 text-rose-500/70 dark:text-rose-400/70 ring-1 ring-inset ring-rose-500/10";

                            return (
                              <td key={q.id} className="px-1 py-1.5 text-center border-r border-slate-50 dark:border-slate-800/50 last:border-r-0">
                                <button
                                  type="button"
                                  onClick={() => isInteractive && toggleWhatIfAnswer(p.question_id, p.answer)}
                                  className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-black transition-all ${color} whitespace-normal break-words line-clamp-2 max-w-[130px] ${
                                    isInteractive ? 'cursor-pointer hover:brightness-95 active:scale-[0.98] ring-1 ring-amber-300/50' : 'cursor-default'
                                  } ${
                                    simulatedState === 'correct'
                                      ? 'ring-2 ring-emerald-400/50'
                                      : simulatedState === 'incorrect'
                                      ? 'ring-2 ring-rose-400/40'
                                      : ''
                                  }`}
                                >
                                  {ans}
                                </button>
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
      )}
    </div>
  );
};
