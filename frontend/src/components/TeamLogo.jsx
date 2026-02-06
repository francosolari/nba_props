import React, { useState, useEffect } from 'react';

const TEAM_LOGO_SLUG_OVERRIDES = {
  'los-angeles-clippers': 'la-clippers',
};

export const resolveTeamLogoSlug = (name = '') => {
  if (!name) return '';
  const baseSlug = name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  return TEAM_LOGO_SLUG_OVERRIDES[baseSlug] || baseSlug;
};

const resolvedLogoSrcBySlug = new Map();

const getSvgPath = (slug) => `/static/img/teams/${slug}.svg`;
const getPngPath = (slug) => `/static/img/teams/${slug}.png`;
const UNKNOWN_LOGO_PATH = '/static/img/teams/unknown.svg';

const TeamLogo = ({ teamName, slug, className, alt, ...props }) => {
  const calculatedSlug = slug || resolveTeamLogoSlug(teamName || '');
  const [src, setSrc] = useState(
    () => (calculatedSlug ? (resolvedLogoSrcBySlug.get(calculatedSlug) || getSvgPath(calculatedSlug)) : UNKNOWN_LOGO_PATH)
  );
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    setSrc(calculatedSlug ? (resolvedLogoSrcBySlug.get(calculatedSlug) || getSvgPath(calculatedSlug)) : UNKNOWN_LOGO_PATH);
    setErrorCount(0);
  }, [calculatedSlug]);

  const handleLoad = () => {
    if (!calculatedSlug || !src) return;
    resolvedLogoSrcBySlug.set(calculatedSlug, src);
  };

  const handleError = () => {
    if (!calculatedSlug) {
      setSrc(UNKNOWN_LOGO_PATH);
      setErrorCount(2);
      return;
    }
    if (errorCount === 0) {
      setSrc(getPngPath(calculatedSlug));
      setErrorCount(1);
    } else if (errorCount === 1) {
      setSrc(UNKNOWN_LOGO_PATH);
      setErrorCount(2);
    } else if (calculatedSlug) {
      resolvedLogoSrcBySlug.set(calculatedSlug, UNKNOWN_LOGO_PATH);
    }
  };

  return (
    <img
      src={src}
      alt={alt || teamName || 'Team Logo'}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
      {...props}
    />
  );
};

export default TeamLogo;
