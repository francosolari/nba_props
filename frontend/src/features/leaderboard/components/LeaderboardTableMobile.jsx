import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { teamSlug, standingPoints, fromSectionKey } from '../utils/helpers';

export const LeaderboardTableMobile = ({
  section,
  displayedUsers,
  westOrder,
  eastOrder,
  setWestOrder,
  setEastOrder,
  whatIfEnabled,
  simActualMap,
  setShowWhatIfConfirm
}) => {
  const catKey = fromSectionKey(section);
  const [collapsedSections, setCollapsedSections] = useState(new Set());

  const toggleSection = (conf) => {
    const next = new Set(collapsedSections);
    if (next.has(conf)) next.delete(conf);
    else next.add(conf);
    setCollapsedSections(next);
  };

  const handleDragEnd = (res, conf) => {
    if (!res.destination || !whatIfEnabled) {
      if (!whatIfEnabled) setShowWhatIfConfirm(true);
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
    <div className="md:hidden pb-20">
      {section === 'standings' ? (
        <div className="overflow-x-auto no-scrollbar">
          <div className="min-w-max">
            {['West', 'East'].map(conf => {
              const teams = conf === 'West' ? westOrder : eastOrder;
              const isCollapsed = collapsedSections.has(conf);
              return (
                <div key={`m-${conf}`} className="mb-6 relative">
                  {/* Glass Sticky Conference Header - Buttons sticky to top */}
                  <button
                    onClick={() => toggleSection(conf)}
                    className="sticky left-0 top-0 z-30 px-4 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between min-w-full shadow-sm w-full transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
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

                  {!isCollapsed && (
                    <DragDropContext onDragEnd={(res) => handleDragEnd(res, conf)}>
                      <Droppable droppableId={`mobile-${conf.toLowerCase()}`} direction="horizontal">
                        {(provided) => (
                          <table ref={provided.innerRef} {...provided.droppableProps} className="border-collapse">
                            {/* Table Header - Sticky below the conference bar (approx 44px height) */}
                            <thead className="bg-white/95 dark:bg-slate-950/95 sticky top-[44px] z-20">
                              <tr>
                                <th className="sticky left-0 z-20 bg-white/95 dark:bg-slate-950/95 px-3 py-3 text-left border-b border-slate-200 dark:border-slate-800 w-[100px] backdrop-blur-sm">
                                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Player</span>
                                  <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-slate-100 dark:bg-slate-800" />
                                </th>
                                <th className="sticky left-[100px] z-20 bg-slate-50/95 dark:bg-slate-900/95 px-1 py-3 border-b border-slate-200 dark:border-slate-800 w-[42px] text-center backdrop-blur-sm shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                  <div className="flex flex-col items-center">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Pts</span>
                                    <div className="h-[14px]" /> {/* Spacer to align with team rows */}
                                  </div>
                                </th>
                                {teams.map((row, idx) => (
                                  <Draggable key={row.id} draggableId={`mobile-${row.id}`} index={idx} isDragDisabled={!whatIfEnabled}>
                                    {(prov, snap) => (
                                      <th ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} className={`px-1 py-3 border-b border-slate-200 dark:border-slate-800 w-14 text-center transition-all ${snap.isDragging ? 'bg-sky-50 dark:bg-sky-900/40 shadow-xl z-[60] scale-105 rounded-lg border-2 border-sky-400' : ''}`}>
                                        <div className="flex flex-col items-center gap-1">
                                          <div className="w-6 h-6 flex items-center justify-center bg-white dark:bg-slate-900 rounded-md shadow-sm border border-slate-100 dark:border-slate-800">
                                            <img src={`/static/img/teams/${teamSlug(row.team)}.png`} className="w-5 h-5 object-contain" alt="" />
                                          </div>
                                          <span className="text-[9px] font-black text-slate-400 leading-none">
                                            {whatIfEnabled ? (simActualMap.get(row.team) || row.actual_position) : (row.actual_position || '—')}
                                          </span>
                                        </div>
                                      </th>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {displayedUsers.map(e => {
                                const catPts = e.user.categories?.[catKey]?.points || 0;
                                return (
                                  <tr key={e.user.id}>
                                    {/* Pinned Player Name */}
                                    <td className="sticky left-0 z-10 bg-white dark:bg-slate-950 px-3 py-3 border-r border-slate-100 dark:border-slate-800">
                                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate block max-w-[90px]">{e.user.display_name || e.user.username}</span>
                                    </td>
                                    {/* Pinned Category Points */}
                                    <td className="sticky left-[100px] z-10 bg-slate-50/95 dark:bg-slate-900/95 text-center px-1 py-3 border-r border-slate-100 dark:border-slate-800 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                      <span className="text-[11px] font-black text-sky-600 dark:text-sky-400">{catPts}</span>
                                    </td>
                                    {/* Prediction Cells */}
                                    {teams.map(row => {
                                      const p = e.user.categories?.[catKey]?.predictions?.find(x => x.team === row.team);
                                      const pts = whatIfEnabled ? standingPoints(p?.predicted_position, simActualMap.get(row.team)) : (p?.points || 0);
                                      const predPos = p?.predicted_position ?? '—';

                                      let colorClass = "text-slate-400 dark:text-slate-600";
                                      if (pts === 3) colorClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20";
                                      if (pts === 1) colorClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20";
                                      if (pts === 0 && p) colorClass = "bg-rose-500/5 text-rose-500/70 dark:text-rose-400/70 ring-1 ring-inset ring-rose-500/10";

                                      return (
                                        <td key={row.id} className="px-1 py-2 text-center border-r border-slate-50 dark:border-slate-800/50 last:border-r-0 w-14">
                                          <div className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-[10px] font-black transition-all ${colorClass}`}>
                                            {predPos}
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </Droppable>
                    </DragDropContext>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Awards / Props Transposed Mobile View */
        <div className="overflow-x-auto no-scrollbar">
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
                <table className="border-collapse">
                  <thead className="bg-white/95 dark:bg-slate-950/95 sticky top-0 z-20">
                    <tr>
                      <th className="sticky left-0 z-20 bg-white dark:bg-slate-950 px-3 py-4 text-left border-b border-slate-200 dark:border-slate-800 w-[100px]">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Player</span>
                        <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-slate-100 dark:bg-slate-800" />
                      </th>
                      <th className="sticky left-[100px] z-20 bg-slate-50/95 dark:bg-slate-900/95 px-1 py-4 border-b border-slate-200 dark:border-slate-800 w-[42px] text-center shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Pts</span>
                      </th>
                      {questions.map((q, idx) => (
                        <th key={q.id} className="px-3 py-4 border-b border-slate-200 dark:border-slate-800 w-[140px] text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[8px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 rounded px-1.5 py-0.5 uppercase">Q{idx + 1}</span>
                            <span className="text-[9px] font-black text-slate-400 line-clamp-2 h-[24px] leading-tight uppercase tracking-tight">{q.text}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {displayedUsers.map(e => {
                      const catPts = e.user.categories?.[catKey]?.points || 0;
                      return (
                        <tr key={e.user.id}>
                          <td className="sticky left-0 z-10 bg-white dark:bg-slate-950 px-3 py-3.5 border-r border-slate-100 dark:border-slate-800">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate block max-w-[90px]">{e.user.display_name || e.user.username}</span>
                          </td>
                          <td className="sticky left-[100px] z-10 bg-slate-50/95 dark:bg-slate-900/95 text-center px-1 py-3.5 border-r border-slate-100 dark:border-slate-800 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                            <span className="text-[11px] font-black text-sky-600 dark:text-sky-400">{catPts}</span>
                          </td>
                          {questions.map(q => {
                            const p = e.user.categories?.[catKey]?.predictions?.find(x => x.question_id === q.id);
                            const ans = p?.answer || '—';
                            const isCorrect = p?.correct === true;
                            const isWrong = p?.correct === false;

                            let color = "text-slate-400 dark:text-slate-600";
                            if (isCorrect) color = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20";
                            if (isWrong) color = "bg-rose-500/5 text-rose-500/70 dark:text-rose-400/70 ring-1 ring-inset ring-rose-500/10";

                            return (
                              <td key={q.id} className="px-1 py-2.5 text-center border-r border-slate-50 dark:border-slate-800/50 last:border-r-0">
                                <div className={`inline-flex items-center justify-center px-2 py-1.5 rounded-md text-[10px] font-black transition-all ${color} truncate max-w-[100px]`}>
                                  {ans}
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
      )}
    </div>
  );
};
