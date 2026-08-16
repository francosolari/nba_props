import React from 'react';
import { ArrowRight } from 'lucide-react';

export function ActionLink({ href, children, secondary = false }) {
  if (!href) return null;
  return (
    <a className={`next-play-action${secondary ? ' is-secondary' : ''}`} href={href}>
      <span>{children}</span>
      <ArrowRight aria-hidden="true" />
    </a>
  );
}

export default ActionLink;
