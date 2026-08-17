import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, memo } from 'react';
import { UserRound } from 'lucide-react';

const MAX_HEADSHOT_CACHE_SIZE = 128;
const failedHeadshotUrls = new Set();

const cacheFailure = (url) => {
  if (failedHeadshotUrls.size >= MAX_HEADSHOT_CACHE_SIZE) {
    const oldest = failedHeadshotUrls.values().next().value;
    failedHeadshotUrls.delete(oldest);
  }
  failedHeadshotUrls.add(url);
};

/**
 * Small circular player headshot sourced directly from the NBA CDN.
 * Only rendered when the caller has a `headshotUrl` (i.e. the player has a
 * known NBA.com ID) — there is no local copy or proxy, so this stays free.
 * Falls back to a generic silhouette icon on missing/broken images, and
 * remembers broken URLs so a missing photo isn't re-requested on remount.
 */
const PlayerHeadshot = memo(({ headshotUrl, name, size = 24, className = '', ...props }) => {
  const knownBad = headshotUrl && failedHeadshotUrls.has(headshotUrl);
  const [failed, setFailed] = useState(!headshotUrl || knownBad);
  const [loaded, setLoaded] = useState(knownBad);
  const imgRef = useRef(null);

  useEffect(() => {
    const bad = headshotUrl && failedHeadshotUrls.has(headshotUrl);
    setFailed(!headshotUrl || bad);
    setLoaded(!!bad);
  }, [headshotUrl]);

  useLayoutEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, [headshotUrl]);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => {
    if (headshotUrl) cacheFailure(headshotUrl);
    setFailed(true);
    setLoaded(true);
  }, [headshotUrl]);

  const dimension = `${size}px`;
  const wrapperClassName = `inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 ${className}`.trim();

  if (failed) {
    return (
      <span
        className={wrapperClassName}
        style={{ width: dimension, height: dimension }}
        role="img"
        aria-label={name || 'Player headshot'}
        {...props}
      >
        <UserRound
          className="text-slate-400 dark:text-slate-500"
          style={{ width: `${Math.round(size * 0.65)}px`, height: `${Math.round(size * 0.65)}px` }}
        />
      </span>
    );
  }

  return (
    <span className={wrapperClassName} style={{ width: dimension, height: dimension }} {...props}>
      <img
        ref={imgRef}
        src={headshotUrl}
        alt={name ? `${name} headshot` : 'Player headshot'}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover object-top"
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 150ms ease-in' }}
      />
    </span>
  );
});

PlayerHeadshot.displayName = 'PlayerHeadshot';

export default PlayerHeadshot;
