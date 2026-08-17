import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'court-theme';
const THEME_EVENT = 'court-theme-change';

function systemPrefersDark() {
  return typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readTheme() {
  if (typeof document === 'undefined') return 'light';
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark' || attr === 'light') return attr;
  return systemPrefersDark() ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (e) {
    // localStorage unavailable (private mode, etc.) — theme still applies for this load
  }
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { theme } }));
}

/**
 * Shared light/dark theme state, synced across every mounted instance via a
 * DOM attribute + storage event rather than React context, since SideNav and
 * the server-rendered topbar toggle mount independently of each other.
 */
export function useTheme() {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    const onChange = (event) => setTheme(event.detail?.theme || readTheme());
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY) setTheme(readTheme());
    };
    window.addEventListener(THEME_EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(THEME_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme(readTheme() === 'dark' ? 'light' : 'dark');
  }, []);

  return [theme, toggleTheme];
}
