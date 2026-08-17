import { useEffect, useState } from 'react';
import axios from 'axios';
import { getAxiosErrorMessage } from './submissionErrors';

const mapPlayerOptions = (data) => data?.players?.map((player) => ({
  value: player.id,
  label: player.name,
  headshotUrl: player.headshot_url || null,
})) || [];

const mapTeamOptions = (data) => data?.teams?.map((team) => ({
  value: team.id,
  label: team.name,
  conference: team.conference || null,
})) || [];

const useSubmissionOptions = ({ questions, seasonSlug }) => {
  const [playerOptions, setPlayerOptions] = useState([]);
  const [teamOptions, setTeamOptions] = useState([]);
  const [loadingAuxData, setLoadingAuxData] = useState(false);
  const [istStandings, setIstStandings] = useState(null);
  const [loadingIstStandings, setLoadingIstStandings] = useState(false);
  const [istStandingsError, setIstStandingsError] = useState(null);

  useEffect(() => {
    const needsPlayers = questions.some((question) => question.question_type === 'superlative');
    const needsTeams = questions.some((question) => (
      ['head_to_head', 'ist', 'nba_finals'].includes(question.question_type)
    ));
    if (!needsPlayers && !needsTeams) return undefined;

    let cancelled = false;
    const fetchOptions = async () => {
      setLoadingAuxData(true);
      try {
        const [players, teams] = await Promise.all([
          needsPlayers && playerOptions.length === 0
            ? axios.get('/api/v2/players/').then(({ data }) => mapPlayerOptions(data))
            : Promise.resolve(playerOptions),
          needsTeams && teamOptions.length === 0
            ? axios.get('/api/v2/teams/').then(({ data }) => mapTeamOptions(data))
            : Promise.resolve(teamOptions),
        ]);
        if (!cancelled) {
          if (needsPlayers && players.length) setPlayerOptions(players);
          if (needsTeams && teams.length) setTeamOptions(teams);
        }
      } catch (error) {
        console.error('Failed to fetch submission reference data', error);
      } finally {
        if (!cancelled) setLoadingAuxData(false);
      }
    };

    fetchOptions();
    return () => { cancelled = true; };
  }, [questions, playerOptions, teamOptions]);

  useEffect(() => {
    const hasIstQuestions = questions.some((question) => question.question_type === 'ist');
    if (!seasonSlug || !hasIstQuestions) {
      setIstStandings(null);
      setIstStandingsError(null);
      return undefined;
    }

    let cancelled = false;
    const fetchIstStandings = async () => {
      setLoadingIstStandings(true);
      setIstStandingsError(null);
      try {
        const { data } = await axios.get(`/api/v2/standings/ist/${seasonSlug}`);
        if (!cancelled) setIstStandings(data);
      } catch (error) {
        if (!cancelled) {
          setIstStandings(null);
          setIstStandingsError(getAxiosErrorMessage(
            error,
            'Unable to load NBA Cup group standings right now.',
          ));
        }
      } finally {
        if (!cancelled) setLoadingIstStandings(false);
      }
    };

    fetchIstStandings();
    return () => { cancelled = true; };
  }, [questions, seasonSlug]);

  return {
    playerOptions,
    teamOptions,
    loadingAuxData,
    istStandings,
    loadingIstStandings,
    istStandingsError,
  };
};

export default useSubmissionOptions;
