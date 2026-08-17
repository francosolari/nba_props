import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

/**
 * Courtside-styled light/dark toggle: a near-square carbon-framed control,
 * not a rounded pill switch, so it reads as scorebook chrome rather than a
 * generic SaaS setting.
 */
function ThemeToggle({ className = '' }) {
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`court-theme-toggle${className ? ` ${className}` : ''}`}
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
    </button>
  );
}

export default ThemeToggle;
