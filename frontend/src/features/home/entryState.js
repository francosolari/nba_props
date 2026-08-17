import { useEffect, useMemo, useState } from 'react';

/**
 * Everything the homepage needs to reason about a season's state.
 *
 * Home has one job per phase — sell the game to guests, finish the entry while
 * the window is open, follow the score once picks lock — and an entry is only
 * valid when both halves are done: the picks saved and the fee paid.
 */

export const DEFAULT_SEASON = 'current';
export const ENTRY_FEE = '$25';
export const TEAMS_PER_CONFERENCE = 15;

const parseBool = (value) => String(value || '').toLowerCase() === 'true';

export function getRootProps() {
  const element = typeof document !== 'undefined' ? document.getElementById('home-root') : null;
  const data = element?.dataset || {};

  return {
    seasonSlug: data.seasonSlug || DEFAULT_SEASON,
    isAuthenticated: parseBool(data.isAuthenticated),
    userId: data.userId || '',
    username: data.username || '',
    displayName: data.displayName || '',
    hasSubmission: parseBool(data.hasSubmission),
    submissionOpen: parseBool(data.submissionOpen),
    submissionStart: data.submissionStart || '',
    submissionEnd: data.submissionEnd || '',
    submitUrl: data.submitUrl || '',
    signupUrl: data.signupUrl || '',
    loginUrl: data.loginUrl || '',
    leaderboardUrl: data.leaderboardUrl || '',
  };
}

export function formatDate(value, includeTime = false) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}

/** Ranks read as places in a final table, not as bare integers. */
export function ordinal(value) {
  const rest = value % 100;
  if (rest >= 11 && rest <= 13) return `${value}th`;
  return `${value}${['th', 'st', 'nd', 'rd'][value % 10] || 'th'}`;
}

/** "2026-27" reads as a season, not a slug, once the hyphen becomes an en dash. */
export function formatSeason(slug) {
  return /^\d{4}-\d{2}$/.test(slug || '') ? slug.replace('-', '–') : null;
}

/**
 * The lock deadline is the one fact that decides what home is for, so it is
 * counted down rather than merely printed. Minute resolution is enough: the
 * timer re-reads the clock every 30s instead of animating a seconds digit.
 */
export function useLockCountdown(endIso) {
  const target = useMemo(() => {
    const date = endIso ? new Date(endIso) : null;
    return date && !Number.isNaN(date.getTime()) ? date.getTime() : null;
  }, [endIso]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return undefined;
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [target]);

  if (!target) return null;
  const remaining = target - now;
  if (remaining <= 0) return { expired: true, label: 'Picks locked' };

  const minutes = Math.floor(remaining / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days >= 2) return { expired: false, label: `Locks in ${days}d ${hours % 24}h` };
  if (hours >= 1) return { expired: false, label: `Locks in ${hours}h ${minutes % 60}m` };
  return { expired: false, label: `Locks in ${Math.max(minutes, 1)}m` };
}

/**
 * Home has one job per phase: sell the game to guests, finish the entry while
 * the window is open, follow the score once picks lock. Everything below reads
 * from this, so no surface renders an empty shell for a phase it is not in.
 */
export function getPhase(rootProps) {
  if (!rootProps.isAuthenticated) return 'guest';
  const start = rootProps.submissionStart ? new Date(rootProps.submissionStart).getTime() : null;
  const now = Date.now();
  if (start && !Number.isNaN(start) && now < start) return 'preview';
  return rootProps.submissionOpen ? 'entry' : 'season';
}

/**
 * An entry is only real once the picks are saved *and* the fee is paid, so the
 * primary action always points at whichever half is still outstanding. Paying
 * never closes editing: picks stay editable until the deadline either way.
 */
export function getEntryAction(rootProps, phase, entry) {
  if (phase === 'guest') {
    return {
      label: 'Start your entry',
      href: rootProps.submitUrl || rootProps.signupUrl || '#signup',
    };
  }
  if (phase === 'season') {
    return {
      label: 'Review your picks',
      href: rootProps.submitUrl,
      status: 'Your picks',
      detail: 'See every call you made and how it graded.',
    };
  }

  if (!entry.paid) {
    return entry.picksComplete
      ? {
        label: `Pay the ${ENTRY_FEE} fee`,
        href: rootProps.submitUrl,
        status: 'One step left',
        detail: `Every pick is saved. Pay the ${ENTRY_FEE} fee to make the entry count.`,
      }
      : {
        label: entry.saved ? 'Finish your picks' : 'Start your entry',
        status: 'Not entered yet',
        href: rootProps.submitUrl,
        detail: `Save the rest of your picks, then pay the ${ENTRY_FEE} fee to enter.`,
      };
  }

  return entry.picksComplete
    ? {
      label: 'Edit your picks',
      href: rootProps.submitUrl,
      status: 'Entry complete',
      detail: 'Paid and fully picked. You can keep changing picks until the deadline.',
    }
    : {
      label: 'Finish your picks',
      href: rootProps.submitUrl,
      status: 'Paid, picks unfinished',
      detail: 'Your fee is in. Unsaved picks score nothing, so finish them before the deadline.',
    };
}
