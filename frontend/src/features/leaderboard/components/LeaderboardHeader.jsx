import React from 'react';
import { ChevronLeft } from 'lucide-react';

export const LeaderboardHeader = ({
  selectedSeason,
  seasonsData,
  setSelectedSeason,
  section,
  setSection,
  mode,
  setMode
}) => {
  return (
    <header className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 relative md:sticky md:top-0 z-40 md:z-[60]">
      <div className="w-full px-3 md:px-4 py-2 md:py-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4">

          {/* Top Row on Mobile: Back, Title, Season Select */}
          <div className="flex items-center justify-between md:justify-start w-full md:w-auto gap-2 md:gap-4">
            <div className="flex items-center gap-2 md:gap-4">
              <a href={`/leaderboard/${selectedSeason}/`} className="p-1.5 md:p-2 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
              </a>
              <h1 className="text-sm md:text-base font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 uppercase tracking-widest block">
                Leaderboard
              </h1>

              <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block" />

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-1">
                {['standings', 'awards', 'props'].map((s) => {
                  const isActive = section === s;
                  return (
                    <button key={s} onClick={() => setSection(s)} className={`px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-all ${isActive ? 'bg-sky-50 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400' : 'text-slate-400 hover:text-slate-600'}`}>
                      {s}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Mobile Season Select (Moved here for better space utilization) */}
            <div className="md:hidden">
              <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)} className="bg-transparent text-xs font-black text-slate-500 hover:text-slate-900 dark:hover:text-white outline-none cursor-pointer uppercase tracking-widest border border-slate-200 dark:border-slate-700 rounded-md py-1 px-2">
                {seasonsData?.map((s) => <option key={s.slug} value={s.slug}>{s.year}</option>)}
              </select>
            </div>
          </div>

          {/* Second Row on Mobile: Nav & Mode & Desktop Season */}
          <div className="flex items-center justify-between md:justify-end gap-2 md:gap-3 w-full md:w-auto pb-1 md:pb-0">
            {/* Mobile Nav */}
            <nav className="flex md:hidden items-center gap-0.5 shrink-0">
              {['standings', 'awards', 'props'].map((s) => {
                const isActive = section === s;
                return (
                  <button key={s} onClick={() => setSection(s)} className={`px-2 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wide transition-all whitespace-nowrap ${isActive ? 'bg-sky-50 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400' : 'text-slate-400 hover:text-slate-600'}`}>
                    {s}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-auto md:ml-0">
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 md:p-1 border border-slate-200 dark:border-slate-700">
                {['showcase', 'compare'].map(m => (
                  <button key={m} onClick={() => setMode(m)} className={`px-2 md:px-4 py-1 md:py-1.5 rounded-md text-[9px] md:text-xs font-black uppercase tracking-wide md:tracking-wider transition-all ${mode === m ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    {m}
                  </button>
                ))}
              </div>

              {/* Desktop Season Select */}
              <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)} className="hidden md:block bg-transparent text-xs font-black text-slate-500 hover:text-slate-900 dark:hover:text-white outline-none cursor-pointer uppercase tracking-widest border-l border-slate-200 dark:border-slate-700 pl-4">
                {seasonsData?.map((s) => <option key={s.slug} value={s.slug}>{s.year}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
