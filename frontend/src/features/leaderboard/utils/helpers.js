export const teamSlug = (name = '') => name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');

export const standingPoints = (pred, actual) => {
  if (actual == null || pred == null) return 0;
  if (pred === actual) return 3;
  if (Math.abs(pred - actual) === 1) return 1;
  return 0;
};

export const fromSectionKey = (s) => s === 'standings' ? 'Regular Season Standings' : s === 'awards' ? 'Player Awards' : 'Props & Yes/No';

export const formatDate = (isoString) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return isoString; }
};

export const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};
