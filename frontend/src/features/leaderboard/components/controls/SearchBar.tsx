/**
 * SearchBar component
 *
 * Search input field for filtering leaderboard users by name.
 *
 * @module features/leaderboard/components/controls/SearchBar
 */

import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  /** Current search query */
  query: string;

  /** Callback when query changes */
  onQueryChange: (query: string) => void;

  /** Placeholder text (default: "Search") */
  placeholder?: string;
}

/**
 * SearchBar component
 *
 * Input field with search icon for filtering users by username/display name.
 *
 * @param props - Component props
 * @returns Rendered search input
 */
export function SearchBar({
  query,
  onQueryChange,
  placeholder = 'Search',
}: SearchBarProps): React.ReactElement {
  return (
    <div className="relative flex-1 md:flex-initial">
      <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-7 pr-2 py-1.5 rounded-lg border border-slate-200/60 bg-white text-xs dark:bg-slate-800 dark:border-slate-700/50 dark:text-slate-300 dark:placeholder-slate-500 transition-colors md:w-32 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
      />
    </div>
  );
}
