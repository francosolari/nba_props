import React, { useMemo } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Trophy,
  TrendingUp,
  Target,
  UserPlus,
  Users,
  LineChart,
} from 'lucide-react';
import { useLeaderboard, useUserSubmissions } from '../hooks';
import '../styles/palette.css';

const DEFAULT_SEASON = 'current';

const parseBool = (value) => String(value || '').toLowerCase() === 'true';

function getRootProps() {
  const el = typeof document !== 'undefined' ? document.getElementById('home-root') : null;
  if (!el) {
    return {
      seasonSlug: DEFAULT_SEASON,
      isAuthenticated: false,
      userId: '',
      username: '',
      displayName: '',
      hasStandingSubmission: false,
      hasAnswerSubmission: false,
      hasSubmission: false,
      submissionOpen: false,
      submissionStart: '',
      submissionEnd: '',
      submitUrl: '',
      signupUrl: '',
      loginUrl: '',
      leaderboardUrl: '',
      profileUrl: '',
    };
  }

  const data = el.dataset || {};
  return {
    seasonSlug: data.seasonSlug || DEFAULT_SEASON,
    isAuthenticated: parseBool(data.isAuthenticated),
    userId: data.userId || '',
    username: data.username || '',
    displayName: data.displayName || '',
    hasStandingSubmission: parseBool(data.hasStandingSubmission),
    hasAnswerSubmission: parseBool(data.hasAnswerSubmission),
    hasSubmission: parseBool(data.hasSubmission),
    submissionOpen: parseBool(data.submissionOpen),
    submissionStart: data.submissionStart || '',
    submissionEnd: data.submissionEnd || '',
    submitUrl: data.submitUrl || '',
    signupUrl: data.signupUrl || '',
    loginUrl: data.loginUrl || '',
    leaderboardUrl: data.leaderboardUrl || '',
    profileUrl: data.profileUrl || '',
  };
}

function formatDateRange(startIso, endIso) {
  if (!startIso && !endIso) return null;
  const start = startIso ? new Date(startIso) : null;
  const end = endIso ? new Date(endIso) : null;
  const dateOptions = { month: 'long', day: 'numeric' };
  const timeOptions = { hour: 'numeric', minute: '2-digit' };

  if (start && end) {
    const sameDay = start.toDateString() === end.toDateString();
    const startDate = start.toLocaleDateString(undefined, dateOptions);
    const endDate = end.toLocaleDateString(undefined, dateOptions);
    const startTime = start.toLocaleTimeString(undefined, timeOptions);
    const endTime = end.toLocaleTimeString(undefined, timeOptions);
    if (sameDay) {
      return `${startDate} | ${startTime} - ${endTime}`;
    }
    return `${startDate} ${startTime} - ${endDate} ${endTime}`;
  }

  if (end) {
    const endDate = end.toLocaleDateString(undefined, dateOptions);
    const endTime = end.toLocaleTimeString(undefined, timeOptions);
    return `Closes ${endDate} | ${endTime}`;
  }

  return null;
}

const PREVIEW_STANDINGS = {
  east: [{ team_name: 'Celtics' }, { team_name: 'Knicks' }, { team_name: 'Bucks' }, { team_name: '76ers' }],
  west: [{ team_name: 'Nuggets' }, { team_name: 'Thunder' }, { team_name: 'Timberwolves' }, { team_name: 'Mavericks' }],
};

const PREVIEW_SECTIONS = [
  { label: 'Props & Totals', total: 7, completed: 3 },
  { label: 'Superlatives', total: 4, completed: 2 },
  { label: 'In-Season Tournament', total: 2, completed: 0 },
];

function StatCard({ icon: Icon, title, value, subtitle, highlightUrl, highlightTitle }) {
  const Wrapper = highlightUrl ? 'a' : 'div';
  const wrapperProps = highlightUrl
    ? {
      href: highlightUrl,
      title: highlightTitle || title,
      className: 'home-stat-card home-stat-card--link',
    }
    : { className: 'home-stat-card' };

  return (
    <Wrapper {...wrapperProps}>
      <div className="home-stat-card__icon">
        <Icon className="w-4 h-4" />
      </div>
      <div className="home-stat-card__label">{title}</div>
      <div className="home-stat-card__value">{value}</div>
      {subtitle ? <div className="home-stat-card__subtle">{subtitle}</div> : null}
    </Wrapper>
  );
}

