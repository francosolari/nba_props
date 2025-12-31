import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
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
              return (
                <div key={`m-${conf}`} className="mb-6 relative">
                  {/* Glass Sticky Conference Header - Pins to top and left visible area */}
                  <div className="sticky left-0 top-[155px] z-50 px-4 py-2.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-y border-slate-200 dark:border-slate-800 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 min-w-full">
                     <div className={`w-1.5 h-4 rounded-full ${conf === 'West' ? 'bg-rose-500' : 'bg-sky-500'}`} />
                     <span className={conf === 'West' ? 'text-rose-600 dark:text-rose-400' : 'text-sky-600 dark:text-sky-400'}>{conf}ern Conference</span>
                  </div>

                  <DragDropContext onDragEnd={(res) => handleDragEnd(res, conf)}>
                    <Droppable droppableId={`mobile-${conf.toLowerCase()}`} direction="horizontal">
                      {(provided) => (
                        <table ref={provided.innerRef} {...provided.droppableProps} className="border-collapse">
                          {/* Table Header - Sticky below the conference bar */}
                          <thead className="bg-white/95 dark:bg-slate-950/95 sticky top-[193px] z-40">
                            <tr>
                              <th className="sticky left-0 z-50 bg-white dark:bg-slate-950 px-3 py-3 text-left border-b border-slate-200 dark:border-slate-800 w-[110px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">
                                <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Player</span>
                              </th>
                              <th className="sticky left-[110px] z-50 bg-slate-50/95 dark:bg-slate-900/95 px-1 py-3 border-b border-slate-200 dark:border-slate-800 w-[45px] text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">
                                <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Pts</span>
                              </th>
                              {teams.map((row, idx) => (
                                <Draggable key={row.id} draggableId={`mobile-${row.id}`} index={idx} isDragDisabled={!whatIfEnabled}>
                                  {(prov, snap) => (
                                    <th ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} className={`px-1 py-3 border-b border-slate-200 dark:border-slate-800 w-[60px] text-center transition-colors ${snap.isDragging ? 'bg-sky-100 dark:bg-sky-900/40 shadow-xl z-50 scale-110' : ''}`}>
                                      <div className="flex flex-col items-center gap-1.5">
                                        <img src={`/static/img/teams/${teamSlug(row.team)}.png`} className="w-5 h-5 object-contain" alt="" />
                                        <span className="text-[10px] font-black text-slate-400 leading-none">
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
                                  <td className="sticky left-0 z-30 bg-white dark:bg-slate-950 px-3 py-2.5 border-r border-slate-100 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">
                                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200 truncate block">{e.user.display_name || e.user.username}</span>
                                  </td>
                                  {/* Pinned Category Points */}
                                  <td className="sticky left-[110px] z-30 bg-slate-50/95 dark:bg-slate-900/95 text-center px-1 py-2.5 border-r border-slate-100 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">
                                    <span className="text-[12px] font-black text-sky-600 dark:text-sky-400">{catPts}</span>
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
                                      <td key={row.id} className="px-1 py-2 text-center border-r border-slate-50 dark:border-slate-800/50 last:border-r-0">
                                        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-[11px] font-black ${colorClass}`}>
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
              const questions = Array.from(qMap.values()).sort((a,b) => a.text.localeCompare(b.text));
              
              return (
                <table className="border-collapse">
                  <thead className="bg-white/95 dark:bg-slate-950/95 sticky top-[155px] z-40">
                    <tr>
                      <th className="sticky left-0 z-50 bg-white dark:bg-slate-950 px-3 py-3 text-left border-b border-slate-200 dark:border-slate-800 w-[110px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">
                        <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Player</span>
                      </th>
                      <th className="sticky left-[110px] z-50 bg-slate-50/95 dark:bg-slate-900/95 px-1 py-3 border-b border-slate-200 dark:border-slate-800 w-[45px] text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">
                        <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Pts</span>
                      </th>
                      {questions.map((q, idx) => (
                        <th key={q.id} className="px-2 py-3 border-b border-slate-200 dark:border-slate-800 w-[130px] text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 rounded-md px-2 py-0.5 mb-1.5">{idx+1}</span>
                            <span className="text-[9px] font-black text-slate-400 line-clamp-2 h-[24px] leading-tight uppercase tracking-tighter">{q.text}</span>
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
                          <td className="sticky left-0 z-30 bg-white dark:bg-slate-950 px-3 py-3 border-r border-slate-100 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">
                            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200 truncate block">{e.user.display_name || e.user.username}</span>
                          </td>
                          <td className="sticky left-[110px] z-30 bg-slate-50/95 dark:bg-slate-900/95 text-center px-1 py-3 border-r border-slate-100 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">
                            <span className="text-[12px] font-black text-sky-600 dark:text-sky-400">{catPts}</span>
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
