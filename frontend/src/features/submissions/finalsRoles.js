// Each NBA Finals question plays one role in the bracket. New questions name
// it in group_name; older seasons only have wording (and 2025-26 mislabeled
// two), so those fall back to reading the text.
export const FINALS_ROLES = [
  { value: 'east_finalist', label: 'East finalist', text: 'Which Eastern Conference team will reach the NBA Finals?' },
  { value: 'west_finalist', label: 'West finalist', text: 'Which Western Conference team will reach the NBA Finals?' },
  { value: 'champion', label: 'Champion', text: 'Which team will win the NBA Finals?' },
  { value: 'series_score', label: 'Series score (tiebreaker)', text: 'NBA Finals series score (tiebreaker)' },
];

export const SERIES_SCORES = ['4-0', '4-1', '4-2', '4-3'];

const ROLE_VALUES = new Set(FINALS_ROLES.map((role) => role.value));

export const finalsRole = (question) => {
  if (ROLE_VALUES.has(question.group_name)) return question.group_name;
  const text = (question.text || '').toLowerCase();
  if (text.includes('series') || text.includes('score')) return 'series_score';
  if (text.includes('win the nba finals') || text.includes('champion')) return 'champion';
  if (text.includes('east')) return 'east_finalist';
  if (text.includes('west')) return 'west_finalist';
  return 'champion';
};
