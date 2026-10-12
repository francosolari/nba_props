import React, { useState } from 'react';
import { useISTData } from '../../hooks';
import ISTGroupStandings from '../../components/ist/ISTGroupStandings';
import ISTWildcardRace from '../../components/ist/ISTWildcardRace';
import ISTUserLeaderboard from '../../components/ist/ISTUserLeaderboard';

/** Cup scorebook with direct navigation to leaders and either conference. */
function ISTCenterPage({ seasonSlug: initialSeasonSlug = 'current' }) {
  const { groups, wildcardRace, userLeaderboard, stats, season, error, isLoading } = useISTData(initialSeasonSlug);
  const [view, setView] = useState('leaders');
  const seasonSlug = season?.slug || initialSeasonSlug;
  const eastGroups = groups.filter((group) => group.conference === 'East');
  const westGroups = groups.filter((group) => group.conference === 'West');
  const tabs = [['leaders', 'Prediction leaders'], ['east', 'East groups'], ['west', 'West groups']];
  const conference = (name, items) => (
    <section id={`cup-${name.toLowerCase()}`} className={`cup-conference cup-conference--${name.toLowerCase()}`} hidden={view !== name.toLowerCase()} aria-label={`${name === 'East' ? 'Eastern' : 'Western'} Conference`}>
      <h2>{name === 'East' ? 'Eastern' : 'Western'} Conference</h2>
      <p className="cup-center-note">Each group winner advances, plus one wildcard per conference. W–L is the group record; DIFF is point differential.</p>
      {items.length ? <div className="cup-standings-grid">{items.map((group) => <ISTGroupStandings key={group.name} groupName={group.name} conference={name} teams={group.teams} />)}</div> : <p className="cup-center-empty">Group standings will appear here when they are available.</p>}
      {wildcardRace[name]?.length > 0 && <ISTWildcardRace conference={name} teams={wildcardRace[name]} />}
    </section>
  );
  return (
    <div className="court-cup-center">
      <header className="cup-center-header">
        <div><h1>NBA Cup</h1><p>Six groups. Eight knockout spots. A champion to call.</p></div>
        <a className="cup-center-pick-link" href={`/submit/${seasonSlug}/#question-group-ist`}>View your Cup picks</a>
      </header>
      <div className="cup-payout"><strong>$50</strong><div><h2>Mid-season payout</h2><p>The Cup prediction winner gets paid after the final. Scored separately from your season total.</p></div></div>
      {isLoading ? <div className="cup-center-loading animate-pulse" role="status">Loading NBA Cup standings and predictions…</div> : error ? <div className="cup-center-empty" role="alert"><p>{String(error)}</p><button type="button" onClick={() => window.location.reload()}>Reload NBA Cup</button></div> : <>
        <dl className="cup-center-stats"><div><dt>Predictors</dt><dd>{stats.totalUsers}</dd></div><div><dt>Predictions</dt><dd>{stats.totalPredictions}</dd></div><div><dt>Accuracy</dt><dd>{stats.totalPredictions > 0 ? `${(stats.avgAccuracy * 100).toFixed(0)}%` : '—'}</dd></div></dl>
        <nav className="cup-center-tabs" aria-label="NBA Cup views">{tabs.map(([id, label]) => <button key={id} type="button" aria-pressed={view === id} aria-controls={`cup-${id}`} onClick={() => setView(id)}>{label}</button>)}</nav>
        <section id="cup-leaders" hidden={view !== 'leaders'} aria-label="Prediction leaders"><ISTUserLeaderboard users={userLeaderboard} /></section>
        {conference('East', eastGroups)}
        {conference('West', westGroups)}
      </>}
    </div>
  );
}

export default ISTCenterPage;
