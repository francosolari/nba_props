import React, { useMemo } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { useLeaderboard, usePaymentStatus, useUserSubmissions } from '../../hooks';
import NBAGames from '../../components/nba/NBAGames';
import useNbaSchedule from '../../components/nba/useNbaSchedule';
import ActionLink from './components/ActionLink';
import GuestEntryLedger from './components/GuestEntryLedger';
import EntryChecklist from './components/EntryChecklist';
import StatusLedger from './components/StatusLedger';
import CategorySheet from './components/CategorySheet';
import Podium from './components/Podium';
import CupHonour from './components/CupHonour';
import { PersonalScorebook, LeaderboardLedger, StandingsPulse } from './components/SeasonTables';
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

  const { data: payment } = usePaymentStatus(seasonSlug, {
    enabled: rootProps.isAuthenticated && phase !== 'guest',
  });
  // Only fetched while a season is actually being played; the shared hook keeps
  // the slow upstream feed off the critical path.
  const { games: upcomingGames } = useNbaSchedule(seasonSlug, {
    limit: 5,
    enabled: phase === 'season' && !seasonComplete,
  });

  const leaderboard = Array.isArray(leaderboardData) ? leaderboardData : [];
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
          <StatusLedger me={me} action={action} hasSubmission={rootProps.hasSubmission} seasonLabel={seasonLabel} />
        )}
      </section>

      {phase === 'guest' || (isEntry && !entryDone)
        ? <CategorySheet superlativeCount={superlativeCount} />
        : null}

      {phase !== 'guest' && seasonComplete
        ? <Podium players={podium} seasonLabel={seasonLabel} leaderboardUrl={rootProps.leaderboardUrl} />
        : null}
      {phase !== 'guest' && cup ? <CupHonour cup={cup} /> : null}

      <div className="next-play-dashboard" aria-busy={leaderboardLoading}>
        {phase === 'season' ? <PersonalScorebook me={me} hasSubmission={rootProps.hasSubmission} leaderboardUrl={rootProps.leaderboardUrl} /> : null}
        {/* Other entrants' picks and scores stay private until play begins. */}
        {phase === 'season' ? (
          <LeaderboardLedger
            entries={leaderboard}
            leaderboardUrl={rootProps.leaderboardUrl}
            currentUserId={rootProps.userId}
            skipTop={seasonComplete && podium.length >= 3 ? 3 : 0}
          />
        ) : null}
        <StandingsPulse standings={homepageData?.mini_standings} />
        {phase === 'season' && !seasonComplete ? (
          <NBAGames games={upcomingGames} variant="rail" title="Next up" caption="The next games on the NBA schedule." />
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
