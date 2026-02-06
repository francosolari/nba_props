import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, FlaskConical, Pin, Search, Users } from 'lucide-react';

export const LeaderboardControls = ({
  query,
  setQuery,
  sortBy,
  setSortBy,
  mode,
  showAll,
  setShowAll,
  section,
  whatIfEnabled,
  onToggleWhatIf,
  setShowManagePlayers,
  loggedInUserId,
  isPinMePinned,
  onTogglePinMe
}) => {
  const sortLabel = section === 'standings' ? 'Standings' : section === 'awards' ? 'Awards' : 'Props';
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef(null);

  const sortOptions = useMemo(() => ([
    { value: 'total', label: 'Total Points' },
    { value: 'section', label: `${sortLabel} Points` },
    { value: 'name', label: 'Name' }
  ]), [sortLabel]);

  const selectedSort = sortOptions.find((opt) => opt.value === sortBy) || sortOptions[0];
  const mobileSortLabel = selectedSort.value === 'section' ? sortLabel : selectedSort.label;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!sortMenuRef.current?.contains(event.target)) {
        setSortMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSortSelect = (value) => {
    setSortBy(value);
    setSortMenuOpen(false);
  };

  return (
    <div className="shrink-0 bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md relative md:sticky md:top-[61px] z-[40]">
      <div className="w-full px-2 md:px-4 py-1.5 md:py-2 flex items-center gap-1.5 md:gap-4 overflow-x-auto no-scrollbar">
        <div className="relative shrink-0 hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="pl-10 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold outline-none w-48 transition-all"
          />
        </div>

        <div ref={sortMenuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setSortMenuOpen(prev => !prev)}
            className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-wide md:tracking-wider outline-none"
            aria-haspopup="menu"
            aria-expanded={sortMenuOpen}
          >
            <span className="md:hidden">Sort: {mobileSortLabel}</span>
            <span className="hidden md:inline">Sort: {selectedSort.label}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${sortMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {sortMenuOpen && (
            <div className="absolute left-0 mt-1 min-w-[150px] md:min-w-[170px] z-50 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg py-1">
              {sortOptions.map((option) => {
                const isActive = selectedSort.value === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSortSelect(option.value)}
                    className={`w-full text-left px-3 py-1.5 text-[10px] md:text-xs font-black uppercase tracking-wide transition-colors ${
                      isActive
                        ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 md:ml-auto shrink-0">
          {mode === 'compare' && (
            <>
              <button
                onClick={() => setShowManagePlayers(true)}
                className="inline-flex items-center gap-1 px-2.5 md:px-3.5 py-1 md:py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] md:text-xs font-black text-slate-500 uppercase hover:text-slate-900 dark:hover:text-white transition-all active:scale-[0.97]"
              >
                <Users className="w-3 h-3" />
                <span>Players</span>
              </button>
              {loggedInUserId && (
                <button
                  onClick={onTogglePinMe}
                  className={`hidden md:inline-flex items-center gap-1 px-2.5 md:px-3.5 py-1 md:py-1.5 border rounded-lg text-[10px] md:text-xs font-black uppercase transition-all duration-200 active:scale-[0.96] ${
                    isPinMePinned
                      ? 'bg-sky-600 border-sky-600 text-white shadow-sm shadow-sky-600/30'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Pin className={`w-3 h-3 transition-transform duration-200 ${isPinMePinned ? 'scale-110' : ''}`} />
                  <span>Pin Me</span>
                </button>
              )}
              <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                <button
                  onClick={() => setShowAll(false)}
                  className={`px-2 md:px-3 py-1 md:py-1.5 text-[9px] md:text-xs font-black uppercase transition-all ${
                    !showAll
                      ? 'bg-sky-600 text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Selected
                </button>
                <button
                  onClick={() => setShowAll(true)}
                  className={`px-2 md:px-3 py-1 md:py-1.5 text-[9px] md:text-xs font-black uppercase transition-all border-l border-slate-200 dark:border-slate-800 ${
                    showAll
                      ? 'bg-sky-600 text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All
                </button>
              </div>
            </>
          )}

          {mode === 'compare' && (
            <button onClick={onToggleWhatIf} className={`flex items-center gap-1 md:gap-2 px-2.5 md:px-4 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-black uppercase transition-all border active:scale-[0.97] ${whatIfEnabled ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}>
              <FlaskConical className="w-3 h-3 md:w-4 md:h-4" /> <span>What-If</span>
            </button>
          )}

          {whatIfEnabled && section !== 'standings' && (
            <span className="hidden md:inline-flex items-center text-[10px] font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap pl-1">
              Click answers to toggle correct / incorrect
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
