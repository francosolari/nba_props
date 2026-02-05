import React, { useState, useEffect } from 'react';

const TEAM_LOGO_SLUG_OVERRIDES = {
  'los-angeles-clippers': 'la-clippers',
};

const teamSlug = (name = '') => {
  if (!name) return '';
  const baseSlug = name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  return TEAM_LOGO_SLUG_OVERRIDES[baseSlug] || baseSlug;
};

const TeamLogo = ({ teamName, slug, className, alt, ...props }) => {
  const calculatedSlug = slug || teamSlug(teamName || '');
  
  // Start with SVG
  const [src, setSrc] = useState(`/static/img/teams/${calculatedSlug}.svg`);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    // Reset when slug changes
    setSrc(`/static/img/teams/${calculatedSlug}.svg`);
    setErrorCount(0);
  }, [calculatedSlug]);

  const handleError = () => {
    if (errorCount === 0) {
      // First error: try PNG
      setSrc(`/static/img/teams/${calculatedSlug}.png`);
      setErrorCount(1);
    } else if (errorCount === 1) {
      // Second error: fallback to unknown
      setSrc('/static/img/teams/unknown.svg');
      setErrorCount(2);
    }
  };

  return (
    <img
      src={src}
      alt={alt || teamName || 'Team Logo'}
      className={className}
      onError={handleError}
      {...props}
    />
  );
};

export default TeamLogo;