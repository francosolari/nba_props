// Pure data/config helpers for QuestionBatchWizard — no JSX, no React state.

export const STEP_TITLES = ['Draft questions', 'Configure details', 'Review & create'];

export const TYPE_CONFIG = {
  superlative: {
    label: 'Superlative',
    description: 'Award-style predictions',
    defaults: (defaultPointValue) => ({
      pointValue: defaultPointValue,
      data: { awardId: '' },
    }),
    isValid: ({ data }) => Boolean(data.awardId),
  },
  prop: {
    label: 'Prop',
    description: 'Player props & outcomes',
    defaults: (defaultPointValue) => ({
      pointValue: defaultPointValue,
      data: { outcomeType: 'over_under', line: '', relatedPlayerId: null },
    }),
    isValid: ({ data }) =>
      Boolean(data.outcomeType) && (data.outcomeType !== 'over_under' || data.line !== ''),
  },
  head_to_head: {
    label: 'Head-to-Head',
    description: 'Team vs team matchups',
    defaults: (defaultPointValue) => ({
      pointValue: defaultPointValue,
      data: { team1Id: null, team2Id: null },
    }),
    isValid: ({ data }) => Boolean(data.team1Id && data.team2Id && data.team1Id !== data.team2Id),
  },
  player_stat: {
    label: 'Player Stat',
    description: 'Stat benchmarks & projections',
    defaults: (defaultPointValue) => ({
      pointValue: defaultPointValue,
      data: { playerStatId: '', statType: '', fixedValue: '' },
    }),
    isValid: ({ data }) => Boolean(data.playerStatId && data.statType.trim()),
  },
  ist: {
    label: 'In-Season Tournament',
    description: 'Group predictions & tiebreakers',
    defaults: (defaultPointValue) => ({
      pointValue: defaultPointValue,
      data: { predictionType: 'group_winner', istGroup: '', isTiebreaker: false },
    }),
    isValid: ({ data }) => Boolean(data.predictionType),
  },
  nba_finals: {
    label: 'NBA Finals',
    description: 'Championship predictions',
    defaults: (defaultPointValue) => ({
      pointValue: defaultPointValue,
      data: { groupName: '' },
    }),
    isValid: () => true,
  },
};

export const TYPE_OPTIONS = Object.entries(TYPE_CONFIG).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

export const outcomeTypeOptions = [
  { value: 'over_under', label: 'Over / Under' },
  { value: 'yes_no', label: 'Yes / No' },
];

export const istTypeOptions = [
  { value: 'group_winner', label: 'Group winner' },
  { value: 'wildcard', label: 'Wildcard' },
  { value: 'conference_winner', label: 'Conference winner' },
  { value: 'tiebreaker', label: 'Tiebreaker' },
];

export const buildDraft = (defaultPointValue, type = 'superlative') => {
  const base = TYPE_CONFIG[type]?.defaults(defaultPointValue) ?? TYPE_CONFIG.superlative.defaults(defaultPointValue);
  return {
    id: `draft-${Math.random().toString(36).slice(2, 11)}`,
    type,
    text: '',
    pointValue: base.pointValue,
    data: base.data,
  };
};

export const summarizeDraft = (draft, lookup) => {
  const { type, data } = draft;
  switch (type) {
    case 'superlative': {
      const awardName = lookup.awards[data.awardId]?.name ?? '—';
      return `Award: ${awardName}`;
    }
    case 'prop': {
      const playerName = data.relatedPlayerId ? lookup.players[data.relatedPlayerId]?.name : '—';
      const lineText = data.outcomeType === 'over_under' ? ` • Line ${data.line || '?'}` : '';
      return `Outcome: ${data.outcomeType.replace('_', ' ')}${lineText}${playerName ? ` • Player ${playerName}` : ''}`;
    }
    case 'head_to_head': {
      const team1 = data.team1Id ? lookup.teams[data.team1Id]?.name : '—';
      const team2 = data.team2Id ? lookup.teams[data.team2Id]?.name : '—';
      return `${team1} vs ${team2}`;
    }
    case 'player_stat': {
      const stat = data.statType || 'stat';
      const fixed = data.fixedValue !== '' && data.fixedValue !== null ? ` • fixed ${data.fixedValue}` : '';
      return `Stat: ${stat}${fixed}`;
    }
    case 'ist': {
      const typeLabel = istTypeOptions.find((option) => option.value === data.predictionType)?.label ?? data.predictionType;
      const group = data.istGroup ? ` • ${data.istGroup}` : '';
      const tie = data.isTiebreaker ? ' • Tiebreaker' : '';
      return `${typeLabel}${group}${tie}`;
    }
    case 'nba_finals': {
      return data.groupName ? `Grouping: ${data.groupName}` : 'Finals prediction';
    }
    default:
      return '';
  }
};

export const mapDraftToPayload = (draft, seasonSlug) => {
  const base = {
    season_slug: seasonSlug,
    text: draft.text.trim(),
    point_value: Number(draft.pointValue),
  };

  switch (draft.type) {
    case 'superlative':
      return { ...base, award_id: Number(draft.data.awardId) };
    case 'prop': {
      const payload = {
        ...base,
        outcome_type: draft.data.outcomeType,
      };
      if (draft.data.relatedPlayerId) {
        payload.related_player_id = Number(draft.data.relatedPlayerId);
      }
      if (draft.data.outcomeType === 'over_under' && draft.data.line !== '') {
        payload.line = Number(draft.data.line);
      }
      return payload;
    }
    case 'head_to_head':
      return {
        ...base,
        team1_id: Number(draft.data.team1Id),
        team2_id: Number(draft.data.team2Id),
      };
    case 'player_stat': {
      const payload = {
        ...base,
        player_stat_id: Number(draft.data.playerStatId),
        stat_type: draft.data.statType.trim(),
      };
      if (draft.data.fixedValue !== '' && draft.data.fixedValue !== null) {
        payload.fixed_value = Number(draft.data.fixedValue);
      }
      return payload;
    }
    case 'ist':
      return {
        ...base,
        prediction_type: draft.data.predictionType,
        ist_group: draft.data.istGroup || undefined,
        is_tiebreaker: Boolean(draft.data.predictionType === 'tiebreaker' || draft.data.isTiebreaker),
      };
    case 'nba_finals':
      return {
        ...base,
        group_name: draft.data.groupName || undefined,
      };
    default:
      return base;
  }
};

export const validateDraft = (draft) => {
  const config = TYPE_CONFIG[draft.type];
  if (!config) return false;
  if (!draft.text.trim()) return false;
  if (draft.pointValue === '' || Number.isNaN(Number(draft.pointValue))) return false;
  return config.isValid(draft);
};
