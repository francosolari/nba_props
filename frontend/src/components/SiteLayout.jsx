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

  useEffect(() => {
    const header = document.getElementById('main-header');
    if (!header) return undefined;
    const target = header.querySelector('nav') || header;
    let lastScrollY = window.scrollY;
    let hidden = false;
    let ticking = false;

    const showHeader = () => {
      hidden = false;
      target.style.transform = 'translateY(0)';
      target.style.opacity = '1';
      target.style.pointerEvents = 'auto';
    };

    const hideHeader = () => {
      hidden = true;
      target.style.transform = 'translateY(-100%)';
      target.style.opacity = '0';
      target.style.pointerEvents = 'none';
    };

    const update = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY;
      if (currentY <= 10) {
        showHeader();
      } else if (delta > 6 && !hidden) {
        hideHeader();
      } else if (delta < -6 && hidden) {
        showHeader();
      }
      lastScrollY = currentY;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    target.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    target.style.willChange = 'transform, opacity';
    showHeader();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      showHeader();
    };
  }, []);

  return <SideNav currentPage={currentPage} seasonSlug={seasonSlug} />;
}

export default SiteLayout;
