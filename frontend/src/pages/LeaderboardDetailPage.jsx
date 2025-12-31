/* LeaderboardDetailPage.jsx */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useLeaderboard } from '../hooks';
import { standingPoints } from '../features/leaderboard/utils/helpers';

// Components
import { LeaderboardHeader } from '../features/leaderboard/components/LeaderboardHeader';
import { LeaderboardControls } from '../features/leaderboard/components/LeaderboardControls';
import { LeaderboardShowcase } from '../features/leaderboard/components/LeaderboardShowcase';
import { LeaderboardTableDesktop } from '../features/leaderboard/components/LeaderboardTableDesktop';
import { LeaderboardTableMobile } from '../features/leaderboard/components/LeaderboardTableMobile';
import { LeaderboardPodium } from '../features/leaderboard/components/LeaderboardPodium';
import { SimulationModal } from '../features/leaderboard/components/SimulationModal';
import { PlayerSelectionModal } from '../features/leaderboard/components/PlayerSelectionModal';

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
  const [mode, setMode] = useState('compare'); 
  const [showAll, setShowAll] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState(() => {
    const top = leaderboardData?.slice(0, 4).map(e => String(e.user.id)) || [];
    return Array.from(new Set([initialUserId, ...top])).filter(Boolean);
  });
  const [sortBy, setSortBy] = useState('standings');
  const [query, setQuery] = useState('');
  const [whatIfEnabled, setWhatIfEnabled] = useState(false);
  const [showWhatIfConfirm, setShowWhatIfConfirm] = useState(false);
  const [pinnedUserIds, setPinnedUserIds] = useState([]);
  const [pinPulseId, setPinPulseId] = useState(null);
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

  useEffect(() => {
    if (!loggedInUserId) return;
    setPinnedUserIds(prev => prev.includes(loggedInUserId) ? prev : [...prev, loggedInUserId]);
    const sp = new URLSearchParams(window.location.search);
    if (!sp.get('users')) {
      setSelectedUserIds(prev => prev.map(String).includes(loggedInUserId) ? prev : [loggedInUserId, ...prev]);
    }
  }, [loggedInUserId]);

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

  const [westOrder, setWestOrder] = useState([]);
  const [eastOrder, setEastOrder] = useState([]);

  useEffect(() => {
    if (whatIfEnabled || westOrder.length > 0 || !standingsTeams.length) return;
    const west = standingsTeams.filter(r => (r.conference || '').toLowerCase().startsWith('w'))
      .map(r => ({ id: `W-${r.team}`, team: r.team, conference: 'West', actual_position: r.actual_position }));
    const east = standingsTeams.filter(r => (r.conference || '').toLowerCase().startsWith('e'))
      .map(r => ({ id: `E-${r.team}`, team: r.team, conference: 'East', actual_position: r.actual_position }));
    setWestOrder(west);
    setEastOrder(east);
  }, [standingsTeams, whatIfEnabled]);

  const simActualMap = useMemo(() => {
    const map = new Map();
    westOrder.forEach((it, idx) => map.set(it.team, idx + 1));
    eastOrder.forEach((it, idx) => map.set(it.team, idx + 1));
    return map;
  }, [westOrder, eastOrder]);

  const withSimTotals = useMemo(() => {
    if (!leaderboardData) return [];
    if (!whatIfEnabled) return leaderboardData;
    return leaderboardData.map(e => {
      const cat = e.user.categories?.['Regular Season Standings'];
      let simStandPts = 0;
      if (cat?.predictions) {
        simStandPts = cat.predictions.reduce((sum, p) => sum + standingPoints(p.predicted_position, simActualMap.get(p.team)), 0);
      }
      const otherPts = (e.user.total_points || 0) - (cat?.points || 0);
      return {
        ...e,
        __orig_total_points: e.user.total_points,
        user: {
          ...e.user,
          total_points: otherPts + simStandPts,
          categories: { ...e.user.categories, 'Regular Season Standings': { ...cat, points: simStandPts } }
        }
      };
    }).sort((a, b) => (b.user.total_points || 0) - (a.user.total_points || 0));
  }, [leaderboardData, whatIfEnabled, simActualMap]);

  const displayedUsers = useMemo(() => {
    const base = showAll ? withSimTotals : selectedUserIds.map(id => withSimTotals.find(e => String(e.user.id) === String(id))).filter(Boolean);
    let arr = base.slice();
    if (sortBy === 'total') arr.sort((a, b) => (b.user.total_points || 0) - (a.user.total_points || 0));
    if (sortBy === 'standings') arr.sort((a, b) => (b.user.categories?.['Regular Season Standings']?.points || 0) - (a.user.categories?.['Regular Season Standings']?.points || 0));
    if (sortBy === 'name') arr.sort((a, b) => (a.user.display_name || a.user.username).localeCompare(b.user.display_name || b.user.username));
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter(e => (e.user.display_name || e.user.username).toLowerCase().includes(q));
    }
    const pinSet = new Set(pinnedUserIds.map(String));
    arr.sort((a, b) => (pinSet.has(String(b.user.id)) ? 1 : 0) - (pinSet.has(String(a.user.id)) ? 1 : 0));
    return arr;
  }, [withSimTotals, selectedUserIds, showAll, sortBy, query, pinnedUserIds]);

  const addUser = (id) => setSelectedUserIds(prev => Array.from(new Set([...prev, String(id)])));
  const togglePin = (id) => {
    setPinnedUserIds(prev => prev.includes(String(id)) ? prev.filter(x => String(x) !== String(id)) : [...prev, String(id)]);
    setPinPulseId(String(id)); window.setTimeout(() => setPinPulseId(null), 350);
  };

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-sky-500/30 text-sm">
      
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
        setWhatIfEnabled={setWhatIfEnabled}
        setShowWhatIfConfirm={setShowWhatIfConfirm}
        setShowManagePlayers={setShowManagePlayers}
      />

      {/* ─── 3. Main Content ─── */}
      <main className="max-w-[1600px] mx-auto px-0 md:px-4 py-0 md:py-6 pb-20">
        
        {/* Showcase Mode */}
        {mode === 'showcase' && (
          <LeaderboardShowcase primaryUser={primaryUser} />
        )}

        {/* Compare Mode */}
        {mode === 'compare' && (
          <div className="bg-white dark:bg-slate-900 border-y md:border border-slate-200 dark:border-slate-800 md:rounded-2xl shadow-sm overflow-hidden flex flex-col">
            
            <LeaderboardTableDesktop
              section={section}
              displayedUsers={displayedUsers}
              pinnedUserIds={pinnedUserIds}
              togglePin={togglePin}
              westOrder={westOrder}
              eastOrder={eastOrder}
              setWestOrder={setWestOrder}
              setEastOrder={setEastOrder}
              whatIfEnabled={whatIfEnabled}
              setShowWhatIfConfirm={setShowWhatIfConfirm}
              simActualMap={simActualMap}
              leaderboardData={leaderboardData}
            />

            <LeaderboardTableMobile
              section={section}
              displayedUsers={displayedUsers}
              westOrder={westOrder}
              eastOrder={eastOrder}
              setWestOrder={setWestOrder}
              setEastOrder={setEastOrder}
              whatIfEnabled={whatIfEnabled}
              simActualMap={simActualMap}
              setShowWhatIfConfirm={setShowWhatIfConfirm}
            />
          </div>
        )}
      </main>

      <LeaderboardPodium whatIfEnabled={whatIfEnabled} withSimTotals={withSimTotals} />

      <SimulationModal 
        show={showWhatIfConfirm} 
        onClose={() => setShowWhatIfConfirm(false)} 
        onEnable={() => { setWhatIfEnabled(true); setShowWhatIfConfirm(false); }} 
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
