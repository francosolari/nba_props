import React, { useLayoutEffect, useRef, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Lock, Pin, GripVertical, X } from 'lucide-react';
import { standingPoints, fromSectionKey, extractLineValue, isLockedPrediction } from '../utils/helpers';
import TeamLogo from '../../../components/TeamLogo';
import PlayerHeadshot from '../../../components/PlayerHeadshot';
import usePlayerHeadshots from '../hooks/usePlayerHeadshots';
import { StandingsLegend, CallsLegend } from './LeaderboardLegend';
import { AnswerKey } from './AnswerKey';

const formatPoints = (value) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return '0';
  return Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1).replace(/\.0$/, '');
};

const positionState = (points, hasPrediction) => {
  if (!hasPrediction) return 'is-empty';
  if (points === 3) return 'is-hit';
  if (points === 1) return 'is-near';
  return 'is-miss';
};

const ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th',
  '9th', '10th', '11th', '12th', '13th', '14th', '15th'];

const ordinal = (n) => ORDINALS[n] || `${n}th`;

/** How much room a seed has left, said in words for the record's tooltip. */
const describeRoom = (row) => {
  const range = row?.seed_range;
  if (!range) return `${row.team}: ${row.wins}\u2013${row.losses}`;
  const [best, worst] = range;
  const room = best === worst
    ? `seed settled at ${ordinal(best)}`
    : `can still finish ${ordinal(best)} to ${ordinal(worst)}`;
  return `${row.team}: ${row.wins}\u2013${row.losses}, ${room}`;
};

const answerState = (status) => {
  if (status === 'correct') return 'is-hit';
  if (status === 'partial') return 'is-near';
  if (status === 'incorrect') return 'is-miss';
  return 'is-open';
};

/* Whether the result behind a cell can still move. Suppressed during a scenario:
   the numbers on screen are hypothetical, so claiming any of them are locked
   would be a lie. */
const settlementState = (prediction, simulating) => {
  if (simulating || !prediction) return '';
  return isLockedPrediction(prediction) ? 'is-settled' : 'is-inplay';
};

/**
 * Desktop orientation: teams (or questions) are rows, participants are columns.
 * The fixed left ledger and the swipable participant columns are two panes with
 * a synchronised scrollLeft, which is what lets a row keep its drag handle in
 * place while the score columns move.
 */
