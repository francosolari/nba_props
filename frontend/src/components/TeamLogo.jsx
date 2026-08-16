import React, { useState, useEffect, useCallback, useLayoutEffect, useRef, memo } from 'react';

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

const MAX_LOGO_CACHE_SIZE = 64;
const resolvedLogoSrcBySlug = new Map();

const cacheLogoSrc = (slug, src) => {
  if (resolvedLogoSrcBySlug.size >= MAX_LOGO_CACHE_SIZE) {
    const oldest = resolvedLogoSrcBySlug.keys().next().value;
    resolvedLogoSrcBySlug.delete(oldest);
  }
  resolvedLogoSrcBySlug.set(slug, src);
};

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
  const imgRef = useRef(null);

  useEffect(() => {
    const cached = resolvedLogoSrcBySlug.get(calculatedSlug);
    setSrc(calculatedSlug ? (cached || getSvgPath(calculatedSlug)) : UNKNOWN_LOGO_PATH);
    setErrorCount(0);
    setLoaded(!!cached);
  }, [calculatedSlug]);

  // The browser may already have this image in its HTTP cache (common on
  // repeat views), in which case `onLoad` fires late relative to paint and
  // the opacity-0 → 1 fade is visible as a pop. Checking `.complete`
  // synchronously before paint catches that case and skips the fade.
  useLayoutEffect(() => {
    if (imgRef.current?.complete) {
      setLoaded(true);
    }
  }, [src]);

  const handleLoad = useCallback(() => {
    if (!calculatedSlug || !src) return;
    cacheLogoSrc(calculatedSlug, src);
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
      cacheLogoSrc(calculatedSlug, UNKNOWN_LOGO_PATH);
      setLoaded(true);
    }
  }, [calculatedSlug, errorCount]);

  return (
    <img
      ref={imgRef}
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
