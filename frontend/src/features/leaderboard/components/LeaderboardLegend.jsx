import React from 'react';
import { Check, Clock, Percent, X } from 'lucide-react';

/**
 * Scoring keys. The tickets in the ledger carry result colour and, in their
 * border, whether that result can still change. The exact point value used to
 * appear only in a hover badge, which put meaning behind a pointer and out of
 * reach on touch — these strips state both dimensions in writing instead.
 */

const Item = ({ state, mark, children }) => (
  <div>
    <dt className={`court-ticket ${state}`}>{mark}</dt>
    <dd>{children}</dd>
  </div>
);

/* Settlement reads the same on every section: a solid ticket has banked its
   points, a dashed one is scored against where things stand today. */
const SettlementItems = ({ lockedNote, liveNote }) => (
  <>
    <Item state="is-hit is-settled" mark="3">{lockedNote}</Item>
    <Item state="is-hit is-inplay" mark="3">{liveNote}</Item>
  </>
);

export const StandingsLegend = () => (
  <dl className="court-adv-legend">
    <Item state="is-hit" mark="3">Exact finish</Item>
    <Item state="is-near" mark="1">Within one place</Item>
    <Item state="is-miss" mark="0">Off by two or more</Item>
    <Item state="is-empty" mark="—">No pick</Item>
    <span className="court-adv-legend__rule" aria-hidden="true" />
    <SettlementItems
      lockedNote="Locked — this seed is mathematically settled"
      liveNote="In play — scored on today's standings"
    />
  </dl>
);

export const CallsLegend = () => (
  <dl className="court-adv-legend">
    <Item state="is-hit" mark={<Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />}>Correct — full points</Item>
    <Item state="is-near" mark={<Percent className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />}>Partial credit</Item>
    <Item state="is-miss" mark={<X className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />}>Incorrect</Item>
    <Item state="is-open" mark={<Clock className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden="true" />}>Not graded yet</Item>
    <span className="court-adv-legend__rule" aria-hidden="true" />
    <SettlementItems
      lockedNote="Locked — the award has been decided"
      liveNote="In play — scored on the current favourite"
    />
  </dl>
);
