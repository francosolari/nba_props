import React, { useState, useEffect, useCallback, useLayoutEffect, useRef, memo } from 'react';
import LOGO_EXTENSIONS from '../generated/teamLogos.json';

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

const UNKNOWN_LOGO_PATH = '/static/img/teams/unknown.svg';
const logoPath = (slug, extension) => `/static/img/teams/${slug}.${extension}`;

/**
 * The logo directory mixes SVG and PNG, so the extension is read from a
 * manifest generated off the directory itself rather than guessed. Guessing
 * costs a 404 per team on every page load — twenty of them on a standings
 * board. A slug the manifest does not know still falls back through both
 * extensions, so a newly added logo works before the manifest is regenerated.
 */
const logoCandidates = (slug) => {
  if (!slug) return [UNKNOWN_LOGO_PATH];
  const known = LOGO_EXTENSIONS[slug];
  const order = known === 'png' ? ['png', 'svg'] : ['svg', 'png'];
  return [...order.map((extension) => logoPath(slug, extension)), UNKNOWN_LOGO_PATH];
};

const TeamLogo = memo(({ teamName, slug, className, alt, ...props }) => {
  const calculatedSlug = slug || resolveTeamLogoSlug(teamName || '');
  const isAlreadyCached = calculatedSlug && resolvedLogoSrcBySlug.has(calculatedSlug);
  const [src, setSrc] = useState(
    () => resolvedLogoSrcBySlug.get(calculatedSlug) || logoCandidates(calculatedSlug)[0]
  );
  const [errorCount, setErrorCount] = useState(0);
  const [loaded, setLoaded] = useState(isAlreadyCached);
  const imgRef = useRef(null);

  useEffect(() => {
    const cached = resolvedLogoSrcBySlug.get(calculatedSlug);
    setSrc(cached || logoCandidates(calculatedSlug)[0]);
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

  // Walk the remaining candidates, ending on the placeholder. The last step is
  // cached so a slug with no artwork is not re-probed on every remount.
  const handleError = useCallback(() => {
    const candidates = logoCandidates(calculatedSlug);
    const next = errorCount + 1;
    if (next < candidates.length) {
      setSrc(candidates[next]);
      setErrorCount(next);
      if (candidates[next] === UNKNOWN_LOGO_PATH) setLoaded(true);
      return;
    }
    if (calculatedSlug) cacheLogoSrc(calculatedSlug, UNKNOWN_LOGO_PATH);
    setLoaded(true);
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
