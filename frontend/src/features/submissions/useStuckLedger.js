import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// Slack between the pin and unpin points. The ledger cannot flip state twice
// inside one slow drag, which is what makes a threshold feel like it is
// resisting the scroll.
const HYSTERESIS = 14;

/**
 * Reports whether a `position: sticky` ledger has lifted off the sheet, and
 * keeps the sheet from moving when it does.
 *
 * Three refs come back, all siblings so the ledger keeps its original sticky
 * containing block — wrapping it in a holder would confine it to the holder's
 * own height. `markRef` is a 1px mark on the ledger's outward side that records
 * its resting position; `ledgerRef` is the sticky ledger; `spacerRef` follows
 * it and grows by exactly what the ledger gives back.
 *
 * The spacer is the point. A pinned sticky element still owns its flow box, so
 * collapsing it would drag every question up by the height it released — right
 * under the reader's thumb. That is also why the collapse is not animated: the
 * spacer is measured once per state change, and a gradual collapse would drift
 * out from under it.
 *
 * Nothing here reads layout while scrolling. This page runs to ~16,000px with a
 * drag-and-drop standings board on it, and a `getBoundingClientRect` per scroll
 * frame forces a full style and layout recalc that iOS cannot absorb — scrolling
 * turns sticky and only catches up on a fast fling. So the mark's position is
 * measured when layout actually changes and cached, and the scroll handler is
 * arithmetic on `scrollY` alone.
 *
 * @param {'top'|'bottom'} edge  Which viewport edge the ledger sticks to.
 * @param {number} offset        The sticky offset in px from that edge.
 */
const useStuckLedger = (edge = 'top', offset = 0) => {
  const markRef = useRef(null);
  const ledgerRef = useRef(null);
  const spacerRef = useRef(null);
  const stuckRef = useRef(false);
  const restingHeightRef = useRef(0);
  const markAtRef = useRef(Number.POSITIVE_INFINITY);
  const [isStuck, setIsStuck] = useState(false);

  // Everything that needs layout happens here, and here only: when the DOM
  // changes size, not when the page scrolls.
  const remeasure = useCallback(() => {
    const mark = markRef.current;
    const ledger = ledgerRef.current;
    const spacer = spacerRef.current;
    if (!mark || !ledger || !spacer) return;

    const rect = mark.getBoundingClientRect();
    markAtRef.current = (edge === 'top' ? rect.top : rect.bottom) + window.scrollY;

    let height = 0;
    if (stuckRef.current) {
      height = Math.max(restingHeightRef.current - ledger.offsetHeight, 0);
    } else {
      // Only ever record the resting height, never the collapsed one.
      restingHeightRef.current = ledger.offsetHeight;
    }
    // Writing an unchanged height would re-trigger the observer watching it.
    const next = `${height}px`;
    if (spacer.style.height !== next) spacer.style.height = next;
  }, [edge]);

  // Re-run when the ledger docks or undocks, so the spacer is resized in the
  // same frame and nothing shifts on screen.
  useLayoutEffect(remeasure, [remeasure, isStuck]);

  useLayoutEffect(() => {
    const ledger = ledgerRef.current;
    if (!ledger || typeof ResizeObserver === 'undefined') return undefined;
    // Answers, validation notes, and the standings board above all change these
    // measurements without a re-render of this component.
    const observer = new ResizeObserver(remeasure);
    observer.observe(ledger);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [remeasure]);

  useEffect(() => {
    let frame = 0;

    const evaluate = () => {
      frame = 0;
      const markAt = markAtRef.current;
      const slack = stuckRef.current ? HYSTERESIS : 0;
      const line = edge === 'top'
        ? window.scrollY + offset
        : window.scrollY + window.innerHeight - offset;
      const pinned = edge === 'top'
        ? line >= markAt - slack
        : line <= markAt + slack;

      if (pinned === stuckRef.current) return;
      stuckRef.current = pinned;
      setIsStuck(pinned);
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(evaluate);
    };

    evaluate();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [edge, offset]);

  return [markRef, ledgerRef, spacerRef, isStuck];
};

export default useStuckLedger;
