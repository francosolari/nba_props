export const UNKNOWN_TEAM_LOGO = '/static/img/teams/unknown.svg';

export const toTeamLogoSrc = (teamName) => {
  if (!teamName) return UNKNOWN_TEAM_LOGO;
  const slug = teamName
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .replace('los-angeles-clippers', 'la-clippers');
  return `/static/img/teams/${slug}.png`;
};

export const extractGroupMeta = (groupName) => {
  if (!groupName) return { conference: '', label: '', short: '' };
  const match = groupName.match(/(East|West)\s+Group\s+([A-Z])/i);
  if (!match) {
    const cleaned = groupName.trim();
    return { conference: cleaned.split(' ')[0] || '', label: cleaned, short: cleaned };
  }
  return {
    conference: match[1],
    label: `${match[1]} Group ${match[2].toUpperCase()}`,
    short: match[2].toUpperCase(),
  };
};

export const resolveConferenceKey = (value) => {
  const normalized = value?.toLowerCase() || '';
  if (normalized.includes('west')) return 'West';
  if (normalized.includes('east')) return 'East';
  return null;
};

export const normalizeTeam = (team) => ({
  id: team?.team_id ?? team?.value ?? team?.id,
  name: team?.team_name ?? team?.label ?? team?.name ?? 'Unknown team',
  wins: typeof team?.wins === 'number' ? team.wins : null,
  losses: typeof team?.losses === 'number' ? team.losses : null,
  pointDifferential: typeof team?.point_differential === 'number'
    ? team.point_differential
    : (typeof team?.pointDifferential === 'number' ? team.pointDifferential : null),
});

export const buildRecordSummary = (team) => {
  const parts = [];
  if (typeof team.wins === 'number' && typeof team.losses === 'number') {
    parts.push(`${team.wins}-${team.losses}`);
  }
  if (typeof team.pointDifferential === 'number') {
    parts.push(`PD ${team.pointDifferential > 0 ? '+' : ''}${team.pointDifferential}`);
  }
  return parts.join(' | ');
};

const THEMES = {
  east: {
    selected: 'ist-team-choice--east border-[var(--nba-blue-400)] bg-[var(--nba-blue-50)] text-[var(--nba-blue-700)]',
    idle: 'ist-team-choice--east hover:border-[var(--nba-blue-400)] hover:bg-[var(--nba-blue-50)]',
    marker: 'ist-group-marker--east',
    text: 'text-[var(--nba-blue-700)]',
  },
  west: {
    selected: 'ist-team-choice--west border-[var(--nba-red-400)] bg-[var(--nba-red-50)] text-[var(--nba-red-700)]',
    idle: 'ist-team-choice--west hover:border-[var(--nba-red-400)] hover:bg-[var(--nba-red-50)]',
    marker: 'ist-group-marker--west',
    text: 'text-[var(--nba-red-700)]',
  },
  default: {
    selected: 'border-slate-400 bg-slate-100 text-slate-800',
    idle: 'hover:bg-slate-100',
    marker: 'ist-group-marker--neutral',
    text: 'text-slate-700',
  },
};

export const getConferenceTheme = (label) => THEMES[resolveConferenceKey(label)?.toLowerCase()] || THEMES.default;

export const findByKeywords = (questions, keywords) => questions.find((question) => {
  const text = (question.text || '').toLowerCase();
  return keywords.every((keyword) => text.includes(keyword));
}) || null;
