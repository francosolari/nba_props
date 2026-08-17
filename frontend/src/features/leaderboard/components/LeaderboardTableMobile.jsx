import React, { useLayoutEffect, useState, useRef, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { standingPoints, fromSectionKey, extractLineValue, isLockedPrediction } from '../utils/helpers';
import TeamLogo from '../../../components/TeamLogo';
import PlayerHeadshot from '../../../components/PlayerHeadshot';
import usePlayerHeadshots from '../hooks/usePlayerHeadshots';
import { StandingsLegend, CallsLegend } from './LeaderboardLegend';

const formatPoints = (value) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
};

const positionState = (points, hasPrediction) => {
  if (!hasPrediction) return 'is-empty';
  if (points === 3) return 'is-hit';
  if (points === 1) return 'is-near';
  return 'is-miss';
};

const answerState = (status) => {
  if (status === 'correct') return 'is-hit';
  if (status === 'partial') return 'is-near';
  if (status === 'incorrect') return 'is-miss';
  return 'is-open';
};

const settlementState = (prediction, simulating) => {
  if (simulating || !prediction) return '';
  return isLockedPrediction(prediction) ? 'is-settled' : 'is-inplay';
};

/**
 * Mobile orientation: participants are rows, teams and questions are swipable
 * columns. This is the deliberate transposition — a phone reads a short list of
 * people down the screen far better than 30 team rows, and the fixed left zone
 * keeps rank, name and the score What-If is moving pinned in place.
 *
 * Conferences are a switch rather than two stacked collapsibles, so a single
 * vertical field holds one full conference at a time.
 */
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
  sortBy,
  loggedInUserId,
}) => {
  const catKey = fromSectionKey(section);
  const isStandings = section === 'standings';
  const isTotalSort = sortBy === 'total';
  const showTotalInPointsCell = whatIfEnabled || isTotalSort;
  const pointsColumnLabel = showTotalInPointsCell ? 'Tot' : 'Pts';

  const [conference, setConference] = useState('West');
  const headerScrollRef = useRef(null);
  const dataScrollRef = useRef(null);
  const syncStateRef = useRef({ lockedTarget: null, rafId: 0, pending: null });
  const rowRefs = useRef(new Map());
  const previousRowPositions = useRef(new Map());

  const teams = conference === 'West' ? westOrder : eastOrder;

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

  const isAwardsSection = section === 'awards';
  const headshotsByName = usePlayerHeadshots(isAwardsSection);

  const setRowRef = (rowKey) => (el) => {
    if (el) rowRefs.current.set(rowKey, el);
    else rowRefs.current.delete(rowKey);
  };

  useEffect(() => () => {
    if (syncStateRef.current?.rafId) window.cancelAnimationFrame(syncStateRef.current.rafId);
  }, []);

  // Keep the carbon column head and the participant rows on the same
  // scrollLeft without either fighting the other's scroll event.
  const syncScroll = (source, scrollLeft) => {
    const state = syncStateRef.current;
    if (!state) return;
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
      const target = targetKey === 'header' ? headerScrollRef.current : dataScrollRef.current;
      if (!target) return;
      if (Math.abs(target.scrollLeft - pending.scrollLeft) < 0.5) return;
      state.lockedTarget = targetKey;
      target.scrollLeft = pending.scrollLeft;
    });
  };

  // FLIP: rows slide to their new place when sorting or pinning reorders them.
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
  }, [displayedUsers, pinnedUserIds, section, conference]);

  const handleDragEnd = (res) => {
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
    if (conference === 'West') setWestOrder((prev) => reorder(prev, res.source.index, res.destination.index));
    else setEastOrder((prev) => reorder(prev, res.source.index, res.destination.index));
  };

  const ParticipantCell = ({ entry, rank }) => {
    const totalPoints = Number(entry.user.total_points || 0);
    const sectionPoints = Number(entry.user.categories?.[catKey]?.points || 0);
    const pointsDisplay = showTotalInPointsCell ? totalPoints : sectionPoints;
    const totalDelta = whatIfEnabled && entry.__orig_total_points != null
      ? totalPoints - Number(entry.__orig_total_points || 0)
      : 0;
    const isPinned = pinnedUserIds.includes(String(entry.user.id));

    return (
      <button
        type="button"
        onClick={() => togglePin(entry.user.id)}
        aria-pressed={isPinned}
        aria-label={`${isPinned ? 'Unpin' : 'Pin'} ${entry.user.display_name || entry.user.username}`}
        className="court-adv-mfixed"
      >
        <span className="court-adv-mfixed__rank">{rank}</span>
        <span className="court-adv-mfixed__body">
          <span className="court-adv-mfixed__name">{entry.user.display_name || entry.user.username}</span>
          <span className="court-adv-mfixed__score">
            {formatPoints(pointsDisplay)}
            <small>{pointsColumnLabel}</small>
            {totalDelta !== 0 && (
              <span className={`court-adv-delta ${totalDelta > 0 ? 'is-up' : 'is-down'}`}>
                {totalDelta > 0 ? '+' : '−'}{formatPoints(Math.abs(totalDelta))}
              </span>
            )}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="court-adv-mobile">
      {isStandings && (
        <div className="court-adv-switch" role="tablist" aria-label="Conference">
          {['West', 'East'].map((conf) => (
            <button
              key={conf}
              type="button"
              role="tab"
              data-conf={conf}
              aria-selected={conference === conf}
              onClick={() => setConference(conf)}
              className={conference === conf ? 'is-active' : ''}
            >
              {conf}ern Conference
            </button>
          ))}
        </div>
      )}

      {isStandings ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId={`mobile-${conference.toLowerCase()}`} direction="horizontal">
            {(provided, dropSnapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`court-drop-ledger ${dropSnapshot.isDraggingOver ? 'is-dragging-over' : ''}`}
              >
                <div className="court-adv-mhead">
                  <span className="court-adv-mhead__fixed">Player · {pointsColumnLabel}</span>
                  <div
                    ref={headerScrollRef}
                    onScroll={(e) => syncScroll('header', e.currentTarget.scrollLeft)}
                    className="court-ledger-scroll"
                  >
                    <div className="flex">
                      {teams.map((row, idx) => {
                        const simRank = simActualMap.get(row.team);
                        const isMoved = whatIfEnabled && simActualMap.has(row.team) && simRank !== row.actual_position;
                        return (
                          <Draggable
                            key={row.id}
                            draggableId={`mobile-${row.id}`}
                            index={idx}
                            isDragDisabled={!whatIfEnabled}
                          >
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                title={row.team}
                                className={`court-adv-mteam court-adv-colgrip ${snap.isDragging ? 'is-dragging' : ''} ${isMoved ? 'is-moved' : ''}`}
                              >
                                <TeamLogo teamName={row.team} />
                                <span className="court-adv-mteam__rank">
                                  {isMoved ? (
                                    <>
                                      <del>{row.actual_position}</del>
                                      <strong>{simRank}</strong>
                                    </>
                                  ) : (row.actual_position || '—')}
                                </span>
                                <span className="sr-only">
                                  {row.team}
                                  {isMoved ? `, moved from ${row.actual_position} to ${simRank}` : ''}
                                </span>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  </div>
                </div>

                <div
                  ref={dataScrollRef}
                  onScroll={(e) => syncScroll('data', e.currentTarget.scrollLeft)}
                  className="court-ledger-scroll"
                >
                  <div className="min-w-max">
                    {displayedUsers.map((entry, index) => (
                      <div
                        key={entry.user.id}
                        ref={setRowRef(`${conference}-${entry.user.id}`)}
                        className={`court-adv-mrow ${String(entry.user.id) === String(loggedInUserId) ? 'is-me' : ''}`}
                      >
                        <ParticipantCell entry={entry} rank={index + 1} />
                        {teams.map((row) => {
                          const p = entry.user.categories?.[catKey]?.predictions?.find((x) => x.team === row.team);
                          const simRank = simActualMap.get(row.team);
                          const pts = whatIfEnabled ? standingPoints(p?.predicted_position, simRank) : (p?.points || 0);
                          const predPos = p?.predicted_position ?? '—';
                          const isMoved = whatIfEnabled && simActualMap.has(row.team) && simRank !== row.actual_position;
                          return (
                            <div key={row.id} className={`court-adv-mcell ${isMoved ? 'is-moved' : ''}`}>
                              <span
                                className={`court-ticket court-pos-ticket ${positionState(pts, Boolean(p))} ${settlementState(p, whatIfEnabled)}`}
                                title={p
                                  ? `${row.team}: predicted ${predPos} · ${pts} ${pts === 1 ? 'point' : 'points'}${whatIfEnabled ? '' : isLockedPrediction(p) ? ' · locked' : ' · in play'}`
                                  : `${row.team}: no prediction`}
                              >
                                {predPos}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <>
          <div className="court-adv-mhead court-adv-mhead--flush">
            <span className="court-adv-mhead__fixed">Player · {pointsColumnLabel}</span>
            <div
              ref={headerScrollRef}
              onScroll={(e) => syncScroll('header', e.currentTarget.scrollLeft)}
              className="court-ledger-scroll"
            >
              <div className="flex min-w-max">
                {nonStandingsQuestions.map((q, idx) => (
                  <div key={q.id} className="court-adv-mq">
                    <span className="court-adv-mq__index">Q{idx + 1}</span>
                    <span className="court-adv-mq__text" title={q.text}>{q.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            ref={dataScrollRef}
            onScroll={(e) => syncScroll('data', e.currentTarget.scrollLeft)}
            className="court-ledger-scroll"
          >
            <div className="min-w-max">
              {displayedUsers.map((entry, index) => (
                <div
                  key={entry.user.id}
                  ref={setRowRef(`non-${entry.user.id}`)}
                  className={`court-adv-mrow ${String(entry.user.id) === String(loggedInUserId) ? 'is-me' : ''}`}
                >
                  <ParticipantCell entry={entry} rank={index + 1} />
                  {nonStandingsQuestions.map((q) => {
                    const p = entry.user.categories?.[catKey]?.predictions?.find((x) => x.question_id === q.id);
                    const ans = p?.answer || '—';
                    const pts = p?.points || 0;
                    const scoreStatus = p?.score_status
                      || (p?.correct === true ? 'correct' : pts > 0 ? 'partial' : p?.correct === false ? 'incorrect' : 'pending');
                    const isInteractive = whatIfEnabled && p?.question_id && ans !== '—';
                    const simulatedState = p?.__what_if_state;
                    const lineValue = extractLineValue(p, q.text);
                    const answerDisplay = lineValue && ans !== '—'
                      ? (String(ans).toLowerCase() === 'over' || String(ans).toLowerCase() === 'under'
                        ? `${ans} ${lineValue}`
                        : `${ans} (${lineValue})`)
                      : ans;

                    return (
                      <div key={q.id} className="court-adv-mcell court-adv-mcell--wide">
                        <button
                          type="button"
                          onClick={() => isInteractive && toggleWhatIfAnswer(p.question_id, p.answer)}
                          disabled={!isInteractive}
                          className={`court-ticket court-answer-ticket ${answerState(scoreStatus)} ${settlementState(p, whatIfEnabled)} ${
                            isInteractive ? 'is-live' : ''
                          } ${simulatedState ? 'is-simulated' : ''}`}
                          title={isInteractive
                            ? 'What-If: tap to give this the win; the current leader drops to runner-up'
                            : (p ? `${pts} ${pts === 1 ? 'point' : 'points'}${isLockedPrediction(p) ? ' · locked' : ' · in play'}` : undefined)}
                        >
                          <span className="court-answer-ticket__figure">
                            {isAwardsSection && ans !== '—' && headshotsByName[ans] && (
                              <PlayerHeadshot headshotUrl={headshotsByName[ans]} name={ans} size={16} />
                            )}
                            {answerDisplay}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {isStandings ? <StandingsLegend /> : <CallsLegend />}
    </div>
  );
};
