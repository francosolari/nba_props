import { useCallback, useEffect, useMemo } from 'react';
import { findByKeywords, normalizeTeam, resolveConferenceKey } from './istSubmissionUtils';

const selectOption = (options, answer) => (
  options.find((option) => String(option.value) === String(answer)) || null
);

const useIstSubmissionData = ({ questions, answers, onAnswerChange, isReadOnly, teamOptions, istStandings }) => {
  const groupQuestions = useMemo(() => questions
    .filter((question) => question.prediction_type === 'group_winner')
    .sort((a, b) => (a.ist_group || a.text).localeCompare(b.ist_group || b.text)), [questions]);
  const wildcardQuestions = useMemo(
    () => questions.filter((question) => question.prediction_type === 'wildcard'),
    [questions],
  );
  const winnerQuestions = useMemo(() => questions.filter((question) => (
    question.prediction_type === 'conference_winner' || question.prediction_type === 'champion'
  )), [questions]);
  const tiebreakerQuestions = useMemo(
    () => questions.filter((question) => question.prediction_type === 'tiebreaker'),
    [questions],
  );

  const conferenceTeams = useMemo(() => {
    const result = { East: [], West: [] };
    Object.entries(istStandings || {}).forEach(([conference, groups]) => {
      const unique = new Map();
      Object.values(groups || {}).flat().forEach((team) => unique.set(team.team_id, normalizeTeam(team)));
      result[resolveConferenceKey(conference) || 'East'] = Array.from(unique.values());
    });
    teamOptions.forEach((team) => {
      const conference = resolveConferenceKey(team.conference);
      if (conference && !result[conference].some((item) => String(item.id) === String(team.value))) {
        result[conference].push(normalizeTeam(team));
      }
    });
    result.East.sort((a, b) => a.name.localeCompare(b.name));
    result.West.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [istStandings, teamOptions]);

  const teamsForQuestion = useCallback((question, overrideConference = null) => {
    const conference = resolveConferenceKey(overrideConference || question?.ist_group || question?.text);
    const exactGroup = conference ? istStandings?.[conference]?.[question?.ist_group] : null;
    if (exactGroup?.length) return exactGroup.map(normalizeTeam);
    if (conference && conferenceTeams[conference]?.length) return conferenceTeams[conference];
    return teamOptions.map(normalizeTeam);
  }, [conferenceTeams, istStandings, teamOptions]);

  const finals = useMemo(() => ({
    east: findByKeywords(winnerQuestions, ['east', 'winner'])
      || winnerQuestions.find((question) => question.ist_group?.toLowerCase().includes('east')) || null,
    west: findByKeywords(winnerQuestions, ['west', 'winner'])
      || winnerQuestions.find((question) => question.ist_group?.toLowerCase().includes('west')) || null,
    champion: findByKeywords(winnerQuestions, ['champion'])
      || winnerQuestions.find((question) => !/east|west/i.test(question.ist_group || question.text || '')) || null,
  }), [winnerQuestions]);

  const scores = useMemo(() => {
    const east = findByKeywords(tiebreakerQuestions, ['east', 'point'])
      || tiebreakerQuestions.find((question) => /east/i.test(question.text || ''));
    const west = findByKeywords(tiebreakerQuestions, ['west', 'point'])
      || tiebreakerQuestions.find((question) => /west/i.test(question.text || ''));
    const used = new Set([east?.id, west?.id]);
    return { east: east || null, west: west || null, extras: tiebreakerQuestions.filter((question) => !used.has(question.id)) };
  }, [tiebreakerQuestions]);

  const optionSets = useMemo(() => ({
    east: finals.east ? teamsForQuestion(finals.east, 'East').map((team) => ({ value: team.id, label: team.name })) : [],
    west: finals.west ? teamsForQuestion(finals.west, 'West').map((team) => ({ value: team.id, label: team.name })) : [],
    champion: teamOptions.map((team) => ({ value: team.value, label: team.label })).sort((a, b) => a.label.localeCompare(b.label)),
  }), [finals, teamOptions, teamsForQuestion]);
  const selected = {
    east: finals.east ? selectOption(optionSets.east, answers[finals.east.id]) : null,
    west: finals.west ? selectOption(optionSets.west, answers[finals.west.id]) : null,
    champion: finals.champion ? selectOption(optionSets.champion, answers[finals.champion.id]) : null,
  };
  const scoreValues = { east: scores.east ? answers[scores.east.id] ?? '' : '', west: scores.west ? answers[scores.west.id] ?? '' : '' };

  useEffect(() => {
    if (isReadOnly || !finals.champion || !scores.east || !scores.west || !selected.east || !selected.west) return;
    const eastScore = Number(scoreValues.east);
    const westScore = Number(scoreValues.west);
    if (!Number.isFinite(eastScore) || !Number.isFinite(westScore) || eastScore === westScore) return;
    const winner = eastScore > westScore ? selected.east.value : selected.west.value;
    if (String(answers[finals.champion.id]) !== String(winner)) onAnswerChange(finals.champion.id, winner);
  }, [
    answers, finals.champion, isReadOnly, onAnswerChange, scoreValues.east, scoreValues.west,
    scores.east, scores.west, selected.east, selected.west,
  ]);

  return { groupQuestions, wildcardQuestions, winnerQuestions, tiebreakerQuestions, teamsForQuestion, finals, scores, optionSets, selected, scoreValues };
};

export default useIstSubmissionData;
