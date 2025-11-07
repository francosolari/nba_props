/**
 * Tests for ProgressBar component.
 *
 * A simple UI component used throughout the leaderboard.
 */
import { render, screen } from '@testing-library/react';
import ProgressBar from '../ProgressBar';

describe('ProgressBar', () => {
  it('renders without crashing', () => {
    render(<ProgressBar value={50} max={100} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('displays correct progress percentage', () => {
    render(<ProgressBar value={75} max={100} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('handles zero max value', () => {
    render(<ProgressBar value={0} max={0} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('handles value greater than max', () => {
    render(<ProgressBar value={150} max={100} />);

    const progressBar = screen.getByRole('progressbar');
    // Should cap at 100%
    expect(progressBar).toBeInTheDocument();
  });

  it('applies custom color prop', () => {
    const { container } = render(
      <ProgressBar
        value={50}
        max={100}
        color="bg-red-500"
      />
    );

    // Check if custom color class is applied
    const progressFill = container.querySelector('.bg-red-500');
    expect(progressFill).toBeInTheDocument();
  });

  it('applies custom size prop', () => {
    render(<ProgressBar value={50} max={100} size="lg" />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('shows correct percentage for partial values', () => {
    render(<ProgressBar value={33} max={100} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '33');
  });

  it('renders with default props', () => {
    render(<ProgressBar />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });
});
