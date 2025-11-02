import React, { useState, useEffect } from 'react';
import SideNav from './SideNav';

/**
 * SiteLayout - Global layout wrapper that provides SideNav across the entire site
 * This component reads the current page and season from data attributes on the root element
 */
function SiteLayout() {
  const [currentPage, setCurrentPage] = useState('home');
  const rootElement = document.getElementById('site-layout-root');
  const seasonSlug = rootElement?.getAttribute('data-season-slug') || 'current';

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/ist')) {
      setCurrentPage('ist-center');
    } else if (path.startsWith('/leaderboard')) {
      if (path.includes('/detailed')) {
        setCurrentPage('breakdown');
      } else {
        setCurrentPage('leaderboard');
      }
    } else if (path.startsWith('/submit')) {
      setCurrentPage('submissions');
    } else if (path.startsWith('/user/profile')) {
      setCurrentPage('profile');
    } else if (path.startsWith('/admin-dashboard')) {
      setCurrentPage('admin');
    } else {
      setCurrentPage('home');
    }
  }, []);

  return <SideNav currentPage={currentPage} seasonSlug={seasonSlug} />;
}

export default SiteLayout;
