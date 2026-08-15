import React, { useMemo } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Clock3,
  Medal,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { useLeaderboard, useUserSubmissions } from '../hooks';
import '../styles/palette.css';

const DEFAULT_SEASON = 'current';
const ENTRY_FEE = '$25';

const parseBool = (value) => String(value || '').toLowerCase() === 'true';

function getRootProps() {
  const element = typeof document !== 'undefined' ? document.getElementById('home-root') : null;
  const data = element?.dataset || {};

  return {
    seasonSlug: data.seasonSlug || DEFAULT_SEASON,
    isAuthenticated: parseBool(data.isAuthenticated),
    userId: data.userId || '',
    username: data.username || '',
    displayName: data.displayName || '',
    hasSubmission: parseBool(data.hasSubmission),
    submissionOpen: parseBool(data.submissionOpen),
    submissionStart: data.submissionStart || '',
    submissionEnd: data.submissionEnd || '',
    submitUrl: data.submitUrl || '',
    signupUrl: data.signupUrl || '',
    loginUrl: data.loginUrl || '',
    leaderboardUrl: data.leaderboardUrl || '',
  };
}

function formatDate(value, includeTime = false) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}

function getEntryAction(rootProps) {
  if (!rootProps.isAuthenticated) {
    return {
      label: 'Start your entry',
      href: rootProps.submitUrl || rootProps.signupUrl || '#signup',
    };
  }
  if (!rootProps.hasSubmission && rootProps.submissionOpen) {
    return { label: 'Create your entry', href: rootProps.submitUrl };
  }
  if (rootProps.hasSubmission && rootProps.submissionOpen) {
    return { label: 'Review or edit picks', href: rootProps.submitUrl };
  }
  return { label: 'Review your picks', href: rootProps.submitUrl };
}

function ActionLink({ href, children, secondary = false }) {
  if (!href) return null;
  return (
    <a className={`next-play-action${secondary ? ' is-secondary' : ''}`} href={href}>
      <span>{children}</span>
      <ArrowRight aria-hidden="true" />
    </a>
  );
}

function GuestEntryLedger({ submissionOpen, loginUrl, action }) {
  const steps = [
    ['Rank all 30 teams', 'Set the East and West in the order you think they finish.'],
    ['Call awards and props', 'Choose the season-defining players, totals, and outcomes.'],
    ['Earn points all season', 'Your picks earn points as NBA results are graded.'],
  ];

  return (
    <aside className="next-play-ledger next-play-ledger--guest" aria-label="How the game works">
      <header className="next-play-ledger__mast">
        <span>Season entry sheet</span>
        <strong>{submissionOpen ? 'Entries open' : 'Season preview'}</strong>
      </header>
      <ol className="next-play-steps">
        {steps.map(([title, detail], index) => (
          <li key={title}>
            <span className="next-play-steps__number">{String(index + 1).padStart(2, '0')}</span>
            <span className="next-play-steps__copy">
              <strong>{title}</strong>
              <small>{detail}</small>
            </span>
          </li>
        ))}
      </ol>
      <footer className="next-play-ledger__footer">
        <a href={loginUrl || '#login'}>Log in</a>
        <a href={action.href}>{action.label}<ChevronRight aria-hidden="true" /></a>
      </footer>
    </aside>
  );
}

function PlayerLedger({ rootProps, me, action, submissionLoading, submissionData }) {
  const deadline = formatDate(rootProps.submissionEnd, true) || 'Not scheduled';
  const totalPoints = me?.user?.total_points;
  const sectionTotal = submissionData?.sections?.reduce((sum, section) => sum + (section.total || 0), 0) || 0;
  const sectionComplete = submissionData?.sections?.reduce((sum, section) => sum + (section.completed || 0), 0) || 0;
  const entryStatus = submissionLoading
    ? 'Checking entry'
    : rootProps.hasSubmission
      ? 'Entry saved'
      : rootProps.submissionOpen
        ? 'Action needed'
        : 'No valid entry';

  return (
    <aside className="next-play-ledger next-play-ledger--player" aria-label="Your season status">
      <header className="next-play-ledger__mast">
        <span>Your season ledger</span>
        <strong>{rootProps.submissionOpen ? 'Live window' : 'Picks locked'}</strong>
      </header>
      <div className="next-play-player-grid">
        <div><span>Rank</span><strong>{me?.rank ? `#${me.rank}` : '—'}</strong><small>{me ? 'Live position' : 'Awaiting score'}</small></div>
        <div><span>Total score</span><strong>{Number.isFinite(totalPoints) ? totalPoints.toLocaleString() : '—'}</strong><small>Points earned</small></div>
        <div><span>Entry</span><strong className="next-play-player-grid__status">{entryStatus}</strong><small>{sectionTotal ? `${sectionComplete} of ${sectionTotal} calls saved` : 'Season submission'}</small></div>
        <div><span>Deadline</span><strong className="next-play-player-grid__deadline">{deadline}</strong><small>{rootProps.submissionOpen ? 'Edits allowed until then' : 'Submission window closed'}</small></div>
      </div>
      <div className="next-play-ledger__next">
        <span><ClipboardList aria-hidden="true" /></span>
        <div><strong>Next play</strong><small>{rootProps.hasSubmission ? 'Review your picks before the window closes.' : 'Complete your standings, awards, and props.'}</small></div>
        <ActionLink href={action.href}>{action.label}</ActionLink>
      </div>
    </aside>
  );
}

