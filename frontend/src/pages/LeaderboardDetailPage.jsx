/* LeaderboardDetailPage.jsx */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useLeaderboard } from '../hooks';
import { standingPoints, fromSectionKey } from '../features/leaderboard/utils/helpers';

// Components
import { LeaderboardHeader } from '../features/leaderboard/components/LeaderboardHeader';
import { LeaderboardControls } from '../features/leaderboard/components/LeaderboardControls';
import { LeaderboardShowcase } from '../features/leaderboard/components/LeaderboardShowcase';
import { LeaderboardTableDesktop } from '../features/leaderboard/components/LeaderboardTableDesktop';
import { LeaderboardTableMobile } from '../features/leaderboard/components/LeaderboardTableMobile';
import { LeaderboardPodium } from '../features/leaderboard/components/LeaderboardPodium';
import { SimulationModal } from '../features/leaderboard/components/SimulationModal';
import { PlayerSelectionModal } from '../features/leaderboard/components/PlayerSelectionModal';
import { resolveTeamLogoSlug } from '../components/TeamLogo';

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

  const { data: leaderboardData, isLoading, error } = useLeaderboard(selectedSeason);

  const [section, setSection] = useState(initialSection);
  const [mode, setMode] = useState('compare'); 
  const [showAll, setShowAll] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState(() => {
    const top = leaderboardData?.slice(0, 4).map(e => String(e.user.id)) || [];
    return Array.from(new Set([initialUserId, ...top])).filter(Boolean);
  });
  const [sortBy, setSortBy] = useState('total');
  const [query, setQuery] = useState('');
  const [whatIfEnabled, setWhatIfEnabled] = useState(false);
  const [showWhatIfConfirm, setShowWhatIfConfirm] = useState(false);
  const [hasSeenWhatIfIntro, setHasSeenWhatIfIntro] = useState(false);
  const [whatIfAnswerOverrides, setWhatIfAnswerOverrides] = useState({});
  const [pinnedUserIds, setPinnedUserIds] = useState([]);
  const [showManagePlayers, setShowManagePlayers] = useState(false);
  const [manageQuery, setManageQuery] = useState('');

  const usersMap = useMemo(() => {
    const m = new Map();
    (leaderboardData || []).forEach(e => m.set(String(e.user.id), e));
    return m;
  }, [leaderboardData]);

  const primaryUserId = useMemo(() => {
    if (selectedUserIds.length > 0) return String(selectedUserIds[0]);
    if (leaderboardData?.length > 0) return String(leaderboardData[0].user.id);
    return '';
  }, [selectedUserIds, leaderboardData]);
  const primaryUser = primaryUserId ? usersMap.get(String(primaryUserId)) : undefined;

  const loggedInEntry = useMemo(() => {
    if (!loggedInUsername) return undefined;
    return (leaderboardData || []).find(e => String(e.user.username) === String(loggedInUsername));
  }, [leaderboardData, loggedInUsername]);
  const loggedInUserId = loggedInEntry?.user?.id ? String(loggedInEntry.user.id) : null;
  const pinTargetUserId = loggedInUserId || String(initialUserId || '');
  const canPinLoggedInUser = Boolean(pinTargetUserId);
  const isPinMePinned = canPinLoggedInUser && pinnedUserIds.includes(pinTargetUserId);

  // Add logged-in user to selected set when URL doesn't explicitly define users.
  useEffect(() => {
    if (!loggedInUserId) return;
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
          const candidate = Number(prediction.point_value ?? prediction.points ?? 0);
          if (!Number.isFinite(candidate)) return;
          pointByQuestion.set(key, Math.max(pointByQuestion.get(key) || 0, candidate));
        });
      });
    });
    return pointByQuestion;
  }, [leaderboardData]);

  useEffect(() => {
    try {
      setHasSeenWhatIfIntro(window.sessionStorage.getItem(WHAT_IF_INTRO_SESSION_KEY) === '1');
    } catch {
      setHasSeenWhatIfIntro(false);
    }
  }, []);

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
    } catch {
      // Ignore session storage failures.
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
      return;
    }
    const answerKey = toAnswerKey(answerValue);
    if (!answerKey || answerKey === '—') return;

    setWhatIfAnswerOverrides((prev) => {
      const qid = String(questionId);
      const next = { ...prev };
      const perQuestion = { ...(next[qid] || {}) };
      const current = perQuestion[answerKey];
      const nextState = current === 'correct' ? 'incorrect' : current === 'incorrect' ? undefined : 'correct';

      if (nextState) perQuestion[answerKey] = nextState;
      else delete perQuestion[answerKey];

      if (Object.keys(perQuestion).length === 0) delete next[qid];
      else next[qid] = perQuestion;

      return next;
    });
  }, [whatIfEnabled, requestEnableWhatIf]);

  const withSimTotals = useMemo(() => {
    if (!leaderboardData) return [];
    if (!whatIfEnabled) return leaderboardData;

    const applyAnswerOverrides = (category) => {
      if (!category?.predictions) return category;

      let categoryPoints = 0;
      const predictions = category.predictions.map((prediction) => {
        const qid = prediction?.question_id ? String(prediction.question_id) : null;
        const override = qid ? whatIfAnswerOverrides[qid]?.[toAnswerKey(prediction.answer)] : undefined;
        const pointValue = Number(prediction.point_value ?? questionPointValues.get(qid) ?? prediction.points ?? 0) || 0;
        let points = Number(prediction.points || 0);
        let correct = prediction.correct;

        if (override === 'correct') {
          points = pointValue;
          correct = true;
        } else if (override === 'incorrect') {
          points = 0;
          correct = false;
        }

        categoryPoints += points;
        return { ...prediction, points, correct, __what_if_state: override || 'unchanged' };
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
  }, [leaderboardData, whatIfEnabled, simActualMap, whatIfAnswerOverrides, questionPointValues]);

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
    sp.set('mode', mode);
    if (selectedUserIds.length) sp.set('users', selectedUserIds.join(',')); else sp.delete('users');
    sp.set('sortBy', sortBy);
    if (query) sp.set('q', query); else sp.delete('q');
    sp.set('wi', whatIfEnabled ? '1' : '0');
    sp.set('all', showAll ? '1' : '0');
    window.history.replaceState(null, '', `${window.location.pathname}?${sp.toString()}`);
  }, [section, mode, selectedUserIds, sortBy, query, whatIfEnabled, showAll]);

  if (isLoading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex items-center justify-center text-slate-400 animate-pulse font-bold">Loading Rankings…</div>;
  if (error) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex items-center justify-center text-rose-500 font-bold">{String(error)}</div>;

  return (
    <div className="h-screen md:min-h-screen md:h-auto overflow-hidden md:overflow-visible bg-slate-50 dark:bg-slate-950 font-sans selection:bg-sky-500/30 text-sm flex flex-col">

      <LeaderboardHeader
        selectedSeason={selectedSeason}
        seasonsData={seasonsData}
        setSelectedSeason={setSelectedSeason}
        section={section}
        setSection={setSection}
        mode={mode}
        setMode={setMode}
      />

      <LeaderboardControls
        query={query}
        setQuery={setQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
        mode={mode}
        showAll={showAll}
        setShowAll={setShowAll}
        section={section}
        whatIfEnabled={whatIfEnabled}
        onToggleWhatIf={handleWhatIfToggle}
        setShowManagePlayers={setShowManagePlayers}
        loggedInUserId={canPinLoggedInUser ? pinTargetUserId : null}
        isPinMePinned={isPinMePinned}
        onTogglePinMe={handleTogglePinMe}
      />

      {/* ─── 3. Main Content ─── */}
      <main className="flex-1 min-h-0 w-full px-0 md:px-4 py-0 md:pb-20 overflow-hidden md:overflow-visible">

        {/* Showcase Mode */}
        {mode === 'showcase' && (
          <LeaderboardShowcase primaryUser={primaryUser} />
        )}

        {/* Compare Mode */}
        {mode === 'compare' && (
          <div className="h-full md:h-auto bg-white dark:bg-slate-900 border-y md:border border-slate-200 dark:border-slate-800 md:rounded-2xl shadow-sm overflow-hidden md:overflow-visible flex flex-col">
            
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
            />
          </div>
        )}
      </main>

      <LeaderboardPodium whatIfEnabled={whatIfEnabled} withSimTotals={withSimTotals} />

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
      />
    </div>
  );
}

export default LeaderboardDetailPage;
