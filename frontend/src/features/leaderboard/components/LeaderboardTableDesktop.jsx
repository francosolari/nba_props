import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Lock, Pin } from 'lucide-react';
import { teamSlug, standingPoints, fromSectionKey } from '../utils/helpers';

export const LeaderboardTableDesktop = ({
  section,
  displayedUsers,
  pinnedUserIds,
  togglePin,
  westOrder,
  eastOrder,
  setWestOrder,
  setEastOrder,
  whatIfEnabled,
  setShowWhatIfConfirm,
  simActualMap,
  leaderboardData
}) => {
  return (
    <div className="overflow-x-auto hidden md:block">
      <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
        <thead className="bg-slate-50/50 dark:bg-slate-800/50 sticky top-[109px] z-30 backdrop-blur-sm">
          <tr>
            <th className="sticky left-0 z-40 bg-slate-50 dark:bg-slate-800 px-6 py-4 text-left border-b border-slate-200 dark:border-slate-700 w-[220px]">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{section === 'standings' ? 'NBA Team' : 'Prediction'}</span>
            </th>
            <th className="px-1 py-4 border-b border-slate-200 dark:border-slate-700 w-[55px] text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">#</span>
            </th>
            {displayedUsers.map((e) => {
              const isPinned = pinnedUserIds.includes(String(e.user.id));
              return (
                <th key={e.user.id} className={`px-3 py-4 border-b border-slate-200 dark:border-slate-700 w-[125px] text-center group transition-colors ${isPinned ? 'bg-sky-50/30 dark:bg-sky-900/10' : ''}`}>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[85px]">{e.user.display_name || e.user.username}</span>
                      <button onClick={() => togglePin(e.user.id)} className={`transition-all ${isPinned ? 'text-indigo-600' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`}>
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-[14px] font-black text-sky-600 dark:text-sky-400 leading-none">{e.user.total_points}</div>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        {section === 'standings' ? (
          <>
            {['West', 'East'].map(conf => (
              <React.Fragment key={conf}>
                <tbody>
                  <tr>
                    <td colSpan={2 + displayedUsers.length} className="px-6 py-2 border-y border-slate-100 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/50">
                       <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${conf === 'West' ? 'text-rose-500' : 'text-sky-500'}`}>{conf}ern Conference</span>
                    </td>
                  </tr>
                </tbody>
                <DragDropContext onDragEnd={(res) => {
                  if (!res.destination || !whatIfEnabled) { if (!whatIfEnabled) setShowWhatIfConfirm(true); return; }
                  const reorder = (list, from, to) => {
                    const arr = Array.from(list); const [rem] = arr.splice(from, 1); arr.splice(to, 0, rem); return arr;
                  };
                  if (conf === 'West') setWestOrder(prev => reorder(prev, res.source.index, res.destination.index));
                  else setEastOrder(prev => reorder(prev, res.source.index, res.destination.index));
                }}>
                  <Droppable droppableId={conf.toLowerCase()}>
                    {(provided) => (
                      <tbody ref={provided.innerRef} {...provided.droppableProps} className="divide-y divide-slate-50 dark:divide-slate-800/50">
                        {(conf === 'West' ? westOrder : eastOrder).map((row, idx) => (
                          <Draggable key={row.id} draggableId={row.id} index={idx} isDragDisabled={!whatIfEnabled}>
                            {(prov, snap) => (
                              <tr ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} className={`transition-colors ${snap.isDragging ? 'bg-sky-50/50 dark:bg-sky-900/20 shadow-xl' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}>
                                <td className="sticky left-0 z-20 bg-white dark:bg-slate-900 px-6 py-2.5 border-r border-slate-100 dark:border-slate-800">
                                  <div className="flex items-center gap-3">
                                    <img src={`/static/img/teams/${teamSlug(row.team)}.png`} className="w-5 h-5 object-contain opacity-90" alt="" />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">{row.team}</span>
                                  </div>
                                </td>
                                <td className="text-center text-sm font-black text-slate-400 border-r border-slate-100 dark:border-slate-800">
                                  {whatIfEnabled ? (simActualMap.get(row.team) || row.actual_position) : (row.actual_position || '—')}
                                </td>
                                {displayedUsers.map(e => {
                                  const p = e.user.categories?.['Regular Season Standings']?.predictions?.find(x => x.team === row.team);
                                  const pts = whatIfEnabled ? standingPoints(p?.predicted_position, simActualMap.get(row.team)) : (p?.points || 0);
                                  const predPos = p?.predicted_position ?? '—';
                                  
                                  let colorClass = "text-slate-400 dark:text-slate-600";
                                  if (pts === 3) colorClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20";
                                  if (pts === 1) colorClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20";
                                  if (pts === 0 && p) colorClass = "bg-rose-500/5 text-rose-500/70 dark:text-rose-400/70 ring-1 ring-inset ring-rose-500/10";

                                  return (
                                    <td key={e.user.id} className="px-1.5 py-2 text-center group/cell relative">
                                      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-black transition-all ${colorClass}`}>
                                        {predPos}
                                      </div>
                                      {p && (
                                        <div className="absolute top-0 right-0 opacity-0 group-hover/cell:opacity-100 transition-opacity z-50 pointer-events-none">
                                          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black border shadow-md ${pts >= 3 ? 'bg-emerald-500 border-emerald-600 text-white' : pts >= 1 ? 'bg-amber-500 border-amber-600 text-white' : 'bg-slate-500 border-slate-600 text-white'}`}>
                                            {pts > 0 ? `+${pts}` : '0'}
                                          </span>
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </tbody>
                    )}
                  </Droppable>
                </DragDropContext>
              </React.Fragment>
            ))}
          </>
        ) : (
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {(() => {
              const catKey = fromSectionKey(section);
              const qMap = new Map();
              (leaderboardData || []).forEach(e => {
                e.user.categories?.[catKey]?.predictions?.forEach(p => {
                  if (p.question_id) qMap.set(p.question_id, { id: p.question_id, text: p.question, is_finalized: p.is_finalized });
                });
              });
              return Array.from(qMap.values()).sort((a,b) => a.text.localeCompare(b.text)).map((q, qIdx) => (
                <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="sticky left-0 z-20 bg-white dark:bg-slate-900 px-6 py-3 border-r border-slate-100 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-tight line-clamp-2">
                      {qIdx + 1}. {q.text}
                      {q.is_finalized && <Lock className="w-3 h-3 text-amber-500 inline ml-2" />}
                    </span>
                  </td>
                  <td className="border-r border-slate-100 dark:border-slate-800"></td>
                  {displayedUsers.map(e => {
                    const p = e.user.categories?.[catKey]?.predictions?.find(x => x.question_id === q.id);
                    const ans = p?.answer || '—';
                    const isCorrect = p?.correct === true;
                    const isWrong = p?.correct === false;
                    const pts = p?.points || 0;
                    
                    let color = "text-slate-400 dark:text-slate-600";
                    if (isCorrect) color = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20";
                    if (isWrong) color = "bg-rose-500/5 text-rose-500/70 dark:text-rose-400/70 ring-1 ring-inset ring-rose-500/10";

                    return (
                      <td key={e.user.id} className="px-2 py-3 text-center group/cell relative">
                        <div className={`inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-xs font-black transition-all ${color} min-w-[80px] max-w-[110px] truncate`}>
                          {ans}
                        </div>
                        {p && (
                          <div className="absolute top-0 right-0 opacity-0 group-hover/cell:opacity-100 transition-opacity z-50 pointer-events-none">
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black border shadow-md ${pts > 0 ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-slate-500 border-slate-600 text-white'}`}>
                              {pts > 0 ? `+${pts}` : '0'}
                            </span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ));
            })()}
          </tbody>
        )}
      </table>
    </div>
  );
};