function LeaderboardPreview({ entries, leaderboardUrl }) {
  return (
    <section className="home-section">
      <div className="home-section__header">
        <div>
          <h2>Leaderboard snapshot</h2>
          <p>See who is surging this season. Tap any name to deep dive into the full board.</p>
        </div>
        {leaderboardUrl ? (
          <a href={leaderboardUrl} className="home-link">
            View full leaderboard
            <ArrowRight className="w-4 h-4" />
          </a>
        ) : null}
      </div>
      <div className="home-leaderboard">
        <div className="home-leaderboard__head">
          <span>#</span>
          <span>Player</span>
          <span>Points</span>
        </div>
        <div className="home-leaderboard__body">
          {entries.length === 0 ? (
            <div className="home-leaderboard__empty">
              <Users className="w-5 h-5" />
              <span>Leaderboard coming soon. Submit your picks to claim a spot.</span>
            </div>
          ) : (
            entries.map((entry) => (
              <a
                key={`${entry.rank}-${entry.user?.username || entry.user?.id || entry.rank}`}
                href={leaderboardUrl || '#'}
                className="home-leaderboard__row"
              >
                <span className="home-leaderboard__rank">#{entry.rank ?? '--'}</span>
                <span className="home-leaderboard__name">{entry.user?.display_name || entry.user?.username || 'Player'}</span>
                <span className="home-leaderboard__points">{entry.user?.total_points ?? entry.points ?? 0}</span>
              </a>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function StandingsPreview({ standings, isAuthenticated, loginUrl, signupUrl }) {
  if (!standings || (!standings.eastern?.length && !standings.western?.length)) {
    return null;
  }

  const renderConference = (label, teams, accent) => (
    <div className={`home-standings-card home-standings-card--${accent}`}>
      <header>
        <span>{label}</span>
        <LineChart className="w-4 h-4" />
      </header>
      <ul>
        {teams.map((team) => (
          <li key={`${label}-${team.team}`}>
            <span className="home-standings-card__position">#{team.position}</span>
            <span className="home-standings-card__team">{team.team}</span>
            <span className="home-standings-card__record">
              {team.wins}-{team.losses}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );

  const content = (
    <div className="home-standings-grid">
      {renderConference('Eastern Conference', standings.eastern || [], 'east')}
      {renderConference('Western Conference', standings.western || [], 'west')}
    </div>
  );

  return (
    <section className="home-section">
      <div className="home-section__header">
        <div>
          <h2>Standings pulse</h2>
          <p>A quick glance at how the conferences are shaping up right now.</p>
        </div>
      </div>
      <div className="home-auth-wrapper">
        {!isAuthenticated && (
          <div className="home-auth-overlay">
            <div className="home-auth-modal">
              <p>Log-in or sign up to make your predictions</p>
              <div className="home-auth-actions">
                <a href={loginUrl || '#login'} className="home-cta primary">Log In</a>
                <a href={signupUrl || '#signup'} className="home-cta secondary">Sign Up</a>
              </div>
            </div>
          </div>
        )}
        <div style={{ filter: !isAuthenticated ? 'blur(2px)' : 'none' }}>
          {content}
        </div>
      </div>
    </section>
  );
}

function SubmissionPreview({ submitUrl, hasSubmission, submissionOpen, isAuthenticated, loginUrl, signupUrl, submissionData, isLoadingSubmissionData }) {
  const Wrapper = submitUrl && isAuthenticated ? 'a' : 'div';
  const wrapperClassNames = ['home-submission-card'];
  if (submitUrl && isAuthenticated) wrapperClassNames.push('home-submission-card--link');
  if (hasSubmission) wrapperClassNames.push('home-submission-card--complete');
  const StatusIcon = hasSubmission ? CheckCircle2 : Clock;
  const statusText = hasSubmission ? 'Submission saved' : submissionOpen ? 'Submission open' : 'Submission closed';
  const foldText = hasSubmission ? 'Review your picks' : submissionOpen ? 'Start your picks' : 'View submissions page';

  // Use real user data when authenticated and available, otherwise show preview
  const hasRealStandings = isAuthenticated && submissionData?.standings &&
    (submissionData.standings.east?.length > 0 || submissionData.standings.west?.length > 0);
  const hasRealSections = isAuthenticated && submissionData?.sections && submissionData.sections.length > 0;

  const standings = (hasRealStandings && !isLoadingSubmissionData) ? submissionData.standings : PREVIEW_STANDINGS;
  const sections = (hasRealSections && !isLoadingSubmissionData) ? submissionData.sections : PREVIEW_SECTIONS;

  const content = (
    <Wrapper
      className={wrapperClassNames.join(' ')}
      {...(submitUrl && isAuthenticated ? { href: submitUrl } : {})}
    >
      <div className="home-submission-card__header">
        <div className="home-submission-card__title">
          <ClipboardList className="w-4 h-4" />
          <span>Props Prediction board</span>
        </div>
        <div className="home-submission-card__status">
          <StatusIcon className="w-4 h-4" />
          <span>{statusText}</span>
        </div>
      </div>
      <div className="home-submission-card__board">
        <div className="home-submission-card__standings">
          {Object.entries(standings).map(([conference, teams]) => (
            <div key={conference} className={`home-submission-card__column home-submission-card__column--${conference}`}>
              <header>{conference.toUpperCase()}</header>
              <ul>
                {teams.slice(0, 4).map((team, index) => {
                  // For real user data, show the predicted_position; for preview, show sequential
                  const displayPosition = hasRealStandings && !isLoadingSubmissionData
                    ? (team.predicted_position || team.position || index + 1)
                    : (index + 1);
                  return (
                    <li key={`${conference}-${team.team_name || team.name || index}`}>
                      <span className="home-submission-card__seed">{displayPosition}</span>
                      <span className="home-submission-card__team">{team.team_name || team.name}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="home-submission-card__sections">
          {sections.map((section, index) => {
            // When showing real data for authenticated users, use actual completion status
            const hasRealData = isAuthenticated && hasRealSections && !isLoadingSubmissionData;
            const Icon = section.completed > 0 ? CheckCircle2 : Clock;

            // Determine state based on whether we're showing real or preview data
            let state;
            if (!isAuthenticated) {
              state = 'Not started';
            } else if (hasRealData) {
              state = section.completed === section.total
                ? 'Submitted'
                : section.completed > 0
                  ? 'Draft saved'
                  : 'Pending';
            } else {
              // Preview data when authenticated but data hasn't loaded yet
              state = section.completed === section.total
                ? 'Submitted'
                : section.completed > 0
                  ? 'Draft saved'
                  : 'Pending';
            }

            return (
              <div key={section.label} className="home-submission-card__section">
                <Icon className="w-3 h-3" />
                <div>
                  <span className="home-submission-card__section-label">{section.label}</span>
                  <span className="home-submission-card__section-meta">
                    {section.completed}/{section.total} • {state}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="home-submission-card__fold">
        <span>{foldText}</span>
        <ArrowRight className="w-4 h-4" />
      </div>
    </Wrapper>
  );

  return (
    <div className="home-auth-wrapper">
      {!isAuthenticated && (
        <div className="home-auth-overlay">
          <div className="home-auth-modal">
            <p>Log-in or sign up to make your predictions</p>
            <div className="home-auth-actions">
              <a href={loginUrl || '#login'} className="home-cta primary">Log In</a>
              <a href={signupUrl || '#signup'} className="home-cta secondary">Sign Up</a>
            </div>
          </div>
        </div>
      )}
      <div style={{ filter: !isAuthenticated ? 'blur(2px)' : 'none', height: '100%' }}>
        {content}
      </div>
    </div>
  );
}


export default function HomePage({ seasonSlug: seasonSlugProp = DEFAULT_SEASON }) {
  const rootProps = useMemo(() => getRootProps(), []);
  const seasonSlug = seasonSlugProp || rootProps.seasonSlug || DEFAULT_SEASON;

  const { data: leaderboardData, isLoading: leaderboardLoading } = useLeaderboard(seasonSlug);
  const { submissionData, isLoading: submissionLoading } = useUserSubmissions(seasonSlug, rootProps.isAuthenticated);

  const { data: homepageData } = useQuery({
    queryKey: ['homepage-data', seasonSlug],
    queryFn: async () => {
      const res = await axios.get('/api/v2/homepage/data');
      return res.data || {};
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const me = useMemo(() => {
    if (!rootProps.isAuthenticated || !Array.isArray(leaderboardData)) return null;
    const byId = rootProps.userId
      ? leaderboardData.find((entry) => String(entry.user?.id) === String(rootProps.userId))
      : null;
    if (byId) return byId;
    if (rootProps.username) {
      return leaderboardData.find((entry) => String(entry.user?.username) === String(rootProps.username)) || null;
    }
    return null;
  }, [leaderboardData, rootProps]);

  const categories = me?.user?.categories || {};
  const standings = categories['Regular Season Standings'] || { points: 0, max_points: 0 };
  const awards = categories['Player Awards'] || { points: 0, max_points: 0 };
  const props = categories['Props & Yes/No'] || { points: 0, max_points: 0 };

  const heroVariant = !rootProps.isAuthenticated ? 'guest' : rootProps.hasSubmission ? 'submitted' : 'incomplete';
  const deadlineCopy = formatDateRange(rootProps.submissionStart, rootProps.submissionEnd);
  const leaderboardTopTen = Array.isArray(leaderboardData) ? leaderboardData.slice(0, 10) : [];
  const heroMeta = rootProps.isAuthenticated
    ? `Welcome back${rootProps.displayName ? `, ${rootProps.displayName}` : ''}`
    : 'Props Prediction';
  const heroHeadlineMap = {
    guest: 'Make your NBA predictions.',
    incomplete: 'Pick up your predictions right where you left off.',
    submitted: 'Monitor your points here.',
  };
  const heroSubcopyMap = {
    guest: 'Build standings, awards, and props once—follow them all season without spreadsheets.',
    incomplete: 'Standings, awards, and props stay synced so you can finish before submissions lock.',
    submitted: 'Review standings, awards, and props at a glance.',
  };
  const heroHeadline = heroHeadlineMap[heroVariant];
  const heroSubcopy = heroSubcopyMap[heroVariant];

  let primaryCta = null;
  let secondaryCta = null;
  if (rootProps.isAuthenticated) {
    if (rootProps.submitUrl) {
      const label = !rootProps.hasSubmission && rootProps.submissionOpen
        ? 'Create submission'
        : rootProps.hasSubmission && rootProps.submissionOpen
          ? 'Edit submission'
          : 'View submission';
      primaryCta = { label, href: rootProps.submitUrl, icon: ClipboardList };
    }
    if (rootProps.leaderboardUrl) {
      secondaryCta = { label: 'View leaderboard', href: rootProps.leaderboardUrl, icon: ArrowRight };
    }
  } else {
    primaryCta = { label: 'Log in to start', href: rootProps.loginUrl || '#login', icon: ArrowRight };
    secondaryCta = { label: 'Create account', href: rootProps.signupUrl || '#signup', icon: UserPlus };
  }

  let deadlineDescription = null;
  if (rootProps.submissionEnd) {
    const base = deadlineCopy || '';
    if (rootProps.submissionOpen) {
      deadlineDescription = `Submission Period: ${base}`;
    } else {
      deadlineDescription = `${base || 'Submissions are locked.'} You can still review your answers.`;
    }
  }

  return (
    <div className="home-shell">
      <section className={`home-hero home-hero--${heroVariant}`}>
        <div className="home-hero__background" />
        <div className="home-hero__content">
          <div className="home-hero__body">
            <div className="home-hero__brand">
              <img src="/static/img/nba_predictions_logo.png" alt="NBA Predictions Logo" />
              <span>Props Prediction</span>
            </div>
            <p className="home-hero__meta">{heroMeta}</p>
            <h1>{heroHeadline}</h1>
            <p className="home-hero__subcopy">{heroSubcopy}</p>
            <div className="home-hero__actions">
              {primaryCta ? (
                <a className="home-cta primary" href={primaryCta.href}>
                  {primaryCta.icon ? <primaryCta.icon className="w-4 h-4" /> : null}
                  {primaryCta.label}
                </a>
              ) : null}
              {secondaryCta ? (
                <a className="home-cta secondary" href={secondaryCta.href}>
                  {secondaryCta.icon ? <secondaryCta.icon className="w-4 h-4" /> : null}
                  {secondaryCta.label}
                </a>
              ) : null}
            </div>
            {deadlineDescription ? (
              <div className="home-hero__deadline">
                <Calendar className="w-4 h-4" />
                <span>{deadlineDescription}</span>
              </div>
            ) : null}
          </div>
          <div className="home-hero__preview">
            <SubmissionPreview
              submitUrl={rootProps.submitUrl}
              hasSubmission={rootProps.hasSubmission}
              submissionOpen={rootProps.submissionOpen}
              isAuthenticated={rootProps.isAuthenticated}
              loginUrl={rootProps.loginUrl}
              signupUrl={rootProps.signupUrl}
              submissionData={submissionData}
              isLoadingSubmissionData={submissionLoading}
            />
          </div>
        </div>
      </section>

      <div className="home-main">
        {rootProps.isAuthenticated && (
          <div className="home-main__col home-main__col--primary">
            <section className="home-section home-section--tight">
              <div className="home-section__header">
                <div>
                  <h2>Season snapshot</h2>
                  <p>Monitor rank, totals, and category scoring without leaving the homepage.</p>
                </div>
              </div>
              <div className="home-stats-grid">
                <StatCard
                  icon={Trophy}
                  title="Rank"
                  value={me?.rank ? `#${me.rank}` : rootProps.hasSubmission ? 'Pending' : '--'}
                  subtitle={leaderboardData?.length ? `${leaderboardData.length} total entries` : 'Leaderboard updates nightly'}
                  highlightUrl={rootProps.leaderboardUrl}
                  highlightTitle="Go to leaderboard"
                />
                <StatCard
                  icon={TrendingUp}
                  title="Total points"
                  value={me?.user?.total_points?.toLocaleString() || (rootProps.hasSubmission ? '0' : '--')}
                  subtitle={rootProps.hasSubmission ? 'Across all categories' : 'Submit to start scoring'}
                />
                <StatCard
                  icon={BarChart3}
                  title="Standings"
                  value={standings.points || 0}
                  subtitle={standings.max_points ? `of ${standings.max_points} pts` : 'Predictions lock on opening night'}
                />
                <StatCard
                  icon={Target}
                  title="Props & awards"
                  value={(awards.points || 0) + (props.points || 0)}
                  subtitle={(awards.max_points || 0) + (props.max_points || 0) ? `of ${(awards.max_points || 0) + (props.max_points || 0)} pts` : 'Awaiting graded results'}
                />
              </div>
            </section>

            <StandingsPreview standings={homepageData?.mini_standings} isAuthenticated={rootProps.isAuthenticated} loginUrl={rootProps.loginUrl} signupUrl={rootProps.signupUrl} />
          </div>
        )}
        <div className="home-main__col home-main__col--secondary" style={{ width: !rootProps.isAuthenticated ? '100%' : undefined, maxWidth: !rootProps.isAuthenticated ? '100%' : undefined }}>
          <LeaderboardPreview entries={leaderboardTopTen} leaderboardUrl={rootProps.leaderboardUrl} />
        </div>
      </div>
    </div>
  );
}
