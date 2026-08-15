import axios from 'axios';

const sortPredictions = (list = []) => (
  [...list].sort((a, b) => (a.predicted_position || 0) - (b.predicted_position || 0))
);

const toPrediction = (team, index) => ({
  team_id: team.team_id ?? team.id,
  team_name: team.team_name ?? team.name,
  predicted_position: team.predicted_position ?? team.position ?? index + 1,
});

const orderTeamsForFallback = (teams = []) => (
  [...teams].sort((a, b) => {
    const aMetric = a?.seed ?? a?.rank ?? a?.projected_rank ?? a?.predicted_position ?? Number.MAX_SAFE_INTEGER;
    const bMetric = b?.seed ?? b?.rank ?? b?.projected_rank ?? b?.predicted_position ?? Number.MAX_SAFE_INTEGER;
    if (aMetric !== bMetric) return aMetric - bMetric;
    return (a?.name || '').localeCompare(b?.name || '');
  })
);

const predictionsForConference = (body, conference) => {
  const direct = body?.[conference.toLowerCase()];
  if (Array.isArray(direct) && direct.length > 0) return sortPredictions(direct).map(toPrediction);
  const predictions = Array.isArray(body?.predictions) ? body.predictions : [];
  return sortPredictions(predictions.filter((team) => team.team_conference === conference)).map(toPrediction);
};

export const cloneStandings = (teams = []) => teams.map((team) => ({ ...team }));

export const orderSignature = (teams = []) => teams.map((team) => team.team_id).join('|');

export const restoreDraftOrder = (teams, orderedIds = []) => {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) return teams;
  const teamsById = new Map(teams.map((team) => [String(team.team_id), team]));
  const ordered = orderedIds.map((id) => teamsById.get(String(id))).filter(Boolean);
  const included = new Set(ordered.map((team) => String(team.team_id)));
  return [...ordered, ...teams.filter((team) => !included.has(String(team.team_id)))];
};

export const resolveSeasonSlug = async (seasonSlug) => {
  if (seasonSlug && seasonSlug !== 'current') return seasonSlug;
  try {
    const { data } = await axios.get('/api/v2/latest-season');
    return data?.slug || null;
  } catch (error) {
    console.error('Error determining latest season:', error);
    return null;
  }
};

const fetchPreviousSeasonSlug = async (currentSlug) => {
  try {
    const { data: seasons } = await axios.get('/api/v2/seasons/');
    if (!Array.isArray(seasons) || seasons.length === 0) return null;
    const currentIndex = seasons.findIndex((season) => season.slug === currentSlug);
    if (currentIndex === -1) return seasons.length > 1 ? seasons[1].slug : seasons[0].slug;
    return seasons[currentIndex + 1]?.slug || seasons[currentIndex]?.slug || null;
  } catch (error) {
    console.error('Error fetching seasons list:', error);
    return null;
  }
};

const fillFromPreviousSeason = async (seasonSlug, standings) => {
  if (standings.east.length > 0 && standings.west.length > 0) return standings;
  try {
    const previousSlug = await fetchPreviousSeasonSlug(seasonSlug);
    if (!previousSlug) return standings;
    const { data } = await axios.get(`/api/v2/standings/${previousSlug}`);
    return {
      east: standings.east.length ? standings.east : sortPredictions(data?.east).map(toPrediction),
      west: standings.west.length ? standings.west : sortPredictions(data?.west).map(toPrediction),
    };
  } catch (error) {
    console.error('Error fetching previous season standings:', error);
    return standings;
  }
};

const fillFromTeams = async (standings) => {
  if (standings.east.length > 0 && standings.west.length > 0) return standings;
  try {
    const { data } = await axios.get('/api/v2/teams/');
    const teams = data?.teams || [];
    const fallback = (conference) => orderTeamsForFallback(
      teams.filter((team) => (team.conference || '').toLowerCase().startsWith(conference))
    ).map(toPrediction);
    return {
      east: standings.east.length ? standings.east : fallback('east'),
      west: standings.west.length ? standings.west : fallback('west'),
    };
  } catch (error) {
    console.error('Error fetching fallback team list:', error);
    return standings;
  }
};

const applyLocalDraft = (standings, draftStorageKey) => {
  if (!draftStorageKey) return standings;
  try {
    const draft = JSON.parse(localStorage.getItem(draftStorageKey) || 'null');
    return {
      east: restoreDraftOrder(standings.east, draft?.east),
      west: restoreDraftOrder(standings.west, draft?.west),
    };
  } catch (error) {
    console.warn('Unable to restore local standings draft', error);
    return standings;
  }
};

export const loadEditableStandings = async ({ seasonSlug, localOnly, username, draftStorageKey }) => {
  let body = {};
  if (!localOnly) {
    try {
      const config = username ? { params: { username } } : {};
      const { data } = await axios.get(`/api/v2/submissions/standings/${seasonSlug}`, config);
      body = data || {};
    } catch (error) {
      console.error('Error fetching user standings predictions:', error);
    }
  }

  let standings = {
    east: predictionsForConference(body, 'East'),
    west: predictionsForConference(body, 'West'),
  };
  standings = await fillFromPreviousSeason(seasonSlug, standings);
  standings = await fillFromTeams(standings);
  return applyLocalDraft(standings, draftStorageKey);
};

export const standingsPayload = (east, west) => [
  ...east.map((team, index) => ({ team_id: team.team_id, predicted_position: index + 1 })),
  ...west.map((team, index) => ({ team_id: team.team_id, predicted_position: index + 1 })),
];

const getCookie = (name) => {
  const cookie = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
};

export const postStandings = async (seasonSlug, predictions) => {
  const { data } = await axios.post(
    `/api/v2/submissions/standings/${seasonSlug}`,
    { predictions },
    { headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') } }
  );
  if (!data || data.status !== 'success') {
    const error = new Error(data?.message || 'There was an error saving your predictions.');
    error.details = data?.errors;
    throw error;
  }
  return data;
};
