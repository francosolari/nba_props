/**
 * Playing a night forward.
 *
 * A standings pick is worth 3 points on the nose and 1 point either side of it,
 * so the only question a player actually has about tonight's games is whether a
 * result moves a team into or out of one of those bands. These helpers take the
 * real table, apply hypothetical winners, and re-score every entry against the
 * table that would result — the same arithmetic the grading command runs, so a
 * projection and a final grade can never disagree.
 */

export const EXACT_POINTS = 3;
export const NEAR_POINTS = 1;
export const STANDINGS_CATEGORY = 'Regular Season Standings';

export const teamKey = (name) => String(name || '').trim().toLowerCase();

/** What one pick is worth against a given finishing position. */
export function scorePosition(predicted, actual) {
  if (!predicted || !actual) return 0;
  const gap = Math.abs(predicted - actual);
  if (gap === 0) return EXACT_POINTS;
  if (gap === 1) return NEAR_POINTS;
  return 0;
}

/** Points still on the table for a pick: what an exact call would add. */
export function pointsAvailable(predicted, actual) {
  return EXACT_POINTS - scorePosition(predicted, actual);
}

const winPct = (row) => {
  const played = (row.wins || 0) + (row.losses || 0);
  return played ? row.wins / played : 0;
};

/**
 * Re-sort a conference after hypothetical results. Ties fall back to wins and
 * then to the team's current position, so an unaffected table never reshuffles.
 */
function projectConference(rows, adjustments) {
  return (rows || [])
    .map((row) => {
      const adjustment = adjustments.get(teamKey(row.team)) || { wins: 0, losses: 0 };
      return {
        ...row,
        wins: (row.wins || 0) + adjustment.wins,
        losses: (row.losses || 0) + adjustment.losses,
        // Kept so the table can mark which half of the record the call moved.
        gainedWins: adjustment.wins,
        gainedLosses: adjustment.losses,
        actualPosition: row.position,
      };
    })
    .sort((a, b) => winPct(b) - winPct(a) || b.wins - a.wins || a.actualPosition - b.actualPosition)
    .map((row, index) => ({ ...row, position: index + 1 }));
}

/**
 * @param {object} standings  { eastern: [], western: [] } as served by the API.
 * @param {Array}  outcomes   [{ winner, loser }] team names, one per called game.
 */
export function projectStandings(standings, outcomes) {
  const adjustments = new Map();
  const bump = (name, field) => {
    const key = teamKey(name);
    if (!key) return;
    const current = adjustments.get(key) || { wins: 0, losses: 0 };
    adjustments.set(key, { ...current, [field]: current[field] + 1 });
  };
  (outcomes || []).forEach(({ winner, loser }) => {
    bump(winner, 'wins');
    bump(loser, 'losses');
  });

  return {
    eastern: projectConference(standings?.eastern, adjustments),
    western: projectConference(standings?.western, adjustments),
  };
}

/** Every team's finishing position in one lookup, both conferences together. */
export function positionIndex(standings) {
  const index = new Map();
  [...(standings?.eastern || []), ...(standings?.western || [])].forEach((row) => {
    index.set(teamKey(row.team), row.position);
  });
  return index;
}

/**
 * Re-score and re-rank the pool against a projected table. Only the standings
 * category can move — every other category is already graded and carries over —
 * so each total shifts by the difference on that category alone.
 */
export function projectLeaderboard(entries, standings) {
  const positions = positionIndex(standings);

  return (entries || [])
    .map((entry) => {
      const category = entry.user?.categories?.[STANDINGS_CATEGORY];
      const picks = category?.predictions || [];
      if (!picks.length) return { ...entry, standingsDelta: 0 };

      const projected = picks.reduce(
        (sum, pick) => sum + scorePosition(pick.predicted_position, positions.get(teamKey(pick.team))),
        0,
      );
      const delta = projected - (category.points || 0);
      return {
        ...entry,
        standingsDelta: delta,
        user: { ...entry.user, total_points: (entry.user?.total_points || 0) + delta },
      };
    })
    .sort((a, b) => (b.user?.total_points || 0) - (a.user?.total_points || 0))
    .map((entry, index) => ({ ...entry, rank: index + 1, actualRank: entry.rank }));
}

/** The picks a player made, as team name to the position they gave it. */
export function buildPredictionIndex(submissionStandings) {
  const index = (rows) => new Map(
    (rows || [])
      .filter((row) => row?.team_name && row?.predicted_position)
      .map((row) => [teamKey(row.team_name), row.predicted_position]),
  );
  return { east: index(submissionStandings?.east), west: index(submissionStandings?.west) };
}
