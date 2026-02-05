/* LeaderboardPage.jsx */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useLeaderboard } from '../hooks';
import ProgressBar from '../components/ProgressBar';
import {
  ChevronDown,
  ChevronUp,
  Trophy,
  Target,
  Award,
  Star,
  BarChart3,
  ListChecks,
  CircleCheck,
  CircleX,
  ArrowRight,
  Lock,
  Calendar,
  Medal,
  Crown,
  TrendingUp,
  Users,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS & HELPERS
   ───────────────────────────────────────────────────────────────────────────── */

const categoryIcons = {
  'Regular Season Standings': Trophy,
  'Player Awards': Award,
  'Props & Yes/No': Target,
};

const formatDate = (isoString) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};

const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENTS
   ───────────────────────────────────────────────────────────────────────────── */

const RankBadge = ({ rank }) => {
  if (rank === 1) {
    return (
      <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-b from-yellow-300 to-yellow-500 shadow-sm border border-yellow-200">
        <Crown className="w-4 h-4 text-white drop-shadow-sm" fill="currentColor" />
        <div className="absolute -bottom-1 -right-1 bg-white text-yellow-600 text-[8px] font-bold px-1 py-px rounded-full border border-yellow-100 shadow-sm leading-none">1st</div>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-b from-slate-300 to-slate-400 shadow-sm border border-slate-200">
        <Medal className="w-4 h-4 text-white drop-shadow-sm" />
        <div className="absolute -bottom-1 -right-1 bg-white text-slate-500 text-[8px] font-bold px-1 py-px rounded-full border border-slate-100 shadow-sm leading-none">2nd</div>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-b from-amber-600 to-amber-700 shadow-sm border border-amber-500">
        <Medal className="w-4 h-4 text-white drop-shadow-sm" />
        <div className="absolute -bottom-1 -right-1 bg-white text-amber-700 text-[8px] font-bold px-1 py-px rounded-full border border-amber-100 shadow-sm leading-none">3rd</div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold text-xs">
      {rank}
    </div>
  );
};

const CategoryDetailCard = ({ icon: Icon, title, data, detailsHref, userId }) => {
  const pts = data?.points || 0;
  const max = data?.max_points || 0;
  const pct = max > 0 ? Math.round((pts / max) * 100) : 0;
  const isStandings = title === 'Regular Season Standings';
  
  const [expandedSections, setExpandedSections] = useState(new Set());
  const toggleSection = (key) => {
    const next = new Set(expandedSections);
    next.has(key) ? next.delete(key) : next.add(key);
    setExpandedSections(next);
  };

  const standingsStats = useMemo(() => {
    if (!isStandings || !Array.isArray(data?.predictions)) return null;
    const east = { exact: [], offByOne: [], wrong: [] };
    const west = { exact: [], offByOne: [], wrong: [] };

    data.predictions.forEach(p => {
      const points = p.points ?? 0;
      const conf = p.conference || p.team_conference;
      const target = conf === 'East' ? east : west;
      const name = p.team || p.team_name || 'Unknown';
      if (points === 3) target.exact.push(name);
      else if (points === 1) target.offByOne.push(name);
      else target.wrong.push(name);
    });
    return { east, west };
  }, [data?.predictions, isStandings]);

  const { rights, wrongs } = useMemo(() => {
    if (isStandings) return { rights: [], wrongs: [] };
    
    if (data?.interesting && (data.interesting.hard_wins?.length || data.interesting.easy_misses?.length)) {
        return {
          rights: (data.interesting.hard_wins || []).slice(0, 3),
          wrongs: (data.interesting.easy_misses || []).slice(0, 3),
        };
    }

    const predictions = Array.isArray(data?.predictions) ? data.predictions : [];
    const withFlags = predictions.map(p => ({
      ...p,
      _isRight: typeof p.correct === 'boolean' ? p.correct : (typeof p.points === 'number' && p.points > 0),
    }));
    
    const seedStr = String(userId || '') + title;
    let seed = 0; for(let i=0; i<seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    const pickN = (arr, n) => {
      if(!arr.length) return [];
      let s = seed ^ (n * 2654435761 >>> 0);
      const res = [];
      for(let k=0; k<Math.min(n, arr.length); k++) {
        s = (s * 1664525 + 1013904223) >>> 0;
        res.push(arr[s % arr.length]);
      }
      return res;
    };

    return { 
      rights: pickN(withFlags.filter(p => p._isRight), 3), 
      wrongs: pickN(withFlags.filter(p => !p._isRight), 3) 
    };
  }, [data?.predictions, data?.interesting, isStandings, title, userId]);

  return (
    <div className={`relative overflow-hidden rounded-xl border transition-all duration-300 group
      ${data?.is_best 
        ? 'bg-indigo-50/30 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-500/30 ring-1 ring-indigo-100 dark:ring-indigo-500/20' 
        : 'bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}
    `}>
      {data?.is_best && (
        <div className="absolute top-0 right-0 px-2 py-1 bg-indigo-100 dark:bg-indigo-500/20 rounded-bl-xl border-l border-b border-indigo-200 dark:border-indigo-500/30">
          <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide flex items-center gap-1">
            <Crown className="w-3 h-3" /> Best
          </span>
        </div>
      )}

      <div className="p-4 space-y-4">
        <a 
          href={detailsHref} 
          className="flex items-center gap-3 group/header transition-colors hover:opacity-80"
        >
          <div className={`p-2 rounded-lg ${
            data?.is_best 
              ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' 
              : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'
          }`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
              {title}
              <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 transition-all group-hover/header:opacity-100 group-hover/header:translate-x-0 text-slate-400" />
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{pts} <span className="text-slate-400 font-normal">/ {max} pts</span></span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${pct >= 50 ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                {pct}%
              </span>
            </div>
          </div>
        </a>

        <ProgressBar 
          value={pts} 
          max={max || 1} 
          size="sm" 
          color={data?.is_best ? "bg-indigo-500" : "bg-teal-500"} 
          bgColor="bg-slate-200 dark:bg-slate-700" 
        />

        <div className="pt-1">
          {isStandings && standingsStats ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {['east', 'west'].map(confKey => {
                 const stats = standingsStats[confKey];
                 const label = confKey === 'east' ? 'Eastern' : 'Western';
                 return (
                   <div key={confKey} className="space-y-1.5">
                     <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 pb-1 mb-1 border-b border-slate-100 dark:border-slate-800">{label}</div>
                     
                     {/* Exact */}
                     <div>
                        <button 
                          onClick={() => toggleSection(`${confKey}-exact`)} 
                          className="w-full flex items-center justify-between text-[11px] p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-500/10 hover:bg-emerald-100/50 dark:hover:bg-emerald-500/20 transition-colors border border-emerald-100/50 dark:border-emerald-500/20"
                        >
                          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold whitespace-nowrap">
                            <Star className="w-3 h-3 flex-shrink-0" /> Exact <span className="font-normal opacity-70">(3 pts)</span>
                          </span>
                          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                             <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded-md text-[9px] font-black">{stats.exact.length}</span>
                             {expandedSections.has(`${confKey}-exact`) ? <ChevronUp className="w-3 h-3 text-emerald-400" /> : <ChevronDown className="w-3 h-3 text-emerald-400" />}
                          </div>
                        </button>
                        {expandedSections.has(`${confKey}-exact`) && stats.exact.length > 0 && (
                          <div className="mt-1 ml-2 pl-4 border-l-2 border-emerald-100 dark:border-emerald-900 text-[10px] text-slate-600 dark:text-slate-400 space-y-1 py-1 animate-in slide-in-from-top-1 duration-200">
                            {stats.exact.map((t,i) => <div key={i} className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-emerald-400"></div>{t}</div>)}
                          </div>
                        )}
                     </div>

                     {/* Off By 1 */}
                     <div>
                        <button 
                          onClick={() => toggleSection(`${confKey}-off`)} 
                          className="w-full flex items-center justify-between text-[11px] p-2 rounded-lg bg-amber-50/50 dark:bg-amber-500/10 hover:bg-amber-100/50 dark:hover:bg-amber-500/20 transition-colors border border-amber-100/50 dark:border-amber-500/20"
                        >
                          <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold whitespace-nowrap">
                            <TrendingUp className="w-3 h-3 flex-shrink-0" /> Off by 1 <span className="font-normal opacity-70">(1 pt)</span>
                          </span>
                          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                             <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded-md text-[9px] font-black">{stats.offByOne.length}</span>
                             {expandedSections.has(`${confKey}-off`) ? <ChevronUp className="w-3 h-3 text-amber-400" /> : <ChevronDown className="w-3 h-3 text-amber-400" />}
                          </div>
                        </button>
                        {expandedSections.has(`${confKey}-off`) && stats.offByOne.length > 0 && (
                          <div className="mt-1 ml-2 pl-4 border-l-2 border-amber-100 dark:border-amber-900 text-[10px] text-slate-600 dark:text-slate-400 space-y-1 py-1 animate-in slide-in-from-top-1 duration-200">
                            {stats.offByOne.map((t,i) => <div key={i} className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-amber-400"></div>{t}</div>)}
                          </div>
                        )}
                     </div>

                     {/* Missed */}
                     <div>
                        <button 
                          onClick={() => toggleSection(`${confKey}-miss`)} 
                          className="w-full flex items-center justify-between text-[11px] p-2 rounded-lg bg-rose-50/50 dark:bg-rose-500/10 hover:bg-rose-100/50 dark:hover:bg-rose-500/20 transition-colors border border-rose-100/50 dark:border-rose-500/20"
                        >
                          <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold whitespace-nowrap">
                            <CircleX className="w-3 h-3 flex-shrink-0" /> Missed <span className="font-normal opacity-70">(0 pts)</span>
                          </span>
                          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                             <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded-md text-[9px] font-black">{stats.wrong.length}</span>
                             {expandedSections.has(`${confKey}-miss`) ? <ChevronUp className="w-3 h-3 text-rose-400" /> : <ChevronDown className="w-3 h-3 text-rose-400" />}
                          </div>
                        </button>
                        {expandedSections.has(`${confKey}-miss`) && stats.wrong.length > 0 && (
                          <div className="mt-1 ml-2 pl-4 border-l-2 border-rose-100 dark:border-rose-900 text-[10px] text-slate-600 dark:text-slate-400 space-y-1 py-1 animate-in slide-in-from-top-1 duration-200">
                            {stats.wrong.map((t,i) => <div key={i} className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-rose-400"></div>{t}</div>)}
                          </div>
                        )}
                     </div>
                   </div>
                 );
               })}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {rights.length > 0 && (
                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl p-3 border border-emerald-100 dark:border-emerald-500/10">
                   <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                        <CircleCheck className="w-3.5 h-3.5" /> Hits
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 bg-emerald-100 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-full">{rights.length} counted</span>
                   </div>
                   <div className="space-y-1.5">
                     {rights.map((p, i) => (
                       <div key={i} className="flex justify-between items-start gap-2 text-[11px] leading-snug">
                         <span className="text-slate-700 dark:text-slate-300 font-medium line-clamp-2">{p.question || p.team}</span>
                         <span className="text-emerald-600 dark:text-emerald-400 font-black whitespace-nowrap">+{p.points}</span>
                       </div>
                     ))}
                   </div>
                </div>
              )}
              {wrongs.length > 0 && (
                <div className="bg-rose-50/50 dark:bg-rose-900/10 rounded-xl p-3 border border-rose-100 dark:border-rose-500/10">
                   <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider">
                        <CircleX className="w-3.5 h-3.5" /> Misses
                      </div>
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-500 bg-rose-100 dark:bg-rose-500/20 px-1.5 py-0.5 rounded-full">{wrongs.length} counted</span>
                   </div>
                   <div className="space-y-1.5">
                     {wrongs.map((p, i) => (
                       <div key={i} className="flex justify-between items-start gap-2 text-[11px] leading-snug">
                         <span className="text-slate-600 dark:text-slate-400 line-clamp-2">{p.question || p.team}</span>
                         <span className="text-rose-500 dark:text-rose-400 font-medium whitespace-nowrap">0</span>
                       </div>
                     ))}
                   </div>
                </div>
              )}
            </div>
          )}
        </div>

        {detailsHref && (
          <div className="flex justify-end mt-2">
            <a href={detailsHref} className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 transition-colors group/link">
              Detailed Breakdown <ArrowRight className="w-3 h-3 transition-transform group-hover/link:translate-x-0.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};


/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────────────────────────────────────── */

function LeaderboardPage({ seasonSlug: initialSeasonSlug = 'current' }) {
  const [selectedSeason, setSelectedSeason] = useState(initialSeasonSlug);

  const { data: seasonsData } = useQuery({
    queryKey: ['seasons', 'user-participated'],
    queryFn: async () => {
      const res = await axios.get('/api/v2/seasons/user-participated');
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: leaderboardData, season: seasonInfo, error, isLoading, totals } = useLeaderboard(selectedSeason);
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  const [visibleCount, setVisibleCount] = useState(20);

  const toggleUserExpansion = (userId) => {
    const next = new Set(expandedUsers);
    next.has(userId) ? next.delete(userId) : next.add(userId);
    setExpandedUsers(next);
  };

  const getCategory = (entry, key) => {
    const cats = entry?.user?.categories || entry?.categories || {};
    return cats?.[key] || { points: 0, max_points: 0, predictions: [] };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex flex-col items-center justify-center space-y-8">
        <div className="w-full max-w-4xl space-y-6 animate-pulse">
           <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl w-full"></div>
           <div className="space-y-3">
             {[...Array(5)].map((_,i) => <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl w-full" />)}
           </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 rounded-2xl p-8 shadow-xl text-center">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500">
             <CircleX className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h3>
          <p className="text-slate-600 dark:text-slate-400">{String(error)}</p>
        </div>
      </div>
    );
  }

  const submissionsOpen = seasonInfo?.submissions_open ?? false;
  const submissionEndDate = seasonInfo?.submission_end_date;

  if (submissionsOpen && submissionEndDate) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 flex items-center justify-center">
        <div className="max-w-xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 text-center relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <Lock className="w-24 h-24 text-slate-900 dark:text-white" />
           </div>
           
           <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-full text-amber-500 mb-6">
              <Lock className="w-8 h-8" />
           </div>
           
           <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Leaderboard Locked</h1>
           <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
             Rankings are hidden while predictions are open. Check back later!
           </p>

           <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4" />
              <span>Reveals {formatDate(submissionEndDate)}</span>
           </div>

           {seasonsData && seasonsData.length > 1 && (
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-center items-center gap-2 text-sm">
                  <span className="text-slate-500">Past seasons:</span>
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                    className="font-semibold text-slate-900 dark:text-white bg-transparent outline-none cursor-pointer hover:text-teal-600"
                  >
                    {seasonsData.map((s) => (
                      <option key={s.slug} value={s.slug}>{s.year}</option>
                    ))}
                  </select>
                </div>
              </div>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-teal-500/30">
      
      {/* ─── 1. Compact Header ─── */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pt-4 pb-4 md:pt-6 md:pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
           <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                  NBA Predictions Leaderboard
                </h1>
              </div>

              {seasonsData && seasonsData.length > 1 && (
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 py-1 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Season</span>
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                  >
                    {seasonsData.map((s) => <option key={s.slug} value={s.slug}>{s.year}</option>)}
                  </select>
                </div>
              )}
           </div>

           {/* Compact Stats Grid */}
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
             {[
               { label: 'Players', value: totals.totalPlayers, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
               { label: 'Predictions', value: totals.totalPredictions || '—', icon: Target, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20' },
               { label: 'Accuracy', value: totals.avgAccuracy ? `${(totals.avgAccuracy * 100).toFixed(0)}%` : '—', icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
               { label: 'Top Score', value: leaderboardData[0]?.user?.total_points || '—', icon: Crown, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
             ].map((stat, i) => (
               <div key={i} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl p-2 flex items-center gap-3">
                  <div className={`w-7 h-7 rounded flex items-center justify-center ${stat.bg} ${stat.color}`}>
                    <stat.icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">{stat.label}</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight mt-0.5">{stat.value.toLocaleString()}</div>
                  </div>
               </div>
             ))}
           </div>
        </div>
      </header>

      {/* ─── 2. Main List ─── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          
          <div className="hidden md:grid grid-cols-[60px_200px_120px_1fr_40px] gap-4 px-6 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <div className="text-center">Rank</div>
            <div>Player</div>
            <div className="text-center">Total Points</div>
            <div className="pl-6">Performance</div>
            <div></div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {leaderboardData.slice(0, visibleCount).map((entry) => {
              const isExpanded = expandedUsers.has(entry.user.id);
              const displayName = entry.user.display_name || entry.user.username;
              return (
                <div key={entry.user.id} className={`group transition-colors duration-200 ${isExpanded ? 'bg-slate-50/80 dark:bg-slate-800/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                  
                  <button 
                    type="button"
                    onClick={() => toggleUserExpansion(entry.user.id)}
                    className="w-full text-left cursor-pointer grid grid-cols-[auto_1fr_auto_auto] md:grid-cols-[60px_200px_120px_1fr_40px] gap-3 md:gap-4 items-center px-4 md:px-6 py-2.5 md:py-3.5 focus:outline-none"
                  >
                    <div className="flex justify-center md:justify-center">
                       <RankBadge rank={entry.rank} />
                    </div>

                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="relative flex-shrink-0">
                         {entry.user.avatar ? (
                           <img src={entry.user.avatar} className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover shadow-sm border border-slate-200 dark:border-slate-700" alt="" onError={(e)=>e.target.style.display='none'}/>
                         ) : (
                           <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 text-xs border border-slate-200 dark:border-slate-700">
                             {getInitials(displayName)}
                           </div>
                         )}
                      </div>
                      
                      <div className="min-w-0 flex flex-col justify-center">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs md:text-sm leading-tight">
                          {displayName}
                        </h3>
                        {entry.user.badges && entry.user.badges.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {entry.user.badges.filter(b => b.type === 'category_best').slice(0, 2).map((b, i) => (
                              <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-500/30 whitespace-nowrap leading-none">
                                <Crown className="w-2 h-2" /> 
                                {b.category ? `Top ${b.category.split(' ')[0]}` : 'Leader'}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Points: Primary Metric - Now moved earlier in desktop grid */}
                    <div className="text-center">
                       <div className="text-base text-center md:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                         {entry.user.total_points.toLocaleString()}
                       </div>
                       <div className="md:hidden text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Pts</div>
                    </div>

                    {/* Desktop: Category Previews - Now after points */}
                    <div className="hidden md:flex items-center gap-4 pl-6">
                      {['Regular Season Standings', 'Player Awards', 'Props & Yes/No'].map(catKey => {
                        const catData = getCategory(entry, catKey);
                        const pct = catData.max_points > 0 ? (catData.points / catData.max_points) * 100 : 0;
                        return (
                           <div key={catKey} className="flex-1 min-w-[80px]">
                              <div className="flex justify-between items-end mb-1">
                                <span className="text-[8px] text-slate-400 uppercase tracking-tight truncate max-w-[80px]">{catKey.replace('Regular Season ', 'Reg. Season Standings').split(' ')[0]}</span>
                                <span className="text-[8px] font-medium text-slate-600 dark:text-slate-400">{catData.points}</span>
                              </div>
                              <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-teal-500 rounded-full" 
                                  style={{ width: `${pct}%` }} 
                                />
                              </div>
                           </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-end">
                       <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                         <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                       </div>
                    </div>
                  </button>

                  <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0 invisible'}`}>
                    <div className="px-2 md:px-6 pb-5 pt-1">
                       <div className="p-3 md:p-5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                         <div className="flex items-center justify-between mb-4 px-1">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                              <BarChart3 className="w-3 h-3" /> Detailed Breakdown
                            </h4>
                            <a href={`/leaderboard/${selectedSeason}/detailed/?user=${entry.user.id}`} className="text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline uppercase tracking-wide">
                              View Full Report &rarr;
                            </a>
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                           <CategoryDetailCard 
                             icon={BarChart3} 
                             title="Regular Season Standings" 
                             userId={entry.user.id} 
                             data={getCategory(entry, 'Regular Season Standings')} 
                             detailsHref={`/leaderboard/${selectedSeason}/detailed/?section=standings&user=${entry.user.id}`}
                           />
                           <CategoryDetailCard 
                             icon={Award} 
                             title="Player Awards" 
                             userId={entry.user.id} 
                             data={getCategory(entry, 'Player Awards')} 
                             detailsHref={`/leaderboard/${selectedSeason}/detailed/?section=awards&user=${entry.user.id}`}
                           />
                           <CategoryDetailCard 
                             icon={ListChecks} 
                             title="Props & Yes/No" 
                             userId={entry.user.id} 
                             data={getCategory(entry, 'Props & Yes/No')} 
                             detailsHref={`/leaderboard/${selectedSeason}/detailed/?section=props&user=${entry.user.id}`}
                           />
                         </div>
                       </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
          
          {visibleCount < leaderboardData.length && (
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 text-center">
              <button
                onClick={() => setVisibleCount(c => c + 20)}
                className="px-4 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors uppercase tracking-wide"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default LeaderboardPage;