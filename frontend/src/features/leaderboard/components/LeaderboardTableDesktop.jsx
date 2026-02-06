import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Lock, Pin, GripVertical } from 'lucide-react';
import { standingPoints, fromSectionKey } from '../utils/helpers';
import TeamLogo from '../../../components/TeamLogo';

export const LeaderboardTableDesktop = ({
  section,
  displayedUsers,
  pinnedUserIds,
  pinPulseId,
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
  const headerScrollRef = React.useRef(null);
  const westScrollRef = React.useRef(null);
  const eastScrollRef = React.useRef(null);
  const nonStandingsScrollRef = React.useRef(null);
  const [draggingId, setDraggingId] = useState(null);

  const isStandingsSection = section === 'standings';

  const handleDragStart = (start) => {
    setDraggingId(start.draggableId);
  };

  const handleDragEnd = (result, conf) => {
    setDraggingId(null);
    if (!result.destination || !whatIfEnabled) {
      if (!whatIfEnabled) setShowWhatIfConfirm(true);
      return;
    }
    const reorder = (list, from, to) => {
      const arr = Array.from(list);
      const [rem] = arr.splice(from, 1);
      arr.splice(to, 0, rem);
      return arr;
    };
    if (conf === 'West') setWestOrder(prev => reorder(prev, result.source.index, result.destination.index));
    else setEastOrder(prev => reorder(prev, result.source.index, result.destination.index));
  };

  const syncHorizontalScroll = (sourceEl) => {
    const scrollLeft = sourceEl?.scrollLeft ?? 0;
    [
      headerScrollRef.current,
      westScrollRef.current,
      eastScrollRef.current,
      nonStandingsScrollRef.current
    ].forEach((el) => {
      if (el && el !== sourceEl && el.scrollLeft !== scrollLeft) {
        el.scrollLeft = scrollLeft;
      }
    });
  };

  const handleBodyScroll = (event) => {
    syncHorizontalScroll(event.currentTarget);
  };

  const handleHeaderScroll = (event) => {
    syncHorizontalScroll(event.currentTarget);
  };

  // Calculate total width for proper alignment
  const fixedColWidth = isStandingsSection ? 220 : 320;
  const rankColWidth = isStandingsSection ? 55 : 0;
  const userColWidth = isStandingsSection ? 125 : 190;

  // Fixed row height for perfect alignment
  const ROW_HEIGHT = isStandingsSection ? 44 : 56;
  const CONF_HEIGHT = 36;
  const HEADER_HEIGHT = 52;
  const nonStandingsCategoryKey = React.useMemo(
    () => (isStandingsSection ? null : fromSectionKey(section)),
    [isStandingsSection, section]
  );
  const nonStandingsQuestions = React.useMemo(() => {
    if (isStandingsSection) return [];
    const qMap = new Map();
    (leaderboardData || []).forEach((e) => {
      e.user.categories?.[nonStandingsCategoryKey]?.predictions?.forEach((p) => {
        if (p.question_id) {
          qMap.set(p.question_id, {
            id: p.question_id,
            text: p.question,
            is_finalized: p.is_finalized
          });
        }
      });
    });
    return Array.from(qMap.values()).sort((a, b) => a.text.localeCompare(b.text));
  }, [isStandingsSection, leaderboardData, nonStandingsCategoryKey]);

  return (
    <div className="hidden md:block w-full">
      {/* Sticky Header Row */}
      <div className="sticky top-[109px] z-[35] bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex" style={{ height: HEADER_HEIGHT }}>
          {/* Fixed left columns in header */}
          <div className="flex-shrink-0 flex bg-slate-50 dark:bg-slate-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
            <div className="px-6 flex items-center border-b border-r border-slate-200 dark:border-slate-700" style={{ width: fixedColWidth }}>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {section === 'standings' ? 'NBA Team' : 'Prediction'}
              </span>
            </div>
            {isStandingsSection && (
              <div className="w-[55px] flex items-center justify-center border-b border-r border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">#</span>
              </div>
            )}
          </div>

          {/* Scrollable user columns in header */}
          <div
            ref={headerScrollRef}
            onScroll={handleHeaderScroll}
            className="flex-1 overflow-x-auto no-scrollbar bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700"
          >
            <div className="flex h-full" style={{ minWidth: displayedUsers.length * userColWidth }}>
              {displayedUsers.map((e) => {
                const isPinned = pinnedUserIds.includes(String(e.user.id));
                const isPulse = String(e.user.id) === String(pinPulseId);
                return (
                  <div
                    key={e.user.id}
                    className={`flex-shrink-0 px-2 flex items-center justify-center group transition-all duration-300 ${
                      isPinned ? 'bg-sky-50 dark:bg-sky-900/30' : ''
                    } ${isPulse ? 'scale-110 bg-sky-100 dark:bg-sky-800/50 shadow-sm z-10' : ''}`}
                    style={{ width: userColWidth, viewTransitionName: `user-desktop-${e.user.id}` }}
                  >
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span
                          className={`text-[11px] font-bold text-slate-700 dark:text-slate-200 ${
                            isStandingsSection ? 'truncate max-w-[75px]' : 'leading-tight text-center max-w-[160px] line-clamp-2'
                          }`}
                        >
                          {e.user.display_name || e.user.username}
                        </span>
                        <button
                          onClick={() => togglePin(e.user.id)}
                          className={`transition-all ${isPinned ? 'text-sky-500' : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:text-sky-400'}`}
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-sm font-black text-sky-600 dark:text-sky-400">{e.user.total_points}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Table Body */}
      {isStandingsSection ? (
        // Standings section with drag-drop support
        ['West', 'East'].map(conf => {
          const teams = conf === 'West' ? westOrder : eastOrder;
          return (
            <DragDropContext
              key={conf}
              onDragStart={handleDragStart}
              onDragEnd={(res) => handleDragEnd(res, conf)}
            >
              {/* Conference Header */}
              <div className="flex w-full">
                <div
                  className="flex-shrink-0 px-6 flex items-center border-y border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-10"
                  style={{ width: fixedColWidth + rankColWidth, height: CONF_HEIGHT }}
                >
                  <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${conf === 'West' ? 'text-rose-500' : 'text-sky-500'}`}>
                    {conf}ern Conference
                  </span>
                  {whatIfEnabled && (
                    <span className="ml-auto text-[9px] text-slate-400 italic">Drag to reorder</span>
                  )}
                </div>
                <div className="flex-1 border-y border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50" style={{ height: CONF_HEIGHT }} />
              </div>

              {/* Team Rows with Drag-Drop */}
              <div className="flex w-full">
                {/* Fixed left columns - contains Droppable */}
                <Droppable droppableId={`${conf.toLowerCase()}-fixed`}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex-shrink-0 bg-white dark:bg-slate-900 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-10"
                      style={{ width: fixedColWidth + rankColWidth }}
                    >
                      {teams.map((row, idx) => (
                        <Draggable key={row.id} draggableId={row.id} index={idx} isDragDisabled={!whatIfEnabled}>
                          {(prov, snap) => {
                            const isMoved = whatIfEnabled && simActualMap.has(row.team) && simActualMap.get(row.team) !== row.actual_position;
                            return (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              className={`flex border-b border-slate-100 dark:border-slate-800/50 transition-all ${
                                snap.isDragging
                                  ? 'bg-sky-100 dark:bg-sky-900/40 shadow-lg ring-2 ring-sky-400 rounded-lg z-50'
                                  : draggingId === row.id
                                  ? 'bg-sky-50 dark:bg-sky-900/20'
                                  : isMoved
                                  ? 'bg-amber-100 dark:bg-amber-900/30 border-l-[3px] border-amber-400 cursor-grab'
                                  : whatIfEnabled
                                  ? 'hover:bg-amber-50/50 dark:hover:bg-amber-900/10 cursor-grab'
                                  : ''
                              }`}
                              style={{ height: ROW_HEIGHT, ...prov.draggableProps.style }}
                            >
                              {whatIfEnabled && (
                                <div className="w-6 flex items-center justify-center ml-1">
                                  <GripVertical className={`w-4 h-4 ${snap.isDragging ? 'text-sky-500' : isMoved ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`} />
                                </div>
                              )}
                              <div className={`${whatIfEnabled ? 'w-[194px]' : 'w-[220px]'} px-4 flex items-center gap-3`}>
                                <TeamLogo className="w-5 h-5 object-contain" teamName={row.team} />
                                <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">{row.team}</span>
                              </div>
                              <div className="w-[55px] flex items-center justify-center text-sm font-bold text-slate-400">
                                {whatIfEnabled ? (simActualMap.get(row.team) || row.actual_position) : (row.actual_position || '—')}
                              </div>
                            </div>
                          ); }}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* Scrollable data columns - synced with drag state */}
                <div
                  ref={conf === 'West' ? westScrollRef : eastScrollRef}
                  onScroll={handleBodyScroll}
                  className="flex-1 overflow-x-auto no-scrollbar"
                >
                  <div style={{ minWidth: displayedUsers.length * userColWidth }}>
                    {teams.map((row) => {
                      const isMoved = whatIfEnabled && simActualMap.has(row.team) && simActualMap.get(row.team) !== row.actual_position;
                      return (
                      <div
                        key={row.id}
                        className={`flex border-b border-slate-100 dark:border-slate-800/50 transition-colors ${
                          draggingId === row.id ? 'bg-sky-50 dark:bg-sky-900/20' : isMoved ? 'bg-amber-100 dark:bg-amber-900/30' : ''
                        }`}
                        style={{ height: ROW_HEIGHT }}
                      >
                        {displayedUsers.map(e => {
                          const p = e.user.categories?.['Regular Season Standings']?.predictions?.find(x => x.team === row.team);
                          const pts = whatIfEnabled ? standingPoints(p?.predicted_position, simActualMap.get(row.team)) : (p?.points || 0);
                          const predPos = p?.predicted_position ?? '—';

                          let colorClass = "text-slate-400 dark:text-slate-500";
                          if (pts === 3) colorClass = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30";
                          if (pts === 1) colorClass = "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30";
                          if (pts === 0 && p) colorClass = "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20";

                          return (
                            <div key={e.user.id} className="flex-shrink-0 flex items-center justify-center group/cell relative" style={{ width: userColWidth }}>
                              <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold transition-all ${colorClass}`}>
                                {predPos}
                              </div>
                              {p && (
                                <div className={`absolute -top-1 right-2 transition-opacity pointer-events-none z-20 ${whatIfEnabled ? 'opacity-100' : 'opacity-0 group-hover/cell:opacity-100'}`}>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm ${
                                    pts >= 3 ? 'bg-emerald-500 text-white' : pts >= 1 ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white'
                                  }`}>
                                    {pts > 0 ? `+${pts}` : '0'}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </DragDropContext>
          );
        })
      ) : (
        // Non-standings sections (awards, props) - no drag-drop
        <div className="flex w-full">
          {/* Fixed left columns */}
          <div className="flex-shrink-0 bg-white dark:bg-slate-900 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-10" style={{ width: fixedColWidth }}>
            {nonStandingsQuestions.map((q) => (
              <div key={q.id} className="flex border-b border-slate-100 dark:border-slate-800/50" style={{ height: ROW_HEIGHT }}>
                <div className="px-6 flex items-center" style={{ width: fixedColWidth }}>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 leading-tight line-clamp-2">
                    {q.text}
                    {q.is_finalized && <Lock className="w-3 h-3 text-amber-500 inline ml-1" />}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Scrollable data columns */}
          <div
            ref={nonStandingsScrollRef}
            onScroll={handleBodyScroll}
            className="flex-1 overflow-x-auto no-scrollbar"
          >
            <div style={{ minWidth: displayedUsers.length * userColWidth }}>
              {nonStandingsQuestions.map((q) => (
                <div key={q.id} className="flex border-b border-slate-100 dark:border-slate-800/50" style={{ height: ROW_HEIGHT }}>
                  {displayedUsers.map(e => {
                    const p = e.user.categories?.[nonStandingsCategoryKey]?.predictions?.find(x => x.question_id === q.id);
                    const ans = p?.answer || '—';
                    const isCorrect = p?.correct === true;
                    const isWrong = p?.correct === false;
                    const pts = p?.points || 0;

                    let color = "text-slate-400 dark:text-slate-500";
                    if (isCorrect) color = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30";
                    if (isWrong) color = "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20";

                    return (
                      <div key={e.user.id} className="flex-shrink-0 flex items-center justify-center group/cell relative px-2" style={{ width: userColWidth }}>
                        <div className={`inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg text-[10px] font-bold leading-tight text-center whitespace-normal break-words line-clamp-2 max-w-[170px] transition-all ${color}`}>
                          {ans}
                        </div>
                        {p && (
                          <div className="absolute -top-1 right-2 opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none z-20">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm ${
                              pts > 0 ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'
                            }`}>
                              {pts > 0 ? `+${pts}` : '0'}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
