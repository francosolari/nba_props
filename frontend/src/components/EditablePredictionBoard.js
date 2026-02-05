import React, {
  useState,
  useEffect,
  useCallback,
  memo,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import '../styles/palette.css';
import TeamLogo from './TeamLogo';


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
                  {(provided, snapshot) => {
                    const { style: draggableStyle, ...draggableProps } = provided.draggableProps;
                    const baseStyle = draggableStyle || {};
                    const itemStyle = {
                      ...baseStyle,
                      transition: snapshot.isDropAnimating ? 'transform 0.0001s linear' : baseStyle.transition,
                      boxSizing: 'border-box',
                    };

                    if (!snapshot.isDragging && typeof baseStyle.width === 'undefined') {
                      itemStyle.width = '100%';
                    }

                    return (
                      <div
                        className={`conference-team ${snapshot.isDragging ? 'dragging' : ''}`}
                        ref={provided.innerRef}
                        {...draggableProps}
                        {...provided.dragHandleProps}
                        style={itemStyle}
                      >
                        <span className="position">{index + 1}</span>
                        <TeamLogo
                          className="logo"
                          teamName={team.team_name}
                        />
                        <span className="name" title={team.team_name}>
                          {team.team_name}
                        </span>
                      </div>
                    );
                  }}
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

const EditablePredictionBoard = forwardRef(function EditablePredictionBoard(
  { seasonSlug: initialSeasonSlug, canEdit = true, username },
  ref
) {
  const [eastStandings, setEastStandings] = useState([]);
  const [westStandings, setWestStandings] = useState([]);
  const [initialEastStandings, setInitialEastStandings] = useState([]);
  const [initialWestStandings, setInitialWestStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(canEdit);
  const [saving, setSaving] = useState(false);
  const [seasonSlug, setSeasonSlug] = useState(initialSeasonSlug);
  const [isDragging, setIsDragging] = useState(false);
  const bodyOverflowRef = useRef('');

  const computeOrderSignature = useCallback(
    (list) => (Array.isArray(list) ? list.map((team) => team.team_id).join('|') : ''),
    []
  );

  const eastOrderSignature = useMemo(
    () => computeOrderSignature(eastStandings),
    [computeOrderSignature, eastStandings]
  );
  const initialEastSignature = useMemo(
    () => computeOrderSignature(initialEastStandings),
    [computeOrderSignature, initialEastStandings]
  );
  const westOrderSignature = useMemo(
    () => computeOrderSignature(westStandings),
    [computeOrderSignature, westStandings]
  );
  const initialWestSignature = useMemo(
    () => computeOrderSignature(initialWestStandings),
    [computeOrderSignature, initialWestStandings]
  );

  const hasUnsavedChanges = useMemo(
    () => eastOrderSignature !== initialEastSignature || westOrderSignature !== initialWestSignature,
    [eastOrderSignature, initialEastSignature, westOrderSignature, initialWestSignature]
  );

  useEffect(() => {
    if (initialSeasonSlug) {
      setSeasonSlug(initialSeasonSlug);
    }
  }, [initialSeasonSlug]);

  useEffect(() => {
    setIsEditing(canEdit);
    setSaving(false);
  }, [seasonSlug, canEdit]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    if (isDragging) {
      bodyOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = bodyOverflowRef.current || '';
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = bodyOverflowRef.current || '';
      }
    };
  }, [isDragging]);

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
        const config = username ? { params: { username } } : {};
        const response = await axios.get(`/api/v2/submissions/standings/${slugToUse}`, config);
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
      if (!seasonSlug || seasonSlug === 'current') {
        try {
          const latestSeasonResponse = await axios.get('/api/v2/latest-season');
          const latestSlug = latestSeasonResponse.data?.slug;
          if (latestSlug) {
            if (seasonSlug !== latestSlug && isMounted) {
              setSeasonSlug(latestSlug);
              return;
            }
            if (!seasonSlug) {
              // If we started without a slug but resolved immediately, avoid duplicate fetch
              setSeasonSlug(latestSlug);
              return;
            }
          }
        } catch (error) {
          console.error('Error determining latest season:', error);
          if (!seasonSlug && isMounted) {
            setLoading(false);
            return;
          }
        }
        if (!seasonSlug) {
          if (isMounted) {
            setLoading(false);
          }
          return;
        }
      }

      await fetchSeasonAndPredictions(seasonSlug);
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, [seasonSlug, username]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(
    (result) => {
      setIsDragging(false);
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

  const handleSave = useCallback(
    async ({ slugOverride, silent = false, force = false } = {}) => {
      if (!force && !hasUnsavedChanges) {
        // Nothing to do – return success so parent flows can continue.
        return {
          success: true,
          skipped: true,
          slug: slugOverride || seasonSlug,
        };
      }

      setSaving(true);

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
        let targetSlug = slugOverride || seasonSlug;

        if (!targetSlug || targetSlug === 'current') {
          try {
            const { data } = await axios.get('/api/v2/latest-season');
            if (data?.slug) {
              targetSlug = data.slug;
              if (seasonSlug !== data.slug) {
                setSeasonSlug(data.slug);
              }
            }
          } catch (resolveError) {
            console.error('Error resolving season slug before save:', resolveError);
          }
        }

        if (!targetSlug) {
          throw new Error('Unable to determine the active season for saving predictions.');
        }

        const { data } = await axios.post(
          `/api/v2/submissions/standings/${targetSlug}`,
          { predictions: payload },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCookie('csrftoken'),
            },
          }
        );

        if (!data || data.status !== 'success') {
          const message = data?.message || 'There was an error saving your predictions.';
          const details = data?.errors;
          const validationError = new Error(message);
          validationError.details = details;
          throw validationError;
        }

        setInitialEastStandings(eastStandings.map((team) => ({ ...team })));
        setInitialWestStandings(westStandings.map((team) => ({ ...team })));
        if (!canEdit) {
          setIsEditing(false);
        }

        return {
          success: true,
          slug: targetSlug,
          updated: true,
        };
      } catch (error) {
        console.error('Error saving predictions:', error);
        if (!silent) {
          alert(
            error?.message ||
              (error?.response?.data?.message ?? 'There was an error saving your predictions.')
          );
        }
        return {
          success: false,
          error,
        };
      } finally {
        setSaving(false);
      }
    },
    [
      canEdit,
      eastStandings,
      hasUnsavedChanges,
      seasonSlug,
      westStandings,
    ]
  );

  const handleCancel = () => {
    setEastStandings(initialEastStandings.map((team) => ({ ...team })));
    setWestStandings(initialWestStandings.map((team) => ({ ...team })));
    setIsEditing(false);
  };

  const handleResetAll = () => {
    setEastStandings(initialEastStandings.map((team) => ({ ...team })));
    setWestStandings(initialWestStandings.map((team) => ({ ...team })));
  };

  useImperativeHandle(
    ref,
    () => ({
      async saveStandings(options = {}) {
        const { slugOverride, silent = true, force = false } = options;
        return handleSave({ slugOverride, silent, force });
      },
      hasUnsavedChanges: () => hasUnsavedChanges,
      isSaving: () => saving,
    }),
    [handleSave, hasUnsavedChanges, saving]
  );

  return (
    <div className={`standings-wrapper${isDragging ? ' standings-wrapper--dragging' : ''}`}>
      {loading ? (
        <div className="standings-loading">Loading standings...</div>
      ) : (
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
              onClick={() => handleSave()}
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
});

export default EditablePredictionBoard;
