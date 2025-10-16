import React, { useState, useEffect } from 'react';
import SideNav from './SideNav';

/**
 * SiteLayout - Global layout wrapper that provides SideNav across the entire site
 * This component reads the current page and season from data attributes on the root element
 */
function SiteLayout() {
  const rootElement = document.getElementById('site-layout-root');
  const currentPage = rootElement?.getAttribute('data-current-page') || 'home';
  const seasonSlug = rootElement?.getAttribute('data-season-slug') || 'current';

  return <SideNav currentPage={currentPage} seasonSlug={seasonSlug} />;
}

export default SiteLayout;
