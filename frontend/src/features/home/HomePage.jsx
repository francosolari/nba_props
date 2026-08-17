import React, { useCallback, useMemo, useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { useLeaderboard, usePaymentStatus, useUserSubmissions } from '../../hooks';
import useNbaSchedule from '../../components/nba/useNbaSchedule';
import FixtureRail from './components/FixtureRail';
import ActionLink from './components/ActionLink';
import GuestEntryLedger from './components/GuestEntryLedger';
import EntryChecklist from './components/EntryChecklist';
import StatusLedger from './components/StatusLedger';
import CategorySheet from './components/CategorySheet';
import Podium from './components/Podium';
import CupHonour from './components/CupHonour';
import { LeaderboardLedger, StandingsPulse } from './components/SeasonTables';
import { buildPredictionIndex, projectLeaderboard, projectStandings } from './whatIf';
import { projectBoard, projectFinish, projectLeaderboardFinish } from './projection';
import {
  DEFAULT_SEASON,
  ENTRY_FEE,
  TEAMS_PER_CONFERENCE,
  formatDate,
  formatSeason,
  getEntryAction,
  getPhase,
  getRootProps,
  ordinal,
  useLockCountdown,
} from './entryState';

export default function HomePage({ seasonSlug: seasonSlugProp = DEFAULT_SEASON }) {
  const rootProps = useMemo(() => getRootProps(), []);
  const seasonSlug = rootProps.seasonSlug !== DEFAULT_SEASON
    ? rootProps.seasonSlug
    : seasonSlugProp || DEFAULT_SEASON;

  const { data: leaderboardData, isLoading: leaderboardLoading } = useLeaderboard(seasonSlug);
  const { submissionData, isLoading: submissionLoading } = useUserSubmissions(seasonSlug, rootProps.isAuthenticated);
  const { data: homepageData } = useQuery({
    queryKey: ['homepage-data', seasonSlug],
    queryFn: async () => (await axios.get('/api/v2/homepage/data', { params: { season_slug: seasonSlug } })).data || {},
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const phase = getPhase(rootProps);
  const seasonComplete = Boolean(homepageData?.season?.complete);
  const podium = homepageData?.podium || [];
  const cup = homepageData?.cup || null;
  const isEntry = phase === 'entry' || phase === 'preview';
  const liveSeason = phase === 'season' && !seasonComplete;

  const { data: payment } = usePaymentStatus(seasonSlug, {
    enabled: rootProps.isAuthenticated && phase !== 'guest',
  });
  // Only fetched while a season is actually being played; the shared hook keeps
  // the slow upstream feed off the critical path.
  const { games: upcomingGames } = useNbaSchedule(seasonSlug, {
    // Several nights' worth: a single NBA slate can run to a dozen games, and
    // the rail groups them by day rather than truncating mid-slate.
    limit: 40,
    enabled: liveSeason,
  });

  const leaderboard = Array.isArray(leaderboardData) ? leaderboardData : [];
  // The podium already names the top three, so the table below it starts at 4th.
  const skipTop = seasonComplete && podium.length >= 3 ? 3 : 0;
  const showLeaders = phase === 'season' && leaderboard.length > skipTop;
  const me = useMemo(() => {
    if (!rootProps.isAuthenticated) return null;
    return leaderboard.find((entry) => (
      rootProps.userId && String(entry.user?.id) === String(rootProps.userId)
    )) || leaderboard.find((entry) => (
      rootProps.username && String(entry.user?.username) === String(rootProps.username)
    )) || null;
  }, [leaderboard, rootProps.isAuthenticated, rootProps.userId, rootProps.username]);

  /** Standings and question sections are the entry, so they are counted as one list. */
  const checklist = useMemo(() => {
    const rows = [
      { label: 'Eastern Conference 1–15', saved: Math.min(submissionData?.standings?.east?.length || 0, TEAMS_PER_CONFERENCE), total: TEAMS_PER_CONFERENCE },
      { label: 'Western Conference 1–15', saved: Math.min(submissionData?.standings?.west?.length || 0, TEAMS_PER_CONFERENCE), total: TEAMS_PER_CONFERENCE },
      ...(submissionData?.sections || []).map((section) => ({
        label: section.label,
        saved: section.completed || 0,
        total: section.total || 0,
      })),
    ].filter((row) => row.total > 0);

    return {
      rows,
      saved: rows.reduce((sum, row) => sum + row.saved, 0),
      total: rows.reduce((sum, row) => sum + row.total, 0),
    };
  }, [submissionData]);

  const entry = useMemo(() => ({
    saved: checklist.saved,
    total: checklist.total,
    picksComplete: checklist.total > 0 && checklist.saved >= checklist.total,
    paid: Boolean(payment?.is_paid),
    paidAt: formatDate(payment?.paid_at),
  }), [checklist, payment]);

  const action = getEntryAction(rootProps, phase, entry);
  const deadline = formatDate(rootProps.submissionEnd, true);
  const countdown = useLockCountdown(rootProps.submissionEnd);
  const seasonLabel = formatSeason(rootProps.seasonSlug) || formatSeason(seasonSlug);
  const entryDone = entry.paid && entry.picksComplete;

  // The ladder is read against this entry's own board.
  const predictionIndex = useMemo(
    () => buildPredictionIndex(submissionData?.standings),
    [submissionData],
  );

  /**
   * Calling tonight's games. Each pick names the winning side of one game; the
   * table and the pool are then re-scored against the result that would follow,
   * so "what does this game do to my score" is answered in place.
   */
  const [calls, setCalls] = useState(() => new Map());
  const handleCall = useCallback((game, side) => {
    setCalls((current) => {
      const next = new Map(current);
      const id = game.game_id ?? game.id;
      if (side) next.set(id, side); else next.delete(id);
      return next;
    });
  }, []);
  const clearCalls = useCallback(() => setCalls(new Map()), []);

  const outcomes = useMemo(() => (
    upcomingGames
      .filter((game) => calls.has(game.game_id ?? game.id))
      .map((game) => {
        const side = calls.get(game.game_id ?? game.id);
        return side === 'home'
          ? { winner: game.home?.name, loser: game.away?.name }
          : { winner: game.away?.name, loser: game.home?.name };
      })
  ), [upcomingGames, calls]);

  const projecting = outcomes.length > 0;
  const shownStandings = useMemo(() => (
    projecting ? projectStandings(homepageData?.mini_standings, outcomes) : homepageData?.mini_standings
  ), [projecting, homepageData, outcomes]);
  const shownLeaderboard = useMemo(() => (
    projecting ? projectLeaderboard(leaderboard, shownStandings) : leaderboard
  ), [projecting, leaderboard, shownStandings]);
  const shownMe = useMemo(() => {
    if (!projecting || !me) return me;
    return shownLeaderboard.find((entry) => String(entry.user?.id) === String(me.user?.id)) || me;
  }, [projecting, shownLeaderboard, me]);

  /**
   * Where the board lands if the season keeps behaving like this. Read off the
   * table currently on screen, so calling tonight's games moves the forecast
   * too. It is a projection and is labelled as one: the pool is still graded on
   * the real final standings and nothing here feeds that.
   */
  const forecast = useMemo(() => {
    const hasBoard = predictionIndex.east.size || predictionIndex.west.size;
    if (!liveSeason || !hasBoard || !shownStandings) return null;

    const finish = projectFinish(shownStandings);
    if (!finish.size) return null;

    // Rank only means anything against the rest of the pool, and the projected
    // total has to be the whole entry so it is comparable with the score beside
    // it — both come from re-scoring every board, not just this one.
    const mine = me && projectLeaderboardFinish(leaderboard, finish)
      .find((entry) => String(entry.user?.id) === String(me.user?.id));
    if (!mine) return null;

    const board = projectBoard(predictionIndex, finish);
    return {
      points: Math.round(mine.projectedTotal),
      rank: mine.projectedRank,
      live: board.live,
      settled: board.settled,
    };
  }, [liveSeason, shownStandings, predictionIndex, leaderboard, me]);

  const superlativeCount = useMemo(() => (
    (submissionData?.sections || []).find((section) => section.label === 'Superlatives')?.total || 0
  ), [submissionData]);

  const season = seasonLabel ? <span className="next-play-nowrap">{seasonLabel}</span> : null;
  const headline = phase === 'guest'
    ? <>Call the {season || 'NBA'} season before it happens.</>
    : phase === 'season'
      ? <>Your {season} season, scored.</>
      : entryDone
        ? 'Your entry is in.'
        : entry.paid
          ? 'Your picks aren’t finished.'
          : entry.picksComplete
            ? 'Your entry isn’t paid.'
            : 'Your entry isn’t in yet.';

  const standfirst = phase === 'guest'
    ? `Rank all 30 teams, call the superlatives, settle the props. One ${ENTRY_FEE} entry, scored from opening night to the Finals.`
    : phase === 'season'
      ? seasonComplete
        ? `Every call is graded and the table is final.${me?.rank ? ` You finished ${ordinal(me.rank)}${leaderboard.length ? ` of ${leaderboard.length}` : ''}.` : ''}`
        : `Welcome back${rootProps.displayName ? `, ${rootProps.displayName}` : ''}. Your rank, your score, and every graded call.`
      : entryDone
        ? `Paid and fully picked${deadline ? `. You can keep editing until ${deadline}` : ''}.`
        : entry.picksComplete
          ? `Every pick is saved, but the ${ENTRY_FEE} fee is still due${deadline ? ` and picks lock ${deadline}` : ''}.`
          : `${checklist.total ? `${checklist.total} picks` : 'Standings, superlatives, and props'} plus the ${ENTRY_FEE} fee make a valid entry${deadline ? `. Everything locks ${deadline}` : ''}.`;

  return (
    <main className={`next-play-home is-${phase}`}>
      <section className="next-play-hero">
        <div className="next-play-hero__copy">
          {isEntry && countdown && !countdown.expired ? (
            <p className={`next-play-hero__stamp${entryDone ? ' is-done' : ''}`}>{countdown.label}</p>
          ) : null}
          <h1>{headline}</h1>
          <p className="next-play-hero__standfirst">{standfirst}</p>
          <div className="next-play-hero__actions">
            {phase === 'season'
              ? <ActionLink href={rootProps.leaderboardUrl}>View leaderboard</ActionLink>
              : <ActionLink href={action.href}>{action.label}</ActionLink>}
            {phase === 'guest' ? <ActionLink href={rootProps.loginUrl} secondary>Log in</ActionLink> : null}
          </div>
        </div>
        {phase === 'guest' ? (
          <GuestEntryLedger seasonLabel={seasonLabel} />
        ) : isEntry ? (
          <EntryChecklist
            rows={checklist.rows}
            entry={entry}
            action={action}
            deadline={deadline}
            loading={submissionLoading}
          />
        ) : (
          <StatusLedger
            me={shownMe}
            action={action}
            hasSubmission={rootProps.hasSubmission}
            seasonLabel={seasonLabel}
            projecting={projecting}
            forecast={forecast}
          />
        )}
      </section>

      {phase === 'guest' || (isEntry && !entryDone)
        ? <CategorySheet superlativeCount={superlativeCount} />
        : null}

      {phase !== 'guest' && seasonComplete
        ? <Podium players={podium} seasonLabel={seasonLabel} leaderboardUrl={rootProps.leaderboardUrl} />
        : null}
      {phase !== 'guest' && cup ? <CupHonour cup={cup} /> : null}

      {/* Calling a game and reading the table it moves are one task, so the
          fixtures sit directly beside the standings and the pool table drops
          below them. DOM order is the phone order: call, table, then pool. */}
      <div
        className={`next-play-workbench${liveSeason ? '' : ' is-settled'}${showLeaders ? '' : ' is-single'}`}
        aria-busy={leaderboardLoading}
      >
        {liveSeason ? (
          <FixtureRail
            games={upcomingGames}
            picks={calls}
            onPick={handleCall}
            onReset={clearCalls}
            projecting={projecting}
          />
        ) : null}

        <StandingsPulse standings={shownStandings} predictions={predictionIndex} projecting={projecting} />

        {/* Other entrants' picks and scores stay private until play begins. */}
        {showLeaders ? (
          <LeaderboardLedger
            entries={shownLeaderboard}
            projecting={projecting}
            leaderboardUrl={rootProps.leaderboardUrl}
            currentUserId={rootProps.userId}
            skipTop={skipTop}
            limit={6}
          />
        ) : null}
      </div>

      {phase === 'season' && !seasonComplete && !leaderboardLoading && !leaderboard.length ? (
        <section className="next-play-note">
          <h2>Scoring hasn’t started.</h2>
          <p>Picks are locked. Your rank, category scores, and the leaderboard appear here as soon as the first results are graded.</p>
        </section>
      ) : null}

      {phase === 'guest' ? (
        <section className="next-play-close">
          <span><Users aria-hidden="true" /></span>
          <div>
            <h2>Think you know how the season ends?</h2>
            <p>Put it on the record before submissions close{deadline ? ` on ${deadline}` : ''}.</p>
          </div>
          <ActionLink href={action.href}>{action.label}</ActionLink>
        </section>
      ) : null}
    </main>
  );
}
