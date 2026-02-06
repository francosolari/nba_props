import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TeamLogo, { resolveTeamLogoSlug } from '../TeamLogo';

// ============================================================================
// resolveTeamLogoSlug unit tests
// ============================================================================

describe('resolveTeamLogoSlug', () => {
  test('converts team name to lowercase hyphenated slug', () => {
    expect(resolveTeamLogoSlug('Los Angeles Lakers')).toBe('los-angeles-lakers');
    expect(resolveTeamLogoSlug('Golden State Warriors')).toBe('golden-state-warriors');
  });

  test('applies override for Los Angeles Clippers', () => {
    expect(resolveTeamLogoSlug('Los Angeles Clippers')).toBe('la-clippers');
  });

  test('replaces ampersand with "and"', () => {
    expect(resolveTeamLogoSlug('Team & Co')).toBe('team-and-co');
  });

  test('returns empty string for empty or missing input', () => {
    expect(resolveTeamLogoSlug('')).toBe('');
    expect(resolveTeamLogoSlug()).toBe('');
  });
});

// ============================================================================
// TeamLogo component tests
// ============================================================================

describe('TeamLogo', () => {
  test('renders img with SVG src derived from teamName', () => {
    render(<TeamLogo teamName="Boston Celtics" />);
    const img = screen.getByAltText('Boston Celtics');
    expect(img).toHaveAttribute('src', '/static/img/teams/boston-celtics.svg');
  });

  test('uses slug prop over teamName for src resolution', () => {
    render(<TeamLogo teamName="Some Team" slug="custom-slug" />);
    const img = screen.getByAltText('Some Team');
    expect(img).toHaveAttribute('src', '/static/img/teams/custom-slug.svg');
  });

  test('has loading="eager" and decoding="async" attributes', () => {
    render(<TeamLogo teamName="Miami Heat" />);
    const img = screen.getByAltText('Miami Heat');
    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).toHaveAttribute('decoding', 'async');
  });

  test('starts with opacity 0 and transitions to 1 on load', () => {
    render(<TeamLogo teamName="Chicago Bulls" />);
    const img = screen.getByAltText('Chicago Bulls');

    expect(img.style.opacity).toBe('0');
    expect(img.style.transition).toContain('opacity');

    fireEvent.load(img);
    expect(img.style.opacity).toBe('1');
  });

  test('falls back from SVG to PNG on first error', () => {
    render(<TeamLogo teamName="Denver Nuggets" />);
    const img = screen.getByAltText('Denver Nuggets');

    expect(img).toHaveAttribute('src', '/static/img/teams/denver-nuggets.svg');

    fireEvent.error(img);
    expect(img).toHaveAttribute('src', '/static/img/teams/denver-nuggets.png');
  });

  test('falls back to unknown logo after PNG error', () => {
    render(<TeamLogo teamName="Indiana Pacers" />);
    const img = screen.getByAltText('Indiana Pacers');

    // SVG fails -> try PNG
    fireEvent.error(img);
    expect(img).toHaveAttribute('src', '/static/img/teams/indiana-pacers.png');

    // PNG fails -> unknown
    fireEvent.error(img);
    expect(img).toHaveAttribute('src', '/static/img/teams/unknown.svg');
  });

  test('renders unknown logo when no teamName or slug provided', () => {
    render(<TeamLogo alt="fallback" />);
    const img = screen.getByAltText('fallback');
    expect(img).toHaveAttribute('src', '/static/img/teams/unknown.svg');
  });
});
