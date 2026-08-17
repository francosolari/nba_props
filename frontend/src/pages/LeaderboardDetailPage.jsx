/* LeaderboardDetailPage.jsx */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useLeaderboard } from '../hooks';
import { standingPoints, fromSectionKey } from '../features/leaderboard/utils/helpers';

// Components
import { LeaderboardHeader } from '../features/leaderboard/components/LeaderboardHeader';
import { LeaderboardTableDesktop } from '../features/leaderboard/components/LeaderboardTableDesktop';
import { LeaderboardTableMobile } from '../features/leaderboard/components/LeaderboardTableMobile';
import { LeaderboardPodium } from '../features/leaderboard/components/LeaderboardPodium';
import { SimulationModal } from '../features/leaderboard/components/SimulationModal';
import { PlayerSelectionModal } from '../features/leaderboard/components/PlayerSelectionModal';
import { resolveTeamLogoSlug } from '../components/TeamLogo';
import LockedResultsSheet from '../components/LockedResultsSheet';

const WHAT_IF_INTRO_SESSION_KEY = 'leaderboard-what-if-intro-seen';

const toAnswerKey = (answer) => String(answer ?? '').trim().toLowerCase();

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────────────────────────────────────── */

function LeaderboardDetailPage({ seasonSlug: initialSeasonSlug = 'current' }) {
  const paramsRoot = document.getElementById('leaderboard-detail-root');
  const initialSection = paramsRoot?.getAttribute('data-initial-section') || 'standings';
  const initialUserId = paramsRoot?.getAttribute('data-initial-user-id') || '';
  const loggedInUsername = paramsRoot?.getAttribute('data-logged-in-username') || null;

  const [selectedSeason, setSelectedSeason] = useState(initialSeasonSlug);

  const { data: seasonsData } = useQuery({
    queryKey: ['seasons', 'user-participated'],
    queryFn: async () => {
      const res = await axios.get('/api/v2/seasons/user-participated');
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: leaderboardData, season: seasonInfo, isLoading, error } = useLeaderboard(selectedSeason);

  const [section, setSection] = useState(initialSection);
  const [showAll, setShowAll] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState(() => {
    const top = leaderboardData?.slice(0, 4).map(e => String(e.user.id)) || [];
    return Array.from(new Set([initialUserId, ...top])).filter(Boolean);
  });
  const [sortBy, setSortBy] = useState('total');
  const [query, setQuery] = useState('');
  const [whatIfEnabled, setWhatIfEnabled] = useState(false);
  const [showWhatIfConfirm, setShowWhatIfConfirm] = useState(false);
  const [hasSeenWhatIfIntro, setHasSeenWhatIfIntro] = useState(() => {
    try { return window.sessionStorage.getItem(WHAT_IF_INTRO_SESSION_KEY) === '1'; }
    catch (err) { console.warn('Failed to read what-if intro state:', err); return false; }
  });
  const [whatIfAnswerOverrides, setWhatIfAnswerOverrides] = useState({});
  const [pinnedUserIds, setPinnedUserIds] = useState([]);
  const [showManagePlayers, setShowManagePlayers] = useState(false);
  const [manageQuery, setManageQuery] = useState('');

  const loggedInEntry = useMemo(() => {
    if (!loggedInUsername) return undefined;
    return (leaderboardData || []).find(e => String(e.user.username) === String(loggedInUsername));
  }, [leaderboardData, loggedInUsername]);
  const loggedInUserId = loggedInEntry?.user?.id ? String(loggedInEntry.user.id) : null;
  const pinTargetUserId = loggedInUserId || String(initialUserId || '');
  const canPinLoggedInUser = Boolean(pinTargetUserId);
  const isPinMePinned = canPinLoggedInUser && pinnedUserIds.includes(pinTargetUserId);

  // Add logged-in user to selected set once when URL doesn't explicitly define users.
  const autoPinDone = useRef(false);
  useEffect(() => {
    if (!loggedInUserId || autoPinDone.current) return;
    autoPinDone.current = true;
    setPinnedUserIds((prev) => (prev.includes(loggedInUserId) ? prev : [loggedInUserId, ...prev]));
    const sp = new URLSearchParams(window.location.search);
    if (!sp.get('users')) {
      setSelectedUserIds(prev => prev.map(String).includes(loggedInUserId) ? prev : [loggedInUserId, ...prev]);
    }
  }, [loggedInUserId]);

  // Populate initial selection with top users when data first loads
  const [initialPopulated, setInitialPopulated] = useState(false);
  useEffect(() => {
    if (initialPopulated || !leaderboardData?.length) return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('users')) {
      setInitialPopulated(true);
      return; // URL has explicit users, don't override
    }
    const top4 = leaderboardData.slice(0, 4).map(e => String(e.user.id));
    setSelectedUserIds(prev => {
      const combined = new Set([...prev.map(String), ...top4]);
      return Array.from(combined);
    });
    setInitialPopulated(true);
  }, [leaderboardData, initialPopulated]);

  const standingsTeams = useMemo(() => {
    const catKey = 'Regular Season Standings';
    const byTeam = new Map();
    (leaderboardData || []).forEach(e => {
      const cat = e.user.categories?.[catKey];
      cat?.predictions?.forEach(p => {
        if (!p.team) return;
        const prev = byTeam.get(p.team) || { team: p.team, conference: p.conference, actual_position: p.actual_position };
        if (prev.actual_position == null || (p.actual_position && p.actual_position < prev.actual_position)) {
          prev.actual_position = p.actual_position;
        }
        byTeam.set(p.team, prev);
      });
    });
    const list = Array.from(byTeam.values());
    list.sort((a, b) => {
      const A = [a.conference === 'West' ? 0 : 1, a.actual_position || 999, a.team];
      const B = [b.conference === 'West' ? 0 : 1, b.actual_position || 999, b.team];
      return A[0] - B[0] || A[1] - B[1] || (A[2] > B[2] ? 1 : -1);
    });
    return list;
  }, [leaderboardData]);

  useEffect(() => {
    const seen = new Set();
    standingsTeams.forEach(({ team }) => {
      const slug = resolveTeamLogoSlug(team);
      if (!slug || seen.has(slug)) return;
      seen.add(slug);

      const svgImage = new Image();
      svgImage.src = `/static/img/teams/${slug}.svg`;
      svgImage.onerror = () => {
        const pngImage = new Image();
        pngImage.src = `/static/img/teams/${slug}.png`;
      };
    });
  }, [standingsTeams]);

  const [westOrder, setWestOrder] = useState([]);
  const [eastOrder, setEastOrder] = useState([]);

  const defaultStandingsOrders = useMemo(() => {
    const west = standingsTeams
      .filter(r => (r.conference || '').toLowerCase().startsWith('w'))
      .map(r => ({ id: `W-${r.team}`, team: r.team, conference: 'West', actual_position: r.actual_position }));
    const east = standingsTeams
      .filter(r => (r.conference || '').toLowerCase().startsWith('e'))
      .map(r => ({ id: `E-${r.team}`, team: r.team, conference: 'East', actual_position: r.actual_position }));
    return { west, east };
  }, [standingsTeams]);

  useEffect(() => {
    if (westOrder.length === 0 && defaultStandingsOrders.west.length > 0) setWestOrder(defaultStandingsOrders.west);
    if (eastOrder.length === 0 && defaultStandingsOrders.east.length > 0) setEastOrder(defaultStandingsOrders.east);
  }, [defaultStandingsOrders, westOrder.length, eastOrder.length]);

  const simActualMap = useMemo(() => {
    const map = new Map();
    westOrder.forEach((it, idx) => map.set(it.team, idx + 1));
    eastOrder.forEach((it, idx) => map.set(it.team, idx + 1));
    return map;
  }, [westOrder, eastOrder]);

  const questionPointValues = useMemo(() => {
    const pointByQuestion = new Map();
    (leaderboardData || []).forEach((entry) => {
      ['Player Awards', 'Props & Yes/No'].forEach((catKey) => {
        entry.user.categories?.[catKey]?.predictions?.forEach((prediction) => {
          if (!prediction?.question_id) return;
          const key = String(prediction.question_id);
          const candidate = Number(prediction.point_value || prediction.points || 0);
          if (!Number.isFinite(candidate)) return;
          pointByQuestion.set(key, Math.max(pointByQuestion.get(key) || 0, candidate));
        });
      });
    });
    return pointByQuestion;
  }, [leaderboardData]);

  // Superlatives pay second place too. The runner-up award isn't published as a
  // field, so it's read back off the graded data: the largest partial score any
  // participant earned on that question. Questions that have never paid partial
  // credit fall back to half the full value.
  const questionPartialValues = useMemo(() => {
    const partialByQuestion = new Map();
    (leaderboardData || []).forEach((entry) => {
      ['Player Awards', 'Props & Yes/No'].forEach((catKey) => {
        entry.user.categories?.[catKey]?.predictions?.forEach((prediction) => {
          if (!prediction?.question_id || prediction.score_status !== 'partial') return;
          const key = String(prediction.question_id);
          const candidate = Number(prediction.points || 0);
          if (!Number.isFinite(candidate) || candidate <= 0) return;
          partialByQuestion.set(key, Math.max(partialByQuestion.get(key) || 0, candidate));
        });
      });
    });
    return partialByQuestion;
  }, [leaderboardData]);

  // Where each question actually stands: the current leader and, on superlatives,
  // the current runner-up. Both come off the latest odds while an award is
  // unfinalized; the graded rows are the fallback for anything that reports
  // neither. A scenario starts from this, so promoting a new winner knows who it
  // is pushing down rather than wiping the question clean.
  const realOutcomes = useMemo(() => {
    const outcomes = new Map();
    (leaderboardData || []).forEach((entry) => {
      ['Player Awards', 'Props & Yes/No'].forEach((catKey) => {
        entry.user.categories?.[catKey]?.predictions?.forEach((prediction) => {
          if (!prediction?.question_id) return;
          const qid = String(prediction.question_id);
          const current = outcomes.get(qid) || { winner: null, partial: null, hasRunnerUp: false };
          const key = toAnswerKey(prediction.answer);

          if (prediction.leader_answer) current.winner = toAnswerKey(prediction.leader_answer);
          else if (!current.winner && prediction.score_status === 'correct') current.winner = key;

          if (prediction.runner_up_answer) {
            current.partial = toAnswerKey(prediction.runner_up_answer);
            current.hasRunnerUp = true;
          } else if (!current.partial && prediction.score_status === 'partial') {
            current.partial = key;
            current.hasRunnerUp = true;
          }

          outcomes.set(qid, current);
        });
      });
    });
    return outcomes;
  }, [leaderboardData]);

  const resetWhatIfState = useCallback(() => {
    setWhatIfAnswerOverrides({});
    setWestOrder(defaultStandingsOrders.west);
    setEastOrder(defaultStandingsOrders.east);
  }, [defaultStandingsOrders]);

  const disableWhatIf = useCallback(() => {
    setWhatIfEnabled(false);
    resetWhatIfState();
  }, [resetWhatIfState]);

  const requestEnableWhatIf = useCallback(() => {
    if (hasSeenWhatIfIntro) {
      setWhatIfEnabled(true);
      return;
    }
    setShowWhatIfConfirm(true);
  }, [hasSeenWhatIfIntro]);

  const handleEnableWhatIf = useCallback(() => {
    setWhatIfEnabled(true);
    setShowWhatIfConfirm(false);
    setHasSeenWhatIfIntro(true);
    try {
      window.sessionStorage.setItem(WHAT_IF_INTRO_SESSION_KEY, '1');
    } catch (err) {
      console.warn('Failed to save what-if intro state:', err);
    }
  }, []);

  const handleWhatIfToggle = useCallback(() => {
    if (whatIfEnabled) {
      disableWhatIf();
      return;
    }
    requestEnableWhatIf();
  }, [whatIfEnabled, disableWhatIf, requestEnableWhatIf]);

  const toggleWhatIfAnswer = useCallback((questionId, answerValue) => {
    if (!questionId) return;
    if (!whatIfEnabled) {
      requestEnableWhatIf();
    }
    const answerKey = toAnswerKey(answerValue);
    if (!answerKey || answerKey === '—') return;

    // First tap on an answer hands it the win, and the leader it displaces drops
    // to runner-up rather than out of the running. Tapping the same answer again
    // walks it round: winner -> out -> runner-up -> winner. Each slot is held by
    // one answer, so taking a slot takes it off whoever had it.
    setWhatIfAnswerOverrides((prev) => {
      const qid = String(questionId);
      const real = realOutcomes.get(qid) || { winner: null, partial: null, hasRunnerUp: false };
      const current = prev[qid] || { winner: real.winner, partial: real.partial, touched: [] };
      const touched = current.touched || [];

      const shown = current.winner === answerKey ? 'winner'
        : current.partial === answerKey ? 'partial'
          : 'out';
      // First tap hands the win over — unless the answer already holds it, in
      // which case there is nothing to promote and the tap walks the cycle on.
      const target = (!touched.includes(answerKey) && shown !== 'winner') ? 'winner'
        : shown === 'winner' ? 'out'
          : shown === 'out' ? 'partial'
            : 'winner';

      let winner = current.winner;
      let partial = current.partial;
      if (target === 'winner') {
        // Promoting displaces the sitting leader to second; whoever held second
        // is pushed out.
        partial = real.hasRunnerUp && winner && winner !== answerKey ? winner : null;
        winner = answerKey;
      } else if (target === 'partial') {
        if (winner === answerKey) winner = null;
        partial = real.hasRunnerUp ? answerKey : null;
      } else {
        if (winner === answerKey) winner = null;
        if (partial === answerKey) partial = null;
      }

      const next = { ...prev };
      if (winner === real.winner && partial === real.partial) delete next[qid];
      else next[qid] = { winner, partial, touched: touched.includes(answerKey) ? touched : [...touched, answerKey] };
      return next;
    });
  }, [whatIfEnabled, requestEnableWhatIf, realOutcomes]);

  const withSimTotals = useMemo(() => {
    if (!leaderboardData) return [];
    if (!whatIfEnabled) return leaderboardData;

    const applyAnswerOverrides = (category) => {
      if (!category?.predictions) return category;

      let categoryPoints = 0;
      const predictions = category.predictions.map((prediction) => {
        const qid = prediction?.question_id ? String(prediction.question_id) : null;
        const override = qid ? whatIfAnswerOverrides[qid] : undefined;
        const realPoints = Number(prediction.points || 0);
        const realStatus = prediction.score_status
          || (prediction.correct === true ? 'correct' : realPoints > 0 ? 'partial' : prediction.correct === false ? 'incorrect' : 'pending');

        if (!override) {
          categoryPoints += realPoints;
          return { ...prediction, score_status: realStatus, __what_if_state: undefined };
        }

        const pointValue = Number(prediction.point_value || questionPointValues.get(qid) || prediction.points || 0) || 0;
        const partialValue = Number(questionPartialValues.get(qid) ?? pointValue / 2) || 0;
        const answerKey = toAnswerKey(prediction.answer);
        const isWinner = answerKey === override.winner;
        const isRunnerUp = !isWinner && answerKey === override.partial;

        const points = isWinner ? pointValue : isRunnerUp ? partialValue : 0;
        const scoreStatus = isWinner ? 'correct' : isRunnerUp ? 'partial' : 'incorrect';

        categoryPoints += points;
        return {
          ...prediction,
          points,
          correct: isWinner,
          score_status: scoreStatus,
          // Only cells the scenario actually moved are marked, so the gold
          // binding stays a record of the change rather than a wash over the
          // whole question.
          __what_if_state: isWinner ? 'winner'
            : isRunnerUp ? 'partial'
              : (scoreStatus === realStatus ? undefined : 'changed'),
        };
      });

      return { ...category, points: categoryPoints, predictions };
    };

    return leaderboardData.map((entry) => {
      const originalCategories = entry.user.categories || {};
      const standingsCat = originalCategories['Regular Season Standings'];
      const awardsCat = originalCategories['Player Awards'];
      const propsCat = originalCategories['Props & Yes/No'];

      let simStandPts = Number(standingsCat?.points || 0);
      let simStandings = standingsCat;
      if (standingsCat?.predictions) {
        simStandings = {
          ...standingsCat,
          predictions: standingsCat.predictions.map((prediction) => {
            const points = standingPoints(prediction.predicted_position, simActualMap.get(prediction.team));
            return { ...prediction, points };
          }),
        };
        simStandPts = simStandings.predictions.reduce((sum, prediction) => sum + Number(prediction.points || 0), 0);
        simStandings.points = simStandPts;
      }

      const simAwards = applyAnswerOverrides(awardsCat);
      const simProps = applyAnswerOverrides(propsCat);

      const categories = { ...originalCategories };
      if (simStandings) categories['Regular Season Standings'] = simStandings;
      if (simAwards) categories['Player Awards'] = simAwards;
      if (simProps) categories['Props & Yes/No'] = simProps;

      const simTotalPoints = Object.values(categories).reduce((sum, category) => sum + Number(category?.points || 0), 0);

      return {
        ...entry,
        __orig_total_points: entry.user.total_points,
        user: {
          ...entry.user,
          total_points: simTotalPoints,
          categories
        },
      };
    }).sort((a, b) => (b.user.total_points || 0) - (a.user.total_points || 0));
  }, [leaderboardData, whatIfEnabled, simActualMap, whatIfAnswerOverrides, questionPointValues, questionPartialValues]);

  const displayedUsers = useMemo(() => {
    const base = showAll ? withSimTotals : selectedUserIds.map(id => withSimTotals.find(e => String(e.user.id) === String(id))).filter(Boolean);
    let arr = base.slice();
    const sortCategoryKey = fromSectionKey(section);
    if (sortBy === 'total') arr.sort((a, b) => (b.user.total_points || 0) - (a.user.total_points || 0));
    if (sortBy === 'section' || sortBy === 'standings') {
      arr.sort((a, b) => {
        const aCategoryPoints = a.user.categories?.[sortCategoryKey]?.points || 0;
        const bCategoryPoints = b.user.categories?.[sortCategoryKey]?.points || 0;
        return (bCategoryPoints - aCategoryPoints) || ((b.user.total_points || 0) - (a.user.total_points || 0));
      });
    }
    if (sortBy === 'name') arr.sort((a, b) => (a.user.display_name || a.user.username).localeCompare(b.user.display_name || b.user.username));
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter(e => (e.user.display_name || e.user.username).toLowerCase().includes(q));
    }
    const pinSet = new Set(pinnedUserIds.map(String));
    arr.sort((a, b) => (pinSet.has(String(b.user.id)) ? 1 : 0) - (pinSet.has(String(a.user.id)) ? 1 : 0));
    return arr;
  }, [withSimTotals, selectedUserIds, showAll, sortBy, query, pinnedUserIds, section]);

  const addUser = (id) => setSelectedUserIds(prev => Array.from(new Set([...prev, String(id)])));

  // Removing straight from the column head. While the board is showing everyone,
  // dropping one player means "everyone except them", so the scope narrows to a
  // real selection rather than silently doing nothing.
  const removeUser = useCallback((id) => {
    const target = String(id);
    setPinnedUserIds(prev => prev.filter(x => String(x) !== target));
    if (showAll) {
      setSelectedUserIds((withSimTotals || [])
        .map(e => String(e.user.id))
        .filter(x => x !== target));
      setShowAll(false);
      return;
    }
    setSelectedUserIds(prev => prev.filter(x => String(x) !== target));
  }, [showAll, withSimTotals]);

  const togglePin = (id) => {
    setPinnedUserIds(prev => prev.includes(String(id)) ? prev.filter(x => String(x) !== String(id)) : [...prev, String(id)]);
  };
  const handleTogglePinMe = useCallback(() => {
    if (!pinTargetUserId) return;
    setPinnedUserIds((prev) => {
      const wasPinned = prev.includes(pinTargetUserId);
      if (!wasPinned) {
        setSelectedUserIds((current) => (current.map(String).includes(pinTargetUserId) ? current : [pinTargetUserId, ...current]));
        return [pinTargetUserId, ...prev];
      }
      return prev.filter((id) => String(id) !== String(pinTargetUserId));
    });
  }, [pinTargetUserId]);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    sp.set('section', section);
    if (selectedUserIds.length) sp.set('users', selectedUserIds.join(',')); else sp.delete('users');
    sp.set('sortBy', sortBy);
    if (query) sp.set('q', query); else sp.delete('q');
    sp.set('wi', whatIfEnabled ? '1' : '0');
    sp.set('all', showAll ? '1' : '0');
    window.history.replaceState(null, '', `${window.location.pathname}?${sp.toString()}`);
  }, [section, selectedUserIds, sortBy, query, whatIfEnabled, showAll]);

  if (isLoading) {
    return (
      <div className="court-adv-state">
        <strong>Opening the board</strong>
        <span>Pulling every prediction for {selectedSeason === 'current' ? 'this season' : selectedSeason}.</span>
      </div>
    );
  }

  // Entries stay sealed until the submission window closes. The API already
  // returns nothing while it is open; this is what the participant reads instead
  // of an empty comparison.
  if (seasonInfo?.submissions_open && seasonInfo?.submission_end_date) {
    return (
      <LockedResultsSheet
        title="Stat Sheet Locked"
        description="Other players' picks stay sealed while predictions are open. Check back later!"
        submissionEndDate={seasonInfo.submission_end_date}
        seasonsData={seasonsData}
        selectedSeason={selectedSeason}
        setSelectedSeason={setSelectedSeason}
      />
    );
  }

  if (error) {
    return (
      <div className="court-adv-state court-adv-state--error">
        <strong>The board did not load</strong>
        <span>{String(error?.message || error)}</span>
      </div>
    );
  }

  return (
    <div className="court-adv">
      <LeaderboardHeader
        selectedSeason={selectedSeason}
        seasonsData={seasonsData}
        setSelectedSeason={setSelectedSeason}
        section={section}
        setSection={setSection}
        query={query}
        setQuery={setQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
        selectedCount={selectedUserIds.length}
        showAll={showAll}
        onOpenRoster={() => setShowManagePlayers(true)}
      />

      <LeaderboardPodium
        whatIfEnabled={whatIfEnabled}
        withSimTotals={withSimTotals}
        loggedInUserId={canPinLoggedInUser ? pinTargetUserId : null}
        isPinMePinned={isPinMePinned}
        onTogglePinMe={handleTogglePinMe}
        onToggleWhatIf={handleWhatIfToggle}
        section={section}
      />

      <main className="court-adv-work">
        {displayedUsers.length === 0 ? (
          <div className="court-adv-empty">
            <strong>No players on the sheet</strong>
            <span>
              {query.trim()
                ? `Nobody in the comparison matches “${query.trim()}”.`
                : 'Pick the players you want to compare column by column.'}
            </span>
            <button type="button" onClick={() => setShowManagePlayers(true)}>Open roster</button>
          </div>
        ) : (
          <>
            <LeaderboardTableDesktop
              section={section}
              sortBy={sortBy}
              displayedUsers={displayedUsers}
              pinnedUserIds={pinnedUserIds}
              togglePin={togglePin}
              westOrder={westOrder}
              eastOrder={eastOrder}
              setWestOrder={setWestOrder}
              setEastOrder={setEastOrder}
              whatIfEnabled={whatIfEnabled}
              requestEnableWhatIf={requestEnableWhatIf}
              toggleWhatIfAnswer={toggleWhatIfAnswer}
              simActualMap={simActualMap}
              leaderboardData={leaderboardData}
              removeUser={removeUser}
            />

            <LeaderboardTableMobile
              section={section}
              displayedUsers={displayedUsers}
              pinnedUserIds={pinnedUserIds}
              togglePin={togglePin}
              westOrder={westOrder}
              eastOrder={eastOrder}
              setWestOrder={setWestOrder}
              setEastOrder={setEastOrder}
              whatIfEnabled={whatIfEnabled}
              simActualMap={simActualMap}
              requestEnableWhatIf={requestEnableWhatIf}
              toggleWhatIfAnswer={toggleWhatIfAnswer}
              sortBy={sortBy}
              loggedInUserId={canPinLoggedInUser ? pinTargetUserId : null}
            />
          </>
        )}
      </main>

      <SimulationModal
        show={showWhatIfConfirm}
        onClose={() => setShowWhatIfConfirm(false)}
        onEnable={handleEnableWhatIf}
        section={section}
      />

      <PlayerSelectionModal
        show={showManagePlayers}
        onClose={() => setShowManagePlayers(false)}
        manageQuery={manageQuery}
        setManageQuery={setManageQuery}
        withSimTotals={withSimTotals}
        selectedUserIds={selectedUserIds}
        setSelectedUserIds={setSelectedUserIds}
        addUser={addUser}
        showAll={showAll}
        setShowAll={setShowAll}
      />
    </div>
  );
}

export default LeaderboardDetailPage;
