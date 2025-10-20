import React from 'react';
import { render, screen } from '@testing-library/react';
import Loader from '../Loader';

describe('Loader Component', () => {
  test('renders with default props', () => {
    render(<Loader />);

    const loader = screen.getByRole('status');
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveAttribute('aria-label', 'Loading...');
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('renders with custom label', () => {
    render(<Loader label="Loading NBA Standings..." />);

    const loader = screen.getByRole('status');
    expect(loader).toHaveAttribute('aria-label', 'Loading NBA Standings...');
    expect(screen.getByText('Loading NBA Standings...')).toBeInTheDocument();
  });

  test('renders with custom size', () => {
    const { container } = render(<Loader size="12" />);

    const loader = container.querySelector('[role="status"]');
    expect(loader).toHaveClass('h-12', 'w-12');
  });

  test('renders with custom color', () => {
    const { container } = render(<Loader color="blue-500" />);

    const loader = container.querySelector('[role="status"]');
    expect(loader).toHaveClass('border-blue-500');
  });

  test('has spinning animation class', () => {
    const { container } = render(<Loader />);

    const loader = container.querySelector('[role="status"]');
    expect(loader).toHaveClass('animate-spin');
  });

  test('renders with all custom props', () => {
    render(<Loader size="16" color="red-600" label="Processing..." />);

    const loader = screen.getByRole('status');
    expect(loader).toHaveAttribute('aria-label', 'Processing...');
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });
});