export const LeaderboardTableDesktop = ({
  section,
  sortBy,
  displayedUsers,
  pinnedUserIds,
  togglePin,
  westOrder,
  eastOrder,
  setWestOrder,
  setEastOrder,
  whatIfEnabled,
  requestEnableWhatIf,
  toggleWhatIfAnswer,
  simActualMap,
  leaderboardData,
  removeUser,
}) => {
  const headerScrollRef = useRef(null);
  const westScrollRef = useRef(null);
  const eastScrollRef = useRef(null);
  const nonStandingsScrollRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);

  // FLIP: when sorting or pinning reorders the columns, carry the header cell
  // and every body cell of that participant across the gap instead of snapping.
  const tableRef = useRef(null);
  const colRefs = useRef(new Map());
  const prevColPositions = useRef(new Map());

  const setColRef = (userId) => (el) => {
    if (el) colRefs.current.set(String(userId), el);
    else colRefs.current.delete(String(userId));
  };

  useLayoutEffect(() => {
    const container = tableRef.current;
    if (!container) return;
    const nextPositions = new Map();
    const deltas = new Map();

    colRefs.current.forEach((node, key) => {
      if (!node) return;
      const rect = node.getBoundingClientRect();
      nextPositions.set(key, rect);
      const prev = prevColPositions.current.get(key);
      if (!prev) return;
      const deltaX = prev.left - rect.left;
      if (Math.abs(deltaX) >= 0.5) deltas.set(key, deltaX);
    });
    prevColPositions.current = nextPositions;

    if (deltas.size === 0) return;

    const cellsByUser = new Map();
    container.querySelectorAll('[data-col-user]').forEach((node) => {
      const uid = node.getAttribute('data-col-user');
      if (deltas.has(uid)) {
        if (!cellsByUser.has(uid)) cellsByUser.set(uid, []);
        cellsByUser.get(uid).push(node);
      }
    });

    deltas.forEach((deltaX, userId) => {
      const headerNode = colRefs.current.get(userId);
      const bodyCells = cellsByUser.get(userId) || [];
      const allNodes = headerNode ? [headerNode, ...bodyCells] : bodyCells;

      allNodes.forEach((node) => {
        node.style.transition = 'none';
        node.style.transform = `translateX(${deltaX}px)`;
      });

      requestAnimationFrame(() => {
        allNodes.forEach((node) => {
          node.style.transition = 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)';
          node.style.transform = 'translateX(0)';
        });
      });
    });
  }, [displayedUsers, pinnedUserIds, section]);

  const isStandingsSection = section === 'standings';

  const handleDragStart = (start) => setDraggingId(start.draggableId);

  const handleDragEnd = (result, conf) => {
    setDraggingId(null);
    if (!result.destination) return;
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
    if (conf === 'West') setWestOrder((prev) => reorder(prev, result.source.index, result.destination.index));
    else setEastOrder((prev) => reorder(prev, result.source.index, result.destination.index));
  };

  const syncHorizontalScroll = (sourceEl) => {
    const scrollLeft = sourceEl?.scrollLeft ?? 0;
    [headerScrollRef.current, westScrollRef.current, eastScrollRef.current, nonStandingsScrollRef.current]
      .forEach((el) => {
        if (el && el !== sourceEl && el.scrollLeft !== scrollLeft) el.scrollLeft = scrollLeft;
      });
  };

  const handleScroll = (event) => syncHorizontalScroll(event.currentTarget);

  const gripWidth = whatIfEnabled && isStandingsSection ? 26 : 0;
  const teamColWidth = 264;
  const rankColWidth = 62;
  const fixedColWidth = isStandingsSection ? gripWidth + teamColWidth + rankColWidth : 340;
  const userColWidth = isStandingsSection ? 128 : 188;

  const ROW_HEIGHT = isStandingsSection ? 54 : 72;
  const HEADER_HEIGHT = 58;

  const nonStandingsCategoryKey = React.useMemo(
    () => (isStandingsSection ? null : fromSectionKey(section)),
    [isStandingsSection, section]
  );
  const headerCategoryKey = React.useMemo(() => fromSectionKey(section), [section]);

  const nonStandingsQuestions = React.useMemo(() => {
    if (isStandingsSection) return [];
    const qMap = new Map();
    (leaderboardData || []).forEach((e) => {
      e.user.categories?.[nonStandingsCategoryKey]?.predictions?.forEach((p) => {
        if (p.question_id) {
          qMap.set(p.question_id, {
            id: p.question_id,
            text: p.question,
            is_finalized: p.is_finalized,
            is_locked: p.is_locked,
            correct_answer: p.correct_answer,
            runner_up_answer: p.runner_up_answer,
            line: p.line,
            outcome_type: p.outcome_type,
          });
        }
      });
    });
    return Array.from(qMap.values()).sort((a, b) => a.text.localeCompare(b.text));
  }, [isStandingsSection, leaderboardData, nonStandingsCategoryKey]);

  const isAwardsSection = section === 'awards';
  const headshotsByName = usePlayerHeadshots(isAwardsSection);
  const isTotalSort = sortBy === 'total';

  // Pinned participants already sort to the front, so the leading run of pinned
  // columns can stick to the left edge of the scrolling pane: pin someone and
  // they stay beside every team you swipe to.
  const pinnedPrefix = React.useMemo(() => {
    let count = 0;
    for (const e of displayedUsers) {
      if (!pinnedUserIds.includes(String(e.user.id))) break;
      count += 1;
    }
    return count;
  }, [displayedUsers, pinnedUserIds]);

  const stickyColProps = (index) => (index < pinnedPrefix
    ? { className: 'is-sticky', style: { left: index * userColWidth } }
    : { className: '', style: undefined });

  return (
    <div ref={tableRef} className="court-adv-desktop">
      {/* Column head — the participants being compared, stamped on carbon. */}
      <div className="court-ledger-head" style={{ height: HEADER_HEIGHT }}>
        <div
          className="court-ledger-head__label flex-none px-4"
          style={{ width: fixedColWidth, borderRight: '2px solid var(--court-paper)' }}
        >
          {isStandingsSection ? 'NBA Team' : 'Prediction'}
        </div>

        <div ref={headerScrollRef} onScroll={handleScroll} className="court-ledger-scroll">
          <div className="flex h-full" style={{ minWidth: displayedUsers.length * userColWidth }}>
            {displayedUsers.map((e, index) => {
              const isPinned = pinnedUserIds.includes(String(e.user.id));
              const sticky = stickyColProps(index);
              const pointsDisplay = isTotalSort
                ? (e.user.total_points || 0)
                : (e.user.categories?.[headerCategoryKey]?.points || 0);
              const delta = isTotalSort && whatIfEnabled && e.__orig_total_points != null
                ? (e.user.total_points - e.__orig_total_points)
                : 0;
              return (
                <div
                  key={e.user.id}
                  ref={setColRef(e.user.id)}
                  className={`court-adv-col ${sticky.className}`}
                  style={{ flex: `1 0 ${userColWidth}px`, ...sticky.style }}
                >
                  <span className="court-adv-col__name">
                    <span>{e.user.display_name || e.user.username}</span>
                    <button
                      type="button"
                      onClick={() => togglePin(e.user.id)}
                      className={`court-adv-pin ${isPinned ? 'is-pinned' : ''}`}
                      aria-pressed={isPinned}
                      aria-label={`${isPinned ? 'Unpin' : 'Pin'} ${e.user.display_name || e.user.username}`}
                    >
                      <Pin className="w-3 h-3" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeUser?.(e.user.id)}
                      className="court-adv-pin court-adv-drop"
                      aria-label={`Remove ${e.user.display_name || e.user.username} from the comparison`}
                      title="Remove from comparison"
                    >
                      <X className="w-3 h-3" strokeWidth={3} aria-hidden="true" />
                    </button>
                  </span>
                  <span className="court-adv-col__score">
                    {formatPoints(pointsDisplay)}
                    {delta !== 0 && (
                      <span className={`court-adv-delta ${delta > 0 ? 'is-up' : 'is-down'}`}>
                        {delta > 0 ? '+' : '−'}{formatPoints(Math.abs(delta))}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isStandingsSection ? (
        <>
          {['West', 'East'].map((conf) => {
            const teams = conf === 'West' ? westOrder : eastOrder;
            return (
              <DragDropContext
                key={conf}
                onDragStart={handleDragStart}
                onDragEnd={(res) => handleDragEnd(res, conf)}
              >
                <div
                  className={`court-conf-head ${conf === 'West' ? 'court-conf-head--west' : ''}`}
                  style={{ top: HEADER_HEIGHT }}
                >
                  {conf}ern Conference
                  {whatIfEnabled && <span className="court-conf-head__hint">Drag to reorder</span>}
                </div>

                <div className="flex w-full">
                  <Droppable droppableId={`${conf.toLowerCase()}-fixed`}>
                    {(provided, dropSnapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`court-ledger-fixed court-drop-ledger ${dropSnapshot.isDraggingOver ? 'is-dragging-over' : ''}`}
                        style={{ width: fixedColWidth }}
                      >
                        {teams.map((row, idx) => (
                          <Draggable key={row.id} draggableId={row.id} index={idx} isDragDisabled={!whatIfEnabled}>
                            {(prov, snap) => {
                              const simRank = simActualMap.get(row.team);
                              const isMoved = whatIfEnabled && simActualMap.has(row.team) && simRank !== row.actual_position;
                              const settledSeed = row.seed_range && row.seed_range[0] === row.seed_range[1];
                              return (
                                <div
                                  ref={prov.innerRef}
                                  {...prov.draggableProps}
                                  {...prov.dragHandleProps}
                                  className={`court-adv-row ${snap.isDragging ? 'is-dragging' : ''} ${isMoved ? 'is-moved' : ''}`}
                                  style={{
                                    height: ROW_HEIGHT,
                                    cursor: whatIfEnabled ? 'grab' : 'default',
                                    ...prov.draggableProps.style,
                                  }}
                                >
                                  {whatIfEnabled && (
                                    <span className="court-adv-grip" aria-hidden="true">
                                      <GripVertical className="w-4 h-4" />
                                    </span>
                                  )}
                                  <div className="court-adv-team" style={{ width: teamColWidth }}>
                                    <TeamLogo teamName={row.team} />
                                    <span className="court-adv-team__body">
                                      <span className="court-adv-team__name">{row.team}</span>
                                      {/* The record reads under the name rather than
                                          beside the rank, so the row carries one
                                          number per line. It stays through What-If:
                                          how much room a team has is exactly what
                                          decides whether a move is plausible. */}
                                      {row.wins != null && (
                                        <span
                                          className={`court-adv-record ${settledSeed ? 'is-settled' : ''}`}
                                          title={describeRoom(row)}
                                        >
                                          {row.wins}&#8211;{row.losses}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <div className="court-adv-rank">
                                    {isMoved ? (
                                      <>
                                        <del>{row.actual_position}</del>
                                        <span aria-hidden="true">→</span>
                                        <strong>{simRank}</strong>
                                        <span className="sr-only">moved from {row.actual_position} to {simRank}</span>
                                      </>
                                    ) : (row.actual_position || '—')}
                                  </div>
                                </div>
                              );
                            }}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>

                  <div
                    ref={conf === 'West' ? westScrollRef : eastScrollRef}
                    onScroll={handleScroll}
                    className="court-ledger-scroll"
                  >
                    <div className="flex flex-col" style={{ minWidth: displayedUsers.length * userColWidth }}>
                      {teams.map((row) => {
                        const simRank = simActualMap.get(row.team);
                        const isMoved = whatIfEnabled && simActualMap.has(row.team) && simRank !== row.actual_position;
                        return (
                          <div
                            key={row.id}
                            className={`court-adv-row ${draggingId === row.id || isMoved ? 'is-moved' : ''}`}
                            style={{ height: ROW_HEIGHT }}
                          >
                            {displayedUsers.map((e, index) => {
                              const sticky = stickyColProps(index);
                              const p = e.user.categories?.['Regular Season Standings']?.predictions?.find((x) => x.team === row.team);
                              const pts = whatIfEnabled ? standingPoints(p?.predicted_position, simRank) : (p?.points || 0);
                              const predPos = p?.predicted_position ?? '—';
                              return (
                                <div
                                  key={e.user.id}
                                  data-col-user={e.user.id}
                                  className={`court-adv-cell ${sticky.className}`}
                                  style={{ flex: `1 0 ${userColWidth}px`, ...sticky.style }}
                                >
                                  <span
                                    className={`court-ticket court-pos-ticket ${positionState(pts, Boolean(p))} ${settlementState(p, whatIfEnabled)}`}
                                    title={p
                                      ? `Predicted ${predPos} · ${pts} ${pts === 1 ? 'point' : 'points'}${whatIfEnabled ? '' : isLockedPrediction(p) ? ' · locked' : ' · in play'}`
                                      : 'No prediction'}
                                  >
                                    {predPos}
                                  </span>
                                  {p && (
                                    <span className={`court-adv-points ${positionState(pts, true)}`} aria-hidden="true">
                                      {pts > 0 ? `+${formatPoints(pts)}` : '0'}
                                    </span>
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
          })}
          <StandingsLegend />
        </>
      ) : (
        <>
          <div className="flex w-full">
            <div className="court-ledger-fixed" style={{ width: fixedColWidth }}>
              {nonStandingsQuestions.map((q) => (
                <div key={q.id} className="court-adv-row" style={{ height: ROW_HEIGHT }}>
                  <div className="court-adv-question" style={{ width: fixedColWidth }}>
                    <span className="court-adv-question__text">
                      {q.text}
                      {q.is_finalized && <Lock aria-label="Result final" />}
                    </span>
                    <AnswerKey prediction={q} />
                  </div>
                </div>
              ))}
            </div>

            <div ref={nonStandingsScrollRef} onScroll={handleScroll} className="court-ledger-scroll">
              <div className="flex flex-col" style={{ minWidth: displayedUsers.length * userColWidth }}>
                {nonStandingsQuestions.map((q) => (
                  <div key={q.id} className="court-adv-row" style={{ height: ROW_HEIGHT }}>
                    {displayedUsers.map((e, index) => {
                      const sticky = stickyColProps(index);
                      const p = e.user.categories?.[nonStandingsCategoryKey]?.predictions?.find((x) => x.question_id === q.id);
                      const ans = p?.answer || '—';
                      const pts = p?.points || 0;
                      const scoreStatus = p?.score_status
                        || (p?.correct === true ? 'correct' : pts > 0 ? 'partial' : p?.correct === false ? 'incorrect' : 'pending');
                      const lineValue = extractLineValue(p, q.text);
                      const answerDisplay = lineValue && ans !== '—'
                        ? (String(ans).toLowerCase() === 'over' || String(ans).toLowerCase() === 'under'
                          ? `${ans} ${lineValue}`
                          : `${ans} (${lineValue})`)
                        : ans;
                      const isInteractive = whatIfEnabled && p?.question_id && ans !== '—';
                      const simulatedState = p?.__what_if_state;

                      return (
                        <div
                          key={e.user.id}
                          data-col-user={e.user.id}
                          className={`court-adv-cell ${sticky.className}`}
                          style={{ flex: `1 0 ${userColWidth}px`, ...sticky.style }}
                        >
                          <button
                            type="button"
                            onClick={() => isInteractive && toggleWhatIfAnswer(p.question_id, p.answer)}
                            disabled={!isInteractive}
                            className={`court-ticket court-answer-ticket ${answerState(scoreStatus)} ${settlementState(p, whatIfEnabled)} ${
                              isInteractive ? 'is-live' : ''
                            } ${simulatedState ? 'is-simulated' : ''}`}
                            title={isInteractive
                              ? 'What-If: click to give this the win; the current leader drops to runner-up'
                              : (p ? `${pts} ${pts === 1 ? 'point' : 'points'}${isLockedPrediction(p) ? ' · locked' : ' · in play'}` : undefined)}
                          >
                            <span className="court-answer-ticket__figure">
                              {isAwardsSection && ans !== '—' && headshotsByName[ans] && (
                                <PlayerHeadshot headshotUrl={headshotsByName[ans]} name={ans} size={18} />
                              )}
                              {answerDisplay}
                            </span>
                          </button>
                          {p && (
                            <span className={`court-adv-points ${answerState(scoreStatus)}`} aria-hidden="true">
                              {pts > 0 ? `+${formatPoints(pts)}` : '0'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <CallsLegend />
        </>
      )}
    </div>
  );
};
