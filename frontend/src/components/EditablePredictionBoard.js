import React, { useState, useEffect, useCallback, memo } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import '../styles/palette.css';

const teamSlug = (name = '') =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

const StandingsList = memo(({ conference, teams, isEditable }) => (
  <div className="standings-column">
    <div className="standings-shell">
      <div className="conference-header">
        <span>{conference}ern Conference</span>
        <span className={`badge ${conference === 'East' ? 'east' : 'west'}`}>{conference}</span>
      </div>

      <Droppable droppableId={`${conference}-standings`} direction="vertical">
        {(provided) => (
          <div
            className={`conference-list ${conference === 'East' ? 'east' : 'west'}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {teams.length > 0 ? (
              teams.map((team, index) => (
                <Draggable
                  key={team.team_id.toString()}
                  draggableId={team.team_id.toString()}
                  index={index}
                  isDragDisabled={!isEditable}
                >
                  {(provided, snapshot) => (
                    <div
                      className={`conference-team ${snapshot.isDragging ? 'dragging' : ''}`}
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <span className="position">{index + 1}</span>
                      <img
                        className="logo"
                        src={`/static/img/teams/${teamSlug(team.team_name)}.png`}
                        alt={team.team_name}
                        onError={(e) => {
                          const img = e.currentTarget;
                          const slug = teamSlug(team.team_name);
                          const step = parseInt(img.dataset.step || '0', 10);
                          if (step === 0) {
                            img.dataset.step = '1';
                            img.src = `/static/img/teams/${slug}.svg`;
                            return;
                          }
                          if (step === 1) {
                            img.dataset.step = '2';
                            img.src = `/static/img/teams/${slug}.PNG`;
                            return;
                          }
                          if (step === 2) {
                            img.dataset.step = '3';
                            img.src = `/static/img/teams/${slug}.SVG`;
                            return;
                          }
                          img.onerror = null;
                          img.src = '/static/img/teams/unknown.svg';
                        }}
                      />
                      <span className="name" title={team.team_name}>
                        {team.team_name}
                      </span>
                    </div>
                  )}
                </Draggable>
              ))
            ) : (
              <div className="standings-empty">No teams available.</div>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  </div>
));

function EditablePredictionBoard({ seasonSlug: initialSeasonSlug, canEdit = true, username }) {
  const [eastStandings, setEastStandings] = useState([]);
  const [westStandings, setWestStandings] = useState([]);
  const [initialEastStandings, setInitialEastStandings] = useState([]);
  const [initialWestStandings, setInitialWestStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seasonSlug, setSeasonSlug] = useState(initialSeasonSlug);

  useEffect(() => {
    if (initialSeasonSlug) {
      setSeasonSlug(initialSeasonSlug);
    }
  }, [initialSeasonSlug]);

  useEffect(() => {
    setIsEditing(false);
    setSaving(false);
  }, [seasonSlug]);

  useEffect(() => {
    let isMounted = true;

    const sortPredictions = (list) =>
      [...list].sort((a, b) => (a.predicted_position || 0) - (b.predicted_position || 0));

    const orderTeamsForFallback = (teams = []) =>
      [...teams].sort((a, b) => {
        const aMetric =
          a?.seed ?? a?.rank ?? a?.projected_rank ?? a?.predicted_position ?? Number.MAX_SAFE_INTEGER;
        const bMetric =
          b?.seed ?? b?.rank ?? b?.projected_rank ?? b?.predicted_position ?? Number.MAX_SAFE_INTEGER;
        if (aMetric !== bMetric) return aMetric - bMetric;
        const aName = a?.name || '';
        const bName = b?.name || '';
        return aName.localeCompare(bName);
      });

    const fetchPreviousSeasonSlug = async (currentSlug) => {
      try {
        const { data: seasons } = await axios.get('/api/v2/seasons/');
        if (!Array.isArray(seasons) || seasons.length === 0) return null;
        const currentIndex = seasons.findIndex((s) => s.slug === currentSlug);
        if (currentIndex === -1) {
          return seasons.length > 1 ? seasons[1].slug : seasons[0].slug;
        }
        const previous = seasons[currentIndex + 1];
        return previous?.slug || seasons[currentIndex]?.slug || null;
      } catch (error) {
        console.error('Error fetching seasons list:', error);
        return null;
      }
    };

    const mapStandingsToPredictions = (entries = []) =>
      entries
        .sort((a, b) => (a.position || 0) - (b.position || 0))
        .map((entry, idx) => ({
          team_id: entry.id,
          team_name: entry.name,
          predicted_position: entry.position || idx + 1,
        }));

    const fetchSeasonAndPredictions = async (slugToUse) => {
      setLoading(true);
      let body = {};

      try {
        const params = username ? { params: { username } } : undefined;
        const response = await axios.get(`/api/user_predictions/${slugToUse}/`, params);
        body = response.data || {};
      } catch (error) {
        console.error('Error fetching user standings predictions:', error);
      }

      let east = Array.isArray(body.east) && body.east.length ? sortPredictions(body.east) : [];
      let west = Array.isArray(body.west) && body.west.length ? sortPredictions(body.west) : [];

      if (east.length === 0 || west.length === 0) {
        const preds = Array.isArray(body.predictions) ? body.predictions : [];
        if (east.length === 0) {
          east = preds
            .filter((t) => t.team_conference === 'East')
            .sort((a, b) => (a.predicted_position || 0) - (b.predicted_position || 0))
            .map((t, idx) => ({
              team_id: t.team_id,
              team_name: t.team_name,
              predicted_position: t.predicted_position || idx + 1,
            }));
        }
        if (west.length === 0) {
          west = preds
            .filter((t) => t.team_conference === 'West')
            .sort((a, b) => (a.predicted_position || 0) - (b.predicted_position || 0))
            .map((t, idx) => ({
              team_id: t.team_id,
              team_name: t.team_name,
              predicted_position: t.predicted_position || idx + 1,
            }));
        }
      }

      if (east.length === 0 || west.length === 0) {
        try {
          const previousSlug = await fetchPreviousSeasonSlug(slugToUse);
          if (previousSlug) {
            const { data: previousStandings } = await axios.get(`/api/v2/standings/${previousSlug}`);
            if (east.length === 0 && Array.isArray(previousStandings?.east)) {
              east = mapStandingsToPredictions(previousStandings.east);
            }
            if (west.length === 0 && Array.isArray(previousStandings?.west)) {
              west = mapStandingsToPredictions(previousStandings.west);
            }
          }
        } catch (error) {
          console.error('Error fetching previous season standings:', error);
        }
      }

      if (east.length === 0 || west.length === 0) {
        try {
          const { data: teamsResponse } = await axios.get('/api/v2/teams/');
          const teams = teamsResponse?.teams || [];
          if (east.length === 0) {
            const eastTeams = orderTeamsForFallback(
              teams.filter((team) => (team.conference || '').toLowerCase().startsWith('east'))
            );
            east = eastTeams.map((team, idx) => ({
              team_id: team.id,
              team_name: team.name,
              predicted_position: idx + 1,
            }));
          }
          if (west.length === 0) {
            const westTeams = orderTeamsForFallback(
              teams.filter((team) => (team.conference || '').toLowerCase().startsWith('west'))
            );
            west = westTeams.map((team, idx) => ({
              team_id: team.id,
              team_name: team.name,
              predicted_position: idx + 1,
            }));
          }
        } catch (error) {
          console.error('Error fetching fallback team list:', error);
        }
      }

      if (isMounted) {
        const eastClone = east.map((team) => ({ ...team }));
        const westClone = west.map((team) => ({ ...team }));
        const eastBaseline = eastClone.map((team) => ({ ...team }));
        const westBaseline = westClone.map((team) => ({ ...team }));
        setEastStandings(eastClone);
        setWestStandings(westClone);
        setInitialEastStandings(eastBaseline);
        setInitialWestStandings(westBaseline);
        setLoading(false);
      }
    };

    const hydrate = async () => {
      if (!seasonSlug) {
        try {
          const latestSeasonResponse = await axios.get('/api/v2/latest-season');
          const latestSlug = latestSeasonResponse.data?.slug;
          if (latestSlug && isMounted) {
            setSeasonSlug(latestSlug);
          }
        } catch (error) {
          console.error('Error determining latest season:', error);
          if (isMounted) {
            setLoading(false);
          }
        }
        return;
      }

      await fetchSeasonAndPredictions(seasonSlug);
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, [seasonSlug, username]);

  const onDragEnd = useCallback(
    (result) => {
      const { source, destination } = result;

      if (!destination) return;

      const sourceConference = source.droppableId.startsWith('East') ? 'East' : 'West';
      const destinationConference = destination.droppableId.startsWith('East') ? 'East' : 'West';

      if (sourceConference !== destinationConference) return;

      const standings = sourceConference === 'East' ? Array.from(eastStandings) : Array.from(westStandings);
      const [movedTeam] = standings.splice(source.index, 1);
      standings.splice(destination.index, 0, movedTeam);

      if (sourceConference === 'East') {
        setEastStandings(standings);
      } else {
        setWestStandings(standings);
      }
    },
    [eastStandings, westStandings]
  );

  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  const handleSave = async () => {
    setSaving(true);
    // Submit the updated standings to the server
    const eastPayload = eastStandings.map((team, index) => ({
      team_id: team.team_id,
      predicted_position: index + 1,
    }));

    const westPayload = westStandings.map((team, index) => ({
      team_id: team.team_id,
      predicted_position: index + 1,
    }));

    const payload = [...eastPayload, ...westPayload];

    try {
      await axios.post(`/api/submit_predictions/${seasonSlug}/`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
      });
      setIsEditing(false);
      setInitialEastStandings(eastStandings.map((team) => ({ ...team })));
      setInitialWestStandings(westStandings.map((team) => ({ ...team })));
    } catch (error) {
      console.error('Error saving predictions:', error);
      alert('There was an error saving your predictions.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEastStandings(initialEastStandings.map((team) => ({ ...team })));
    setWestStandings(initialWestStandings.map((team) => ({ ...team })));
    setIsEditing(false);
  };

  const handleResetAll = () => {
    setEastStandings(initialEastStandings.map((team) => ({ ...team })));
    setWestStandings(initialWestStandings.map((team) => ({ ...team })));
  };

  return (
    <div className="standings-wrapper">
      {loading ? (
        <div className="standings-loading">Loading standings...</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="standings-grid">
            <StandingsList conference="East" teams={eastStandings} isEditable={isEditing} />
            <StandingsList conference="West" teams={westStandings} isEditable={isEditing} />
          </div>
        </DragDropContext>
      )}

      <div className="standings-actions">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={handleCancel}
              className="standings-button cancel"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleResetAll}
              className="standings-button ghost"
              disabled={saving}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="standings-button save"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </>
        ) : (
          canEdit && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="standings-button edit"
              disabled={loading}
            >
              Edit Standings
            </button>
          )
        )}
      </div>
    </div>
  );
}

export default EditablePredictionBoard;
