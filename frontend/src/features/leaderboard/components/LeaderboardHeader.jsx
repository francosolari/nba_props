import React from 'react';
import { ChevronLeft } from 'lucide-react';
import CourtSelect from '../../../components/CourtSelect';

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
    <header className="court-detail-header shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 relative md:sticky md:top-0 z-40 md:z-[60]">
      <div className="w-full px-3 md:px-4 py-2 md:py-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4">

          {/* Top Row on Mobile: Back, Title, Season Select */}
          <div className="flex items-center justify-between md:justify-start w-full md:w-auto gap-2 md:gap-4">
            <div className="flex items-center gap-2 md:gap-4">
              <a href={`/leaderboard/${selectedSeason}/`} className="p-1.5 md:p-2 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
              </a>
              <h1 className="court-detail-title block uppercase text-slate-900 dark:text-white">
                Advanced Board
              </h1>

              <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block" />

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-1">
                {['standings', 'awards', 'props'].map((s) => {
                  const isActive = section === s;
                  return (
                    <button key={s} onClick={() => setSection(s)} className={`court-detail-tab px-3 py-1.5 uppercase transition-all ${isActive ? 'is-active' : ''}`}>
                      {s}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Mobile Season Select (Moved here for better space utilization) */}
            <CourtSelect
              label="Season"
              showLabel={false}
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="court-select--compact md:hidden"
            >
                {seasonsData?.map((s) => <option key={s.slug} value={s.slug}>{s.year}</option>)}
            </CourtSelect>
          </div>

          {/* Second Row on Mobile: Nav & Mode & Desktop Season */}
          <div className="flex items-center justify-between md:justify-end gap-2 md:gap-3 w-full md:w-auto pb-1 md:pb-0">
            {/* Mobile Nav */}
            <nav className="flex md:hidden items-center gap-0.5 shrink-0">
              {['standings', 'awards', 'props'].map((s) => {
                const isActive = section === s;
                return (
                  <button key={s} onClick={() => setSection(s)} className={`court-detail-tab px-2 py-1.5 uppercase whitespace-nowrap transition-all ${isActive ? 'is-active' : ''}`}>
                    {s}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-auto md:ml-0">
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 md:p-1 border border-slate-200 dark:border-slate-700">
                {['showcase', 'compare'].map(m => (
                  <button key={m} onClick={() => setMode(m)} className={`court-detail-tab px-2 md:px-4 py-1 md:py-1.5 uppercase transition-all ${mode === m ? 'is-active' : ''}`}>
                    {m}
                  </button>
                ))}
              </div>

              {/* Desktop Season Select */}
              <CourtSelect
                label="Season"
                showLabel={false}
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="court-select--compact hidden md:block"
              >
                {seasonsData?.map((s) => <option key={s.slug} value={s.slug}>{s.year}</option>)}
              </CourtSelect>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
