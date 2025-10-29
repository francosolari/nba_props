/**
 * SectionTabs component
 *
 * Segmented control for switching between leaderboard sections
 * (Standings, Awards, Props).
 *
 * @module features/leaderboard/components/controls/SectionTabs
 */

import React from 'react';
import type { Section } from '../../types/leaderboard';
import { CATEGORY_KEYS } from '../../utils/constants';

interface SectionTabsProps {
  /** Currently active section */
  activeSection: Section;

  /** Callback when section changes */
  onSectionChange: (section: Section) => void;
}

/**
 * Map section keys to display labels
 */
const SECTION_LABELS: Record<Section, string> = {
  standings: CATEGORY_KEYS.STANDINGS,
  awards: CATEGORY_KEYS.AWARDS,
  props: CATEGORY_KEYS.PROPS,
};

/**
 * SectionTabs component
 *
 * Animated segmented control that slides a highlight behind the active tab.
 *
 * @param props - Component props
 * @returns Rendered section tabs
 */
export function SectionTabs({
  activeSection,
  onSectionChange,
}: SectionTabsProps): React.ReactElement {
  const sections: Section[] = ['standings', 'awards', 'props'];
  const activeIdx = Math.max(0, sections.indexOf(activeSection));
  const segWidth = `${100 / sections.length}%`;

  return (
    <div className="relative flex overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
      {/* Sliding highlight background */}
      <div
        className="absolute top-0 bottom-0 left-0 rounded-lg bg-white dark:bg-slate-700 shadow transition-transform duration-200 will-change-transform"
        style={{
          width: segWidth,
          transform: `translateX(${activeIdx * 100}%)`,
        }}
      />

      {/* Tab buttons */}
      {sections.map((section) => (
        <button
          key={section}
          onClick={() => onSectionChange(section)}
          className={`relative z-10 flex-1 basis-0 text-center px-3 py-1.5 text-sm transition-colors duration-200 ${
            activeSection === section
              ? 'text-slate-900 dark:text-white'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          {SECTION_LABELS[section]}
        </button>
      ))}
    </div>
  );
}
