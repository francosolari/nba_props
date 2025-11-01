import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Home,
  Trophy,
  FileText,
  BarChart3,
  User,
  ChevronLeft,
  ChevronRight,
  Menu,
  Settings,
  Medal
} from 'lucide-react';

function SideNav({ currentPage = 'home', seasonSlug: propSeasonSlug = 'latest' }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentSeasonSlug, setCurrentSeasonSlug] = useState(propSeasonSlug);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchLatestSeason = async () => {
      try {
        const response = await axios.get('/api/v2/latest-season/');
        if (response.data && response.data.season_slug) {
          setCurrentSeasonSlug(response.data.season_slug);
        }
      } catch (error) {
        console.error('Error fetching latest season slug:', error);
        // Fallback to propSeasonSlug if API call fails
        setCurrentSeasonSlug(propSeasonSlug);
      }
    };

    if (propSeasonSlug === 'latest') {
      fetchLatestSeason();
    } else {
      setCurrentSeasonSlug(propSeasonSlug);
    }
  }, [propSeasonSlug]);

  useEffect(() => {
    const fetchUserContext = async () => {
      try {
        const response = await axios.get('/api/v2/user/context');
        if (response.data && response.data.is_admin) {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error('Error fetching user context:', error);
      }
    };

    fetchUserContext();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = () => setIsMobile(!!mq.matches);
    onChange();
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else if (mq.removeListener) mq.removeListener(onChange);
    };
  }, []);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, href: '/' },
    { id: 'submissions', label: 'My Submissions', icon: FileText, href: `/submit/${currentSeasonSlug}/` },
    { id: 'ist-center', label: 'IST Center', icon: Medal, href: `/ist/${currentSeasonSlug}/`, special: true },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, href: `/leaderboard/${currentSeasonSlug}/` },
    { id: 'breakdown', label: 'Points Breakdown', icon: BarChart3, href: `/leaderboard/${currentSeasonSlug}/detailed/` },
    { id: 'profile', label: 'Profile', icon: User, href: `/user/profile/` },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: Settings, href: '/admin-dashboard/' }] : []),
  ];

  const NavContent = () => (
    <>
      {/* Logo */}
      <a
        href="/"
        className="flex items-center gap-3 px-4 py-4 mb-2 border-b border-slate-200 dark:border-slate-700 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        <img
          src="/static/img/nba_predictions_logo.png"
          alt="NBA Predictions Logo"
          className="w-8 h-8 rounded-lg object-contain shrink-0"
        />
        {(isExpanded || isMobileOpen) && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">NBA Props</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{currentSeasonSlug.replace('-', '–')}</span>
          </div>
        )}
      </a>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const isSpecial = item.special === true;
          const isCompact = !isExpanded && !isMobile;
          const paddingClasses = isCompact ? 'px-2.5 py-2.5' : 'px-3 py-2.5';
          const gapClasses = isCompact ? 'gap-0 justify-center' : 'gap-3';
          const iconPulseClass = isSpecial ? 'text-amber-600 dark:text-amber-400' : '';

          return (
            <div key={item.id} className="relative group">
              <a
                href={item.href}
                className={`flex items-center ${gapClasses} ${paddingClasses} rounded-lg transition-all duration-200 ${
                  isActive
                    ? isSpecial
                      ? 'bg-amber-100/80 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200 shadow-md border border-amber-200 dark:border-amber-500/30'
                      : 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 shadow-sm'
                    : isSpecial
                    ? 'bg-amber-50/70 text-amber-700 dark:bg-amber-900/15 dark:text-amber-300 hover:bg-amber-100/80 dark:hover:bg-amber-900/25 border border-amber-200/40 dark:border-amber-500/20'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${
                  isActive
                    ? isSpecial ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-orange-600 dark:text-orange-400'
                    : iconPulseClass
                }`} />
                {(isExpanded || isMobileOpen) && (
                  <span className={`text-sm font-medium truncate ${isSpecial ? 'font-semibold' : ''}`}>
                    {item.label}
                    {isSpecial && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-500/30 text-amber-800 dark:text-amber-200 font-bold">NEW</span>}
                  </span>
                )}
              </a>
              {/* Tooltip for collapsed state (desktop only) */}
              {!isMobile && !isExpanded && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                  {item.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900 dark:border-r-slate-700"></div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Expand/Collapse Button (Desktop Only) */}
      {!isMobile && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mx-3 mb-3 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <>
              <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Collapse</span>
            </>
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          )}
        </button>
      )}
    </>
  );

  // Mobile: Hamburger button
  if (isMobile) {
    return (
      <>
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="fixed top-14 left-4 z-50 p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>

        {/* Mobile Overlay */}
        {isMobileOpen && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsMobileOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-[60] w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col">
              <NavContent />
            </div>
          </>
        )}
      </>
    );
  }

  // Desktop: Sidebar
  return (
    <div
      className={`fixed inset-y-0 left-0 z-40 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 shadow-lg flex flex-col transition-all duration-300 ${
        isExpanded ? 'w-64' : 'w-16'
      }`}
    >
      <NavContent />
    </div>
  );
}

export default SideNav;
