import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, Check, ChevronLeft, Search, Users } from 'lucide-react';
import CourtSelect from '../../../components/CourtSelect';

const SECTIONS = [
  { key: 'standings', label: 'Standings' },
  { key: 'awards', label: 'Awards' },
  { key: 'props', label: 'Props' },
];

const SectionTabs = ({ section, setSection, fill }) => (
  <div className={`court-seg ${fill ? 'court-seg--fill' : ''}`} role="tablist" aria-label="Prediction category">
    {SECTIONS.map(({ key, label }) => (
      <button
        key={key}
        type="button"
        role="tab"
        aria-selected={section === key}
        onClick={() => setSection(key)}
        className={`court-seg__cell ${section === key ? 'is-active' : ''}`}
      >
        {label}
      </button>
    ))}
  </div>
);

/** Roster + sort, joined into one ledger. Rendered per viewport, so each copy
 *  owns its own outside-click ref rather than sharing one across two nodes. */
const LedgerTools = ({
  compact,
  sortOptions,
  selectedSort,
  setSortBy,
  selectedCount,
  showAll,
  onOpenRoster,
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="court-seg">
      <button
        type="button"
        onClick={onOpenRoster}
        className="court-seg__cell"
        aria-label={`Roster — ${showAll ? 'showing everyone' : `${selectedCount} players selected`}`}
      >
        <Users className="w-3.5 h-3.5" aria-hidden="true" />
        {!compact && <span>Roster</span>}
        <span className="court-seg__count" aria-hidden="true">{showAll ? 'All' : selectedCount}</span>
      </button>

      <div ref={menuRef} className="court-adv-menu">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="court-seg__cell"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Sort: ${selectedSort.label}`}
        >
          <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" />
          {!compact && <span>Sort: {selectedSort.label}</span>}
        </button>
        {open && (
          <div className="court-adv-menu__list" role="menu">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={selectedSort.value === option.value}
                onClick={() => { setSortBy(option.value); setOpen(false); }}
                className={`court-adv-menu__option ${selectedSort.value === option.value ? 'is-active' : ''}`}
              >
                {option.label}
                {selectedSort.value === option.value && (
                  <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * The board's chrome: identity, the section on show, and the tools that change
 * what the ledger contains. Anything that changes scores — What-If, pinning
 * yourself — lives on the score band instead, attached to the numbers it moves.
 */
export const LeaderboardHeader = ({
  selectedSeason,
  seasonsData,
  setSelectedSeason,
  section,
  setSection,
  query,
  setQuery,
  sortBy,
  setSortBy,
  selectedCount,
  showAll,
  onOpenRoster,
}) => {
  const sectionLabel = SECTIONS.find((s) => s.key === section)?.label || 'Section';

  const sortOptions = useMemo(() => ([
    { value: 'total', label: 'Total Points' },
    { value: 'section', label: `${sectionLabel} Points` },
    { value: 'name', label: 'Name' },
  ]), [sectionLabel]);

  const selectedSort = sortOptions.find((opt) => opt.value === sortBy) || sortOptions[0];

  const toolProps = {
    sortOptions,
    selectedSort,
    setSortBy,
    selectedCount,
    showAll,
    onOpenRoster,
  };

  return (
    <>
      <header className="court-adv-masthead">
        <a
          href={`/leaderboard/${selectedSeason}/`}
          className="court-adv-back"
          aria-label="Back to the leaderboard"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        </a>

        <h1 className="court-adv-title">Stat Sheet</h1>

        <div className="hidden md:block ml-3">
          <SectionTabs section={section} setSection={setSection} />
        </div>

        <div className="court-adv-masthead__end">
          <label className="court-adv-search hidden md:flex">
            <Search className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">Search compared players</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a player"
            />
          </label>

          <div className="hidden md:block">
            <LedgerTools {...toolProps} />
          </div>

          <CourtSelect
            label="Season"
            showLabel={false}
            value={selectedSeason}
            onChange={(event) => setSelectedSeason(event.target.value)}
            className="court-select--compact"
          >
            {seasonsData?.map((s) => <option key={s.slug} value={s.slug}>{s.year}</option>)}
          </CourtSelect>
        </div>
      </header>

      {/* Mobile keeps section choice and the two ledger tools on one joined row,
          so the score band still lands inside the first viewport. */}
      <div className="court-adv-mobilebar md:hidden">
        <SectionTabs section={section} setSection={setSection} fill />
        <LedgerTools compact {...toolProps} />
      </div>
    </>
  );
};