function ScorePath() {
  const stages = [
    { icon: ClipboardList, title: 'Make the calls', copy: 'Standings, awards, props, playoffs, and the NBA Cup.' },
    { icon: Target, title: 'Results become points', copy: 'Your score updates as real NBA outcomes are graded.' },
    { icon: Trophy, title: 'Climb the table', copy: 'Track your overall rank and every scoring category.' },
  ];

  return (
    <section className="next-play-path" aria-labelledby="score-path-title">
      <header>
        <h2 id="score-path-title">One entry, scored all season.</h2>
        <p>Submit your picks once. Your score updates as NBA results are graded.</p>
      </header>
      <div className="next-play-path__stages">
        {stages.map(({ icon: Icon, title, copy }, index) => (
          <article key={title}>
            <span className="next-play-path__index">{String(index + 1).padStart(2, '0')}</span>
            <Icon aria-hidden="true" />
            <div><h3>{title}</h3><p>{copy}</p></div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PersonalScorebook({ me, hasSubmission, leaderboardUrl }) {
  const categories = me?.user?.categories || {};
  const rows = [
    ['Regular season', categories['Regular Season Standings']],
    ['Player awards', categories['Player Awards']],
    ['Props & yes/no', categories['Props & Yes/No']],
  ];

  return (
    <section className="next-play-scorebook" aria-labelledby="personal-scorebook-title">
      <header className="next-play-section-head">
        <div><h2 id="personal-scorebook-title">Your scorebook</h2><p>See your category scores and overall total.</p></div>
        {leaderboardUrl ? <a href={leaderboardUrl}>Full breakdown <ArrowRight aria-hidden="true" /></a> : null}
      </header>
      <div className="next-play-scorebook__summary">
        <div><Medal aria-hidden="true" /><span>Overall rank</span><strong>{me?.rank ? `#${me.rank}` : '—'}</strong></div>
        <div><BarChart3 aria-hidden="true" /><span>Total score</span><strong>{Number.isFinite(me?.user?.total_points) ? me.user.total_points.toLocaleString() : hasSubmission ? '0' : '—'}</strong></div>
      </div>
      <div className="next-play-scorebook__rows">
        <div className="next-play-scorebook__row is-head"><span>Category</span><span>Score</span><span>Available</span></div>
        {rows.map(([label, category]) => (
          <div className="next-play-scorebook__row" key={label}>
            <span>{label}</span><strong>{category?.points || 0}</strong><span>{category?.max_points || '—'}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function LeaderboardLedger({ entries, leaderboardUrl, currentUserId }) {
  return (
    <section className="next-play-leaders" aria-labelledby="leaders-title">
      <header className="next-play-section-head">
        <div><h2 id="leaders-title">Live table</h2><p>The top of the season-long competition.</p></div>
        {leaderboardUrl ? <a href={leaderboardUrl}>View leaderboard <ArrowRight aria-hidden="true" /></a> : null}
      </header>
      <div className="next-play-leaders__table">
        <div className="next-play-leaders__row is-head"><span>Rank</span><span>Player</span><span>Points</span></div>
        {entries.length ? entries.slice(0, 6).map((entry) => {
          const isCurrent = currentUserId && String(entry.user?.id) === String(currentUserId);
          return (
            <a className={`next-play-leaders__row${isCurrent ? ' is-current' : ''}`} href={leaderboardUrl || '#'} key={`${entry.rank}-${entry.user?.id || entry.user?.username}`}>
              <strong>#{entry.rank ?? '—'}</strong>
              <span>{entry.user?.display_name || entry.user?.username || 'Player'}{isCurrent ? ' (You)' : ''}</span>
              <strong>{entry.user?.total_points ?? entry.points ?? 0}</strong>
            </a>
          );
        }) : (
          <div className="next-play-leaders__empty"><Users aria-hidden="true" /><span>The table will fill when scored entries are available.</span></div>
        )}
      </div>
    </section>
  );
}

function StandingsPulse({ standings }) {
  if (!standings?.eastern?.length && !standings?.western?.length) return null;
  const conferences = [['East', standings.eastern || []], ['West', standings.western || []]];
  return (
    <section className="next-play-pulse" aria-labelledby="pulse-title">
      <header className="next-play-section-head"><div><h2 id="pulse-title">NBA standings</h2><p>Compare your predictions with the current conference leaders.</p></div></header>
      <div className="next-play-pulse__grid">
        {conferences.map(([name, teams]) => (
          <div className={`next-play-conference is-${name.toLowerCase()}`} key={name}>
            <header><span>{name}</span><span>W–L</span></header>
            {teams.slice(0, 4).map((team) => (
              <div key={`${name}-${team.team}`}><strong>{team.position}</strong><span>{team.team}</span><b>{team.wins}–{team.losses}</b></div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HomePage({ seasonSlug: seasonSlugProp = DEFAULT_SEASON }) {
  const rootProps = useMemo(() => getRootProps(), []);
  const seasonSlug = seasonSlugProp || rootProps.seasonSlug;
  const { data: leaderboardData, isLoading: leaderboardLoading } = useLeaderboard(seasonSlug);
  const { submissionData, isLoading: submissionLoading } = useUserSubmissions(seasonSlug, rootProps.isAuthenticated);
  const { data: homepageData } = useQuery({
    queryKey: ['homepage-data', seasonSlug],
    queryFn: async () => (await axios.get('/api/v2/homepage/data')).data || {},
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
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

  const action = getEntryAction(rootProps);
  const deadline = formatDate(rootProps.submissionEnd, true);
  const isPlayer = rootProps.isAuthenticated;
  const headline = isPlayer
    ? rootProps.hasSubmission ? 'Your season. Every call accounted for.' : 'Your next play starts here.'
    : 'Call the season before it happens.';

  return (
    <main className={`next-play-home${isPlayer ? ' is-player' : ' is-guest'}`}>
      <section className="next-play-hero">
        <div className="next-play-hero__copy">
          <h1>{headline}</h1>
          <p>{isPlayer
            ? `Welcome back${rootProps.displayName ? `, ${rootProps.displayName}` : ''}. Check your picks, score, and current rank.`
            : 'Rank every team, call the awards and props, then earn points as the real NBA season unfolds.'}</p>
          <div className="next-play-hero__actions">
            <ActionLink href={action.href}>{action.label}</ActionLink>
            <ActionLink href={isPlayer ? rootProps.leaderboardUrl : rootProps.loginUrl} secondary>{isPlayer ? 'View leaderboard' : 'Log in'}</ActionLink>
          </div>
          <dl className="next-play-facts">
            <div><dt><CalendarDays aria-hidden="true" />Entry deadline</dt><dd>{deadline || (rootProps.submissionOpen ? 'Open now' : 'To be announced')}</dd></div>
            <div><dt><ClipboardList aria-hidden="true" />Entry fee</dt><dd>{ENTRY_FEE}</dd></div>
            <div><dt><Clock3 aria-hidden="true" />Scoring</dt><dd>All season</dd></div>
          </dl>
        </div>
        {isPlayer ? (
          <PlayerLedger rootProps={rootProps} me={me} action={action} submissionLoading={submissionLoading} submissionData={submissionData} />
        ) : (
          <GuestEntryLedger submissionOpen={rootProps.submissionOpen} loginUrl={rootProps.loginUrl} action={action} />
        )}
      </section>

      {!isPlayer ? <ScorePath /> : null}

      <div className={`next-play-dashboard${isPlayer ? '' : ' is-guest'}`} aria-busy={leaderboardLoading}>
        {isPlayer ? <PersonalScorebook me={me} hasSubmission={rootProps.hasSubmission} leaderboardUrl={rootProps.leaderboardUrl} /> : null}
        <LeaderboardLedger entries={leaderboard} leaderboardUrl={rootProps.leaderboardUrl} currentUserId={rootProps.userId} />
        {isPlayer ? <StandingsPulse standings={homepageData?.mini_standings} /> : null}
      </div>

      <section className="next-play-close">
        <span><Check aria-hidden="true" /></span>
        <div><h2>{isPlayer ? 'Review your picks before they lock.' : 'Think you know how the season ends?'}</h2><p>{isPlayer ? 'Check your entry and follow each scoring update.' : 'Put it on the record before submissions close.'}</p></div>
        <ActionLink href={action.href}>{action.label}</ActionLink>
      </section>
    </main>
  );
}
