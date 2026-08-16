import { useCallback, useLayoutEffect, useRef } from 'react';

const prefersReducedMotion = () => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

/**
 * FLIP for a list that re-sorts itself.
 *
 * Rows are measured before the browser paints the new order, dropped back to
 * where they were, and released, so a row that climbs two places is seen
 * climbing rather than simply appearing higher up.
 *
 * Only for reorders the app performs itself. A drag library already owns the
 * `transform` of the items it is moving, so animating a drag from here would
 * fight it — pass `enabled: false` for the duration of a drag. Positions are
 * still recorded while disabled, so the first reorder afterwards animates from
 * where the rows actually are.
 *
 * @param {object}  options
 * @param {boolean} options.enabled  Animate, or only track positions.
 * @returns {Function} `register(key)` — a ref callback for each row.
 */
export default function useReorderAnimation({ enabled = true } = {}) {
  const rows = useRef(new Map());
  const lastTop = useRef(new Map());

  const register = useCallback((key) => (node) => {
    if (node) rows.current.set(key, node); else rows.current.delete(key);
  }, []);

  useLayoutEffect(() => {
    const previous = lastTop.current;
    const next = new Map();
    const moves = [];

    rows.current.forEach((node, key) => {
      const { top } = node.getBoundingClientRect();
      next.set(key, top);
      const before = previous.get(key);
      if (before != null && Math.abs(before - top) > 0.5) moves.push([node, before - top]);
    });
    lastTop.current = next;

    if (!enabled || !moves.length || prefersReducedMotion()) return undefined;

    const settle = (node) => () => {
      node.style.transition = '';
      node.style.transform = '';
      node.style.zIndex = '';
    };
    moves.forEach(([node, delta]) => {
      node.style.transition = 'none';
      node.style.transform = `translateY(${delta}px)`;
      node.style.zIndex = '1';
    });
    const frame = requestAnimationFrame(() => {
      moves.forEach(([node]) => {
        node.style.transition = 'transform 420ms cubic-bezier(.2, .8, .3, 1)';
        node.style.transform = '';
        node.addEventListener('transitionend', settle(node), { once: true });
      });
    });
    return () => cancelAnimationFrame(frame);
  });

  return register;
}
