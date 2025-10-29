/**
 * Mobile sticky positioning hook
 *
 * Manages dynamic sticky header offset for mobile responsive layouts
 * based on the height of conference headers.
 *
 * @module features/leaderboard/hooks/useMobileSticky
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

/**
 * State returned by useMobileSticky hook
 */
export interface MobileStickyState {
  /** Current sticky offset in pixels */
  mobileStickyOffset: number;

  /** Ref for west conference header */
  westHeaderRef: React.RefObject<HTMLDivElement>;

  /** Ref for east conference header */
  eastHeaderRef: React.RefObject<HTMLDivElement>;

  /** Inline style object for sticky positioning */
  mobileHeaderStickyStyle: { top: number };

  /** Manually trigger offset recalculation */
  updateMobileStickyOffset: () => void;
}

/**
 * Options for mobile sticky hook
 */
export interface MobileStickyOptions {
  /** Whether west conference is collapsed */
  collapsedWest?: boolean;

  /** Whether east conference is collapsed */
  collapsedEast?: boolean;
}

/**
 * Mobile sticky positioning hook
 *
 * Dynamically calculates and maintains the sticky header offset for mobile
 * layouts based on the height of conference section headers.
 *
 * Features:
 * - Automatically updates on window resize
 * - Updates when collapse state changes (requestAnimationFrame)
 * - Provides refs for measuring header heights
 * - Returns inline style object for applying sticky positioning
 *
 * @param options - Configuration options
 * @returns Mobile sticky state with refs and styles
 *
 * @example
 * ```tsx
 * const sticky = useMobileSticky({
 *   collapsedWest: false,
 *   collapsedEast: true
 * });
 *
 * // Attach refs to headers
 * <div ref={sticky.westHeaderRef}>West Conference</div>
 * <div ref={sticky.eastHeaderRef}>East Conference</div>
 *
 * // Apply sticky positioning
 * <div style={sticky.mobileHeaderStickyStyle}>
 *   Sticky content
 * </div>
 * ```
 */
export function useMobileSticky(
  options: MobileStickyOptions = {}
): MobileStickyState {
  const { collapsedWest = false, collapsedEast = false } = options;

  const westHeaderRef = useRef<HTMLDivElement>(null);
  const eastHeaderRef = useRef<HTMLDivElement>(null);
  const [mobileStickyOffset, setMobileStickyOffset] = useState(0);

  // Calculate sticky offset based on header heights
  const updateMobileStickyOffset = useCallback(() => {
    const westHeight =
      westHeaderRef.current?.getBoundingClientRect().height || 0;
    const eastHeight =
      eastHeaderRef.current?.getBoundingClientRect().height || 0;
    const next = Math.max(westHeight, eastHeight);

    // Only update if change is significant (>0.5px) to avoid excessive re-renders
    setMobileStickyOffset((prev) => (Math.abs(prev - next) > 0.5 ? next : prev));
  }, []);

  // Update on window resize
  useEffect(() => {
    if (typeof window === 'undefined') return;

    updateMobileStickyOffset();

    const handleResize = () => updateMobileStickyOffset();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [updateMobileStickyOffset]);

  // Update when collapse state changes (using requestAnimationFrame for smoother updates)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const rafId = window.requestAnimationFrame(updateMobileStickyOffset);
    return () => window.cancelAnimationFrame(rafId);
  }, [collapsedWest, collapsedEast, updateMobileStickyOffset]);

  // Memoized style object
  const mobileHeaderStickyStyle = useMemo(
    () => ({ top: mobileStickyOffset }),
    [mobileStickyOffset]
  );

  return {
    mobileStickyOffset,
    westHeaderRef,
    eastHeaderRef,
    mobileHeaderStickyStyle,
    updateMobileStickyOffset,
  };
}
