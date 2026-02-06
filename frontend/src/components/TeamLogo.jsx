import React, { useState, useEffect, useCallback, memo } from 'react';

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

const TeamLogo = memo(({ teamName, slug, className, alt, ...props }) => {
  const calculatedSlug = slug || resolveTeamLogoSlug(teamName || '');
  const isAlreadyCached = calculatedSlug && resolvedLogoSrcBySlug.has(calculatedSlug);
  const [src, setSrc] = useState(
    () => (calculatedSlug ? (resolvedLogoSrcBySlug.get(calculatedSlug) || getSvgPath(calculatedSlug)) : UNKNOWN_LOGO_PATH)
  );
  const [errorCount, setErrorCount] = useState(0);
  const [loaded, setLoaded] = useState(isAlreadyCached);

  useEffect(() => {
    const cached = resolvedLogoSrcBySlug.get(calculatedSlug);
    setSrc(calculatedSlug ? (cached || getSvgPath(calculatedSlug)) : UNKNOWN_LOGO_PATH);
    setErrorCount(0);
    setLoaded(!!cached);
  }, [calculatedSlug]);

  const handleLoad = useCallback(() => {
    if (!calculatedSlug || !src) return;
    resolvedLogoSrcBySlug.set(calculatedSlug, src);
    setLoaded(true);
  }, [calculatedSlug, src]);

  const handleError = useCallback(() => {
    if (!calculatedSlug) {
      setSrc(UNKNOWN_LOGO_PATH);
      setErrorCount(2);
      setLoaded(true);
      return;
    }
    if (errorCount === 0) {
      setSrc(getPngPath(calculatedSlug));
      setErrorCount(1);
    } else if (errorCount === 1) {
      setSrc(UNKNOWN_LOGO_PATH);
      setErrorCount(2);
      setLoaded(true);
    } else if (calculatedSlug) {
      resolvedLogoSrcBySlug.set(calculatedSlug, UNKNOWN_LOGO_PATH);
      setLoaded(true);
    }
  }, [calculatedSlug, errorCount]);

  return (
    <img
      src={src}
      alt={alt || teamName || 'Team Logo'}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
      loading="eager"
      decoding="async"
      style={{
        opacity: loaded ? 1 : 0,
        transition: 'opacity 150ms ease-in',
      }}
      {...props}
    />
  );
});

TeamLogo.displayName = 'TeamLogo';

export default TeamLogo;
