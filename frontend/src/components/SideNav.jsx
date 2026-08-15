import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Home,
  Trophy,
  ClipboardList,
  User,
  Settings,
  Medal,
  BarChart3,
} from 'lucide-react';

function SideNav({ currentPage = 'home', seasonSlug: propSeasonSlug = 'latest' }) {
  const [currentSeasonSlug, setCurrentSeasonSlug] = useState(propSeasonSlug);
  const [isAdmin, setIsAdmin] = useState(() => (
    typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true'
  ));

  useEffect(() => {
    if (propSeasonSlug !== 'latest') {
      setCurrentSeasonSlug(propSeasonSlug);
      return;
    }
    axios.get('/api/v2/latest-season/')
      .then(({ data }) => setCurrentSeasonSlug(data?.season_slug || propSeasonSlug))
      .catch(() => setCurrentSeasonSlug(propSeasonSlug));
  }, [propSeasonSlug]);

  useEffect(() => {
    axios.get('/api/v2/user/context')
      .then(({ data }) => {
        const adminStatus = Boolean(data?.is_admin);
        setIsAdmin(adminStatus);
        localStorage.setItem('isAdmin', String(adminStatus));
      })
      .catch(() => {});
  }, []);

  const primaryItems = [
    { id: 'home', shortLabel: 'Home', label: 'Home', icon: Home, href: '/' },
    { id: 'submissions', shortLabel: 'Picks', label: 'My Picks', icon: ClipboardList, href: `/submit/${currentSeasonSlug}/` },
    { id: 'ist-center', shortLabel: 'Cup', label: 'NBA Cup', icon: Medal, href: `/ist/${currentSeasonSlug}/` },
    { id: 'leaderboard', shortLabel: 'Leaders', label: 'Leaderboard', icon: Trophy, href: `/leaderboard/${currentSeasonSlug}/` },
    { id: 'profile', shortLabel: 'Profile', label: 'Profile', icon: User, href: '/user/profile/' },
  ];

  const desktopItems = [
    ...primaryItems,
    { id: 'breakdown', label: 'Advanced Board', icon: BarChart3, href: `/leaderboard/${currentSeasonSlug}/detailed/` },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: Settings, href: '/admin-dashboard/' }] : []),
  ];

  const renderLink = (item, mobile = false) => {
    const Icon = item.icon;
    const active = currentPage === item.id || (item.id === 'leaderboard' && currentPage === 'breakdown' && mobile);
    return (
      <a
        key={item.id}
        href={item.href}
        className={`court-nav-link${active ? ' is-active' : ''}`}
        aria-current={active ? 'page' : undefined}
      >
        <Icon aria-hidden="true" />
        <span>{mobile ? item.shortLabel : item.label}</span>
      </a>
    );
  };

  return (
    <>
      <aside className="court-desktop-nav" aria-label="Primary navigation">
        <a className="court-desktop-nav__brand" href="/" aria-label="Props Predictions home">
          <img src="/static/img/nba_predictions_logo.png" alt="" />
          <span>Props<br />Predictions</span>
        </a>
        <div className="court-desktop-nav__season">{currentSeasonSlug.replace('-', '–')}</div>
        <nav>{desktopItems.map((item) => renderLink(item))}</nav>
      </aside>

      <nav className="court-mobile-nav" aria-label="Primary navigation">
        {primaryItems.map((item) => renderLink(item, true))}
      </nav>
    </>
  );
}

export default SideNav;
